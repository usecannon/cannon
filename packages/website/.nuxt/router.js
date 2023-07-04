import Vue from 'vue'
import Router from 'vue-router'
import { normalizeURL, decode } from 'ufo'
import { interopDefault } from './utils'
import scrollBehavior from './router.scrollBehavior.js'

const _6ec4cfbe = () => interopDefault(import('../pages/docs/index.vue' /* webpackChunkName: "pages/docs/index" */))
const _e0f4e90c = () => interopDefault(import('../pages/get-started.vue' /* webpackChunkName: "pages/get-started" */))
const _5a706c68 = () => interopDefault(import('../pages/search.vue' /* webpackChunkName: "pages/search" */))
const _96dfaf72 = () => interopDefault(import('../pages/docs/technical-reference.vue' /* webpackChunkName: "pages/docs/technical-reference" */))
const _210a7688 = () => interopDefault(import('../pages/packages/_name.vue' /* webpackChunkName: "pages/packages/_name" */))
const _021411ea = () => interopDefault(import('../pages/packages/_name/index.vue' /* webpackChunkName: "pages/packages/_name/index" */))
const _4fd4198d = () => interopDefault(import('../pages/packages/_name/interact.vue' /* webpackChunkName: "pages/packages/_name/interact" */))
const _0943711c = () => interopDefault(import('../pages/packages/_name/versions.vue' /* webpackChunkName: "pages/packages/_name/versions" */))
const _3f711542 = () => interopDefault(import('../pages/index.vue' /* webpackChunkName: "pages/index" */))

const emptyFn = () => {}

Vue.use(Router)

export const routerOptions = {
  mode: 'history',
  base: '/',
  linkActiveClass: 'nuxt-link-active',
  linkExactActiveClass: 'nuxt-link-exact-active',
  scrollBehavior,

  routes: [{
    path: "/docs",
    component: _6ec4cfbe,
    name: "docs"
  }, {
    path: "/get-started",
    component: _e0f4e90c,
    name: "get-started"
  }, {
    path: "/search",
    component: _5a706c68,
    name: "search"
  }, {
    path: "/docs/technical-reference",
    component: _96dfaf72,
    name: "docs-technical-reference"
  }, {
    path: "/packages/:name?",
    component: _210a7688,
    children: [{
      path: "",
      component: _021411ea,
      name: "packages-name"
    }, {
      path: "interact",
      component: _4fd4198d,
      name: "packages-name-interact"
    }, {
      path: "versions",
      component: _0943711c,
      name: "packages-name-versions"
    }]
  }, {
    path: "/",
    component: _3f711542,
    name: "index"
  }],

  fallback: false
}

export function createRouter (ssrContext, config) {
  const base = (config._app && config._app.basePath) || routerOptions.base
  const router = new Router({ ...routerOptions, base  })

  // TODO: remove in Nuxt 3
  const originalPush = router.push
  router.push = function push (location, onComplete = emptyFn, onAbort) {
    return originalPush.call(this, location, onComplete, onAbort)
  }

  const resolve = router.resolve.bind(router)
  router.resolve = (to, current, append) => {
    if (typeof to === 'string') {
      to = normalizeURL(to)
    }
    return resolve(to, current, append)
  }

  return router
}
