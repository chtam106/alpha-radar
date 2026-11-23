import { mergeConfig, defineConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}', 'workers/**/*.test.ts'],
      clearMocks: true,
      restoreMocks: true,
      unstubGlobals: true,
      coverage: {
        provider: 'v8',
        include: ['src/**/*.ts', 'src/**/*.tsx', 'workers/cmc-proxy/src/**/*.ts'],
        exclude: [
          '**/*.stories.tsx',
          '**/*.test.ts',
          '**/*.test.tsx',
          'src/test/**',
          'src/vite-env.d.ts'
        ],
        reporter: ['text', 'html', 'lcov'],
        thresholds: {
          lines: 80,
          functions: 80,
          branches: 70,
          statements: 80
        }
      }
    }
  })
);
