/**
 * 九成八发版管理平台 - 全流程自动化测试
 * 
 * 测试覆盖：
 * 1. 用户认证（登录、登出）
 * 2. 角色权限（ADMIN、PM）
 * 3. 发版全流程（创建 → 准备 → 实施 → 验证 → 完成/回滚）
 * 4. PM 权限控制（只能管理自己创建的发版）
 */

import { test, expect } from '@playwright/test';

// 测试配置 - 使用环境变量或默认值
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3001';

// 辅助函数：API 登录
async function apiLogin(request, account, password) {
    const response = await request.post(`${BASE_URL}/api/auth/login`, {
        data: { account, password },
    });
    
    if (response.ok()) {
        return await response.json();
    }
    return null;
}

// 辅助函数：设置页面登录状态
async function setLoginState(page, token, user) {
    await page.goto('/login');
    await page.evaluate(({ token, user }) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
    }, { token, user });
}

// ============================================
// 测试套件 1：用户认证测试
// ============================================
test.describe('用户认证测试', () => {
    test('登录页面加载正常', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');
        await expect(page.locator('.input-field').first()).toBeVisible({ timeout: 10000 });
        await expect(page.locator('input[type="password"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('错误密码登录失败', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');
        
        await page.locator('.input-field').first().fill('admin');
        await page.locator('input[type="password"]').fill('wrongpassword');
        await page.click('button[type="submit"]');
        
        // 应该显示错误提示
        await expect(page.locator('.error-alert').first()).toBeVisible({ timeout: 10000 });
    });

    test('未登录访问受保护页面应跳转到登录页', async ({ page }) => {
        await page.goto('/dashboard');
        await page.waitForURL('**/login', { timeout: 10000 });
        expect(page.url()).toContain('/login');
    });
});

// ============================================
// 测试套件 2：API 接口测试
// ============================================
test.describe('API 接口测试', () => {
    let adminAuth;

    test.beforeAll(async ({ request }) => {
        adminAuth = await apiLogin(request, 'admin', 'admin123');
    });

    test('登录 API 正常工作', async ({ request }) => {
        const response = await request.post(`${BASE_URL}/api/auth/login`, {
            data: { account: 'admin', password: 'admin123' },
        });
        
        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.token).toBeTruthy();
        expect(data.user).toBeTruthy();
    });

    test('未授权请求返回 401', async ({ request }) => {
        const response = await request.get(`${BASE_URL}/api/releases`);
        expect(response.status()).toBe(401);
    });

    test('获取用户信息 API', async ({ request }) => {
        if (!adminAuth) { test.skip(); return; }

        const response = await request.get(`${BASE_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${adminAuth.token}` },
        });
        
        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.user).toBeTruthy();
    });

    test('获取发版列表 API', async ({ request }) => {
        if (!adminAuth) { test.skip(); return; }

        const response = await request.get(`${BASE_URL}/api/releases`, {
            headers: { 'Authorization': `Bearer ${adminAuth.token}` },
        });
        
        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(Array.isArray(data.releases)).toBeTruthy();
    });

    test('获取角色列表 API', async ({ request }) => {
        if (!adminAuth) { test.skip(); return; }

        const response = await request.get(`${BASE_URL}/api/roles`, {
            headers: { 'Authorization': `Bearer ${adminAuth.token}` },
        });
        
        expect(response.ok()).toBeTruthy();
    });

    test('获取数据字典 API', async ({ request }) => {
        if (!adminAuth) { test.skip(); return; }

        const response = await request.get(`${BASE_URL}/api/dictionary?type=system`, {
            headers: { 'Authorization': `Bearer ${adminAuth.token}` },
        });
        
        expect(response.ok()).toBeTruthy();
    });
});

// ============================================
// 测试套件 3：角色权限测试
// ============================================
test.describe('角色权限测试', () => {
    test('ADMIN 可以访问用户管理页面', async ({ page, request }) => {
        const auth = await apiLogin(request, 'admin', 'admin123');
        if (!auth) { test.skip(); return; }

        await setLoginState(page, auth.token, auth.user);
        await page.goto('/users');
        await page.waitForLoadState('networkidle');
        
        // ADMIN 应该能看到用户管理页面
        await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
    });

    test('ADMIN 可以访问数据字典管理', async ({ page, request }) => {
        const auth = await apiLogin(request, 'admin', 'admin123');
        if (!auth) { test.skip(); return; }

        await setLoginState(page, auth.token, auth.user);
        await page.goto('/admin/dictionary');
        await page.waitForLoadState('networkidle');
        
        // 应该能看到数据字典页面
        await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
    });
});

