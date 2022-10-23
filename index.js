const fs = require('fs/promises');
(async function () {
  const content = await fs.readFile('./package.json', { encoding: 'utf-8' })
  await fs.writeFile('./package2.json', content)
})()
