/* eslint-disable promise/param-names */
import Vue from 'vue'
import cornerstone from 'cornerstone-core'
import dicomParser from 'dicom-parser'
Vue.config.performance = true
const cornerstoneWADOImageLoader = window.cornerstoneWADOImageLoader
// const dicomParser = window.dicomParser
// const cornerstone = window.cornerstone
cornerstoneWADOImageLoader.external.dicomParser = dicomParser
cornerstoneWADOImageLoader.external.cornerstone = cornerstone

export const fn = function () {
  const el = document.querySelector('#dicomImage')
  let result
  let fileImgId = ''
  cornerstone.enable(el)

  cornerstone.metaData.addProvider(function (type, imageId) {
    if (type === 'imagePixelModule' && imageId === fileImgId) {
      console.log(imageId, result, 'add provider dataSet')
      return getImagePixelModule(result)
    }
    return metaDataProvider(type, imageId)
  })
  extend()

  document.getElementById('file').onchange = function (e) {
    const files = e.target.files
    if (!files || !files.length) return
    const file = files[0]
    cornerstone.disable(el)
    const read = new FileReader()
    read.readAsArrayBuffer(file)
    read.onload = function () {
      result = dicomParser.parseDicom(new Uint8Array(this.result))
      const url = 'http://' + file.name
      fileImgId = 'wadouri:' + url
      cornerstoneWADOImageLoader.wadouri.dataSetCacheManager.add(url, result)

      cornerstone.imageCache.putImageLoadObject(fileImgId, cornerstoneWADOImageLoader.wadouri.loadImageFromPromise(new Promise((res) => {
        res(result)
      }), fileImgId))
      cornerstone.loadAndCacheImage(fileImgId).then(img => {
        cornerstone.enable(el)
        cornerstone.displayImage(el, img)
      })
    }
  }
}

function extend () {
  const loadedDataSets = {}
  const dataSetCacheManager = cornerstoneWADOImageLoader.wadouri.dataSetCacheManager
  const getCache = dataSetCacheManager.get
  cornerstoneWADOImageLoader.wadouri.dataSetCacheManager = {
    ...dataSetCacheManager,
    get (uri) {
      console.log(uri, loadedDataSets, 'extend get')
      if (loadedDataSets[uri]) return loadedDataSets[uri].dataSet
      return getCache(uri)
    },
    add (uri, dataSet) {
      if (!loadedDataSets[uri]) {
        loadedDataSets[uri] = {}
      }
      loadedDataSets[uri].dataSet = dataSet
    }
  }
}

