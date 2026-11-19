import { Box, Chip } from '@mui/material';

export function DataSourceStatus() {
  return (
    <Chip
      className="c-data-source-status"
      icon={<Box component="span" className="c-data-source-status__dot" />}
      label="NO DATA SOURCE"
      variant="outlined"
    />
  );
}
