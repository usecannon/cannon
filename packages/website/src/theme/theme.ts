import { extendTheme } from '@chakra-ui/react';

export const theme = extendTheme({
  config: {
    initialColorMode: 'dark',
    useSystemColorMode: false,
  },
  fonts: {
    heading: 'var(--font-inter)',
    body: 'var(--font-inter)',
  },
  colors: {
    gray: {
      50: '#F7FAFC',
      100: '#EDF2F7',
      200: '#E7EDF2', // used in navlink
      300: '#B4BCD0', // used in hp display 2
      400: '#A0AEC0',
      500: '#4c5666',
      600: '#31363C', // used as border
      700: '#22262C', // used as border
      800: '#171B21', // used as box bg
      900: '#0E1116', // used as bg
    },
    blue: {
      700: '#003182',
      800: '#001d51',
      900: '#000a21',
      950: '#00050f',
      975: '#000714',
    },
    teal: {
      50: '#d7fdff',
      100: '#aaf2ff',
      200: '#7ae9ff',
      300: '#48dfff',
      400: '#1ad6ff',
      500: '#00A7CC',
      600: '#0092b4',
      700: '#006882',
      800: '#004050',
      900: '#00171f',
    },
  },
  components: {
    Link: {
      baseStyle: {
        textDecoration: 'underline',
      },
    },
    Code: {
      baseStyle: {
        color: 'gray.50',
        backgroundColor: 'gray.800',
      },
    },
  },
  styles: {
    global: {
      'html, body': {
        color: '#ffffffd9',
        backgroundColor: 'black',
      },
      ':root': {
        '--diff-gutter-insert-background-color': '#1c4532 !important',
        '--diff-gutter-delete-background-color': '#63171b !important',
        '--diff-code-insert-background-color': '#1c4532 !important',
        '--diff-code-delete-background-color': '#63171b !important',
      },
    },
  },
  gradients: {
    dark: 'linear-gradient(45deg, #000F14 0%, #140014 100%);',
    light: 'linear-gradient(45deg, #00131A 0%, #1A0019 100%);',
  },
});