function metaDataProvider (type, imageId) {
  const parsedImageId = cornerstoneWADOImageLoader.wadouri.parseImageId(imageId)
  const dataSet = cornerstoneWADOImageLoader.wadouri.dataSetCacheManager.get(parsedImageId.url)
  if (!dataSet) {
    return
  }

  if (type === 'generalSeriesModule') {
    return {
      modality: dataSet.string('x00080060'),
      seriesInstanceUID: dataSet.string('x0020000e'),
      seriesNumber: dataSet.intString('x00200011'),
      studyInstanceUID: dataSet.string('x0020000d'),
      seriesDate: dicomParser.parseDA(dataSet.string('x00080021')),
      seriesTime: dicomParser.parseTM(dataSet.string('x00080031') || '')
    }
  }

  if (type === 'patientStudyModule') {
    return {
      patientAge: dataSet.intString('x00101010'),
      patientSize: dataSet.floatString('x00101020'),
      patientWeight: dataSet.floatString('x00101030')
    }
  }

  if (type === 'imagePlaneModule') {
    const imageOrientationPatient = cornerstoneWADOImageLoader.wadouri.metaData.getNumberValues(dataSet, 'x00200037', 6)
    const imagePositionPatient = cornerstoneWADOImageLoader.wadouri.metaData.getNumberValues(dataSet, 'x00200032', 3)
    const pixelSpacing = cornerstoneWADOImageLoader.wadouri.metaData.getNumberValues(dataSet, 'x00280030', 2)
    let columnPixelSpacing = null
    let rowPixelSpacing = null

    if (pixelSpacing) {
      rowPixelSpacing = pixelSpacing[0]
      columnPixelSpacing = pixelSpacing[1]
    }

    let rowCosines = null
    let columnCosines = null

    if (imageOrientationPatient) {
      rowCosines = [parseFloat(imageOrientationPatient[0]), parseFloat(imageOrientationPatient[1]), parseFloat(imageOrientationPatient[2])]
      columnCosines = [parseFloat(imageOrientationPatient[3]), parseFloat(imageOrientationPatient[4]), parseFloat(imageOrientationPatient[5])]
    }

    return {
      frameOfReferenceUID: dataSet.string('x00200052'),
      rows: dataSet.uint16('x00280010'),
      columns: dataSet.uint16('x00280011'),
      imageOrientationPatient: imageOrientationPatient,
      rowCosines: rowCosines,
      columnCosines: columnCosines,
      imagePositionPatient: imagePositionPatient,
      sliceThickness: dataSet.floatString('x00180050'),
      sliceLocation: dataSet.floatString('x00201041'),
      pixelSpacing: pixelSpacing,
      rowPixelSpacing: rowPixelSpacing,
      columnPixelSpacing: columnPixelSpacing
    }
  }

  if (type === 'imagePixelModule') {
    return cornerstoneWADOImageLoader.wadouri.metaData.getImagePixelModule(dataSet)
  }

  if (type === 'modalityLutModule') {
    return {
      rescaleIntercept: dataSet.floatString('x00281052'),
      rescaleSlope: dataSet.floatString('x00281053'),
      rescaleType: dataSet.string('x00281054'),
      modalityLUTSequence: cornerstoneWADOImageLoader.wadouri.metaData.getLUTs(dataSet.uint16('x00280103'), dataSet.elements.x00283000)
    }
  }

  if (type === 'voiLutModule') {
    const modalityLUTOutputPixelRepresentation = cornerstoneWADOImageLoader.wadouri.metaData.getModalityLUTOutputPixelRepresentation(dataSet)
    return {
      windowCenter: cornerstoneWADOImageLoader.wadouri.metaData.getNumberValues(dataSet, 'x00281050', 1),
      windowWidth: cornerstoneWADOImageLoader.wadouri.metaData.getNumberValues(dataSet, 'x00281051', 1),
      voiLUTSequence: cornerstoneWADOImageLoader.wadouri.metaData.getLUTs(modalityLUTOutputPixelRepresentation, dataSet.elements.x00283010)
    }
  }

  if (type === 'sopCommonModule') {
    return {
      sopClassUID: dataSet.string('x00080016'),
      sopInstanceUID: dataSet.string('x00080018')
    }
  }

  if (type === 'petIsotopeModule') {
    const radiopharmaceuticalInfo = dataSet.elements.x00540016

    if (radiopharmaceuticalInfo === undefined) {
      return
    }

    const firstRadiopharmaceuticalInfoDataSet = radiopharmaceuticalInfo.items[0].dataSet
    return {
      radiopharmaceuticalInfo: {
        radiopharmaceuticalStartTime: dicomParser.parseTM(firstRadiopharmaceuticalInfoDataSet.string('x00181072') || ''),
        radionuclideTotalDose: firstRadiopharmaceuticalInfoDataSet.floatString('x00181074'),
        radionuclideHalfLife: firstRadiopharmaceuticalInfoDataSet.floatString('x00181075')
      }
    }
  }

  if (type === 'overlayPlaneModule') {
    return getOverlayPlaneModule(dataSet)
  }
}

function getOverlayPlaneModule (dataSet) {
  const overlays = []

  for (let overlayGroup = 0x00; overlayGroup <= 0x1e; overlayGroup += 0x02) {
    let groupStr = 'x60'.concat(overlayGroup.toString(16))

    if (groupStr.length === 4) {
      groupStr = 'x600'.concat(overlayGroup.toString(16))
    }

    const data = dataSet.elements[''.concat(groupStr, '3000')]

    if (!data) {
      continue
    }

    const pixelData = []

    for (let i = 0; i < data.length; i++) {
      for (let k = 0; k < 8; k++) {
        const byteAsInt = dataSet.byteArray[data.dataOffset + i]
        pixelData[i * 8 + k] = byteAsInt >> k & 1 // eslint-disable-line no-bitwise
      }
    }

    overlays.push({
      rows: dataSet.uint16(''.concat(groupStr, '0010')),
      columns: dataSet.uint16(''.concat(groupStr, '0011')),
      type: dataSet.string(''.concat(groupStr, '0040')),
      x: dataSet.int16(''.concat(groupStr, '0050'), 1) - 1,
      y: dataSet.int16(''.concat(groupStr, '0050'), 0) - 1,
      pixelData: pixelData,
      description: dataSet.string(''.concat(groupStr, '0022')),
      label: dataSet.string(''.concat(groupStr, '1500')),
      roiArea: dataSet.string(''.concat(groupStr, '1301')),
      roiMean: dataSet.string(''.concat(groupStr, '1302')),
      roiStandardDeviation: dataSet.string(''.concat(groupStr, '1303'))
    })
  }

  return {
    overlays: overlays
  }
}

