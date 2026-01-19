'use client';

import Link from 'next/link';
import useDictionary from '@/hooks/useDictionary';

const STAGE_CONFIG = {
    PREPARATION: { label: '准备阶段', icon: '📋', color: 'var(--info)' },
    IMPLEMENTATION: { label: '实施阶段', icon: '⚙️', color: 'var(--warning)' },
    VERIFICATION: { label: '验证阶段', icon: '🔍', color: 'var(--primary)' },
    COMPLETED: { label: '已完成', icon: '✅', color: 'var(--success)' },
    ROLLBACK: { label: '已回滚', icon: '↩️', color: 'var(--error)' },
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
    const isCompleted = release.stage === 'COMPLETED';
    const isFailed = release.stage === 'ROLLBACK';

    return (
        <Link href={`/releases/${release.id}`} className="card-link">
            <div className="release-card">
                {/* 顶部状态条 */}
                <div className="card-status-bar" style={{ '--status-color': stage.color }} />
                
                {/* 头部 */}
                <div className="card-header">
                    <div className="card-title-section">
                        <h3 className="card-title">{release.version}</h3>
                        <span className="card-creator">
                            由 {release.createdBy?.name || '未知'} 创建
                        </span>
                    </div>
                    <span className={`status-badge ${status.class}`}>
                        {status.label}
                    </span>
                </div>

                {/* 描述 */}
                <p className="card-desc">{release.description || '暂无描述'}</p>

                {/* 底部信息 */}
                <div className="card-footer">
                    <div className="stage-info">
                        <span className="stage-icon">{stage.icon}</span>
                        <span className="stage-label">{stage.label}</span>
                    </div>

                    {release.plannedDate && (
                        <div className="date-info">
                            <CalendarIcon />
                            <span>{formatDate(release.plannedDate)}</span>
                        </div>
                    )}
                </div>

                {/* 悬停光效 */}
                <div className="card-glow" />
            </div>
        </Link>
    );
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
    });
}

function CalendarIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    );
}
