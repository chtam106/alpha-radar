import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Box, CssBaseline, ThemeProvider } from '@mui/material';
import { CryptoDashboard } from '@/components/organisms/crypto-dashboard';
import { appTheme } from '@/theme';

import.meta.glob('./**/*.scss', { eager: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <Box className="o-app-shell">
        <CryptoDashboard />
      </Box>
    </ThemeProvider>
  </StrictMode>
);
