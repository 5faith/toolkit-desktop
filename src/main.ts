import { createApp } from 'vue'
import { pinia } from './stores'
import router from './router'
import App from './App.vue'
import { registerAllModules } from './modules'

import 'virtual:uno.css'
import '@shared/styles/reset.css'
import '@shared/styles/variables.css'
import '@shared/styles/global.css'

registerAllModules()

const app = createApp(App)
app.use(pinia)
app.use(router)
app.mount('#app')
