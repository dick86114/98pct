import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest, hashPassword, hasRole } from '@/lib/auth';

// 更新用户信息
export async function PUT(request, { params }) {
    try {
        const decoded = getUserFromRequest(request);
        if (!decoded) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const { id } = await params;
        const userId = parseInt(id);
        const data = await request.json();

        // 权限检查：必须是超级管理员或者是用户本人
        const isAdmin = hasRole(decoded.role, 'ADMIN');
        if (!isAdmin && decoded.userId !== userId) {
            return NextResponse.json({ error: '无权操作' }, { status: 403 });
        }

        // 如果尝试修改角色，必须是超级管理员
        if (data.role && !isAdmin) {
            return NextResponse.json({ error: '无权修改角色' }, { status: 403 });
        }

        const updateData = {};
        
        // 用户名处理
        if (data.username !== undefined) {
            if (!data.username || !data.username.trim()) {
                return NextResponse.json({ error: '用户名为必填项' }, { status: 400 });
            }
            // 检查用户名是否已被其他用户使用
            const existingUser = await prisma.user.findFirst({
                where: {
                    username: data.username,
                    NOT: { id: userId }
                }
            });
            if (existingUser) {
                return NextResponse.json({ error: '该用户名已被使用' }, { status: 400 });
            }
            updateData.username = data.username;
        }
        
        if (data.name) updateData.name = data.name;
        if (data.email) updateData.email = data.email;
        
        // 手机号必填验证
        if (data.phone !== undefined) {
            if (!data.phone || !data.phone.trim()) {
                return NextResponse.json({ error: '手机号为必填项' }, { status: 400 });
            }
            const phoneRegex = /^1[3-9]\d{9}$/;
            if (!phoneRegex.test(data.phone)) {
                return NextResponse.json({ error: '请输入有效的手机号' }, { status: 400 });
            }
            updateData.phone = data.phone;
        }

        // 处理角色更新
        if (data.role) {
            let roleArray = Array.isArray(data.role) ? data.role : [data.role];
            roleArray = roleArray.filter(r => r && r.trim() !== '');

            const validRoles = ['ADMIN', 'PM', 'RD', 'QA', 'PO', 'DBA', 'OP'];
            if (!roleArray.every(r => validRoles.includes(r))) {
                return NextResponse.json({ error: '包含无效角色' }, { status: 400 });
            }
            updateData.role = roleArray.join(',');
        }

        // 如果修改密码
        if (data.password) {
            updateData.password = await hashPassword(data.password);
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                username: true,
                email: true,
                name: true,
                phone: true,
                role: true,
            },
        });

        return NextResponse.json({
            message: '更新成功',
            user,
        });
    } catch (error) {
        console.error('Update user error:', error);
        return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }
}

// 删除用户 (仅超级管理员)
export async function DELETE(request, { params }) {
    try {
        const decoded = getUserFromRequest(request);
        if (!decoded) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        if (!hasRole(decoded.role, 'ADMIN')) {
            return NextResponse.json({ error: '无权操作' }, { status: 403 });
        }

        const { id } = await params;
        const userId = parseInt(id);

        // 不能删除自己
        if (userId === decoded.userId) {
            return NextResponse.json({ error: '不能删除自己' }, { status: 400 });
        }

        await prisma.user.delete({
            where: { id: userId },
        });

        return NextResponse.json({ message: '删除成功' });
    } catch (error) {
        console.error('Delete user error:', error);
        return NextResponse.json({ error: '删除失败，可能用户存在关联数据' }, { status: 500 });
    }
}
