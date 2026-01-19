import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, generateToken, getUserFromRequest, hasRole } from '@/lib/auth';

export async function POST(request) {
    try {
        const { username, email, password, name, phone, role } = await request.json();

        // 验证必填字段
        if (!username || !email || !password || !name || !phone || !role) {
            return NextResponse.json(
                { error: '请填写所有必填字段（包括用户名和手机号）' },
                { status: 400 }
            );
        }

        // 验证手机号格式
        const phoneRegex = /^1[3-9]\d{9}$/;
        if (!phoneRegex.test(phone)) {
            return NextResponse.json(
                { error: '请输入有效的手机号' },
                { status: 400 }
            );
        }

        // 处理角色：支持数组或单个字符串
        let roleArray = Array.isArray(role) ? role : [role];
        // 过滤空值
        roleArray = roleArray.filter(r => r && r.trim() !== '');

        if (roleArray.length === 0) {
            return NextResponse.json(
                { error: '请至少选择一个角色' },
                { status: 400 }
            );
        }

        // 验证角色有效性
        const validRoles = ['ADMIN', 'LD', 'PM', 'RD', 'QA', 'PO', 'DBA', 'OP'];
        const invalidRoles = roleArray.filter(r => !validRoles.includes(r));

        if (invalidRoles.length > 0) {
            return NextResponse.json(
                { error: `包含无效的角色: ${invalidRoles.join(', ')}` },
                { status: 400 }
            );
        }

        // 转换为存储格式（逗号分隔）
        const roleString = roleArray.join(',');

        // --- 权限控制变更 Start ---
        // 检查是否允许注册：
        // 1. 系统中无任何用户（初始化模式）
        // 2. 当前请求者是 ADMIN（超级管理员模式）

        const userCount = await prisma.user.count();
        let isAllowed = false;

        if (userCount === 0) {
            isAllowed = true;
        } else {
            const currentUser = getUserFromRequest(request);

            // 使用 hasRole 检查权限，只有 ADMIN 可以添加用户
            if (currentUser && hasRole(currentUser.role, 'ADMIN')) {
                isAllowed = true;
            }
        }

        if (!isAllowed) {
            return NextResponse.json(
                { error: '仅允许超级管理员添加新用户，或系统初始化时注册' },
                { status: 403 }
            );
        }
        // --- 权限控制变更 End ---

        // 检查用户名是否已存在
        const existingUsername = await prisma.user.findUnique({
            where: { username },
        });

        if (existingUsername) {
            return NextResponse.json(
                { error: '该用户名已被使用' },
                { status: 400 }
            );
        }

        // 检查邮箱是否已存在
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: '该邮箱已被注册' },
                { status: 400 }
            );
        }

        // 检查手机号是否已存在
        const existingPhone = await prisma.user.findUnique({
            where: { phone },
        });

        if (existingPhone) {
            return NextResponse.json(
                { error: '该手机号已被注册' },
                { status: 400 }
            );
        }

        // 创建用户
        const hashedPassword = await hashPassword(password);
        const user = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                name,
                phone,
                role: roleString,
            },
        });

        // 生成 Token
        const token = generateToken(user);

        return NextResponse.json({
            message: '用户创建成功',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                name: user.name,
                phone: user.phone,
                role: user.role,
            },
            token,
        });
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { error: '注册失败，请稍后重试' },
            { status: 500 }
        );
    }
}
