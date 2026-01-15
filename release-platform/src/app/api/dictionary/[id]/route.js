import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest, hasRole } from '@/lib/auth';

// 更新字典项
export async function PUT(request, { params }) {
    try {
        const decoded = getUserFromRequest(request);
        if (!decoded) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        if (!hasRole(decoded.role, 'ADMIN')) {
            return NextResponse.json({ error: '无权操作' }, { status: 403 });
        }

        const { id } = await params;
        const data = await request.json();

        const updateData = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
        if (data.enabled !== undefined) updateData.enabled = data.enabled;

        const item = await prisma.dictionary.update({
            where: { id: parseInt(id) },
            data: updateData,
        });

        return NextResponse.json({ message: '更新成功', item });
    } catch (error) {
        console.error('Update dictionary error:', error);
        return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }
}

// 删除字典项
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

        await prisma.dictionary.delete({
            where: { id: parseInt(id) },
        });

        return NextResponse.json({ message: '删除成功' });
    } catch (error) {
        console.error('Delete dictionary error:', error);
        return NextResponse.json({ error: '删除失败' }, { status: 500 });
    }
}
