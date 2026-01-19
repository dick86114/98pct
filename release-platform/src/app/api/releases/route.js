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
        const isLeader = userRoles.includes('LD');
        const isPM = userRoles.includes('PM');

        // ADMIN 和 LD 可以看到所有发版记录
        // PM 只能看到自己创建的或参与的发版记录
        // 其他角色只能看到自己参与的
        if (!isAdmin && !isLeader) {
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
        // 支持新格式 members: [{ userId, role }] 和旧格式 memberIds: [userId]
        const { projectName, version, description, plannedDate, releaseType, impactScope, downtime, members, memberIds } = data;
        
        // 兼容处理：如果是旧格式 memberIds，转换为新格式
        let memberList = members || [];
        if (!members && memberIds) {
            // 旧格式：需要查询用户角色
            for (const userId of memberIds) {
                const user = await prisma.user.findUnique({
                    where: { id: Number(userId) },
                    select: { role: true }
                });
                if (user) {
                    // 使用用户的第一个非 ADMIN 角色
                    const roles = (user.role || '').split(',').filter(r => r && r !== 'ADMIN');
                    memberList.push({ userId: Number(userId), role: roles[0] || 'RD' });
                }
            }
        }

        // 验证基本字段
        if (!projectName || !version || !description) {
            return NextResponse.json(
                { error: '项目名称、版本号和描述为必填项' },
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

        // 验证并过滤成员数据
        const validMembers = memberList.filter(m => m && m.userId && m.role);
        
        console.log('Creating release with members:', validMembers);

        // 创建发版记录
        const release = await prisma.release.create({
            data: {
                projectName,
                version,
                description,
                plannedDate: parsedDate,
                releaseType: releaseType || null,
                impactScope: impactScope || null,
                downtime: downtime ? parseInt(downtime) : null,
                createdById: decoded.userId,
                stage: 'PREPARATION',
                status: 'DRAFT',
                // 初始化关联成员，包含角色信息
                members: {
                    create: validMembers.map(m => ({
                        userId: Number(m.userId),
                        role: String(m.role)
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

        // 为每个成员以及创建者初始化检查清单项
        // 创建者作为 PM 参与
        const allChecklists = getAllChecklists();
        const checklistData = [];
        
        // 为创建者（PM）创建检查清单
        const pmItems = allChecklists.filter(item => item.roles.includes('PM'));
        pmItems.forEach(item => {
            checklistData.push({
                releaseId: release.id,
                userId: decoded.userId,
                itemKey: item.key,
                stage: item.stage,
                checked: false,
            });
        });

        // 为每个成员根据其在该发版中的角色创建检查清单
        for (const member of validMembers) {
            const memberRole = member.role;
            if (!memberRole) continue;
            
            // 只为该成员在该发版中的角色创建检查项
            const relevantItems = allChecklists.filter(item =>
                item.roles.includes(memberRole)
            );

            relevantItems.forEach(item => {
                // 避免重复（如果成员也是创建者）
                if (Number(member.userId) === decoded.userId && item.roles.includes('PM')) {
                    return;
                }
                checklistData.push({
                    releaseId: release.id,
                    userId: Number(member.userId),
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
