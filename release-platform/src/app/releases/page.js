'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ReleaseCard from '@/components/ReleaseCard';

const STATUS_OPTIONS = [
    { value: '', label: '全部状态', icon: '📊' },
    { value: 'DRAFT', label: '草稿', icon: '📝' },
    { value: 'PENDING_REVIEW', label: '待评审', icon: '⏳' },
    { value: 'IN_PROGRESS', label: '进行中', icon: '🔄' },
    { value: 'SUCCESS', label: '成功', icon: '✅' },
    { value: 'FAILED', label: '失败', icon: '❌' },
];

const STAGE_OPTIONS = [
    { value: '', label: '全部阶段', icon: '📋' },
    { value: 'PREPARATION', label: '准备阶段', icon: '📋' },
    { value: 'IMPLEMENTATION', label: '实施阶段', icon: '⚙️' },
    { value: 'VERIFICATION', label: '验证阶段', icon: '🔍' },
    { value: 'COMPLETED', label: '已完成', icon: '🎉' },
    { value: 'ROLLBACK', label: '已回滚', icon: '↩️' },
];

export default function ReleasesPage() {
    const router = useRouter();
    const [releases, setReleases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [user, setUser] = useState(null);
    const [filters, setFilters] = useState({
        status: '',
        stage: '',
    });

    useEffect(() => {
        setMounted(true);
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        
        if (!token) {
            router.push('/login');
            return;
        }
        
        if (userStr) {
            setUser(JSON.parse(userStr));
        }
        
        fetchReleases(token);
    }, [router]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            fetchReleases(token);
        }
    }, [filters]);

    const fetchReleases = async (token) => {
        try {
            const params = new URLSearchParams();
            if (filters.status) params.append('status', filters.status);
            if (filters.stage) params.append('stage', filters.stage);

            const res = await fetch(`/api/releases?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (res.status === 401) {
                router.push('/login');
                return;
            }

            const data = await res.json();
            setReleases(data.releases || []);
        } catch (error) {
            console.error('获取发版列表失败:', error);
        } finally {
            setLoading(false);
        }
    };

    const isPM = user?.role?.split(',').includes('PM');
    const hasFilters = filters.status || filters.stage;

    if (loading) {
        return (
            <>
                <Navbar />
                <main className="releases-page">
                    <div className="container">
                        <div className="loading-state">
                            <div className="loading-spinner" />
                            <p>加载中...</p>
                        </div>
                    </div>
                </main>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <main className={`releases-page ${mounted ? 'mounted' : ''}`}>
                <div className="container">
                    {/* 页面头部 */}
                    <div className="page-header">
                        <div className="header-content">
                            <div className="header-badge">
                                <RocketIcon />
                                <span>发版管理</span>
                            </div>
                            <h1 className="page-title">发版记录</h1>
                            <p className="page-subtitle">
                                共 <span className="count">{releases.length}</span> 条发版记录
                            </p>
                        </div>
                        {isPM && (
                            <button
                                className="create-btn"
                                onClick={() => router.push('/releases/new')}
                            >
                                <PlusIcon />
                                <span>新建发版</span>
                            </button>
                        )}
                    </div>

                    {/* 筛选器 */}
                    <div className="filter-section">
                        <div className="filter-row">
                            <div className="filter-group">
                                <label className="filter-label">
                                    <FilterIcon />
                                    状态筛选
                                </label>
                                <div className="filter-chips">
                                    {STATUS_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            className={`filter-chip ${filters.status === opt.value ? 'active' : ''}`}
                                            onClick={() => setFilters({ ...filters, status: opt.value })}
                                        >
                                            <span className="chip-icon">{opt.icon}</span>
                                            <span>{opt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="filter-group">
                                <label className="filter-label">
                                    <StageIcon />
                                    阶段筛选
                                </label>
                                <div className="filter-chips">
                                    {STAGE_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            className={`filter-chip ${filters.stage === opt.value ? 'active' : ''}`}
                                            onClick={() => setFilters({ ...filters, stage: opt.value })}
                                        >
                                            <span className="chip-icon">{opt.icon}</span>
                                            <span>{opt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {hasFilters && (
                            <button
                                className="clear-btn"
                                onClick={() => setFilters({ status: '', stage: '' })}
                            >
                                <CloseIcon />
                                <span>清除筛选</span>
                            </button>
                        )}
                    </div>

                    {/* 发版列表 */}
                    {releases.length > 0 ? (
                        <div className="releases-grid">
                            {releases.map((release, index) => (
                                <div 
                                    key={release.id} 
                                    className="release-item"
                                    style={{ animationDelay: `${index * 0.05}s` }}
                                >
                                    <ReleaseCard release={release} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-card">
                            <div className="empty-illustration">
                                <EmptyIcon />
                            </div>
                            <h3 className="empty-title">
                                {hasFilters ? '没有符合条件的记录' : '暂无发版记录'}
                            </h3>
                            <p className="empty-text">
                                {hasFilters 
                                    ? '尝试调整筛选条件查看更多记录'
                                    : '点击右上角按钮创建第一个发版'
                                }
                            </p>
                            {!hasFilters && isPM && (
                                <button
                                    className="empty-btn"
                                    onClick={() => router.push('/releases/new')}
                                >
                                    <PlusIcon />
                                    <span>新建发版</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}

// 样式已迁移到 globals.css
const _unusedStyles = `
    .releases-page {
        padding: 32px 0;
        min-height: calc(100vh - 64px);
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.6s var(--ease-out-expo);
    }

    .releases-page.mounted {
        opacity: 1;
        transform: translateY(0);
    }

    .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 60vh;
        gap: 16px;
        color: var(--text-muted);
    }

    .loading-spinner {
        width: 48px;
        height: 48px;
        border: 3px solid var(--bg-tertiary);
        border-top-color: var(--primary);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    /* 页面头部 */
    .page-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 24px;
        margin-bottom: 32px;
    }

    .header-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 14px;
        background: var(--primary-subtle);
        border: 1px solid rgba(14, 165, 233, 0.2);
        border-radius: var(--radius-full);
        font-size: 12px;
        font-weight: 600;
        color: var(--primary-light);
        margin-bottom: 12px;
    }

    .header-badge :global(svg) {
        width: 14px;
        height: 14px;
    }

    .page-title {
        font-family: var(--font-display);
        font-size: 36px;
        font-weight: 800;
        color: var(--text-primary);
        letter-spacing: -0.03em;
        margin-bottom: 8px;
    }

    .page-subtitle {
        font-size: 15px;
        color: var(--text-muted);
    }

    .page-subtitle .count {
        font-family: var(--font-mono);
        font-weight: 600;
        color: var(--primary-light);
    }

    .create-btn {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 28px;
        font-family: var(--font-sans);
        font-size: 15px;
        font-weight: 600;
        color: white;
        background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
        border: none;
        border-radius: var(--radius-xl);
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 24px var(--primary-glow);
    }

    .create-btn:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 40px var(--primary-glow);
    }

    .create-btn :global(svg) {
        width: 20px;
        height: 20px;
    }

    /* 筛选器 */
    .filter-section {
        background: var(--glass-bg);
        backdrop-filter: blur(20px);
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-xl);
        padding: 24px;
        margin-bottom: 28px;
    }

    .filter-row {
        display: flex;
        flex-direction: column;
        gap: 20px;
    }

    .filter-group {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .filter-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        font-weight: 600;
        color: var(--text-muted);
    }

    .filter-label :global(svg) {
        width: 16px;
        height: 16px;
    }

    .filter-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }

    .filter-chip {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        font-size: 13px;
        font-weight: 500;
        color: var(--text-secondary);
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-full);
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .filter-chip:hover {
        background: var(--bg-tertiary);
        border-color: var(--primary);
        color: var(--text-primary);
    }

    .filter-chip.active {
        background: var(--primary-subtle);
        border-color: var(--primary);
        color: var(--primary-light);
    }

    .chip-icon {
        font-size: 14px;
    }

    .clear-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 16px;
        padding: 10px 16px;
        font-size: 13px;
        font-weight: 500;
        color: var(--text-muted);
        background: transparent;
        border: 1px dashed var(--border-color);
        border-radius: var(--radius-lg);
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .clear-btn:hover {
        color: var(--error);
        border-color: var(--error);
        background: rgba(239, 68, 68, 0.05);
    }

    .clear-btn :global(svg) {
        width: 14px;
        height: 14px;
    }

    /* 发版网格 */
    .releases-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 20px;
    }

    .release-item {
        animation: fadeSlideUp 0.4s ease backwards;
    }

    @keyframes fadeSlideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }

    /* 空状态 */
    .empty-card {
        background: var(--glass-bg);
        backdrop-filter: blur(20px);
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-xl);
        padding: 80px 24px;
        text-align: center;
    }

    .empty-illustration {
        width: 120px;
        height: 120px;
        margin: 0 auto 28px;
        border-radius: 50%;
        background: var(--bg-secondary);
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .empty-illustration :global(svg) {
        width: 56px;
        height: 56px;
        color: var(--text-dim);
    }

    .empty-title {
        font-family: var(--font-display);
        font-size: 20px;
        font-weight: 700;
        color: var(--text-secondary);
        margin-bottom: 10px;
    }

    .empty-text {
        font-size: 14px;
        color: var(--text-muted);
        margin-bottom: 24px;
    }

    .empty-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 12px 24px;
        font-size: 14px;
        font-weight: 600;
        color: white;
        background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
        border: none;
        border-radius: var(--radius-lg);
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 20px var(--primary-glow);
    }

    .empty-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 30px var(--primary-glow);
    }

    .empty-btn :global(svg) {
        width: 18px;
        height: 18px;
    }

    /* 响应式 */
    @media (max-width: 1200px) {
        .releases-grid {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    @media (max-width: 768px) {
        .releases-page {
            padding: 20px 0;
        }

        .page-header {
            flex-direction: column;
            gap: 20px;
        }

        .page-title {
            font-size: 28px;
        }

        .create-btn {
            width: 100%;
            justify-content: center;
        }

        .filter-section {
            padding: 18px;
        }

        .releases-grid {
            grid-template-columns: 1fr;
        }
    `;

// 图标组件
function RocketIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
        </svg>
    );
}

function PlusIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    );
}

function FilterIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
    );
}

function StageIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
    );
}

function CloseIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}

function EmptyIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
    );
}
