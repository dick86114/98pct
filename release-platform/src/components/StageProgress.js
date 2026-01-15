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
                '📝 填报基本信息：姓名、手机号、所属系统、涉及内容说明',
                '🗄️ 如有数据库变更，填写变更原因、数据库名、表名、类型、SQL等',
                '⚙️ 如有配置变更，填写变更原因、内容、影响说明',
                '📎 上传相关附件（代码包、截图等）',
                '✅ 完成自查清单：自测发版内容、移动端、关联模块'
            ],
            PM: [
                '📋 审核发版计划和变更内容',
                '👥 跟进成员填报进度',
                '✅ 确认准备阶段所有检查项完成',
                '➡️ 推进到实施阶段'
            ],
            QA: [
                '🧪 执行功能测试',
                '📄 输出测试报告',
                '✅ 确认测试通过'
            ],
            PO: [
                '👀 产品验收',
                '✅ 确认验收通过'
            ],
            DBA: [
                '🔍 审核 SQL 脚本及回滚脚本',
                '✅ 确认在预发布环境跑通'
            ],
            OP: [
                '📋 确认回退方案和步骤',
                '🛠️ 准备部署环境'
            ]
        },
        IMPLEMENTATION: {
            RD: [
                '🤝 配合 DBA 执行 SQL 变更',
                '🤝 配合 OP 进行代码部署',
                '📊 观察应用日志，确认无异常错误'
            ],
            PM: [
                '📢 确认所有相关人员在线就位',
                '👥 协调各方配合执行',
                '➡️ 推进到验证阶段'
            ],
            DBA: [
                '💾 完成数据库备份（截图留存）',
                '▶️ 执行 SQL 脚本',
                '✅ 确认执行无误'
            ],
            OP: [
                '💾 完成代码/配置文件备份',
                '🚀 部署代码包',
                '📊 确认应用日志无异常'
            ],
            QA: [
                '👀 待部署完成后准备验证'
            ],
            PO: [
                '👀 待部署完成后准备验收'
            ]
        },
        VERIFICATION: {
            RD: [
                '📊 观察日志平台',
                '✅ 确认无持续报错'
            ],
            PM: [
                '📋 协调验证工作',
                '📢 完成发版结果登记',
                '📢 通知所有相关人员',
                '➡️ 完成发版'
            ],
            QA: [
                '🧪 执行冒烟测试（核心流程快速验证）',
                '🧪 执行正式环境测试',
                '📄 提交正式环境测试报告'
            ],
            PO: [
                '👀 确认新功能展示正常'
            ]
        }
    };

    // 获取当前角色的指引
    const roleGuidance = guidance[stage];
    if (!roleGuidance) return null;

    // 按优先级获取指引（PM > RD > 其他）
    for (const role of ['PM', 'RD', 'QA', 'PO', 'DBA', 'OP']) {
        if (userRoles.includes(role) && roleGuidance[role]) {
            return { role, items: roleGuidance[role] };
        }
    }

    return null;
};

