import { defineConfig, devices } from '@playwright/test';

const isDocker = !!process.env.TEST_BASE_URL;

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // 串行执行以保证测试顺序
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1, // 单线程执行
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'], // 控制台输出
  ],
  timeout: 60000, // 单个测试超时 60 秒
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3001',
    trace: 'off', // 禁用 trace 避免 ffmpeg 依赖
    screenshot: 'only-on-failure',
    video: 'off', // 禁用视频录制避免 ffmpeg 依赖
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // 使用系统安装的 Chrome
        channel: 'chrome',
      },
    },
  ],

  // 仅在非 Docker 测试模式下启动本地服务器
  webServer: (isDocker || process.env.CI) ? undefined : {
    command: 'pnpm dev',
    url: 'http://localhost:3001',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
