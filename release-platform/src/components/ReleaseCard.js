'use client';

import { memo } from 'react';
import Link from 'next/link';
import useDictionary from '@/hooks/useDictionary';
import { UserIcon, CalendarIcon, ClockIcon, ArrowIcon } from '@/components/Icons';
import { formatDate, formatRelativeTime } from '@/lib/utils';

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

function ReleaseCard({ release }) {
    // 从数据字典获取状态名称
    const { getLabel: getStatusLabel } = useDictionary('status');
    
    const statusLabel = getStatusLabel(release.status);
    const statusClass = STATUS_CLASS_MAP[release.status] || 'status-draft';
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

// 使用 memo 优化性能，避免不必要的重渲染
export default memo(ReleaseCard, (prevProps, nextProps) => {
    // 只有当 release 的关键属性变化时才重新渲染
    return (
        prevProps.release.id === nextProps.release.id &&
        prevProps.release.version === nextProps.release.version &&
        prevProps.release.status === nextProps.release.status &&
        prevProps.release.stage === nextProps.release.stage &&
        prevProps.release.description === nextProps.release.description
    );
});
