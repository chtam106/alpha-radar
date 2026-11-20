import type { Meta, StoryObj } from '@storybook/react-vite';
import { ScrollToEdgeButton } from './index';

const meta = {
  title: 'Atoms/Scroll To Edge Button',
  component: ScrollToEdgeButton,
  tags: ['autodocs']
} satisfies Meta<typeof ScrollToEdgeButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
