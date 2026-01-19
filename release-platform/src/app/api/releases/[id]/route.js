import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { STAGES, getChecklistByStage } from '@/lib/constants';

// 获取发版详情
export async function GET(request, { params }) {
    try {
        const decoded = getUserFromRequest(request);
        if (!decoded) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const { id } = await params;
        console.log('API GET ID:', id);
        const releaseId = parseInt(id);

        console.log('Fetching release from Prisma...');
        const release = await prisma.release.findUnique({
            where: { id: releaseId },
            include: {
                createdBy: {
                    select: { id: true, name: true, role: true, email: true, username: true, phone: true },
                },
                members: {
                    include: {
                        user: {
                            select: { id: true, name: true, role: true, email: true, username: true, phone: true }
                        },
                        content: {
                            include: {
                                dbChanges: true,
                                configChanges: true
                            }
                        }
                    }
                },
                checklists: {
                    include: {
                        user: {
                            select: { id: true, name: true }
                        },
                        confirmedBy: {
                            select: { id: true, name: true, role: true },
                        },
                    },
                },
                documents: {
                    include: {
                        uploadedBy: {
                            select: { id: true, name: true, role: true },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!release) {
            return NextResponse.json({ error: '发版记录不存在' }, { status: 404 });
        }

        // 权限检查：ADMIN、LD 和 PM 可以查看所有，其他角色只能查看自己参与的
        const userRoles = (decoded.role || '').split(',');
        const isAdmin = userRoles.includes('ADMIN');
        const isLeader = userRoles.includes('LD');
        const isPM = userRoles.includes('PM');
        const isCreator = release.createdById === decoded.userId;
        const isMember = release.members.some(m => m.userId === decoded.userId);

        if (!isAdmin && !isLeader && !isPM && !isCreator && !isMember) {
            return NextResponse.json({ error: '您没有权限查看此发版记录' }, { status: 403 });
        }

        return NextResponse.json({ release });
    } catch (error) {
        console.error('Get release error details:', error);
        return NextResponse.json({ error: '获取发版详情失败' }, { status: 500 });
    }
}

// 更新发版 (包括阶段推进)
export async function PUT(request, { params }) {
    try {
        const decoded = getUserFromRequest(request);
        if (!decoded) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const { id } = await params;
        const releaseId = parseInt(id);
        const data = await request.json();

        // 检查发版是否存在
        const existing = await prisma.release.findUnique({
            where: { id: releaseId },
            include: { checklists: true },
        });

        if (!existing) {
            return NextResponse.json({ error: '发版记录不存在' }, { status: 404 });
        }

        // Permission Helper
        const userRoles = (decoded.role || '').split(',');
        const isAdmin = userRoles.includes('ADMIN');
        const isPM = userRoles.includes('PM');
        const isRD = userRoles.includes('RD');
        const isCreator = existing.createdById === decoded.userId;
        
        // PM 只能管理自己创建的发版记录（除非是 ADMIN）
        const canManageRelease = isAdmin || (isPM && isCreator);

        // ACTION: ADVANCE_STAGE (ADMIN 或创建者 PM)
        if (data.action === 'advance_stage') {
            if (!canManageRelease) return NextResponse.json({ error: '只有管理员或发版创建者可以推进阶段' }, { status: 403 });

            // 检查当前阶段的所有检查项是否完成
            const currentStageChecklists = existing.checklists.filter(
                c => c.stage === existing.stage
            );
            const allChecked = currentStageChecklists.every(c => c.checked);

            // 调试信息：找出未完成的检查项
            if (!allChecked && existing.stage !== 'COMPLETED' && existing.stage !== 'ROLLBACK') {
                const uncheckedItems = currentStageChecklists.filter(c => !c.checked);
                console.log('未完成的检查项:', uncheckedItems.map(c => ({
                    itemKey: c.itemKey,
                    userId: c.userId,
                    checked: c.checked
                })));
                
                // 返回更详细的错误信息
                const uncheckedCount = uncheckedItems.length;
                const totalCount = currentStageChecklists.length;
                return NextResponse.json(
                    { 
                        error: `当前阶段还有 ${uncheckedCount} 项未完成（共 ${totalCount} 项）`,
                        uncheckedItems: uncheckedItems.map(c => ({
                            itemKey: c.itemKey,
                            userId: c.userId
                        }))
                    },
                    { status: 400 }
                );
            }

            // Determine next stage
            let nextStage;
            let nextStatus = existing.status;

            switch (existing.stage) {
                case STAGES.PREPARATION:
                    nextStage = STAGES.IMPLEMENTATION;
                    nextStatus = 'IN_PROGRESS';
                    break;
                case STAGES.IMPLEMENTATION:
                    nextStage = STAGES.VERIFICATION;
                    // Reset status?
                    break;
                case STAGES.VERIFICATION:
                    nextStage = STAGES.COMPLETED;
                    nextStatus = 'SUCCESS';
                    break;
                default:
                    return NextResponse.json({ error: '当前阶段无法推进' }, { status: 400 });
            }

            const release = await prisma.release.update({
                where: { id: releaseId },
                data: { stage: nextStage, status: nextStatus },
            });
            return NextResponse.json({ message: '阶段推进成功', release });
        }

        // ACTION: ROLLBACK (ADMIN 或创建者 PM)
        if (data.action === 'rollback') {
            if (!canManageRelease) return NextResponse.json({ error: '只有管理员或发版创建者可以标记回滚' }, { status: 403 });

            const release = await prisma.release.update({
                where: { id: releaseId },
                data: { stage: STAGES.ROLLBACK, status: 'FAILED' },
            });
            return NextResponse.json({ message: '已标记为回滚', release });
        }

        // ACTION: UPDATE_INFO (ADMIN 或创建者 PM - Version, Desc, Date)
        if (data.action === 'update_info') {
            if (!canManageRelease) return NextResponse.json({ error: '只有管理员或发版创建者可以修改发版信息' }, { status: 403 });

            const { version, description, plannedDate } = data;
            if (!version || !description) return NextResponse.json({ error: '版本和描述不能为空' }, { status: 400 });

            // Check unique version if changed
            if (version !== existing.version) {
                const dup = await prisma.release.findUnique({ where: { version } });
                if (dup) return NextResponse.json({ error: '该版本号已存在' }, { status: 400 });
            }

            const release = await prisma.release.update({
                where: { id: releaseId },
                data: {
                    version,
                    description,
                    plannedDate: plannedDate ? new Date(plannedDate) : null
                }
            });
            return NextResponse.json({ message: '信息更新成功', release });
        }

        // ACTION: UPDATE_CONTENT (RD, 或创建者 PM - Basic Info, DB Changes, Config Changes)
        if (data.action === 'update_content') {
            const canEdit = canManageRelease || isRD;
            if (!canEdit) return NextResponse.json({ error: '无权修改发版填报内容' }, { status: 403 });

            if (!canManageRelease && existing.stage !== 'PREPARATION' && existing.stage !== 'DRAFT') {
                return NextResponse.json({ error: '非准备阶段仅发版创建者可修改内容' }, { status: 403 });
            }

            const { devName, devPhone, system, contentDesc, dbChanges, configChanges } = data;

            // Find the releaseMember record for this user
            const member = await prisma.releaseMember.findUnique({
                where: {
                    releaseId_userId: {
                        releaseId,
                        userId: decoded.userId
                    }
                }
            });

            if (!member) {
                return NextResponse.json({ error: '您不是该发版单的参与人员' }, { status: 403 });
            }

            // 辅助函数：安全解析日期
            const parseDate = (dateStr) => {
                if (!dateStr) return new Date(); // 默认当前时间
                const date = new Date(dateStr);
                return isNaN(date.getTime()) ? new Date() : date;
            };

            // Upsert MemberContent and handle nested changes
            await prisma.memberContent.upsert({
                where: { releaseMemberId: member.id },
                create: {
                    releaseMemberId: member.id,
                    devName,
                    devPhone,
                    system,
                    contentDesc,
                    dbChanges: {
                        create: (dbChanges || []).map(db => ({
                            reason: db.reason || '',
                            executionTime: parseDate(db.executionTime),
                            changeType: db.changeType || '',
                            dbName: db.dbName || '',
                            tableName: db.tableName || '',
                            sql: db.sql || '',
                            impact: db.impact || '',
                            affectsOnline: db.affectsOnline || false
                        }))
                    },
                    configChanges: {
                        create: (configChanges || []).map(cfg => ({
                            reason: cfg.reason || '',
                            content: cfg.content || '',
                            impact: cfg.impact || '',
                            affectsOnline: cfg.affectsOnline || false
                        }))
                    }
                },
                update: {
                    devName,
                    devPhone,
                    system,
                    contentDesc,
                    dbChanges: {
                        deleteMany: {},
                        create: (dbChanges || []).map(db => ({
                            reason: db.reason || '',
                            executionTime: parseDate(db.executionTime),
                            changeType: db.changeType || '',
                            dbName: db.dbName || '',
                            tableName: db.tableName || '',
                            sql: db.sql || '',
                            impact: db.impact || '',
                            affectsOnline: db.affectsOnline || false
                        }))
                    },
                    configChanges: {
                        deleteMany: {},
                        create: (configChanges || []).map(cfg => ({
                            reason: cfg.reason || '',
                            content: cfg.content || '',
                            impact: cfg.impact || '',
                            affectsOnline: cfg.affectsOnline || false
                        }))
                    }
                }
            });

            return NextResponse.json({ message: '内容保存成功' });
        }

        // ACTION: UPDATE_QA_CONTENT (QA Only - Test Info)
        if (data.action === 'update_qa_content') {
            const isQA = userRoles.includes('QA');
            if (!isQA && !isPM) return NextResponse.json({ error: '无权修改测试信息' }, { status: 403 });

            const { qaName, qaPhone, qaTestDate } = data;

            // Find the releaseMember record for this user
            const member = await prisma.releaseMember.findUnique({
                where: {
                    releaseId_userId: {
                        releaseId,
                        userId: decoded.userId
                    }
                }
            });

            if (!member) {
                return NextResponse.json({ error: '您不是该发版单的参与人员' }, { status: 403 });
            }

            // Upsert MemberContent with QA info
            await prisma.memberContent.upsert({
                where: { releaseMemberId: member.id },
                create: {
                    releaseMemberId: member.id,
                    qaName,
                    qaPhone,
                    qaTestDate: qaTestDate ? new Date(qaTestDate) : null,
                },
                update: {
                    qaName,
                    qaPhone,
                    qaTestDate: qaTestDate ? new Date(qaTestDate) : null,
                }
            });

            return NextResponse.json({ message: '测试信息保存成功' });
        }

        // ACTION: UPDATE_PO_CONTENT (PO Only - Acceptance Info)
        if (data.action === 'update_po_content') {
            const isPO = userRoles.includes('PO');
            if (!isPO && !isPM) return NextResponse.json({ error: '无权修改验收信息' }, { status: 403 });

            const { poName, poPhone, poAcceptDate, poAcceptComment } = data;

            const member = await prisma.releaseMember.findUnique({
                where: {
                    releaseId_userId: {
                        releaseId,
                        userId: decoded.userId
                    }
                }
            });

            if (!member) {
                return NextResponse.json({ error: '您不是该发版单的参与人员' }, { status: 403 });
            }

            await prisma.memberContent.upsert({
                where: { releaseMemberId: member.id },
                create: {
                    releaseMemberId: member.id,
                    poName,
                    poPhone,
                    poAcceptDate: poAcceptDate ? new Date(poAcceptDate) : null,
                    poAcceptComment,
                },
                update: {
                    poName,
                    poPhone,
                    poAcceptDate: poAcceptDate ? new Date(poAcceptDate) : null,
                    poAcceptComment,
                }
            });

            return NextResponse.json({ message: '验收信息保存成功' });
        }

        // ACTION: UPDATE_DBA_CONTENT (DBA Only - Review Info)
        if (data.action === 'update_dba_content') {
            const isDBA = userRoles.includes('DBA');
            if (!isDBA && !isPM) return NextResponse.json({ error: '无权修改审核信息' }, { status: 403 });

            const { dbaName, dbaPhone, dbaReviewDate, dbaReviewComment } = data;

            const member = await prisma.releaseMember.findUnique({
                where: {
                    releaseId_userId: {
                        releaseId,
                        userId: decoded.userId
                    }
                }
            });

            if (!member) {
                return NextResponse.json({ error: '您不是该发版单的参与人员' }, { status: 403 });
            }

            await prisma.memberContent.upsert({
                where: { releaseMemberId: member.id },
                create: {
                    releaseMemberId: member.id,
                    dbaName,
                    dbaPhone,
                    dbaReviewDate: dbaReviewDate ? new Date(dbaReviewDate) : null,
                    dbaReviewComment,
                },
                update: {
                    dbaName,
                    dbaPhone,
                    dbaReviewDate: dbaReviewDate ? new Date(dbaReviewDate) : null,
                    dbaReviewComment,
                }
            });

            return NextResponse.json({ message: '审核信息保存成功' });
        }

        // ACTION: UPDATE_DBA_EXEC (DBA Only - 实施阶段执行结果)
        if (data.action === 'update_dba_exec') {
            const isDBA = userRoles.includes('DBA');
            if (!isDBA && !isPM) return NextResponse.json({ error: '无权修改DBA执行结果' }, { status: 403 });

            // 检查是否在实施阶段
            if (existing.stage !== 'IMPLEMENTATION' && !isPM) {
                return NextResponse.json({ error: '只能在实施阶段填报执行结果' }, { status: 403 });
            }

            const { dbaExecTime, dbaExecName, dbaExecPhone, dbaExecResult, dbaRollbackInfo, dbaExecRemark } = data;

            const member = await prisma.releaseMember.findUnique({
                where: {
                    releaseId_userId: {
                        releaseId,
                        userId: decoded.userId
                    }
                }
            });

            if (!member) {
                return NextResponse.json({ error: '您不是该发版单的参与人员' }, { status: 403 });
            }

            await prisma.memberContent.upsert({
                where: { releaseMemberId: member.id },
                create: {
                    releaseMemberId: member.id,
                    dbaExecTime: dbaExecTime ? new Date(dbaExecTime) : null,
                    dbaExecName,
                    dbaExecPhone,
                    dbaExecResult,
                    dbaRollbackInfo,
                    dbaExecRemark,
                },
                update: {
                    dbaExecTime: dbaExecTime ? new Date(dbaExecTime) : null,
                    dbaExecName,
                    dbaExecPhone,
                    dbaExecResult,
                    dbaRollbackInfo,
                    dbaExecRemark,
                }
            });

            return NextResponse.json({ message: 'DBA执行结果保存成功' });
        }

        // ACTION: UPDATE_OP_CONTENT (OP Only - Backup & Rollback Info)
        if (data.action === 'update_op_content') {
            const isOP = userRoles.includes('OP');
            if (!isOP && !isPM) return NextResponse.json({ error: '无权修改运维信息' }, { status: 403 });

            const { opName, opPhone, opBackupDate, rollbackPlan } = data;

            const member = await prisma.releaseMember.findUnique({
                where: {
                    releaseId_userId: {
                        releaseId,
                        userId: decoded.userId
                    }
                }
            });

            if (!member) {
                return NextResponse.json({ error: '您不是该发版单的参与人员' }, { status: 403 });
            }

            await prisma.memberContent.upsert({
                where: { releaseMemberId: member.id },
                create: {
                    releaseMemberId: member.id,
                    opName,
                    opPhone,
                    opBackupDate: opBackupDate ? new Date(opBackupDate) : null,
                    rollbackPlan,
                },
                update: {
                    opName,
                    opPhone,
                    opBackupDate: opBackupDate ? new Date(opBackupDate) : null,
                    rollbackPlan,
                }
            });

            return NextResponse.json({ message: '运维信息保存成功' });
        }

        // ACTION: UPDATE_CHECKLIST
        if (data.action === 'update_checklist') {
            const { items } = data; // { itemKey: checked_boolean }

            const updates = [];
            for (const itemKey in items) {
                const checked = items[itemKey];

                // 查找属于当前用户的该检查项
                const checklistItem = existing.checklists.find(
                    c => c.itemKey === itemKey && c.userId === decoded.userId
                );

                if (checklistItem) {
                    updates.push(
                        prisma.checklist.update({
                            where: { id: checklistItem.id },
                            data: {
                                checked,
                                confirmedById: checked ? decoded.userId : null,
                                confirmedAt: checked ? new Date() : null,
                            }
                        })
                    );
                }
            }

            if (updates.length > 0) {
                await prisma.$transaction(updates);
            }

            return NextResponse.json({ message: '检查清单更新成功' });
        }

        // Action: update_members (ADMIN 或创建者 PM)
        if (data.action === 'update_members') {
            if (!canManageRelease) return NextResponse.json({ error: '只有管理员或发版创建者可以修改成员' }, { status: 403 });
            const { memberIds } = data;

            // Re-sync members: delete old, create new
            await prisma.releaseMember.deleteMany({ where: { releaseId } });
            await prisma.releaseMember.createMany({
                data: (memberIds || []).map(userId => ({
                    releaseId,
                    userId: Number(userId)
                }))
            });

            return NextResponse.json({ message: '成员更新成功' });
        }

        return NextResponse.json({ error: '无效的操作' }, { status: 400 });
    } catch (error) {
        console.error('Update release error:', error);
        return NextResponse.json({ error: '更新发版失败' }, { status: 500 });
    }
}

// 删除发版记录（ADMIN 可删除所有，PM 只能删除自己创建的）
export async function DELETE(request, { params }) {
    try {
        const decoded = getUserFromRequest(request);
        if (!decoded) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const userRoles = (decoded.role || '').split(',');
        const isAdmin = userRoles.includes('ADMIN');
        const isPM = userRoles.includes('PM');
        
        if (!isAdmin && !isPM) {
            return NextResponse.json({ error: '只有管理员或项目经理可以删除发版记录' }, { status: 403 });
        }

        const { id } = await params;
        const releaseId = parseInt(id);

        // 检查发版是否存在
        const existing = await prisma.release.findUnique({
            where: { id: releaseId },
        });

        if (!existing) {
            return NextResponse.json({ error: '发版记录不存在' }, { status: 404 });
        }

        // PM 只能删除自己创建的发版记录
        if (isPM && !isAdmin && existing.createdById !== decoded.userId) {
            return NextResponse.json({ error: '您只能删除自己创建的发版记录' }, { status: 403 });
        }

        // 删除关联数据（按顺序删除以避免外键约束）
        // 1. 删除 MemberContent 及其关联的 DbChange 和 ConfigChange
        const members = await prisma.releaseMember.findMany({
            where: { releaseId },
            select: { id: true }
        });
        const memberIds = members.map(m => m.id);

        if (memberIds.length > 0) {
            await prisma.dbChange.deleteMany({
                where: { memberContent: { releaseMemberId: { in: memberIds } } }
            });
            await prisma.configChange.deleteMany({
                where: { memberContent: { releaseMemberId: { in: memberIds } } }
            });
            await prisma.memberContent.deleteMany({
                where: { releaseMemberId: { in: memberIds } }
            });
        }

        // 2. 删除 ReleaseMember
        await prisma.releaseMember.deleteMany({ where: { releaseId } });

        // 3. 删除 Checklist
        await prisma.checklist.deleteMany({ where: { releaseId } });

        // 4. 删除 Document
        await prisma.document.deleteMany({ where: { releaseId } });

        // 5. 删除 Release
        await prisma.release.delete({ where: { id: releaseId } });

        return NextResponse.json({ message: '发版记录删除成功' });
    } catch (error) {
        console.error('Delete release error:', error);
        return NextResponse.json({ error: '删除发版记录失败' }, { status: 500 });
    }
}
