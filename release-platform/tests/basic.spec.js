/**
 * 今天发什么发版管理平台 - 基础测试
 * 测试基本页面加载和 UI 元素
 */

import { test, expect } from '@playwright/test';

test.describe('发版管理平台 - 基础测试', () => {
  test('首页加载测试', async ({ page }) => {
    await page.goto('/');

    // 检查页面标题
    await expect(page).toHaveTitle(/发版管理平台|今天发什么/);

    // 检查是否重定向到登录页面或仪表盘
    const url = page.url();
    expect(url).toMatch(/\/(login|dashboard)/);
  });

  test('登录页面功能测试', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // 检查登录表单元素 - 使用 class 选择器
    await expect(page.locator('.input-field').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // 检查 Logo
    await expect(page.locator('.logo-img')).toBeVisible();
    await expect(page.locator('.logo-title')).toContainText('今天发什么');
  });

  test('导航栏测试（需要登录）', async ({ page }) => {
    await page.goto('/dashboard');

    // 未登录应该重定向到登录页
    await page.waitForURL('**/login', { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });
});

test.describe('发版管理平台 - UI 测试', () => {
  test('页面样式检查', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // 检查登录卡片存在
    const loginCard = page.locator('.login-card');
    await expect(loginCard).toBeVisible({ timeout: 10000 });

    // 检查背景效果元素
    const bgEffects = page.locator('.bg-effects');
    await expect(bgEffects).toBeVisible();
  });

  test('登录表单交互测试', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // 填写表单
    const accountInput = page.locator('.input-field').first();
    const passwordInput = page.locator('input[type="password"]');
    
    await accountInput.fill('testuser');
    await passwordInput.fill('testpassword');

    // 验证输入值
    await expect(accountInput).toHaveValue('testuser');
    await expect(passwordInput).toHaveValue('testpassword');
  });
});