export default function StageProgress({ currentStage, userRole }) {
    const [showGuidance, setShowGuidance] = useState(true);
    
    const stages = [
        { key: 'PREPARATION', label: '准备阶段', icon: '📋', desc: '开发者填报内容及自查' },
        { key: 'IMPLEMENTATION', label: '实施阶段', icon: '⚙️', desc: '执行变更并确认清单' },
        { key: 'VERIFICATION', label: '验证阶段', icon: '✅', desc: '线上验证并提交报告' },
        { key: 'COMPLETED', label: '完成', icon: '🎉', desc: '整个流程已顺利结束' },
    ];

    const currentStep = STAGE_CONFIG[currentStage]?.step || 1;
    const isRollback = currentStage === 'ROLLBACK';

    if (isRollback) {
        return (
            <div className="stage-progress-container">
                <div className="progress-steps rollback-view">
                    <div className="progress-step rollback">
                        <div className="step-circle rollback-circle">
                            ⚠️
                        </div>
                        <span className="step-label rollback-label">已回滚</span>
                    </div>
                </div>
                <style jsx>{progressStyles}</style>
            </div>
        );
    }

    const stageGuidance = getStageGuidance(currentStage, userRole);
    const currentStageInfo = stages.find(s => s.key === currentStage);

    return (
        <div className="stage-progress-container">
            {/* 流程步骤 */}
            <div className="progress-steps">
                {stages.map((stage, index) => {
                    const step = index + 1;
                    const isCompleted = step < currentStep;
                    const isActive = step === currentStep;

                    return (
                        <div
                            key={stage.key}
                            className={`progress-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}
                        >
                            <div className="step-circle">
                                {isCompleted ? '✓' : stage.icon}
                            </div>
                            <div className="step-info">
                                <span className="step-label">{stage.label}</span>
                                <span className="step-desc">{stage.desc}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 当前阶段操作指引（集成在流程图下方） */}
            {stageGuidance && currentStage !== 'COMPLETED' && (
                <div className="guidance-panel">
                    <div className="guidance-header" onClick={() => setShowGuidance(!showGuidance)}>
                        <div className="guidance-title">
                            <span className="guidance-icon">💡</span>
                            <span>当前阶段操作指引</span>
                            <span className="guidance-stage-badge">{currentStageInfo?.label}</span>
                        </div>
                        <button className="guidance-toggle">
                            {showGuidance ? '收起 ▲' : '展开 ▼'}
                        </button>
                    </div>
                    
                    {showGuidance && (
                        <div className="guidance-content">
                            <ul className="guidance-list">
                                {stageGuidance.items.map((item, index) => (
                                    <li key={index}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            <style jsx>{progressStyles}</style>
        </div>
    );
}

const progressStyles = `
    .stage-progress-container {
        width: 100%;
    }

    /* 流程步骤 */
    .progress-steps {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        padding: 20px 0;
        position: relative;
    }

    .progress-steps.rollback-view {
        justify-content: center;
    }

    .progress-step {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        flex: 1;
        position: relative;
        z-index: 1;
    }

    /* 连接线 */
    .progress-step::after {
        content: '';
        position: absolute;
        top: 18px;
        left: 50%;
        width: 100%;
        height: 3px;
        background: var(--border-color);
        z-index: -1;
    }

    .progress-step:last-child::after {
        display: none;
    }

    .progress-step.completed::after {
        background: linear-gradient(90deg, var(--success) 0%, var(--success) 100%);
    }

    .progress-step.active::after {
        background: linear-gradient(90deg, var(--success) 0%, var(--border-color) 50%);
    }

    /* 步骤圆圈 */
    .step-circle {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        font-weight: 700;
        background: var(--bg-tertiary);
        border: 3px solid var(--border-color);
        transition: all 0.3s ease;
        flex-shrink: 0;
    }

    .progress-step.completed .step-circle {
        background: var(--success);
        border-color: var(--success);
        color: white;
        box-shadow: 0 0 12px rgba(16, 185, 129, 0.4);
    }

    .progress-step.active .step-circle {
        background: var(--primary);
        border-color: var(--primary);
        color: white;
        box-shadow: 0 0 16px rgba(99, 102, 241, 0.5);
        transform: scale(1.1);
    }

    /* 步骤信息 */
    .step-info {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
    }

    .step-label {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-muted);
        text-align: center;
    }

    .progress-step.completed .step-label,
    .progress-step.active .step-label {
        color: var(--text-primary);
    }

    .step-desc {
        font-size: 11px;
        color: var(--text-muted);
        text-align: center;
        max-width: 120px;
        line-height: 1.3;
    }

    /* 回滚状态 */
    .progress-step.rollback .step-circle {
        width: 56px;
        height: 56px;
        font-size: 24px;
    }

    .rollback-circle {
        background: var(--error) !important;
        border-color: var(--error) !important;
        box-shadow: 0 0 20px rgba(239, 68, 68, 0.5);
    }

    .rollback-label {
        color: var(--error) !important;
        font-size: 16px !important;
        font-weight: 700 !important;
    }

    /* 操作指引面板 */
    .guidance-panel {
        margin-top: 20px;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        overflow: hidden;
        border-left: 4px solid var(--primary);
    }

    .guidance-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px 18px;
        cursor: pointer;
        transition: background 0.2s ease;
    }

    .guidance-header:hover {
        background: var(--bg-tertiary);
    }

    .guidance-title {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-primary);
    }

    .guidance-icon {
        font-size: 16px;
    }

    .guidance-stage-badge {
        font-size: 11px;
        font-weight: 500;
        padding: 3px 8px;
        background: rgba(99, 102, 241, 0.15);
        color: var(--primary-light);
        border-radius: 100px;
    }

    .guidance-toggle {
        background: none;
        border: none;
        font-size: 12px;
        color: var(--text-muted);
        cursor: pointer;
        padding: 4px 8px;
        border-radius: var(--radius-sm);
        transition: all 0.2s ease;
    }

    .guidance-toggle:hover {
        background: var(--bg-tertiary);
        color: var(--text-primary);
    }

    .guidance-content {
        padding: 0 18px 16px;
        animation: slideDown 0.2s ease;
    }

    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .guidance-list {
        margin: 0;
        padding-left: 20px;
        font-size: 13px;
        color: var(--text-secondary);
        line-height: 1.8;
    }

    .guidance-list li {
        margin-bottom: 4px;
    }

    .guidance-list li:last-child {
        margin-bottom: 0;
    }

    /* 响应式 - 平板 */
    @media (max-width: 1024px) {
        .step-desc {
            font-size: 10px;
            max-width: 100px;
        }
    }

    /* 响应式 - 手机 */
    @media (max-width: 768px) {
        .progress-steps {
            flex-wrap: wrap;
            gap: 12px;
            padding: 16px 0;
        }

        .progress-step {
            flex: 0 0 calc(50% - 6px);
        }

        .progress-step::after {
            display: none;
        }

        .step-circle {
            width: 32px;
            height: 32px;
            font-size: 14px;
        }

        .progress-step.active .step-circle {
            transform: scale(1.05);
        }

        .step-info {
            gap: 2px;
        }

        .step-label {
            font-size: 12px;
        }

        .step-desc {
            display: none;
        }

        /* 操作指引面板 */
        .guidance-panel {
            margin-top: 16px;
        }

        .guidance-header {
            padding: 12px 14px;
        }

        .guidance-title {
            font-size: 13px;
            gap: 8px;
            flex-wrap: wrap;
        }

        .guidance-icon {
            font-size: 14px;
        }

        .guidance-stage-badge {
            font-size: 10px;
            padding: 2px 6px;
        }

        .guidance-toggle {
            font-size: 11px;
            padding: 3px 6px;
        }

        .guidance-content {
            padding: 0 14px 14px;
        }

        .guidance-list {
            font-size: 12px;
            padding-left: 16px;
            line-height: 1.7;
        }
    }

    /* 超小屏幕 */
    @media (max-width: 480px) {
        .progress-steps {
            gap: 10px;
            padding: 12px 0;
        }

        .progress-step {
            flex: 0 0 calc(50% - 5px);
        }

        .step-circle {
            width: 28px;
            height: 28px;
            font-size: 12px;
            border-width: 2px;
        }

        .step-label {
            font-size: 11px;
        }

        .guidance-title {
            font-size: 12px;
        }

        .guidance-list {
            font-size: 11px;
        }
    }
`;
