import { Box, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { CryptoDashboard } from './components/organisms/crypto-dashboard';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#9cf5c4' },
    background: { default: '#090d12', paper: '#111820' },
    text: { primary: '#f2f5f7', secondary: '#9ba8b5' }
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    h1: { fontWeight: 650, letterSpacing: '-0.045em' },
    h2: { fontWeight: 600, letterSpacing: '-0.025em' }
  }
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box className="o-app-shell">
        <CryptoDashboard />
      </Box>
    </ThemeProvider>
  );
}

export default App;
