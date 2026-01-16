'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import useRoles from '@/hooks/useRoles';

// 检查用户是否有权限
function hasPermission(userRoleString, allowedRoles) {
    if (!userRoleString) return false;
    const userRoles = userRoleString.split(',');
    return userRoles.includes('PM') || allowedRoles.some(r => userRoles.includes(r));
}

export default function ChecklistPanel({ checklists, stage, userRole, onSubmit, onBeforeSubmit }) {
    const [updating, setUpdating] = useState(false);
    const { getRoleLabel } = useRoles();
    const [localChecked, setLocalChecked] = useState({});

    // 按阶段筛选
    const stageItems = checklists.filter(item => item.stage === stage);

    // 按角色筛选可见项
    const isPM = (userRole || '').includes('PM');
    const userRoleList = (userRole || '').split(',');

    const visibleItems = stageItems.filter(item => {
        if (isPM) return true;
        return item.allowedRoles.some(r => userRoleList.includes(r));
    });

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
        // 如果有 onBeforeSubmit 回调，先执行校验和保存
        if (onBeforeSubmit) {
            try {
                const validationResult = await onBeforeSubmit(localChecked);
                if (validationResult === false) {
                    return; // 校验失败，不提交
                }
            } catch (error) {
                console.error('校验或保存失败:', error);
                return;
            }
        }

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
    const hasChanges = Object.keys(localChecked).length > 0;

    return (
        <div className="checklist-panel">
            {/* 头部 */}
            <div className="panel-header">
                <div className="header-info">
                    <div className="header-title">
                        <ChecklistIcon />
                        <span>检查清单</span>
                    </div>
                    <p className="header-count">
                        <span className="count-done">{completedCount}</span>
                        <span className="count-sep">/</span>
                        <span className="count-total">{totalCount}</span>
                        <span className="count-label">项已确认</span>
                    </p>
                </div>
                
                {/* 进度环 */}
                <div className="progress-ring">
                    <svg viewBox="0 0 36 36">
                        <circle className="ring-bg" cx="18" cy="18" r="16" />
                        <circle 
                            className="ring-progress" 
                            cx="18" 
                            cy="18" 
                            r="16"
                            style={{ 
                                strokeDashoffset: 100 - progress,
                                stroke: progress === 100 ? 'var(--success)' : 'var(--primary)'
                            }}
                        />
                    </svg>
                    <span className="ring-text">{Math.round(progress)}%</span>
                </div>
            </div>

            {/* 清单列表 */}
            <div className="checklist-items">
                {visibleItems.length === 0 ? (
                    <div className="empty-state">
                        <EmptyIcon />
                        <p>当前职责下暂无检查项</p>
                    </div>
                ) : (
                    visibleItems.map((item, index) => {
                        const isChecked = getIsChecked(item);
                        const isOriginalChecked = item.checked;
                        const isDirty = localChecked[item.itemKey] !== undefined && localChecked[item.itemKey] !== item.checked;
                        const canOperate = hasPermission(userRole, item.allowedRoles);

                        return (
                            <div
                                key={item.itemKey}
                                className={`checklist-item ${isChecked ? 'checked' : ''} ${isDirty ? 'dirty' : ''}`}
                                onClick={() => canOperate && handleToggle(item)}
                                style={{ 
                                    cursor: canOperate ? 'pointer' : 'default',
                                    animationDelay: `${index * 0.03}s`
                                }}
                            >
                                <div className={`item-checkbox ${isChecked ? 'checked' : ''}`}>
                                    {isChecked && <CheckIcon />}
                                </div>
                                
                                <div className="item-content">
                                    <span className={`item-label ${isChecked ? 'checked' : ''}`}>
                                        {item.label}
                                    </span>
                                    {isOriginalChecked && item.confirmedBy && (
                                        <span className="item-meta">
                                            由 {item.confirmedBy.name} 确认
                                        </span>
                                    )}
                                    {isDirty && (
                                        <span className="item-dirty">未提交</span>
                                    )}
                                </div>
                                
                                <div className="item-roles">
                                    {item.allowedRoles.map(role => (
                                        <span key={role} className="role-tag">
                                            {getRoleLabel(role)}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* 提交按钮 */}
            {visibleItems.length > 0 && hasChanges && (
                <div className="submit-section">
                    <button
                        className="submit-btn"
                        onClick={handleSubmit}
                        disabled={updating}
                    >
                        {updating ? (
                            <>
                                <span className="spinner" />
                                <span>提交中...</span>
                            </>
                        ) : (
                            <>
                                <SubmitIcon />
                                <span>提交确认</span>
                            </>
                        )}
                    </button>
                    <p className="submit-hint">请确认勾选无误后点击提交</p>
                </div>
            )}
        </div>
    );
}

// 图标组件
function ChecklistIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

function EmptyIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="9" y1="9" x2="15" y2="15" />
            <line x1="15" y1="9" x2="9" y2="15" />
        </svg>
    );
}

function SubmitIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    );
}
