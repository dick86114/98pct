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

    // Seed Users
    const users = [
        { email: '99738440@qq.com', name: '郑亮', role: 'PM' },
        { email: 'tangjun@qq.com', name: '唐俊', role: 'RD' },
        { email: 'ceshi@qq.com', name: '承晨旭', role: 'QA' },
        { email: 'linxiaofeng@qq.com', name: '林晓锋', role: 'PO' },
        { email: 'zhengzhiwen@qq.com', name: '郑致文', role: 'DBA' },
        { email: 'yunwei@qq.com', name: '运维人员', role: 'OP' }
    ];

    const hashedPassword = await bcrypt.hash('123456', 12);

    for (const userData of users) {
        await prisma.user.upsert({
            where: { email: userData.email },
            update: {},
            create: {
                ...userData,
                password: hashedPassword,
            },
        });
        console.log(`User ${userData.name} (${userData.role}) seeded.`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
