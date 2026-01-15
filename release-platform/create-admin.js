const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createAdminUser() {
    try {
        const hashedPassword = await bcrypt.hash('admin123', 12);
        const user = await prisma.user.upsert({
            where: { email: 'admin@98pct.com' },
            update: { password: hashedPassword, role: 'ADMIN' },
            create: {
                username: 'admin',
                email: 'admin@98pct.com',
                password: hashedPassword,
                name: '系统管理员',
                phone: '13800000000',
                role: 'ADMIN'
            }
        });
        console.log('Admin 用户创建成功');
        console.log('用户名: admin');
        console.log('密码: admin123');
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

createAdminUser();
