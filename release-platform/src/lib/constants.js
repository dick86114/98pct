// 发版流程各阶段检查清单配置
// 基于《发版规范方案书》定义

export const STAGES = {
    PREPARATION: 'PREPARATION',
    IMPLEMENTATION: 'IMPLEMENTATION',
    VERIFICATION: 'VERIFICATION',
    COMPLETED: 'COMPLETED',
    ROLLBACK: 'ROLLBACK',
};

export const STAGE_LABELS = {
    PREPARATION: '准备阶段',
    IMPLEMENTATION: '实施阶段',
    VERIFICATION: '验证阶段',
    COMPLETED: '已完成',
    ROLLBACK: '已回滚',
};

export const ROLES = {
    ADMIN: 'ADMIN', // 超级管理员
    PM: 'PM',
    RD: 'RD',
    QA: 'QA',
    PO: 'PO',
    DBA: 'DBA',
    OP: 'OP', // 运维角色
};

export const STATUS_LABELS = {
    DRAFT: '草稿',
    PENDING_REVIEW: '待评审',
    IN_PROGRESS: '进行中',
    SUCCESS: '发版成功',
    FAILED: '发版失败',
};

// 准备阶段检查清单
export const PREPARATION_CHECKLIST = [
    // 开发人员自查清单
    {
        key: 'rd_self_1',
        label: '自测本次发版的内容',
        roles: ['RD'],
        category: 'RD_SELF_CHECK',
    },
    {
        key: 'rd_self_2',
        label: '自测移动端',
        roles: ['RD'],
        category: 'RD_SELF_CHECK',
    },
    {
        key: 'rd_self_3',
        label: '自测本次发版可能会影响的关联模块',
        roles: ['RD'],
        category: 'RD_SELF_CHECK',
    },
    {
        key: 'rd_self_4',
        label: '已填报所有变更内容',
        roles: ['RD'],
        category: 'RD_SELF_CHECK',
    },
    // 测试人员自查清单
    {
        key: 'qa_prep_1',
        label: '已上传测试用例',
        roles: ['QA'],
        category: 'QA_SELF_CHECK',
    },
    {
        key: 'qa_prep_2',
        label: '已完成本次发版涉及的功能测试',
        roles: ['QA'],
        category: 'QA_SELF_CHECK',
    },
    {
        key: 'qa_prep_3',
        label: '已完成本次发版涉及的移动端测试',
        roles: ['QA'],
        category: 'QA_SELF_CHECK',
    },
    {
        key: 'qa_prep_4',
        label: '已测试可能受影响的关联模块',
        roles: ['QA'],
        category: 'QA_SELF_CHECK',
    },
    {
        key: 'qa_prep_5',
        label: '已提交测试报告',
        roles: ['QA'],
        category: 'QA_SELF_CHECK',
    },
    // 产品人员自查清单
    {
        key: 'po_prep_1',
        label: '核对当次发版需求范围',
        roles: ['PO'],
        category: 'PO_SELF_CHECK',
    },
    {
        key: 'po_prep_2',
        label: '核对核心业务流程是否正常',
        roles: ['PO'],
        category: 'PO_SELF_CHECK',
    },
    {
        key: 'po_prep_3',
        label: '确认测试报告中记录的问题是否影响本次发版',
        roles: ['PO'],
        category: 'PO_SELF_CHECK',
    },
    {
        key: 'po_prep_4',
        label: '核对列表、详情页的数字、状态、文案显示等是否正常',
        roles: ['PO'],
        category: 'PO_SELF_CHECK',
    },
    {
        key: 'po_prep_5',
        label: '检查有无错别字、按钮错位、报错信息是否友好等问题',
        roles: ['PO'],
        category: 'PO_SELF_CHECK',
    },
    {
        key: 'po_prep_6',
        label: '检查移动端相关功能是否正常',
        roles: ['PO'],
        category: 'PO_SELF_CHECK',
    },
    // DBA 自查清单
    {
        key: 'dba_prep_1',
        label: '已审核数据库变更内容',
        roles: ['DBA'],
        category: 'DBA_SELF_CHECK',
    },
    {
        key: 'dba_prep_2',
        label: '已确认脚本运行正常',
        roles: ['DBA'],
        category: 'DBA_SELF_CHECK',
    },
    // PM 项目经理自查清单
    {
        key: 'pm_prep_1',
        label: '开发人员已准备好发版工作',
        roles: ['PM'],
        category: 'PM_SELF_CHECK',
    },
    {
        key: 'pm_prep_2',
        label: '所有功能都已通过测试',
        roles: ['PM'],
        category: 'PM_SELF_CHECK',
    },
    {
        key: 'pm_prep_3',
        label: 'PO已确认可以上线',
        roles: ['PM'],
        category: 'PM_SELF_CHECK',
    },
    {
        key: 'pm_prep_4',
        label: 'DBA已评审数据库变更可行性',
        roles: ['PM'],
        category: 'PM_SELF_CHECK',
    },
    {
        key: 'pm_prep_5',
        label: '已做好回滚准备',
        roles: ['PM'],
        category: 'PM_SELF_CHECK',
    },
    {
        key: 'pm_prep_6',
        label: '确定发版具体时间',
        roles: ['PM'],
        category: 'PM_SELF_CHECK',
    },
    {
        key: 'pm_prep_7',
        label: '已同步停机/升级的通知到项目组以及客户',
        roles: ['PM'],
        category: 'PM_SELF_CHECK',
    },
    // OP 运维人员自查清单
    {
        key: 'op_prep_1',
        label: '已做好备份工作',
        roles: ['OP'],
        category: 'OP_SELF_CHECK',
    },
    {
        key: 'op_prep_2',
        label: '已提交回滚方案',
        roles: ['OP'],
        category: 'OP_SELF_CHECK',
    },
    {
        key: 'op_prep_3',
        label: '回退方案和步骤已确认',
        roles: ['OP'],
        category: 'OP_SELF_CHECK',
    },
];

