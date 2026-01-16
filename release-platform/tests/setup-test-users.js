/**
 * 测试用户初始化脚本
 * 
 * 创建各角色的测试用户，用于自动化测试
 * 运行方式：node tests/setup-test-users.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// 测试用户配置
const TEST_USERS = [
    { name: '项目经理1', email: 'pm1@test.com', password: 'test123', role: 'PM' },
    { name: '项目经理2', email: 'pm2@test.com', password: 'test123', role: 'PM' },
    { name: '开发人员', email: 'rd@test.com', password: 'test123', role: 'RD' },
    { name: '测试人员', email: 'qa@test.com', password: 'test123', role: 'QA' },
    { name: '产品经理', email: 'po@test.com', password: 'test123', role: 'PO' },
    { name: 'DBA', email: 'dba@test.com', password: 'test123', role: 'DBA' },
    { name: '运维人员', email: 'op@test.com', password: 'test123', role: 'OP' },
    { name: '多角色用户', email: 'multi@test.com', password: 'test123', role: 'RD,QA' },
];

async function setupTestUsers() {
    console.log('🚀 开始创建测试用户...\n');

    for (const userData of TEST_USERS) {
        try {
            // 检查用户是否已存在
            const existing = await prisma.user.findUnique({
                where: { email: userData.email }
            });

            if (existing) {
                console.log(`⏭️  用户已存在: ${userData.email} (${userData.name})`);
                continue;
            }

            // 加密密码
            const hashedPassword = await bcrypt.hash(userData.password, 10);

            // 创建用户
            const user = await prisma.user.create({
                data: {
                    name: userData.name,
                    email: userData.email,
                    password: hashedPassword,
                    role: userData.role,
                }
            });

            console.log(`✅ 创建成功: ${user.email} (${user.name}) - 角色: ${user.role}`);
        } catch (error) {
            console.error(`❌ 创建失败: ${userData.email} - ${error.message}`);
        }
    }

    console.log('\n📋 测试用户列表:');
    console.log('─'.repeat(60));
    console.log('邮箱                      密码        角色');
    console.log('─'.repeat(60));
    TEST_USERS.forEach(u => {
        console.log(`${u.email.padEnd(25)} ${u.password.padEnd(11)} ${u.role}`);
    });
    console.log('─'.repeat(60));
    console.log('\n✨ 测试用户初始化完成！');
}

async function main() {
    try {
        await setupTestUsers();
    } catch (error) {
        console.error('初始化失败:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
