import { extendTheme } from '@chakra-ui/react';

export const theme = extendTheme({
  fonts: {
    heading: 'var(--font-miriam)',
    body: 'var(--font-inter)',
  },
  colors: {
    gray: {
      50: '#F7FAFC',
      100: '#EDF2F7',
      200: '#E2E8F0',
      300: '#CBD5E0',
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
      500: '#00bce6',
      600: '#0092b4',
      700: '#006882',
      800: '#004050',
      900: '#00171f',
    },
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: 'bold', // Customize the font weight
        fontFamily: 'var(--font-miriam)', // Customize the font family
        textTransform: 'uppercase',
      },
    },
    Link: {
      baseStyle: {
        textDecoration: 'underline',
      },
    },
  },
  styles: {
    global: {
      'html, body': {
        color: '#ffffffd9',
      },
    },
  },
});
