'use client';

import Link from 'next/link';

const STAGE_LABELS = {
    PREPARATION: '准备阶段',
    IMPLEMENTATION: '实施阶段',
    VERIFICATION: '验证阶段',
    COMPLETED: '已完成',
    ROLLBACK: '已回滚',
};

const STATUS_STYLES = {
    DRAFT: { label: '草稿', class: 'badge-info' },
    PENDING_REVIEW: { label: '待评审', class: 'badge-warning' },
    IN_PROGRESS: { label: '进行中', class: 'badge-primary' },
    SUCCESS: { label: '发版成功', class: 'badge-success' },
    FAILED: { label: '发版失败', class: 'badge-error' },
};

export default function ReleaseCard({ release }) {
    const statusStyle = STATUS_STYLES[release.status] || STATUS_STYLES.DRAFT;
    const isCompleted = release.stage === 'COMPLETED';
    const isFailed = release.stage === 'ROLLBACK';

    return (
        <Link href={`/releases/${release.id}`} className="release-card-link">
            <div className="card release-card">
                <div className="release-card-header">
                    <div className="release-card-title-wrap">
                        <h3 className="release-card-title">
                            {release.version}
                        </h3>
                        <p className="release-card-creator">
                            由 {release.createdBy?.name || '未知'} 创建
                        </p>
                    </div>
                    <span className={`badge ${statusStyle.class}`}>
                        {statusStyle.label}
                    </span>
                </div>

                <p className="release-card-desc">
                    {release.description}
                </p>

                <div className="release-card-footer">
                    <div className="release-card-stage">
                        <span className="release-card-stage-icon">
                            {isCompleted ? '🎉' : isFailed ? '⚠️' : '🔄'}
                        </span>
                        <span className="release-card-stage-label">
                            {STAGE_LABELS[release.stage]}
                        </span>
                    </div>

                    {release.plannedDate && (
                        <span className="release-card-date">
                            📅 {new Date(release.plannedDate).toLocaleDateString('zh-CN')}
                        </span>
                    )}
                </div>
            </div>

            <style jsx>{`
                .release-card-link {
                    text-decoration: none;
                    display: block;
                }

                .release-card {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                }

                .release-card-header {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 12px;
                    margin-bottom: 16px;
                }

                .release-card-title-wrap {
                    flex: 1;
                    min-width: 0;
                }

                .release-card-title {
                    font-size: 18px;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin: 0;
                    word-break: break-word;
                }

                .release-card-creator {
                    font-size: 12px;
                    color: var(--text-muted);
                    margin-top: 4px;
                }

                .release-card-desc {
                    font-size: 14px;
                    color: var(--text-secondary);
                    margin-bottom: 16px;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    flex: 1;
                }

                .release-card-footer {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding-top: 16px;
                    border-top: 1px solid var(--border-color);
                    gap: 8px;
                }

                .release-card-stage {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .release-card-stage-icon {
                    font-size: 16px;
                    opacity: ${isCompleted ? 1 : isFailed ? 0.8 : 0.6};
                }

                .release-card-stage-label {
                    font-size: 13px;
                    color: var(--text-secondary);
                }

                .release-card-date {
                    font-size: 12px;
                    color: var(--text-muted);
                    white-space: nowrap;
                }

                @media (max-width: 768px) {
                    .release-card {
                        padding: 14px;
                    }

                    .release-card-header {
                        margin-bottom: 12px;
                    }

                    .release-card-title {
                        font-size: 16px;
                    }

                    .release-card-creator {
                        font-size: 11px;
                    }

                    .release-card-desc {
                        font-size: 13px;
                        margin-bottom: 12px;
                        -webkit-line-clamp: 2;
                    }

                    .release-card-footer {
                        padding-top: 12px;
                        flex-wrap: wrap;
                    }

                    .release-card-stage-icon {
                        font-size: 14px;
                    }

                    .release-card-stage-label {
                        font-size: 12px;
                    }

                    .release-card-date {
                        font-size: 11px;
                    }
                }

                @media (max-width: 480px) {
                    .release-card {
                        padding: 12px;
                    }

                    .release-card-title {
                        font-size: 15px;
                    }
                }
            `}</style>
        </Link>
    );
}
