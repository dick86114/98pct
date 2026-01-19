const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// 字典数据模板
const dictionaryData = [
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
    { type: 'dbChangeType', code: 'NEW_TABLE', name: '新增表', sortOrder: 1 },
    { type: 'dbChangeType', code: 'ALTER_TABLE', name: '修改表结构', sortOrder: 2 },
    { type: 'dbChangeType', code: 'DROP_TABLE', name: '删除表', sortOrder: 3 },
    { type: 'dbChangeType', code: 'NEW_FIELD', name: '新增字段', sortOrder: 4 },
    { type: 'dbChangeType', code: 'ALTER_FIELD', name: '修改字段', sortOrder: 5 },
    { type: 'dbChangeType', code: 'DROP_FIELD', name: '删除字段', sortOrder: 6 },
    { type: 'dbChangeType', code: 'CREATE_INDEX', name: '创建索引', sortOrder: 7 },
    { type: 'dbChangeType', code: 'DATA_UPDATE', name: '数据批量更新', sortOrder: 8 },
    { type: 'dbChangeType', code: 'PERMISSION', name: '权限变更', sortOrder: 9 },
    
    // 发版类型
    { type: 'releaseType', code: 'REGULAR', name: '常规发版', sortOrder: 1 },
    { type: 'releaseType', code: 'URGENT', name: '紧急发版', sortOrder: 2 },
    { type: 'releaseType', code: 'ROLLBACK', name: '回滚发版', sortOrder: 3 },
    
    // 影响范围
    { type: 'impactScope', code: 'FULL', name: '全量', sortOrder: 1 },
    { type: 'impactScope', code: 'GRAY', name: '灰度', sortOrder: 2 },
    { type: 'impactScope', code: 'SPECIFIC', name: '特定用户', sortOrder: 3 },
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

    // 3. 初始化数据字典（使用 upsert 确保数据完整）
    console.log('开始初始化数据字典...');
    let successCount = 0;
    let updateCount = 0;
    
    for (const item of dictionaryData) {
        try {
            const result = await prisma.dictionary.upsert({
                where: {
                    type_code: {
                        type: item.type,
                        code: item.code,
                    }
                },
                update: {
                    name: item.name,
                    sortOrder: item.sortOrder,
                },
                create: item,
            });
            
            // 判断是新增还是更新
            const existing = await prisma.dictionary.findFirst({
                where: {
                    type: item.type,
                    code: item.code,
                    createdAt: result.createdAt
                }
            });
            
            if (existing && existing.createdAt.getTime() === result.updatedAt.getTime()) {
                successCount++;
            } else {
                updateCount++;
            }
        } catch (error) {
            console.error(`初始化字典失败 ${item.type}/${item.code}:`, error.message);
        }
    }
    
    console.log(`数据字典初始化完成: 新增 ${successCount} 条, 更新 ${updateCount} 条`);
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
