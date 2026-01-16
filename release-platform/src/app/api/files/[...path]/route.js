import { NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import path from 'path';

// MIME 类型映射
const MIME_TYPES = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.7z': 'application/x-7z-compressed',
    '.tar': 'application/x-tar',
    '.gz': 'application/gzip',
    '.sql': 'application/sql',
    '.csv': 'text/csv',
    '.log': 'text/plain',
};

export async function GET(request, { params }) {
    try {
        const pathSegments = params.path;
        if (!pathSegments || pathSegments.length === 0) {
            return NextResponse.json({ error: '文件路径无效' }, { status: 400 });
        }

        // 构建文件路径，防止路径遍历攻击
        const relativePath = pathSegments.join('/');
        if (relativePath.includes('..')) {
            return NextResponse.json({ error: '非法路径' }, { status: 403 });
        }

        const filePath = path.join(process.cwd(), 'public', 'uploads', relativePath);

        // 检查文件是否存在
        try {
            const fileStat = await stat(filePath);
            if (!fileStat.isFile()) {
                return NextResponse.json({ error: '不是有效文件' }, { status: 400 });
            }
        } catch {
            return NextResponse.json({ error: '文件不存在' }, { status: 404 });
        }

        // 读取文件
        const fileBuffer = await readFile(filePath);
        
        // 获取文件扩展名和 MIME 类型
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        // 返回文件
        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                'Content-Length': fileBuffer.length.toString(),
                'Cache-Control': 'public, max-age=31536000',
            },
        });
    } catch (error) {
        console.error('File serve error:', error);
        return NextResponse.json({ error: '文件读取失败' }, { status: 500 });
    }
}
