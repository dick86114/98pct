import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, getUserFromRequest, hasRole } from '@/lib/auth';

/**
 * 批量创建用户 API
 * POST /api/users/batch
 * 
 * 请求体格式：
 * {
 *   users: [
 *     { username: 'zhangsan', name: '张三', email: 'zhangsan@example.com', phone: '13800138001', role: 'RD', password: '123456' },
 *     { username: 'lisi', name: '李四', email: 'lisi@example.com', phone: '13800138002', role: 'QA,RD', password: '123456' },
 *   ]
 * }
 */
export async function POST(request) {
    try {
        // 验证权限：仅 PM 可以批量创建用户
        const currentUser = getUserFromRequest(request);
        if (!currentUser) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        if (!hasRole(currentUser.role, 'ADMIN')) {
            return NextResponse.json({ error: '仅超级管理员可以批量创建用户' }, { status: 403 });
        }

        const { users } = await request.json();

        if (!users || !Array.isArray(users) || users.length === 0) {
            return NextResponse.json({ error: '请提供用户列表' }, { status: 400 });
        }

        // 限制单次批量创建数量
        if (users.length > 50) {
            return NextResponse.json({ error: '单次最多创建 50 个用户' }, { status: 400 });
        }

        const validRoles = ['ADMIN', 'PM', 'RD', 'QA', 'PO', 'DBA', 'OP'];
        const phoneRegex = /^1[3-9]\d{9}$/;
        const results = [];
        const errors = [];

        // 预先检查所有用户名、邮箱和手机号是否已存在
        const usernames = users.map(u => u.username).filter(Boolean);
        const emails = users.map(u => u.email).filter(Boolean);
        const phones = users.map(u => u.phone).filter(Boolean);

        const existingUsernames = await prisma.user.findMany({
            where: { username: { in: usernames } },
            select: { username: true }
        });
        const existingEmails = await prisma.user.findMany({
            where: { email: { in: emails } },
            select: { email: true }
        });
        const existingPhones = await prisma.user.findMany({
            where: { phone: { in: phones } },
            select: { phone: true }
        });

        const existingUsernameSet = new Set(existingUsernames.map(u => u.username));
        const existingEmailSet = new Set(existingEmails.map(u => u.email));
        const existingPhoneSet = new Set(existingPhones.map(u => u.phone));

        // 检查批量数据中的重复
        const batchUsernameSet = new Set();
        const batchEmailSet = new Set();
        const batchPhoneSet = new Set();

        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            const rowNum = i + 1;

            // 验证必填字段
            if (!user.username || !user.name || !user.email || !user.phone || !user.role) {
                errors.push({ row: rowNum, error: '缺少必填字段（用户名、姓名、邮箱、手机号、角色）' });
                continue;
            }

            // 验证手机号格式
            if (!phoneRegex.test(user.phone)) {
                errors.push({ row: rowNum, name: user.name, error: '手机号格式不正确' });
                continue;
            }

            // 验证角色
            const roleArray = user.role.split(',').map(r => r.trim()).filter(Boolean);
            const invalidRoles = roleArray.filter(r => !validRoles.includes(r));
            if (invalidRoles.length > 0) {
                errors.push({ row: rowNum, name: user.name, error: `无效角色: ${invalidRoles.join(', ')}` });
                continue;
            }

            // 检查用户名是否已存在（数据库或本批次）
            if (existingUsernameSet.has(user.username) || batchUsernameSet.has(user.username)) {
                errors.push({ row: rowNum, name: user.name, error: `用户名 ${user.username} 已存在` });
                continue;
            }

            // 检查邮箱是否已存在（数据库或本批次）
            if (existingEmailSet.has(user.email) || batchEmailSet.has(user.email)) {
                errors.push({ row: rowNum, name: user.name, error: `邮箱 ${user.email} 已存在` });
                continue;
            }

            // 检查手机号是否已存在（数据库或本批次）
            if (existingPhoneSet.has(user.phone) || batchPhoneSet.has(user.phone)) {
                errors.push({ row: rowNum, name: user.name, error: `手机号 ${user.phone} 已存在` });
                continue;
            }

            batchUsernameSet.add(user.username);
            batchEmailSet.add(user.email);
            batchPhoneSet.add(user.phone);

            // 创建用户
            try {
                const password = user.password || '123456'; // 默认密码
                const hashedPassword = await hashPassword(password);

                const newUser = await prisma.user.create({
                    data: {
                        username: user.username,
                        name: user.name,
                        email: user.email,
                        phone: user.phone,
                        password: hashedPassword,
                        role: roleArray.join(','),
                    },
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        email: true,
                        phone: true,
                        role: true,
                    }
                });

                results.push({ row: rowNum, success: true, user: newUser });
            } catch (err) {
                errors.push({ row: rowNum, name: user.name, error: err.message });
            }
        }

        return NextResponse.json({
            message: `成功创建 ${results.length} 个用户，失败 ${errors.length} 个`,
            success: results,
            errors,
            total: users.length,
            successCount: results.length,
            errorCount: errors.length,
        });
    } catch (error) {
        console.error('Batch create users error:', error);
        return NextResponse.json({ error: '批量创建失败: ' + error.message }, { status: 500 });
    }
}
