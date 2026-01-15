/**
 * 初始化数据字典
 * 运行: node seed-dictionary.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
    console.log('开始初始化数据字典...');
    
    for (const item of dictionaryData) {
        try {
            await prisma.dictionary.upsert({
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
            console.log(`✓ ${item.type}/${item.code}: ${item.name}`);
        } catch (error) {
            console.error(`✗ ${item.type}/${item.code}: ${error.message}`);
        }
    }
    
    console.log('\n数据字典初始化完成！');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
