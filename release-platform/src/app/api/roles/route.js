import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request) {
    try {
        const decoded = getUserFromRequest(request);
        if (!decoded) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const roles = await prisma.role.findMany({
            orderBy: { id: 'asc' },
        });

        return NextResponse.json({ roles });
    } catch (error) {
        console.error('Get roles error:', error);
        return NextResponse.json({ error: '获取角色信息失败' }, { status: 500 });
    }
}
