import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

// 更新反馈（管理员回复或更新状态）
export async function PUT(request, { params }) {
    try {
        const decoded = getUserFromRequest(request);
        if (!decoded) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const userRoles = (decoded.role || '').split(',');
        const isAdmin = userRoles.includes('ADMIN');

        if (!isAdmin) {
            return NextResponse.json({ error: '只有管理员可以回复反馈' }, { status: 403 });
        }

        const { id } = await params;
        const feedbackId = parseInt(id);
        const { status, adminReply } = await request.json();

        const feedback = await prisma.feedback.update({
            where: { id: feedbackId },
            data: {
                status: status || undefined,
                adminReply: adminReply || undefined
            },
            include: {
                user: {
                    select: { id: true, name: true, email: true, phone: true, role: true }
                }
            }
        });

        return NextResponse.json({ message: '反馈更新成功', feedback });
    } catch (error) {
        console.error('Update feedback error:', error);
        return NextResponse.json({ error: '更新反馈失败' }, { status: 500 });
    }
}

// 删除反馈（管理员）
export async function DELETE(request, { params }) {
    try {
        const decoded = getUserFromRequest(request);
        if (!decoded) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const userRoles = (decoded.role || '').split(',');
        const isAdmin = userRoles.includes('ADMIN');

        if (!isAdmin) {
            return NextResponse.json({ error: '只有管理员可以删除反馈' }, { status: 403 });
        }

        const { id } = await params;
        const feedbackId = parseInt(id);

        await prisma.feedback.delete({
            where: { id: feedbackId }
        });

        return NextResponse.json({ message: '反馈删除成功' });
    } catch (error) {
        console.error('Delete feedback error:', error);
        return NextResponse.json({ error: '删除反馈失败' }, { status: 500 });
    }
}
