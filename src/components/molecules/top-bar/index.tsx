import { Box, Chip, Stack, Typography } from '@mui/material';
import { BrandMark } from '@/components/atoms/brand-mark';

export function TopBar() {
  return (
    <Box component="header" className="c-top-bar">
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <BrandMark />
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            Alpha Watch
          </Typography>
          <Typography variant="caption" color="text.secondary">
            BNB Smart Chain
          </Typography>
        </Box>
      </Stack>
      <Chip size="small" variant="outlined" label="BINANCE ALPHA" />
    </Box>
  );
}
