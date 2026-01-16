'use client';

import { useState } from 'react';

const STAGE_CONFIG = {
    PREPARATION: { label: '准备阶段', step: 1 },
    IMPLEMENTATION: { label: '实施阶段', step: 2 },
    VERIFICATION: { label: '验证阶段', step: 3 },
    COMPLETED: { label: '已完成', step: 4 },
    ROLLBACK: { label: '已回滚', step: -1 },
};

// 根据角色和阶段获取操作指引
const getStageGuidance = (stage, userRole) => {
    const userRoles = (userRole || '').split(',');

    const guidance = {
        PREPARATION: {
            RD: [
                '填报基本信息：姓名、手机号、所属系统、涉及内容说明',
                '如有数据库变更，填写变更原因、数据库名、表名、类型、SQL等',
                '如有配置变更，填写变更原因、内容、影响说明',
                '上传相关附件（代码包、截图等）',
                '完成自查清单：自测发版内容、移动端、关联模块'
            ],
            PM: [
                '审核发版计划和变更内容',
                '跟进成员填报进度',
                '确认准备阶段所有检查项完成',
                '推进到实施阶段'
            ],
            QA: ['执行功能测试', '输出测试报告', '确认测试通过'],
            PO: ['产品验收', '确认验收通过'],
            DBA: ['审核 SQL 脚本及回滚脚本', '确认在预发布环境跑通'],
            OP: ['确认回退方案和步骤', '准备部署环境']
        },
        IMPLEMENTATION: {
            RD: ['配合 DBA 执行 SQL 变更', '配合 OP 进行代码部署', '观察应用日志，确认无异常错误'],
            PM: ['确认所有相关人员在线就位', '协调各方配合执行', '推进到验证阶段'],
            DBA: ['完成数据库备份（截图留存）', '执行 SQL 脚本', '确认执行无误'],
            OP: ['完成代码/配置文件备份', '部署代码包', '确认应用日志无异常'],
            QA: ['待部署完成后准备验证'],
            PO: ['待部署完成后准备验收']
        },
        VERIFICATION: {
            RD: ['观察日志平台', '确认无持续报错'],
            PM: ['协调验证工作', '完成发版结果登记', '通知所有相关人员', '完成发版'],
            QA: ['执行冒烟测试（核心流程快速验证）', '执行正式环境测试', '提交正式环境测试报告'],
            PO: ['确认新功能展示正常']
        }
    };

    const roleGuidance = guidance[stage];
    if (!roleGuidance) return null;

    for (const role of ['PM', 'RD', 'QA', 'PO', 'DBA', 'OP']) {
        if (userRoles.includes(role) && roleGuidance[role]) {
            return { role, items: roleGuidance[role] };
        }
    }
    return null;
};

export default function StageProgress({ currentStage, userRole }) {
    const [showGuidance, setShowGuidance] = useState(false); // 默认收起操作指引
    
    const stages = [
        { key: 'PREPARATION', label: '准备', num: '1' },
        { key: 'IMPLEMENTATION', label: '实施', num: '2' },
        { key: 'VERIFICATION', label: '验证', num: '3' },
        { key: 'COMPLETED', label: '完成', num: '4' },
    ];

    const currentStep = STAGE_CONFIG[currentStage]?.step || 1;
    const isRollback = currentStage === 'ROLLBACK';

    if (isRollback) {
        return (
            <div className="stage-progress-container">
                <div className="stage-rollback-banner">
                    <span className="rollback-icon">↩</span>
                    <span className="rollback-text">已回滚</span>
                    <span className="rollback-desc">发版已执行回滚操作</span>
                </div>
            </div>
        );
    }

    const stageGuidance = getStageGuidance(currentStage, userRole);

    return (
        <div className="stage-progress-container">
            {/* 简洁步骤条 */}
            <div className="stage-steps">
                {stages.map((stage, index) => {
                    const step = index + 1;
                    const isCompleted = step < currentStep;
                    const isActive = step === currentStep;

                    return (
                        <div key={stage.key} className="stage-step-item">
                            <div className={`step-indicator ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
                                {isCompleted ? '✓' : stage.num}
                            </div>
                            <span className={`step-label ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
                                {stage.label}
                            </span>
                            {index < stages.length - 1 && (
                                <div className={`step-connector ${isCompleted ? 'completed' : ''}`} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* 操作指引 */}
            {stageGuidance && currentStage !== 'COMPLETED' && (
                <div className="guidance-card">
                    <button className="guidance-header" onClick={() => setShowGuidance(!showGuidance)}>
                        <div className="guidance-title">
                            <span className="guidance-icon">💡</span>
                            <span>操作指引</span>
                            <span className="guidance-badge">{STAGE_CONFIG[currentStage]?.label}</span>
                        </div>
                        <span className={`guidance-chevron ${showGuidance ? 'open' : ''}`}>▼</span>
                    </button>
                    
                    {showGuidance && (
                        <div className="guidance-body">
                            {stageGuidance.items.map((item, index) => (
                                <div key={index} className="guidance-item">
                                    <span className="item-number">{index + 1}</span>
                                    <span className="item-text">{item}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
