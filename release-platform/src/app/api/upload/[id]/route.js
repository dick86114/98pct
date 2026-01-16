import { NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import path from 'path';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

/**
 * 删除文档
 * 权限：
 * - 上传者本人可以删除
 * - ADMIN 可以删除任何文档
 * - PM（发版创建者）可以删除该发版下的任何文档
 */
export async function DELETE(request, { params }) {
    try {
        const decoded = getUserFromRequest(request);
        if (!decoded) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const documentId = parseInt(params.id);
        if (isNaN(documentId)) {
            return NextResponse.json({ error: '无效的文档ID' }, { status: 400 });
        }

        // 获取文档信息
        const document = await prisma.document.findUnique({
            where: { id: documentId },
            include: {
                release: {
                    select: { createdById: true }
                }
            }
        });

        if (!document) {
            return NextResponse.json({ error: '文档不存在' }, { status: 404 });
        }

        // 获取当前用户信息
        const currentUser = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, role: true }
        });

        if (!currentUser) {
            return NextResponse.json({ error: '用户不存在' }, { status: 404 });
        }

        const userRoles = (currentUser.role || '').split(',');
        const isAdmin = userRoles.includes('ADMIN');
        const isPM = userRoles.includes('PM');
        const isUploader = document.uploadedById === currentUser.id;
        const isReleaseCreator = document.release?.createdById === currentUser.id;

        // 权限检查
        // 1. 上传者本人可以删除
        // 2. ADMIN 可以删除任何文档
        // 3. PM 且是该发版的创建者可以删除
        const canDelete = isUploader || isAdmin || (isPM && isReleaseCreator);

        if (!canDelete) {
            return NextResponse.json({ error: '没有权限删除此文档' }, { status: 403 });
        }

        // 删除物理文件
        try {
            const filePath = path.join(process.cwd(), 'public', document.filepath);
            await unlink(filePath);
        } catch (err) {
            // 文件可能已经不存在，忽略错误
            console.warn('删除文件失败:', err.message);
        }

        // 删除数据库记录
        await prisma.document.delete({
            where: { id: documentId }
        });

        return NextResponse.json({ message: '文档删除成功' });
    } catch (error) {
        console.error('Delete document error:', error);
        return NextResponse.json({ error: '删除文档失败' }, { status: 500 });
    }
}
