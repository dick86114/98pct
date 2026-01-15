const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    // Seed Roles
    const roles = [
        { code: 'ADMIN', name: '超级管理员' },
        { code: 'PM', name: '项目经理' },
        { code: 'RD', name: '开发人员' },
        { code: 'QA', name: '测试人员' },
        { code: 'PO', name: '产品经理' },
        { code: 'DBA', name: 'DBA' },
        { code: 'OP', name: '运维人员' },
    ];

    for (const roleData of roles) {
        await prisma.role.upsert({
            where: { code: roleData.code },
            update: { name: roleData.name },
            create: roleData,
        });
        console.log(`Role ${roleData.code} (${roleData.name}) seeded.`);
    }

    // 创建默认超级管理员账号
    const adminPassword = await bcrypt.hash('admin123', 12);
    await prisma.user.upsert({
        where: { email: 'admin@98pct.com' },
        update: { password: adminPassword, role: 'ADMIN' },
        create: {
            username: 'admin',
            email: 'admin@98pct.com',
            password: adminPassword,
            name: '系统管理员',
            phone: '13800000000',
            role: 'ADMIN'
        }
    });
    console.log('默认管理员账号创建成功');
    console.log('用户名: admin');
    console.log('密码: admin123')
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
