import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

// 获取用户列表
// ADMIN: 可以查看所有用户（用于用户管理）
// PM: 可以查看非 ADMIN 用户（用于创建发版时选择成员）
export async function GET(request) {
    try {
        const decoded = getUserFromRequest(request);
        if (!decoded) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const userRoles = (decoded.role || '').split(',');
        const isAdmin = userRoles.includes('ADMIN');
        const isPM = userRoles.includes('PM');

        // 检查权限：ADMIN 或 PM 可以查看用户列表
        if (!isAdmin && !isPM) {
            return NextResponse.json({ error: '无权访问' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const role = searchParams.get('role');
        const forRelease = searchParams.get('forRelease'); // 用于创建发版时获取成员列表

        const where = {};
        if (role) where.role = role;

        // PM（非 ADMIN）只能通过 forRelease=true 获取用户列表（用于创建发版）
        // 访问用户管理页面时（无 forRelease 参数），只有 ADMIN 可以
        if (!isAdmin && forRelease !== 'true') {
            return NextResponse.json({ error: '无权访问' }, { status: 403 });
        }

        // 如果是通过 forRelease 获取成员列表，排除 ADMIN 角色
        if (forRelease === 'true' && !isAdmin) {
            where.NOT = {
                role: { contains: 'ADMIN' }
            };
        }

        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                username: true,
                email: true,
                name: true,
                phone: true,
                role: true,
                createdAt: true,
                _count: {
                    select: {
                        releases: true, // 创建的发版数量
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ users });
    } catch (error) {
        console.error('Get users error:', error);
        return NextResponse.json({ error: '获取用户列表失败' }, { status: 500 });
    }
}
