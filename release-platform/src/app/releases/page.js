'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ReleaseCard from '@/components/ReleaseCard';

const STATUS_OPTIONS = [
    { value: '', label: '全部状态' },
    { value: 'DRAFT', label: '草稿' },
    { value: 'PENDING_REVIEW', label: '待评审' },
    { value: 'IN_PROGRESS', label: '进行中' },
    { value: 'SUCCESS', label: '成功' },
    { value: 'FAILED', label: '失败' },
];

const STAGE_OPTIONS = [
    { value: '', label: '全部阶段' },
    { value: 'PREPARATION', label: '准备阶段' },
    { value: 'IMPLEMENTATION', label: '实施阶段' },
    { value: 'VERIFICATION', label: '验证阶段' },
    { value: 'COMPLETED', label: '已完成' },
    { value: 'ROLLBACK', label: '已回滚' },
];

export default function ReleasesPage() {
    const router = useRouter();
    const [releases, setReleases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: '',
        stage: '',
    });

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }
        fetchReleases(token);
    }, [router, filters]);

    const fetchReleases = async (token) => {
        try {
            const params = new URLSearchParams();
            if (filters.status) params.append('status', filters.status);
            if (filters.stage) params.append('stage', filters.stage);

            const res = await fetch(`/api/releases?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
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

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="loading" style={{ minHeight: 'calc(100vh - 64px)' }}>
                    <div className="loading-spinner"></div>
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <main style={{ padding: '32px 24px' }}>
                <div className="container">
                    {/* 页面标题 */}
                    <div className="page-header">
                        <div>
                            <h1 className="page-title">发版管理</h1>
                            <p className="page-subtitle">共 {releases.length} 条发版记录</p>
                        </div>
                        {(localStorage.getItem('user') && JSON.parse(localStorage.getItem('user')).role?.split(',').includes('PM')) && (
                            <button
                                className="btn btn-primary"
                                onClick={() => router.push('/releases/new')}
                            >
                                ➕ 新建发版
                            </button>
                        )}
                    </div>

                    {/* 筛选器 */}
                    <div className="card filter-card">
                        <div className="filter-content">
                            <span className="filter-label">筛选:</span>
                            <div className="filter-selects">
                                <select
                                    className="form-select"
                                    value={filters.status}
                                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                >
                                    {STATUS_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                <select
                                    className="form-select"
                                    value={filters.stage}
                                    onChange={(e) => setFilters({ ...filters, stage: e.target.value })}
                                >
                                    {STAGE_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                            {(filters.status || filters.stage) && (
                                <button
                                    className="btn btn-secondary clear-filter-btn"
                                    onClick={() => setFilters({ status: '', stage: '' })}
                                >
                                    清除筛选
                                </button>
                            )}
                        </div>
                    </div>

                    <style jsx>{`
                        .filter-card {
                            margin-bottom: 24px;
                            padding: 16px 20px;
                        }

                        .filter-content {
                            display: flex;
                            align-items: center;
                            gap: 16px;
                        }

                        .filter-label {
                            font-size: 14px;
                            color: var(--text-muted);
                            flex-shrink: 0;
                        }

                        .filter-selects {
                            display: flex;
                            gap: 12px;
                            flex: 1;
                        }

                        .filter-selects .form-select {
                            width: 160px;
                        }

                        .clear-filter-btn {
                            padding: 8px 16px;
                            font-size: 13px;
                            flex-shrink: 0;
                        }

                        @media (max-width: 768px) {
                            .filter-card {
                                padding: 12px;
                                margin-bottom: 16px;
                            }

                            .filter-content {
                                flex-direction: column;
                                align-items: stretch;
                                gap: 10px;
                            }

                            .filter-label {
                                display: none;
                            }

                            .filter-selects {
                                flex-direction: column;
                                gap: 8px;
                            }

                            .filter-selects .form-select {
                                width: 100%;
                            }

                            .clear-filter-btn {
                                width: 100%;
                            }
                        }
                    `}</style>

                    {/* 发版列表 */}
                    {releases.length > 0 ? (
                        <div className="grid grid-3">
                            {releases.map((release) => (
                                <ReleaseCard key={release.id} release={release} />
                            ))}
                        </div>
                    ) : (
                        <div className="card">
                            <div className="empty-state">
                                <div className="empty-state-icon">📋</div>
                                <div className="empty-state-title">暂无发版记录</div>
                                <div className="empty-state-text">
                                    {filters.status || filters.stage
                                        ? '没有符合筛选条件的发版记录'
                                        : '点击右上角按钮创建第一个发版'}
                                </div>
                                {(localStorage.getItem('user') && JSON.parse(localStorage.getItem('user')).role?.split(',').includes('PM')) && (
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => router.push('/releases/new')}
                                        style={{ marginTop: '16px' }}
                                    >
                                        新建发版
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}
