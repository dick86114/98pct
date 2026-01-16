import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(request) {
    try {
        const decoded = getUserFromRequest(request);
        if (!decoded) {
            return NextResponse.json({ error: '未登录' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file');
        const releaseId = formData.get('releaseId'); // Optional now
        const documentType = formData.get('type') || 'OTHER';

        if (!file) {
            return NextResponse.json(
                { error: '请选择文件' },
                { status: 400 }
            );
        }

        // 检查发版是否存在 (if releaseId provided)
        if (releaseId) {
            const release = await prisma.release.findUnique({
                where: { id: parseInt(releaseId) },
            });

            if (!release) {
                return NextResponse.json({ error: '发版记录不存在' }, { status: 404 });
            }
        }

        // 创建上传目录
        const dirName = releaseId ? releaseId.toString() : 'temp';
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', dirName);
        await mkdir(uploadDir, { recursive: true });

        // 生成唯一文件名
        const ext = path.extname(file.name);
        const uniqueName = `${randomUUID()}${ext}`;
        const filepath = path.join(uploadDir, uniqueName);

        // 保存文件
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filepath, buffer);

        // 记录到数据库（使用 API 路由提供文件访问）
        const document = await prisma.document.create({
            data: {
                releaseId: releaseId ? parseInt(releaseId) : null,
                type: documentType,
                filename: file.name,
                filepath: `/api/files/${dirName}/${uniqueName}`,
                uploadedById: decoded.userId,
            },
            include: {
                uploadedBy: {
                    select: { id: true, name: true, role: true },
                },
            },
        });

        return NextResponse.json({
            message: '文件上传成功',
            document,
        });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: '文件上传失败' }, { status: 500 });
    }
}
