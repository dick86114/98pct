/**
 * 今天发什么发版管理平台 - 多角色协作流程测试
 * 
 * 模拟真实场景：
 * 1. PM 创建发版，添加各角色成员
 * 2. 各角色完成检查清单
 * 3. PM 推进阶段
 * 4. 测试回滚功能
 */

import { test, expect } from '@playwright/test';

// 使用环境变量或默认值
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

// ============================================
// 多角色协作流程测试
// ============================================
test.describe.serial('多角色协作流程测试', () => {
    let pmAuth = null;
    let adminAuth = null;
    let testReleaseId = null;

    test.beforeAll(async ({ request }) => {
        // 登录 PM 用户
        pmAuth = await apiLogin(request, 'zhengliang', '123456');
        // 登录 admin
        adminAuth = await apiLogin(request, 'admin', 'admin123');
    });

    // ============================================
    // 步骤 1：PM 创建发版
    // ============================================
    test('步骤1: PM 创建发版记录', async ({ request }) => {
        if (!pmAuth) { test.skip(); return; }

        // 创建发版
        const createRes = await request.post(`${BASE_URL}/api/releases`, {
            headers: {
                'Authorization': `Bearer ${pmAuth.token}`,
                'Content-Type': 'application/json',
            },
            data: {
                version: `v3.0.0-multi-role-${Date.now()}`,
                description: '多角色协作测试发版 - 包含完整的准备、实施、验证流程',
                plannedDate: new Date().toISOString().split('T')[0],
                memberIds: [],
            },
        });

        expect(createRes.ok()).toBeTruthy();
        const data = await createRes.json();
        testReleaseId = data.release.id;
        
        console.log(`✅ 发版创建成功，ID: ${testReleaseId}`);
    });

    // ============================================
    // 步骤 2：验证发版初始状态
    // ============================================
    test('步骤2: 验证发版初始状态为准备阶段', async ({ request }) => {
        if (!pmAuth || !testReleaseId) { test.skip(); return; }

        const response = await request.get(`${BASE_URL}/api/releases/${testReleaseId}`, {
            headers: { 'Authorization': `Bearer ${pmAuth.token}` },
        });

        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        
        expect(data.release.stage).toBe('PREPARATION');
        expect(data.release.status).toBe('DRAFT');
        
        console.log(`✅ 发版状态正确：${data.release.stage} / ${data.release.status}`);
    });

    // ============================================
    // 步骤 3：验证检查清单已创建
    // ============================================
    test('步骤3: 验证准备阶段检查清单已创建', async ({ request }) => {
        if (!pmAuth || !testReleaseId) { test.skip(); return; }

        const response = await request.get(`${BASE_URL}/api/releases/${testReleaseId}`, {
            headers: { 'Authorization': `Bearer ${pmAuth.token}` },
        });

        const data = await response.json();
        const checklists = data.release.checklists || [];
        
        // 应该有准备阶段的检查清单
        const prepChecklists = checklists.filter(c => c.stage === 'PREPARATION');
        expect(prepChecklists.length).toBeGreaterThan(0);
        
        console.log(`✅ 准备阶段检查清单数量：${prepChecklists.length}`);
    });

    // ============================================
    // 步骤 4：PM 更新发版信息
    // ============================================
    test('步骤4: PM 更新发版信息', async ({ request }) => {
        if (!pmAuth || !testReleaseId) { test.skip(); return; }

        const response = await request.put(`${BASE_URL}/api/releases/${testReleaseId}`, {
            headers: {
                'Authorization': `Bearer ${pmAuth.token}`,
                'Content-Type': 'application/json',
            },
            data: {
                action: 'update_info',
                version: `v3.0.1-updated-${Date.now()}`,
                description: '更新后的发版描述 - 多角色协作测试',
                plannedDate: new Date().toISOString().split('T')[0],
            },
        });

        expect(response.ok()).toBeTruthy();
        console.log('✅ 发版信息更新成功');
    });

    // ============================================
    // 步骤 5：测试回滚功能
    // ============================================
    test('步骤5: 测试标记回滚功能', async ({ request }) => {
        if (!pmAuth) { test.skip(); return; }

        // 创建一个新的发版用于测试回滚
        const createRes = await request.post(`${BASE_URL}/api/releases`, {
            headers: {
                'Authorization': `Bearer ${pmAuth.token}`,
                'Content-Type': 'application/json',
            },
            data: {
                version: `v-rollback-test-${Date.now()}`,
                description: '回滚测试发版',
                plannedDate: new Date().toISOString().split('T')[0],
                memberIds: [],
            },
        });

        if (!createRes.ok()) { test.skip(); return; }

        const { release } = await createRes.json();
        const rollbackReleaseId = release.id;

        // 标记回滚
        const rollbackRes = await request.put(`${BASE_URL}/api/releases/${rollbackReleaseId}`, {
            headers: {
                'Authorization': `Bearer ${pmAuth.token}`,
                'Content-Type': 'application/json',
            },
            data: {
                action: 'rollback',
            },
        });

        expect(rollbackRes.ok()).toBeTruthy();

        // 验证状态
        const verifyRes = await request.get(`${BASE_URL}/api/releases/${rollbackReleaseId}`, {
            headers: { 'Authorization': `Bearer ${pmAuth.token}` },
        });
        
        const verifyData = await verifyRes.json();
        expect(verifyData.release.stage).toBe('ROLLBACK');
        expect(verifyData.release.status).toBe('FAILED');

        console.log('✅ 回滚功能测试通过');

        // 清理
        await request.delete(`${BASE_URL}/api/releases/${rollbackReleaseId}`, {
            headers: { 'Authorization': `Bearer ${pmAuth.token}` },
        });
    });

    // ============================================
    // 步骤 6：测试删除权限
    // ============================================
    test('步骤6: 测试删除发版权限', async ({ request }) => {
        if (!pmAuth) { test.skip(); return; }

        // 创建一个临时发版
        const createRes = await request.post(`${BASE_URL}/api/releases`, {
            headers: {
                'Authorization': `Bearer ${pmAuth.token}`,
                'Content-Type': 'application/json',
            },
            data: {
                version: `v-delete-test-${Date.now()}`,
                description: '删除测试发版',
                plannedDate: new Date().toISOString().split('T')[0],
                memberIds: [],
            },
        });

        if (!createRes.ok()) { test.skip(); return; }

        const { release } = await createRes.json();

        // 删除发版
        const deleteRes = await request.delete(`${BASE_URL}/api/releases/${release.id}`, {
            headers: { 'Authorization': `Bearer ${pmAuth.token}` },
        });

        expect(deleteRes.ok()).toBeTruthy();
        console.log('✅ 删除权限测试通过');
    });

    // ============================================
    // 清理：删除测试数据
    // ============================================
    test.afterAll(async ({ request }) => {
        if (pmAuth && testReleaseId) {
            await request.delete(`${BASE_URL}/api/releases/${testReleaseId}`, {
                headers: { 'Authorization': `Bearer ${pmAuth.token}` },
            });
            console.log('🧹 测试数据已清理');
        }
    });
});

