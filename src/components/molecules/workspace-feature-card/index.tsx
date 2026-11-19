import type { ReactNode } from 'react';
import { Box, Paper, Typography } from '@mui/material';

type WorkspaceFeatureCardProps = {
  description: string;
  icon: ReactNode;
  title: string;
};

export function WorkspaceFeatureCard({ description, icon, title }: WorkspaceFeatureCardProps) {
  return (
    <Paper className="c-workspace-feature-card" elevation={0} component="section">
      <Box className="c-workspace-feature-card__icon" aria-hidden="true">
        {icon}
      </Box>
      <Typography variant="h3" sx={{ fontSize: 17, fontWeight: 650 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
        {description}
      </Typography>
      <Typography className="c-workspace-feature-card__status">NOT CONNECTED</Typography>
    </Paper>
  );
}
