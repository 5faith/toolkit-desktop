import { createRouter, createWebHashHistory } from 'vue-router'
import { moduleRegistry } from '@core/module-registry'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [],
})

router.beforeEach((to) => {
  const moduleId = to.meta.moduleId as string | undefined
  if (moduleId) {
    moduleRegistry.activate(moduleId)
  }
})

export function registerModuleRoutes() {
  const modules = moduleRegistry.getAll()
  modules.forEach(mod => {
    router.addRoute(mod.route)
  })

  if (modules.length > 0) {
    router.addRoute({
      path: '/',
      redirect: `/${modules[0].id}`,
    })
  }
}

export default router