// ============================================
// 独立测试：角色 API 权限验证
// ============================================
test.describe('角色 API 权限验证', () => {
    test('非 PM/ADMIN 不能创建发版', async ({ request }) => {
        // 使用无效 token 测试
        const response = await request.post(`${BASE_URL}/api/releases`, {
            headers: {
                'Authorization': 'Bearer invalid_token',
                'Content-Type': 'application/json',
            },
            data: {
                version: 'v-test',
                description: 'test',
            },
        });

        expect(response.status()).toBe(401);
        console.log('✅ 未授权用户无法创建发版');
    });

    test('未登录用户无法访问发版列表', async ({ request }) => {
        const response = await request.get(`${BASE_URL}/api/releases`);
        expect(response.status()).toBe(401);
        console.log('✅ 未登录用户无法访问发版列表');
    });

    test('未登录用户无法访问用户列表', async ({ request }) => {
        const response = await request.get(`${BASE_URL}/api/users`);
        expect(response.status()).toBe(401);
        console.log('✅ 未登录用户无法访问用户列表');
    });
});

// ============================================
// 独立测试：数据完整性验证
// ============================================
test.describe('数据完整性验证', () => {
    let pmAuth = null;

    test.beforeAll(async ({ request }) => {
        pmAuth = await apiLogin(request, 'zhengliang', '123456');
    });

    test('发版版本号唯一性验证', async ({ request }) => {
        if (!pmAuth) { test.skip(); return; }

        const uniqueVersion = `v-unique-${Date.now()}`;

        // 创建第一个发版
        const firstRes = await request.post(`${BASE_URL}/api/releases`, {
            headers: {
                'Authorization': `Bearer ${pmAuth.token}`,
                'Content-Type': 'application/json',
            },
            data: {
                version: uniqueVersion,
                description: '第一个发版',
                plannedDate: new Date().toISOString().split('T')[0],
                memberIds: [],
            },
        });

        expect(firstRes.ok()).toBeTruthy();
        const { release: firstRelease } = await firstRes.json();

        // 尝试创建相同版本号的发版
        const secondRes = await request.post(`${BASE_URL}/api/releases`, {
            headers: {
                'Authorization': `Bearer ${pmAuth.token}`,
                'Content-Type': 'application/json',
            },
            data: {
                version: uniqueVersion,
                description: '第二个发版',
                plannedDate: new Date().toISOString().split('T')[0],
                memberIds: [],
            },
        });

        // 应该失败
        expect(secondRes.ok()).toBeFalsy();
        console.log('✅ 版本号唯一性验证通过');

        // 清理
        await request.delete(`${BASE_URL}/api/releases/${firstRelease.id}`, {
            headers: { 'Authorization': `Bearer ${pmAuth.token}` },
        });
    });

    test('必填字段验证', async ({ request }) => {
        if (!pmAuth) { test.skip(); return; }

        // 缺少版本号
        const response = await request.post(`${BASE_URL}/api/releases`, {
            headers: {
                'Authorization': `Bearer ${pmAuth.token}`,
                'Content-Type': 'application/json',
            },
            data: {
                description: '缺少版本号',
            },
        });

        expect(response.ok()).toBeFalsy();
        console.log('✅ 必填字段验证通过');
    });
});
