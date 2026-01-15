import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword, generateToken } from '@/lib/auth';

export async function POST(request) {
    try {
        const { account, password } = await request.json();

        // 验证必填字段
        if (!account || !password) {
            return NextResponse.json(
                { error: '请输入用户名/手机号和密码' },
                { status: 400 }
            );
        }

        // 查找用户：支持用户名或手机号登录
        // 判断输入是手机号还是用户名（手机号为纯数字且长度为11位）
        const isPhone = /^1\d{10}$/.test(account);
        
        let user = null;
        if (isPhone) {
            // 按手机号查找
            user = await prisma.user.findUnique({
                where: { phone: account },
            });
        } else {
            // 按用户名查找
            user = await prisma.user.findUnique({
                where: { username: account },
            });
        }

        if (!user) {
            return NextResponse.json(
                { error: '账号或密码错误' },
                { status: 401 }
            );
        }

        // 验证密码
        const isValid = await verifyPassword(password, user.password);
        if (!isValid) {
            return NextResponse.json(
                { error: '账号或密码错误' },
                { status: 401 }
            );
        }

        // 生成 token
        const token = generateToken(user);

        return NextResponse.json({
            message: '登录成功',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                name: user.name,
                phone: user.phone,
                role: user.role,
            },
            token,
        });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: '登录失败，请稍后重试' },
            { status: 500 }
        );
    }
}
