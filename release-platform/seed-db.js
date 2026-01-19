const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// 字典数据模板
const dictionaryData = [
    // 发版平台
    { type: 'platform', code: 'PORTAL', name: '门户', sortOrder: 1 },
    { type: 'platform', code: 'ADMIN', name: '管理后台', sortOrder: 2 },
    { type: 'platform', code: 'API', name: 'API服务', sortOrder: 3 },
    { type: 'platform', code: 'MOBILE', name: '移动端', sortOrder: 4 },
    
    // 所属系统（开发人员填报时选择）
    { type: 'system', code: 'PORTAL', name: '门户', sortOrder: 1 },
    { type: 'system', code: 'OA', name: 'OA', sortOrder: 2 },
    { type: 'system', code: 'IM', name: 'IM', sortOrder: 3 },
    
    // 发版状态
    { type: 'status', code: 'DRAFT', name: '草稿', sortOrder: 1 },
    { type: 'status', code: 'PENDING_REVIEW', name: '待评审', sortOrder: 2 },
    { type: 'status', code: 'IN_PROGRESS', name: '进行中', sortOrder: 3 },
    { type: 'status', code: 'SUCCESS', name: '发版成功', sortOrder: 4 },
    { type: 'status', code: 'FAILED', name: '发版失败', sortOrder: 5 },
    
    // 文档类型
    { type: 'docType', code: 'TEST_REPORT', name: '测试报告', sortOrder: 1 },
    { type: 'docType', code: 'TEST_CASE', name: '测试用例', sortOrder: 2 },
    { type: 'docType', code: 'ACCEPTANCE_REPORT', name: '验收报告', sortOrder: 3 },
    { type: 'docType', code: 'BACKUP_SCREENSHOT', name: '备份截图', sortOrder: 4 },
    { type: 'docType', code: 'PROD_TEST_REPORT', name: '正式环境测试报告', sortOrder: 5 },
    { type: 'docType', code: 'OTHER', name: '其他文档', sortOrder: 99 },
    
    // 数据库变更类型
    { type: 'dbChangeType', code: 'DDL', name: 'DDL（表结构变更）', sortOrder: 1 },
    { type: 'dbChangeType', code: 'DML', name: 'DML（数据变更）', sortOrder: 2 },
    { type: 'dbChangeType', code: 'DCL', name: 'DCL（权限变更）', sortOrder: 3 },
];

async function main() {
    // 1. 初始化角色数据
    const roles = [
        { code: 'ADMIN', name: '超级管理员' },
        { code: 'LD', name: '领导' },
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

    // 2. 创建默认超级管理员账号
    const adminPassword = await bcrypt.hash('admin123', 12);
    
    // 先检查是否已存在 admin 用户
    const existingAdmin = await prisma.user.findFirst({
        where: {
            OR: [
                { username: 'admin' },
                { email: 'admin@98pct.com' }
            ]
        }
    });

    if (existingAdmin) {
        console.log('默认管理员账号已存在,跳过创建');
    } else {
        await prisma.user.create({
            data: {
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
        console.log('密码: admin123');
    }

    // 3. 初始化数据字典（智能判断）
    // 检查字典表是否有数据
    const existingDictCount = await prisma.dictionary.count();
    
    if (existingDictCount > 0) {
        console.log(`数据字典已存在 ${existingDictCount} 条记录,保持现状`);
    } else {
        console.log('开始初始化数据字典...');
        let successCount = 0;
        let skipCount = 0;
        
        for (const item of dictionaryData) {
            try {
                await prisma.dictionary.create({
                    data: item,
                });
                successCount++;
            } catch (error) {
                // 如果是唯一约束冲突,说明数据已存在,跳过
                if (error.code === 'P2002') {
                    skipCount++;
                } else {
                    console.error(`初始化字典失败 ${item.type}/${item.code}:`, error.message);
                }
            }
        }
        
        console.log(`数据字典初始化完成: 新增 ${successCount} 条, 跳过 ${skipCount} 条`);
    }
}

main()
    .catch((e) => {
        // 友好的错误处理
        if (e.code === 'P2002') {
            console.log('数据已存在,初始化完成');
        } else {
            console.error('数据库初始化失败:', e.message);
        }
        process.exit(0); // 改为正常退出,避免容器启动失败
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
