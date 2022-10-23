<template>
  <div id="app">
    {{name}}
    <input type="text" v-model="name">
    <HelloWorld @hook:beforeCreate="beforeHandle" shuxing="001" @testEvent="handleEvent"></HelloWorld>
  </div>
</template>
<script>
import HelloWorld from '@/components/HelloWorld.vue'
// import { fn } from './utils/dicom'
export default {
  data () {
    return {
      name: '',
      obj: {}
    }
  },
  components: {
    HelloWorld
  },
  provide: {
    provKey: 'provValueFromApp'
  },
  watch: {},
  methods: {
    getFn () {
      console.log('this is fn')
    },
    handleEvent () {
      console.log('handleEvent')
    },
    beforeHandle () {
      console.log('beforecreate方法执行了')
    }
  },
  computed: {},
  mounted () {
    this.name = 'york'
    // fn()
    // this.$set(this.obj, 'name', 'nigel')
  }
}
</script>
<style lang="scss">
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

nav {
  padding: 30px;

  a {
    font-weight: bold;
    color: #2c3e50;

    &.router-link-exact-active {
      color: #42b983;
    }
  }
}
</style>
