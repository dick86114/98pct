import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request) {
    try {
        const decoded = getUserFromRequest(request);

        if (!decoded) {
            return NextResponse.json(
                { error: '未登录或登录已过期' },
                { status: 401 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                role: true,
                createdAt: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: '用户不存在' },
                { status: 404 }
            );
        }

        return NextResponse.json({ user });
    } catch (error) {
        console.error('Get user error:', error);
        return NextResponse.json(
            { error: '获取用户信息失败' },
            { status: 500 }
        );
    }
}
