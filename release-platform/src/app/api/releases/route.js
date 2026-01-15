import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { getAllChecklists } from '@/lib/constants';

// 获取发版列表
export async function GET(request) {
    try {
        const decoded = getUserFromRequest(request);
        if (!decoded) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const stage = searchParams.get('stage');

        const where = {};
        if (status) where.status = status;
        if (stage) where.stage = stage;

        // 检查用户角色
        const userRoles = (decoded.role || '').split(',');
        const isAdmin = userRoles.includes('ADMIN');
        const isPM = userRoles.includes('PM');

        // ADMIN 可以看到所有发版记录
        // PM 只能看到自己创建的或参与的发版记录
        // 其他角色只能看到自己参与的
        if (!isAdmin) {
            if (isPM) {
                // PM 只能看到自己创建的或参与的
                where.OR = [
                    { createdById: decoded.userId },
                    { members: { some: { userId: decoded.userId } } }
                ];
            } else {
                // 其他角色只能看到自己参与的
                where.OR = [
                    { createdById: decoded.userId },
                    { members: { some: { userId: decoded.userId } } }
                ];
            }
        }

        const releases = await prisma.release.findMany({
            where,
            include: {
                createdBy: {
                    select: { id: true, name: true, role: true },
                },
                _count: {
                    select: { checklists: true, documents: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ releases });
    } catch (error) {
        console.error('Get releases error:', error);
        return NextResponse.json({ error: '获取发版列表失败' }, { status: 500 });
    }
}

// 创建发版申请
// 创建发版申请 (PM Only)
export async function POST(request) {
    try {
        const decoded = getUserFromRequest(request);
        if (!decoded) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const data = await request.json();
        const { version, description, plannedDate, memberIds } = data; // memberIds is an array of user IDs

        // 验证基本字段
        if (!version || !description) {
            return NextResponse.json(
                { error: '版本号和描述为必填项' },
                { status: 400 }
            );
        }

        // Role check: Only PM
        const userRoles = (decoded.role || '').split(',');
        if (!userRoles.includes('PM')) {
            return NextResponse.json(
                { error: '只有项目经理(PM)可以创建发版申请' },
                { status: 403 }
            );
        }

        // 检查版本号是否已存在
        const existing = await prisma.release.findUnique({
            where: { version },
        });

        if (existing) {
            return NextResponse.json(
                { error: '该版本号已存在' },
                { status: 400 }
            );
        }

        // 处理日期
        let parsedDate = null;
        if (plannedDate) {
            const date = new Date(plannedDate);
            if (!isNaN(date.getTime())) {
                parsedDate = date;
            }
        }

        // 创建发版记录
        const release = await prisma.release.create({
            data: {
                version,
                description,
                plannedDate: parsedDate,
                createdById: decoded.userId,
                stage: 'PREPARATION',
                status: 'DRAFT',
                // 初始化关联成员
                members: {
                    create: (memberIds || []).map(userId => ({
                        userId: Number(userId)
                    }))
                }
            },
            include: {
                createdBy: {
                    select: { id: true, name: true, role: true },
                },
                members: {
                    include: {
                        user: {
                            select: { id: true, name: true, role: true }
                        }
                    }
                }
            },
        });

        // 为每个成员以及创建者（如果是PM且需要参与）初始化检查清单项
        // 获取所有待初始化的用户ID列表（成员 + 创建者）
        const participantIds = Array.from(new Set([...(memberIds || []).map(id => Number(id)), decoded.userId]));
        const allChecklists = getAllChecklists();

        const checklistData = [];
        for (const userId of participantIds) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { role: true }
            });

            if (!user) continue;

            const userRoleList = (user.role || '').split(',');
            // 只为该用户角色对应的检查项创建记录
            // 每个用户只能看到和操作自己角色相关的检查项
            const relevantItems = allChecklists.filter(item =>
                item.roles.some(r => userRoleList.includes(r))
            );

            relevantItems.forEach(item => {
                checklistData.push({
                    releaseId: release.id,
                    userId: userId,
                    itemKey: item.key,
                    stage: item.stage,
                    checked: false,
                });
            });
        }

        if (checklistData.length > 0) {
            await prisma.checklist.createMany({
                data: checklistData,
            });
        }

        return NextResponse.json({
            message: '发版申请创建成功',
            release,
        });
    } catch (error) {
        console.error('Create release error:', error);
        return NextResponse.json(
            { error: error.message || '创建发版申请失败' },
            { status: 500 }
        );
    }
}
