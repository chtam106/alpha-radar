import ShowChartRoundedIcon from '@mui/icons-material/ShowChartRounded';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { WorkspaceFeatureCard } from './index';

const meta = {
  title: 'Molecules/Workspace Feature Card',
  component: WorkspaceFeatureCard,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs']
} satisfies Meta<typeof WorkspaceFeatureCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const MarketData: Story = {
  args: {
    title: 'Market data',
    description: 'Connect a price provider to explore live assets and market movement.',
    icon: <ShowChartRoundedIcon />
  },
  render: (args) => <WorkspaceFeatureCard {...args} />
};
