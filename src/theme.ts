import { createTheme } from '@mui/material';

export const appTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#f0b90b', contrastText: '#0b0e11' },
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
        root: { fontSize: '1rem' }
      }
    },
    MuiChip: {
      styleOverrides: {
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