// 实施阶段检查清单（由 PM 统一勾选）
export const IMPLEMENTATION_CHECKLIST = [
    {
        key: 'impl_1',
        label: '数据库备份完成（附截图）',
        roles: ['PM'],
        category: 'PM_IMPL_CHECK',
    },
    {
        key: 'impl_2',
        label: '代码/配置备份完成',
        roles: ['PM'],
        category: 'PM_IMPL_CHECK',
    },
    {
        key: 'impl_3',
        label: '已通知客户准备开始发版',
        roles: ['PM'],
        category: 'PM_IMPL_CHECK',
    },
    {
        key: 'impl_4',
        label: 'DBA 执行 SQL 脚本，确认执行无报错',
        roles: ['PM'],
        category: 'PM_IMPL_CHECK',
    },
    {
        key: 'impl_5',
        label: '运维/开发执行代码部署，确认部署过程无误',
        roles: ['PM'],
        category: 'PM_IMPL_CHECK',
    },
];

// 验证阶段检查清单（由 PM 统一勾选）
export const VERIFICATION_CHECKLIST = [
    {
        key: 'verify_1',
        label: '运维/开发确认服务启动成功',
        roles: ['PM'],
        category: 'PM_VERIFY_CHECK',
    },
    {
        key: 'verify_2',
        label: '开发确认应用日志无异常 ERROR',
        roles: ['PM'],
        category: 'PM_VERIFY_CHECK',
    },
    {
        key: 'verify_3',
        label: '本次发版更新功能正常',
        roles: ['PM'],
        category: 'PM_VERIFY_CHECK',
    },
    {
        key: 'verify_4',
        label: '核心业务流程正常',
        roles: ['PM'],
        category: 'PM_VERIFY_CHECK',
    },
    {
        key: 'verify_5',
        label: '提交正式环境测试报告',
        roles: ['PM'],
        category: 'PM_VERIFY_CHECK',
    },
];

// 获取指定阶段的检查清单
export function getChecklistByStage(stage) {
    switch (stage) {
        case STAGES.PREPARATION:
            return PREPARATION_CHECKLIST;
        case STAGES.IMPLEMENTATION:
            return IMPLEMENTATION_CHECKLIST;
        case STAGES.VERIFICATION:
            return VERIFICATION_CHECKLIST;
        default:
            return [];
    }
}

// 获取所有检查清单
export function getAllChecklists() {
    return [
        ...PREPARATION_CHECKLIST.map(item => ({ ...item, stage: STAGES.PREPARATION })),
        ...IMPLEMENTATION_CHECKLIST.map(item => ({ ...item, stage: STAGES.IMPLEMENTATION })),
        ...VERIFICATION_CHECKLIST.map(item => ({ ...item, stage: STAGES.VERIFICATION })),
    ];
}

// 文档类型
export const DOCUMENT_TYPES = {
    TEST_REPORT: 'TEST_REPORT',
    TEST_CASE: 'TEST_CASE',
    ACCEPTANCE_REPORT: 'ACCEPTANCE_REPORT',
    BACKUP_SCREENSHOT: 'BACKUP_SCREENSHOT',
    PROD_TEST_REPORT: 'PROD_TEST_REPORT',
    OTHER: 'OTHER',
};

export const DOCUMENT_TYPE_LABELS = {
    TEST_REPORT: '测试报告',
    TEST_CASE: '测试用例',
    ACCEPTANCE_REPORT: '验收报告',
    BACKUP_SCREENSHOT: '备份截图',
    PROD_TEST_REPORT: '正式环境测试报告',
    OTHER: '其他文档',
};
