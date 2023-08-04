export default {
  fonts: {
    heading: '"Miriam Libre", sans-serif',
    body: 'Inter, system-ui, sans-serif',
  },
  colors: {
    blue: {
      950: '#00081a',
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
  baseStyles: {
    CButton: ({ theme }) => ({
      fontFamily: theme.fonts.heading,
      textTransform: 'uppercase',
      letterSpacing: '1px',
      paddingTop: '0.3rem',
    }),
  },
};
