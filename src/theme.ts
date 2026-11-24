import { createTheme } from '@mui/material';

const primaryColor = '#f0b90b';

export const appTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: primaryColor, contrastText: '#0b0e11' },
    background: { default: '#0b0e11', paper: '#181a20' },
    text: { primary: '#f2f5f7', secondary: '#9ba8b5' }
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    fontSize: 16,
    h1: { fontWeight: 650, letterSpacing: '-0.045em' },
    h2: { fontWeight: 600, letterSpacing: '-0.025em' },
    body1: { '@media (max-width:600px)': { fontSize: '1rem' } },
    body2: { fontSize: '1rem' },
    button: { fontSize: '1rem' },
    caption: { fontSize: '1rem' },
    overline: { fontSize: '1rem' },
    subtitle2: { fontSize: '1rem' }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          fontSize: '1rem',
          '&.MuiButton-containedPrimary:hover, &.MuiButton-containedPrimary.Mui-focusVisible': {
            backgroundColor: primaryColor
          },
          '&.MuiButton-containedPrimary.Mui-focusVisible': {
            outline: `2px solid ${primaryColor}`,
            outlineOffset: 2
          }
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          '&.MuiChip-clickable.MuiChip-colorPrimary:hover, &.MuiChip-clickable.MuiChip-colorPrimary.Mui-focusVisible':
            {
              backgroundColor: primaryColor
            },
          '&.MuiChip-clickable.MuiChip-colorPrimary.Mui-focusVisible': {
            outline: `2px solid ${primaryColor}`,
            outlineOffset: 2
          }
        },
        sizeSmall: { height: 32 },
        label: { fontSize: '1rem' }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: { fontSize: '1rem' }
      }
    }
  }
});
