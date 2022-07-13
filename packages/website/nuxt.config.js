import customTheme from './styles/theme.js';

export default {
  // Target: https://go.nuxtjs.dev/config-target
  target: 'static',

  mode: 'spa',

  // Global page headers: https://go.nuxtjs.dev/config-head
  head: {
    title: 'Cannon',
    htmlAttrs: {
      lang: 'en',
    },
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: '' },
      { name: 'format-detection', content: 'telephone=no' },
    ],
    link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
  },

  // Global CSS: https://go.nuxtjs.dev/config-css
  css: ['@/styles/extras.scss'],

  // Plugins to run before rendering page: https://go.nuxtjs.dev/config-plugins
  plugins: [],

  // Auto import components: https://go.nuxtjs.dev/config-components
  components: true,

  // Modules for dev and build (recommended): https://go.nuxtjs.dev/config-modules
  buildModules: ['@nuxtjs/google-fonts'],

  // Modules: https://go.nuxtjs.dev/config-modules
  modules: [
    // https://go.nuxtjs.dev/chakra
    '@chakra-ui/nuxt',
    // https://go.nuxtjs.dev/emotion
    '@nuxtjs/emotion',
    '@nuxt/content',
    '@nuxtclub/feathericons',
    '@nuxtjs/apollo',
  ],

  // Build Configuration: https://go.nuxtjs.dev/config-build
  build: {},

  chakra: {
    extendTheme: customTheme,
  },

  googleFonts: {
    families: {
      'Miriam+Libre': true,
      Inter: true,
    },
  },

  apollo: {
    clientConfigs: {
      default: {
        httpEndpoint: 'https://api.thegraph.com/subgraphs/name/noahlitvin/cannon-registry',
      },
    },
  },

  content: {
    markdown: {
      prism: {
        theme: 'prism-themes/themes/prism-one-dark.css',
      },
    },
  },

  telemetry: false,
};
