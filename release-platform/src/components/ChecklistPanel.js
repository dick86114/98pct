'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import useRoles from '@/hooks/useRoles';

// 检查用户是否有权限
function hasPermission(userRoleString, allowedRoles) {
    if (!userRoleString) return false;
    const userRoles = userRoleString.split(',');
    // PM 拥有所有权限，或者用户拥有 allowedRoles 中的任一角色
    return userRoles.includes('PM') || allowedRoles.some(r => userRoles.includes(r));
}

export default function ChecklistPanel({ checklists, stage, userRole, onSubmit }) {
    const [updating, setUpdating] = useState(false);
    const { getRoleLabel } = useRoles();

    // 按阶段筛选
    const stageItems = checklists.filter(item => item.stage === stage);

    // 按角色筛选可见项（PM 可见全部，其他角色只能看到自己的）
    const isPM = (userRole || '').includes('PM');
    const userRoleList = (userRole || '').split(',');

    const visibleItems = stageItems.filter(item => {
        if (isPM) return true;
        return item.allowedRoles.some(r => userRoleList.includes(r));
    });

    const [localChecked, setLocalChecked] = useState({});

    const getIsChecked = (item) => {
        return localChecked[item.itemKey] !== undefined
            ? localChecked[item.itemKey]
            : item.checked;
    };

    const handleToggle = (item) => {
        const current = getIsChecked(item);
        setLocalChecked(prev => ({
            ...prev,
            [item.itemKey]: !current
        }));
    };

    const handleSubmit = async () => {
        setUpdating(true);
        try {
            const changedKeys = Object.keys(localChecked);
            if (changedKeys.length === 0) {
                toast('没有更改需要提交');
                return;
            }

            await onSubmit(localChecked);
            setLocalChecked({});
        } finally {
            setUpdating(false);
        }
    };

    const completedCount = stageItems.filter(item => item.checked).length;
    const totalCount = stageItems.length;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    return (
        <div className="card checklist-panel">
            <div className="checklist-panel-header">
                <div className="checklist-panel-info">
                    <h3 className="card-title">检查清单</h3>
                    <p className="checklist-panel-count">
                        {completedCount} / {totalCount} 项已确认 (全局)
                    </p>
                </div>
                {/* 进度条 */}
                <div className="checklist-progress-bar">
                    <div 
                        className="checklist-progress-fill" 
                        style={{ 
                            width: `${progress}%`,
                            background: progress === 100 ? 'var(--success)' : 'var(--primary)'
                        }} 
                    />
                </div>
            </div>

            <div className="checklist">
                {visibleItems.length === 0 ? (
                    <p className="checklist-empty">当前的职责下暂无检查项</p>
                ) : (
                    visibleItems.map((item) => {
                        const isChecked = getIsChecked(item);
                        const isOriginalChecked = item.checked;
                        const isDirty = localChecked[item.itemKey] !== undefined && localChecked[item.itemKey] !== item.checked;
                        const canOperate = hasPermission(userRole, item.allowedRoles);

                        return (
                            <div
                                key={item.itemKey}
                                className={`checklist-item ${isChecked ? 'checked' : ''} ${isDirty ? 'dirty' : ''}`}
                                onClick={() => canOperate && handleToggle(item)}
                                style={{ cursor: canOperate ? 'pointer' : 'default' }}
                            >
                                <div className="checklist-checkbox">
                                    {isChecked && '✓'}
                                </div>
                                <div className="checklist-content">
                                    <div className="checklist-label">{item.label}</div>
                                    {isOriginalChecked && item.confirmedBy && (
                                        <div className="checklist-meta">
                                            由 {item.confirmedBy.name} 确认
                                        </div>
                                    )}
                                    {isDirty && (
                                        <div className="checklist-meta checklist-dirty-hint">
                                            (未提交)
                                        </div>
                                    )}
                                </div>
                                <div className="checklist-roles">
                                    {item.allowedRoles.map(role => (
                                        <span key={role} className="badge badge-info checklist-role-badge">
                                            {getRoleLabel(role)}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {visibleItems.length > 0 && Object.keys(localChecked).length > 0 && (
                <div className="checklist-submit-section">
                    <button
                        className="btn btn-primary checklist-submit-btn"
                        onClick={handleSubmit}
                        disabled={updating}
                    >
                        {updating ? '提交中...' : '提交确认'}
                    </button>
                    <p className="checklist-submit-hint">
                        请确认勾选无误后点击提交
                    </p>
                </div>
            )}

            <style jsx>{`
                .checklist-panel-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 20px;
                    padding-bottom: 16px;
                    border-bottom: 1px solid var(--border-color);
                    gap: 16px;
                }

                .checklist-panel-info {
                    flex: 1;
                }

                .checklist-panel-count {
                    font-size: 14px;
                    color: var(--text-muted);
                    margin-top: 4px;
                }

                .checklist-progress-bar {
                    width: 120px;
                    height: 8px;
                    background: var(--bg-tertiary);
                    border-radius: 100px;
                    overflow: hidden;
                    flex-shrink: 0;
                }

                .checklist-progress-fill {
                    height: 100%;
                    border-radius: 100px;
                    transition: width 0.3s ease;
                }

                .checklist-empty {
                    padding: 20px;
                    text-align: center;
                    color: var(--text-muted);
                }

                .checklist-item.dirty {
                    border-left: 3px solid var(--warning);
                }

                .checklist-dirty-hint {
                    color: var(--warning) !important;
                }

                .checklist-role-badge {
                    font-size: 10px;
                    padding: 2px 6px;
                }

                .checklist-submit-section {
                    margin-top: 16px;
                    padding-top: 16px;
                    border-top: 1px solid var(--border-color);
                }

                .checklist-submit-btn {
                    width: 100%;
                }

                .checklist-submit-hint {
                    font-size: 12px;
                    color: var(--text-muted);
                    text-align: center;
                    margin-top: 8px;
                }

                @media (max-width: 768px) {
                    .checklist-panel-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 12px;
                        margin-bottom: 16px;
                        padding-bottom: 12px;
                    }

                    .checklist-progress-bar {
                        width: 100%;
                        height: 6px;
                    }

                    .checklist-panel-count {
                        font-size: 13px;
                    }

                    .checklist-role-badge {
                        font-size: 9px;
                        padding: 2px 4px;
                    }

                    .checklist-roles {
                        display: none;
                    }
                }
            `}</style>
        </div>
    );
}
