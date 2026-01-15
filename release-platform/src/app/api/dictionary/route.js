import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest, hasRole } from '@/lib/auth';

// 获取字典列表
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');

        const where = {};
        if (type) where.type = type;

        const items = await prisma.dictionary.findMany({
            where,
            orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
        });

        return NextResponse.json({ items });
    } catch (error) {
        console.error('Get dictionary error:', error);
        return NextResponse.json({ error: '获取字典失败' }, { status: 500 });
    }
}

// 创建字典项（仅超级管理员）
export async function POST(request) {
    try {
        const decoded = getUserFromRequest(request);
        if (!decoded) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        if (!hasRole(decoded.role, 'ADMIN')) {
            return NextResponse.json({ error: '无权操作' }, { status: 403 });
        }

        const { type, code, name, sortOrder } = await request.json();

        if (!type || !code || !name) {
            return NextResponse.json({ error: '类型、编码和名称为必填项' }, { status: 400 });
        }

        // 检查是否已存在
        const existing = await prisma.dictionary.findUnique({
            where: { type_code: { type, code } },
        });

        if (existing) {
            return NextResponse.json({ error: '该字典项已存在' }, { status: 400 });
        }

        const item = await prisma.dictionary.create({
            data: {
                type,
                code,
                name,
                sortOrder: sortOrder || 0,
            },
        });

        return NextResponse.json({ message: '创建成功', item });
    } catch (error) {
        console.error('Create dictionary error:', error);
        return NextResponse.json({ error: '创建失败' }, { status: 500 });
    }
}
