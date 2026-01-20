'use client';

import Link from 'next/link';
import useDictionary from '@/hooks/useDictionary';

const STAGE_CONFIG = {
    PREPARATION: { label: '准备阶段', icon: '📋', color: 'info', gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' },
    IMPLEMENTATION: { label: '实施阶段', icon: '⚙️', color: 'warning', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
    VERIFICATION: { label: '验证阶段', icon: '🔍', color: 'primary', gradient: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' },
    COMPLETED: { label: '已完成', icon: '✅', color: 'success', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
    ROLLBACK: { label: '已回滚', icon: '↩️', color: 'error', gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' },
};

// 状态样式类映射
const STATUS_CLASS_MAP = {
    DRAFT: 'status-draft',
    PENDING_REVIEW: 'status-pending',
    IN_PROGRESS: 'status-progress',
    SUCCESS: 'status-success',
    FAILED: 'status-failed',
};

export default function ReleaseCard({ release }) {
    // 从数据字典获取状态名称
    const { getLabel: getStatusLabel } = useDictionary('status');
    
    const statusLabel = getStatusLabel(release.status);
    const statusClass = STATUS_CLASS_MAP[release.status] || 'status-draft';
    const status = { label: statusLabel, class: statusClass };
    
    const stage = STAGE_CONFIG[release.stage] || STAGE_CONFIG.PREPARATION;

    return (
        <Link href={`/releases/${release.id}`} className="release-card-link">
            <div className="release-card-v2">
                {/* 左侧彩色边条 */}
                <div className="release-card-accent" style={{ background: stage.gradient }} />
                
                {/* 头部区域 */}
                <div className="release-card-header">
                    <div className="release-card-title-section">
                        <div className="release-card-title-content">
                            <h3 className="release-card-title">
                                {release.projectName ? `${release.projectName} - ${release.version}` : release.version}
                            </h3>
                            <div className="release-card-meta">
                                <span className="release-card-creator">
                                    <UserIcon />
                                    {release.createdBy?.name || '未知'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <span className={`release-status-badge badge-${stage.color}`}>
                        {stage.label}
                    </span>
                </div>

                {/* 描述区域 */}
                <div className="release-card-body">
                    <p className="release-card-description">
                        {release.description || '暂无描述'}
                    </p>
                </div>

                {/* 底部信息栏 */}
                <div className="release-card-footer">
                    <div className="release-card-info-group">
                        {release.plannedDate && (
                            <div className="release-card-info-item">
                                <CalendarIcon />
                                <span>计划：{formatDate(release.plannedDate)}</span>
                            </div>
                        )}
                        <div className="release-card-info-item">
                            <ClockIcon />
                            <span>创建：{formatRelativeTime(release.createdAt)}</span>
                        </div>
                    </div>
                    <div className="release-card-arrow">
                        <ArrowIcon />
                    </div>
                </div>

                {/* 悬停光效 */}
                <div className="release-card-glow" />
            </div>
        </Link>
    );
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
        month: 'long',
        day: 'numeric',
    });
}

function formatRelativeTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    if (days < 30) return `${Math.floor(days / 7)}周前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function UserIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    );
}

function CalendarIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    );
}

function ClockIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    );
}

function ArrowIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
        </svg>
    );
}
