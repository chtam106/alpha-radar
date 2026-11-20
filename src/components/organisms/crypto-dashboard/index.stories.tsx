import { ThemeProvider } from '@mui/material';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { CryptoDashboard } from './index';
import { appTheme } from '@/theme';

const meta = {
  title: 'Organisms/Crypto Dashboard',
  component: CryptoDashboard,
  parameters: {
    layout: 'fullscreen'
  },
  tags: ['autodocs']
} satisfies Meta<typeof CryptoDashboard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ThemeProvider theme={appTheme}>
      <CryptoDashboard />
    </ThemeProvider>
  )
};
