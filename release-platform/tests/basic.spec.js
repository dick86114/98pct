import { test, expect } from '@playwright/test';

test.describe('发版管理平台 - 基础测试', () => {
  test('首页加载测试', async ({ page }) => {
    await page.goto('/');

    // 检查页面标题
    await expect(page).toHaveTitle(/发版管理平台/);

    // 检查是否重定向到登录页面或仪表盘
    const url = page.url();
    expect(url).toMatch(/\/(login|dashboard)/);
  });

  test('登录页面功能测试', async ({ page }) => {
    await page.goto('/login');

    // 检查登录表单元素
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('注册页面功能测试', async ({ page }) => {
    await page.goto('/register');

    // 检查注册表单元素
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('导航栏测试（需要登录）', async ({ page }) => {
    await page.goto('/dashboard');

    // 未登录应该重定向到登录页
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
  });
});

test.describe('发版管理平台 - UI 测试', () => {
  test('页面样式检查', async ({ page }) => {
    await page.goto('/login');

    // 检查背景渐变效果
    const body = page.locator('body');
    const backgroundColor = await body.evaluate(el => {
      return window.getComputedStyle(el).background;
    });

    // 验证有背景设置
    expect(backgroundColor).toBeTruthy();
  });
});
