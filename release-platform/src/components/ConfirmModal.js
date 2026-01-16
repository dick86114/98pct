'use client';

import { useEffect } from 'react';

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title = '确认操作',
    message = '确定要执行此操作吗？',
    confirmText = '确认',
    cancelText = '取消',
    type = 'default', // default, danger, warning, success
    loading = false,
}) {
    // ESC 键关闭
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    // 阻止背景滚动
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const typeConfig = {
        default: { icon: InfoIcon, color: 'var(--primary)', btnClass: 'btn-primary' },
        danger: { icon: AlertIcon, color: 'var(--error)', btnClass: 'btn-danger' },
        warning: { icon: WarningIcon, color: 'var(--warning)', btnClass: 'btn-warning' },
        success: { icon: CheckIcon, color: 'var(--success)', btnClass: 'btn-success' },
    };

    const config = typeConfig[type] || typeConfig.default;
    const Icon = config.icon;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="modal-content">
                    {/* 图标 */}
                    <div className="modal-icon" style={{ '--icon-color': config.color }}>
                        <Icon />
                        <div className="icon-glow" />
                    </div>

                    {/* 标题和消息 */}
                    <h3 className="modal-title">{title}</h3>
                    <p className="modal-message">{message}</p>

                    {/* 按钮 */}
                    <div className="modal-actions">
                        <button 
                            className="btn btn-secondary" 
                            onClick={onClose}
                            disabled={loading}
                        >
                            {cancelText}
                        </button>
                        <button 
                            className={`btn ${config.btnClass}`}
                            onClick={onConfirm}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner" />
                                    <span>处理中...</span>
                                </>
                            ) : (
                                confirmText
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function InfoIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
    );
}

function AlertIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
    );
}

function WarningIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    );
}
