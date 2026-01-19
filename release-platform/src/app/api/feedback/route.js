import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

// 获取反馈列表（管理员查看所有，普通用户查看自己的）
export async function GET(request) {
    try {
        const decoded = getUserFromRequest(request);
        if (!decoded) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const userRoles = (decoded.role || '').split(',');
        const isAdmin = userRoles.includes('ADMIN');

        let feedbacks;
        if (isAdmin) {
            // 管理员查看所有反馈
            feedbacks = await prisma.feedback.findMany({
                include: {
                    user: {
                        select: { id: true, name: true, email: true, phone: true, role: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
        } else {
            // 普通用户只能查看自己的反馈
            feedbacks = await prisma.feedback.findMany({
                where: { userId: decoded.userId },
                include: {
                    user: {
                        select: { id: true, name: true, email: true, phone: true, role: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
        }

        return NextResponse.json(feedbacks);
    } catch (error) {
        console.error('Get feedbacks error:', error);
        return NextResponse.json({ error: '获取反馈列表失败' }, { status: 500 });
    }
}

// 提交新反馈
export async function POST(request) {
    try {
        const decoded = getUserFromRequest(request);
        if (!decoded) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const { type, title, content } = await request.json();

        if (!type || !title || !content) {
            return NextResponse.json({ error: '请填写完整的反馈信息' }, { status: 400 });
        }

        const feedback = await prisma.feedback.create({
            data: {
                userId: decoded.userId,
                type,
                title,
                content,
                status: 'pending'
            },
            include: {
                user: {
                    select: { id: true, name: true, email: true, phone: true, role: true }
                }
            }
        });

        return NextResponse.json({ message: '反馈提交成功', feedback });
    } catch (error) {
        console.error('Create feedback error:', error);
        return NextResponse.json({ error: '提交反馈失败' }, { status: 500 });
    }
}