function getLutDescriptor (dataSet, tag) {
  if (!dataSet.elements[tag] || dataSet.elements[tag].length !== 6) {
    return
  }

  return [dataSet.uint16(tag, 0), dataSet.uint16(tag, 1), dataSet.uint16(tag, 2)]
}

function getLutData (lutDataSet, tag, lutDescriptor) {
  const lut = []
  const lutData = lutDataSet.elements[tag]

  for (let i = 0; i < lutDescriptor[0]; i++) {
    if (lutDescriptor[2] === 16) {
      lut[i] = lutDataSet.uint16(tag, i)
    } else {
      lut[i] = lutDataSet.byteArray[i + lutData.dataOffset]
    }
  }

  return lut
}

function populatePaletteColorLut (dataSet, imagePixelModule) {
  imagePixelModule.redPaletteColorLookupTableDescriptor = getLutDescriptor(dataSet, 'x00281101')
  imagePixelModule.greenPaletteColorLookupTableDescriptor = getLutDescriptor(dataSet, 'x00281102')
  imagePixelModule.bluePaletteColorLookupTableDescriptor = getLutDescriptor(dataSet, 'x00281103')

  if (imagePixelModule.redPaletteColorLookupTableDescriptor[0] === 0) {
    imagePixelModule.redPaletteColorLookupTableDescriptor[0] = 65536
    imagePixelModule.greenPaletteColorLookupTableDescriptor[0] = 65536
    imagePixelModule.bluePaletteColorLookupTableDescriptor[0] = 65536
  }

  const numLutEntries = imagePixelModule.redPaletteColorLookupTableDescriptor[0]
  const lutData = dataSet.elements.x00281201
  const lutBitsAllocated = lutData.length === numLutEntries ? 8 : 16

  if (imagePixelModule.redPaletteColorLookupTableDescriptor[2] !== lutBitsAllocated) {
    imagePixelModule.redPaletteColorLookupTableDescriptor[2] = lutBitsAllocated
    imagePixelModule.greenPaletteColorLookupTableDescriptor[2] = lutBitsAllocated
    imagePixelModule.bluePaletteColorLookupTableDescriptor[2] = lutBitsAllocated
  }

  imagePixelModule.redPaletteColorLookupTableData = getLutData(dataSet, 'x00281201', imagePixelModule.redPaletteColorLookupTableDescriptor)
  imagePixelModule.greenPaletteColorLookupTableData = getLutData(dataSet, 'x00281202', imagePixelModule.greenPaletteColorLookupTableDescriptor)
  imagePixelModule.bluePaletteColorLookupTableData = getLutData(dataSet, 'x00281203', imagePixelModule.bluePaletteColorLookupTableDescriptor)
}

function populateSmallestLargestPixelValues (dataSet, imagePixelModule) {
  const pixelRepresentation = dataSet.uint16('x00280103')

  if (pixelRepresentation === 0) {
    imagePixelModule.smallestPixelValue = dataSet.uint16('x00280106')
    imagePixelModule.largestPixelValue = dataSet.uint16('x00280107')
  } else {
    imagePixelModule.smallestPixelValue = dataSet.int16('x00280106')
    imagePixelModule.largestPixelValue = dataSet.int16('x00280107')
  }
}

function getImagePixelModule (dataSet) {
  const imagePixelModule = {
    samplesPerPixel: dataSet.uint16('x00280002'),
    photometricInterpretation: dataSet.string('x00280004'),
    rows: dataSet.uint16('x00280010'),
    columns: dataSet.uint16('x00280011'),
    bitsAllocated: dataSet.uint16('x00280100'),
    bitsStored: dataSet.uint16('x00280101'),
    highBit: dataSet.uint16('x00280102'),
    pixelRepresentation: dataSet.uint16('x00280103'),
    planarConfiguration: dataSet.uint16('x00280006'),
    pixelAspectRatio: dataSet.string('x00280034')
  }
  populateSmallestLargestPixelValues(dataSet, imagePixelModule)

  if (imagePixelModule.photometricInterpretation === 'PALETTE COLOR' && dataSet.elements.x00281101) {
    populatePaletteColorLut(dataSet, imagePixelModule)
  }
  return imagePixelModule
}
