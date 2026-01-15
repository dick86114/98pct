import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest, canConfirmChecklist } from '@/lib/auth';
import { PREPARATION_CHECKLIST, IMPLEMENTATION_CHECKLIST, VERIFICATION_CHECKLIST } from '@/lib/constants';

// 获取所有检查清单项的配置
function getChecklistConfig(itemKey) {
    const allItems = [
        ...PREPARATION_CHECKLIST,
        ...IMPLEMENTATION_CHECKLIST,
        ...VERIFICATION_CHECKLIST,
    ];
    return allItems.find(item => item.key === itemKey);
}

// 获取发版的检查清单状态
export async function GET(request, { params }) {
    try {
        const decoded = getUserFromRequest(request);
        if (!decoded) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const { id } = await params;
        const releaseId = parseInt(id);

        const checklists = await prisma.checklist.findMany({
            where: { releaseId },
            include: {
                confirmedBy: {
                    select: { id: true, name: true, role: true },
                },
            },
            orderBy: { id: 'asc' },
        });

        // 添加配置信息
        const enrichedChecklists = checklists.map(item => {
            const config = getChecklistConfig(item.itemKey);
            return {
                ...item,
                label: config?.label || item.itemKey,
                allowedRoles: config?.roles || [],
            };
        });

        return NextResponse.json({ checklists: enrichedChecklists });
    } catch (error) {
        console.error('Get checklist error:', error);
        return NextResponse.json({ error: '获取检查清单失败' }, { status: 500 });
    }
}

// 确认检查项
export async function POST(request, { params }) {
    try {
        const decoded = getUserFromRequest(request);
        if (!decoded) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const { id } = await params;
        const releaseId = parseInt(id);
        const { itemKey, checked } = await request.json();

        if (!itemKey) {
            return NextResponse.json({ error: '缺少检查项标识' }, { status: 400 });
        }

        // 获取检查项配置
        const config = getChecklistConfig(itemKey);
        if (!config) {
            return NextResponse.json({ error: '无效的检查项' }, { status: 400 });
        }

        // 检查用户角色是否有权限确认此项
        if (!canConfirmChecklist(decoded.role, config.roles)) {
            return NextResponse.json(
                { error: `此检查项仅允许 ${config.roles.join('、')} 角色确认` },
                { status: 403 }
            );
        }

        // 更新检查项状态
        const checklist = await prisma.checklist.update({
            where: {
                releaseId_itemKey: {
                    releaseId,
                    itemKey,
                },
            },
            data: {
                checked: checked !== false,
                confirmedById: checked !== false ? decoded.userId : null,
                confirmedAt: checked !== false ? new Date() : null,
            },
            include: {
                confirmedBy: {
                    select: { id: true, name: true, role: true },
                },
            },
        });

        return NextResponse.json({
            message: checked !== false ? '已确认' : '已取消确认',
            checklist,
        });
    } catch (error) {
        console.error('Update checklist error:', error);
        return NextResponse.json({ error: '更新检查项失败' }, { status: 500 });
    }
}
