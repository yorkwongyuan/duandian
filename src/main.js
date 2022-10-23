import Vue from 'vue'
import './utils/dicom'
import App from './App.vue'
import router from './router'
import store from './store'
Vue.config.performance = false
Vue.config.productionTip = false
Vue.options.data = function () {
  return {
    globalName: '名字'
  }
}
new Vue({
  data: {
    myVue: 'wyuan'
  },
  router,
  store,
  render: h => h(App)
}).$mount('#app')
