import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// 获取当前用户信息
export async function GET(request) {
    try {
        const decoded = getUserFromRequest(request);
        if (!decoded) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                username: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                createdAt: true,
            }
        });

        if (!user) {
            return NextResponse.json({ error: '用户不存在' }, { status: 404 });
        }

        return NextResponse.json({ user });
    } catch (error) {
        console.error('Get profile error:', error);
        return NextResponse.json({ error: '获取用户信息失败' }, { status: 500 });
    }
}

// 更新当前用户信息（仅限邮箱、手机号、密码）
export async function PUT(request) {
    try {
        const decoded = getUserFromRequest(request);
        if (!decoded) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const data = await request.json();
        const { email, phone, password, currentPassword } = data;

        // 获取当前用户
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId }
        });

        if (!user) {
            return NextResponse.json({ error: '用户不存在' }, { status: 404 });
        }

        // 构建更新数据
        const updateData = {};

        // 更新邮箱
        if (email !== undefined) {
            if (!email || !email.includes('@')) {
                return NextResponse.json({ error: '请输入有效的邮箱地址' }, { status: 400 });
            }
            // 检查邮箱是否已被其他用户使用
            const existingEmail = await prisma.user.findFirst({
                where: { 
                    email,
                    NOT: { id: decoded.userId }
                }
            });
            if (existingEmail) {
                return NextResponse.json({ error: '该邮箱已被使用' }, { status: 400 });
            }
            updateData.email = email;
        }

        // 更新手机号
        if (phone !== undefined) {
            updateData.phone = phone;
        }

        // 更新密码
        if (password) {
            // 验证当前密码
            if (!currentPassword) {
                return NextResponse.json({ error: '请输入当前密码' }, { status: 400 });
            }
            const isValidPassword = await bcrypt.compare(currentPassword, user.password);
            if (!isValidPassword) {
                return NextResponse.json({ error: '当前密码错误' }, { status: 400 });
            }
            if (password.length < 6) {
                return NextResponse.json({ error: '新密码长度至少6位' }, { status: 400 });
            }
            updateData.password = await bcrypt.hash(password, 12);
        }

        // 执行更新
        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: '没有需要更新的内容' }, { status: 400 });
        }

        const updatedUser = await prisma.user.update({
            where: { id: decoded.userId },
            data: updateData,
            select: {
                id: true,
                username: true,
                name: true,
                email: true,
                phone: true,
                role: true,
            }
        });

        return NextResponse.json({ 
            message: '个人信息更新成功',
            user: updatedUser 
        });
    } catch (error) {
        console.error('Update profile error:', error);
        return NextResponse.json({ error: '更新个人信息失败' }, { status: 500 });
    }
}