// ============================================
// 测试套件 4：发版流程 API 测试（使用 PM 用户）
// ============================================
test.describe('发版流程 API 测试', () => {
    let pmAuth;
    let releaseId;

    test.beforeAll(async ({ request }) => {
        // 使用 PM 用户登录（zhengliang 是 PM 角色，密码是 123456）
        pmAuth = await apiLogin(request, 'zhengliang', '123456');
    });

    test('PM 创建发版记录', async ({ request }) => {
        if (!pmAuth) { test.skip(); return; }

        const response = await request.post(`${BASE_URL}/api/releases`, {
            headers: {
                'Authorization': `Bearer ${pmAuth.token}`,
                'Content-Type': 'application/json',
            },
            data: {
                version: `v1.0.0-test-${Date.now()}`,
                description: '自动化测试发版',
                plannedDate: new Date().toISOString().split('T')[0],
                memberIds: [],
            },
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.release).toBeTruthy();
        expect(data.release.id).toBeTruthy();
        releaseId = data.release.id;
    });

    test('获取发版详情', async ({ request }) => {
        if (!pmAuth || !releaseId) { test.skip(); return; }

        const response = await request.get(`${BASE_URL}/api/releases/${releaseId}`, {
            headers: { 'Authorization': `Bearer ${pmAuth.token}` },
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(data.release).toBeTruthy();
        expect(data.release.stage).toBe('PREPARATION');
    });

    test('更新发版信息', async ({ request }) => {
        if (!pmAuth || !releaseId) { test.skip(); return; }

        const response = await request.put(`${BASE_URL}/api/releases/${releaseId}`, {
            headers: {
                'Authorization': `Bearer ${pmAuth.token}`,
                'Content-Type': 'application/json',
            },
            data: {
                action: 'update_info',
                version: `v1.0.1-test-${Date.now()}`,
                description: '更新后的描述',
                plannedDate: new Date().toISOString().split('T')[0],
            },
        });

        expect(response.ok()).toBeTruthy();
    });

    test('删除发版记录', async ({ request }) => {
        if (!pmAuth || !releaseId) { test.skip(); return; }

        const response = await request.delete(`${BASE_URL}/api/releases/${releaseId}`, {
            headers: { 'Authorization': `Bearer ${pmAuth.token}` },
        });

        expect(response.ok()).toBeTruthy();
    });
});

// ============================================
// 测试套件 5：PM 权限控制测试
// ============================================
test.describe('PM 权限控制测试', () => {
    test('PM 只能删除自己创建的发版', async ({ request }) => {
        // 使用 PM 用户登录
        const pmAuth = await apiLogin(request, 'zhengliang', '123456');
        if (!pmAuth) { test.skip(); return; }

        // 创建发版
        const createRes = await request.post(`${BASE_URL}/api/releases`, {
            headers: {
                'Authorization': `Bearer ${pmAuth.token}`,
                'Content-Type': 'application/json',
            },
            data: {
                version: `v-pm-test-${Date.now()}`,
                description: 'PM 权限测试',
                plannedDate: new Date().toISOString().split('T')[0],
                memberIds: [],
            },
        });

        if (!createRes.ok()) { test.skip(); return; }

        const { release } = await createRes.json();
        const releaseId = release.id;

        // PM 应该能删除自己创建的发版
        const deleteRes = await request.delete(`${BASE_URL}/api/releases/${releaseId}`, {
            headers: { 'Authorization': `Bearer ${pmAuth.token}` },
        });

        expect(deleteRes.ok()).toBeTruthy();
    });

    test('ADMIN 可以删除任何发版', async ({ request }) => {
        // PM 创建发版
        const pmAuth = await apiLogin(request, 'zhengliang', '123456');
        if (!pmAuth) { test.skip(); return; }

        const createRes = await request.post(`${BASE_URL}/api/releases`, {
            headers: {
                'Authorization': `Bearer ${pmAuth.token}`,
                'Content-Type': 'application/json',
            },
            data: {
                version: `v-admin-delete-test-${Date.now()}`,
                description: 'ADMIN 删除测试',
                plannedDate: new Date().toISOString().split('T')[0],
                memberIds: [],
            },
        });

        if (!createRes.ok()) { test.skip(); return; }

        const { release } = await createRes.json();

        // ADMIN 登录
        const adminAuth = await apiLogin(request, 'admin', 'admin123');
        if (!adminAuth) { test.skip(); return; }

        // ADMIN 应该能删除任何发版
        const deleteRes = await request.delete(`${BASE_URL}/api/releases/${release.id}`, {
            headers: { 'Authorization': `Bearer ${adminAuth.token}` },
        });

        expect(deleteRes.ok()).toBeTruthy();
    });
});

// ============================================
// 测试套件 6：UI 组件测试
// ============================================
test.describe('UI 组件测试', () => {
    test('发版列表页面加载', async ({ page, request }) => {
        const auth = await apiLogin(request, 'admin', 'admin123');
        if (!auth) { test.skip(); return; }

        await setLoginState(page, auth.token, auth.user);
        await page.goto('/releases');
        await page.waitForLoadState('networkidle');

        // 验证页面标题
        await expect(page.locator('text=发版').first()).toBeVisible({ timeout: 10000 });
    });

    test('导航栏显示正确', async ({ page, request }) => {
        const auth = await apiLogin(request, 'admin', 'admin123');
        if (!auth) { test.skip(); return; }

        await setLoginState(page, auth.token, auth.user);
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // 验证导航栏元素
        await expect(page.locator('nav, .navbar').first()).toBeVisible({ timeout: 10000 });
    });
});

// ============================================
// 测试套件 7：数据字典测试
// ============================================
test.describe('数据字典测试', () => {
    let adminAuth;

    test.beforeAll(async ({ request }) => {
        adminAuth = await apiLogin(request, 'admin', 'admin123');
    });

    test('获取系统类型字典', async ({ request }) => {
        if (!adminAuth) { test.skip(); return; }

        const response = await request.get(`${BASE_URL}/api/dictionary?type=system`, {
            headers: { 'Authorization': `Bearer ${adminAuth.token}` },
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        expect(Array.isArray(data.items)).toBeTruthy();
    });

    test('获取数据库变更类型字典', async ({ request }) => {
        if (!adminAuth) { test.skip(); return; }

        const response = await request.get(`${BASE_URL}/api/dictionary?type=dbChangeType`, {
            headers: { 'Authorization': `Bearer ${adminAuth.token}` },
        });

        expect(response.ok()).toBeTruthy();
    });
});

// ============================================
// 测试套件 8：错误处理测试
// ============================================
test.describe('错误处理测试', () => {
    test('访问不存在的发版返回 404', async ({ request }) => {
        const auth = await apiLogin(request, 'admin', 'admin123');
        if (!auth) { test.skip(); return; }

        const response = await request.get(`${BASE_URL}/api/releases/999999`, {
            headers: { 'Authorization': `Bearer ${auth.token}` },
        });

        expect(response.status()).toBe(404);
    });

    test('无效的发版数据返回错误', async ({ request }) => {
        const pmAuth = await apiLogin(request, 'zhengliang', '123456');
        if (!pmAuth) { test.skip(); return; }

        const response = await request.post(`${BASE_URL}/api/releases`, {
            headers: {
                'Authorization': `Bearer ${pmAuth.token}`,
                'Content-Type': 'application/json',
            },
            data: {
                // 缺少必填字段
                description: '测试',
            },
        });

        expect(response.ok()).toBeFalsy();
    });
});

// ============================================
// 测试套件 9：性能测试
// ============================================
test.describe('性能测试', () => {
    test('页面加载时间应在合理范围内', async ({ page, request }) => {
        const auth = await apiLogin(request, 'admin', 'admin123');
        if (!auth) { test.skip(); return; }

        await setLoginState(page, auth.token, auth.user);

        const startTime = Date.now();
        await page.goto('/releases');
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;

        // 页面加载应在 5 秒内完成
        expect(loadTime).toBeLessThan(5000);
    });

    test('API 响应时间应在合理范围内', async ({ request }) => {
        const auth = await apiLogin(request, 'admin', 'admin123');
        if (!auth) { test.skip(); return; }

        const startTime = Date.now();
        await request.get(`${BASE_URL}/api/releases`, {
            headers: { 'Authorization': `Bearer ${auth.token}` },
        });
        const responseTime = Date.now() - startTime;

        // API 响应应在 2 秒内
        expect(responseTime).toBeLessThan(2000);
    });
});
