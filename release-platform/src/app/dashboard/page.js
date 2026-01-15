'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ReleaseCard from '@/components/ReleaseCard';
import useRoles from '@/hooks/useRoles';

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [releases, setReleases] = useState([]);
    const { getRoleLabel } = useRoles();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total: 0,
        inProgress: 0,
        success: 0,
        failed: 0,
    });

    useEffect(() => {
        // 检查登录状态
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');

        if (!token || !userStr) {
            router.push('/login');
            return;
        }

        setUser(JSON.parse(userStr));
        fetchReleases(token);
    }, [router]);

    const fetchReleases = async (token) => {
        try {
            const res = await fetch('/api/releases', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (res.status === 401) {
                router.push('/login');
                return;
            }

            const data = await res.json();
            const releaseList = data.releases || [];
            setReleases(releaseList);

            // 计算统计数据
            setStats({
                total: releaseList.length,
                inProgress: releaseList.filter(r => r.status === 'IN_PROGRESS').length,
                success: releaseList.filter(r => r.status === 'SUCCESS').length,
                failed: releaseList.filter(r => r.status === 'FAILED').length,
            });
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

    // 正在进行的发版
    const activeReleases = releases.filter(r =>
        r.status === 'IN_PROGRESS' || r.status === 'PENDING_REVIEW' || r.status === 'DRAFT'
    );

    // 最近完成的发版
    const recentCompleted = releases.filter(r =>
        r.status === 'SUCCESS' || r.status === 'FAILED'
    ).slice(0, 4);

    return (
        <>
            <Navbar />
            <main className="dashboard-page">
                <div className="container">
                    {/* 页面标题 */}
                    <div className="page-header">
                        <div>
                            <h1 className="page-title">
                                {user?.role === 'PM' ? '项目管理仪表盘' : '我的工作台'}
                            </h1>
                            <p className="page-subtitle">
                                欢迎回来, {user?.name} ({getRoleLabel(user?.role)})
                            </p>
                        </div>
                        {user?.role?.split(',').includes('PM') && (
                            <button
                                className="btn btn-primary"
                                onClick={() => router.push('/releases/new')}
                            >
                                ➕ 新建发版
                            </button>
                        )}
                    </div>

                    {/* 统计卡片 */}
                    <div className="grid grid-4 stats-grid">
                        <div className="card stat-card">
                            <div className="stat-value">{stats.total}</div>
                            <div className="stat-label">总发版数</div>
                        </div>
                        <div className="card stat-card">
                            <div className="stat-value stat-value-info">
                                {stats.inProgress}
                            </div>
                            <div className="stat-label">进行中</div>
                        </div>
                        <div className="card stat-card">
                            <div className="stat-value stat-value-success">
                                {stats.success}
                            </div>
                            <div className="stat-label">成功发版</div>
                        </div>
                        <div className="card stat-card">
                            <div className="stat-value stat-value-error">
                                {stats.failed}
                            </div>
                            <div className="stat-label">失败/回滚</div>
                        </div>
                    </div>

                    {/* 正在进行的发版 */}
                    <section className="dashboard-section">
                        <div className="section-header">
                            <h2 className="section-title">
                                🔄 进行中的发版
                            </h2>
                            <button
                                className="btn btn-secondary section-btn"
                                onClick={() => router.push('/releases')}
                            >
                                查看全部 →
                            </button>
                        </div>

                        {activeReleases.length > 0 ? (
                            <div className="grid grid-3">
                                {activeReleases.slice(0, 6).map((release) => (
                                    <ReleaseCard key={release.id} release={release} />
                                ))}
                            </div>
                        ) : (
                            <div className="card">
                                <div className="empty-state">
                                    <div className="empty-state-icon">🎉</div>
                                    <div className="empty-state-title">暂无进行中的发版</div>
                                    <div className="empty-state-text">所有发版都已完成，点击右上角按钮创建新发版</div>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* 最近完成 */}
                    {recentCompleted.length > 0 && (
                        <section className="dashboard-section">
                            <h2 className="section-title">
                                📋 最近完成
                            </h2>
                            <div className="grid grid-4">
                                {recentCompleted.map((release) => (
                                    <ReleaseCard key={release.id} release={release} />
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                <style jsx>{`
                    .dashboard-page {
                        padding: 32px 24px;
                    }

                    .stats-grid {
                        margin-bottom: 32px;
                    }

                    .stat-value-info {
                        background: linear-gradient(135deg, var(--info) 0%, #60a5fa 100%);
                        -webkit-background-clip: text;
                        background-clip: text;
                    }

                    .stat-value-success {
                        background: linear-gradient(135deg, var(--success) 0%, #34d399 100%);
                        -webkit-background-clip: text;
                        background-clip: text;
                    }

                    .stat-value-error {
                        background: linear-gradient(135deg, var(--error) 0%, #f87171 100%);
                        -webkit-background-clip: text;
                        background-clip: text;
                    }

                    .dashboard-section {
                        margin-bottom: 40px;
                    }

                    .section-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        margin-bottom: 16px;
                        gap: 12px;
                    }

                    .section-title {
                        font-size: 20px;
                        font-weight: 700;
                        margin: 0;
                    }

                    .section-btn {
                        padding: 8px 16px;
                        font-size: 13px;
                        white-space: nowrap;
                    }

                    @media (max-width: 768px) {
                        .dashboard-page {
                            padding: 16px 12px;
                        }

                        .stats-grid {
                            margin-bottom: 24px;
                        }

                        .dashboard-section {
                            margin-bottom: 24px;
                        }

                        .section-header {
                            flex-direction: column;
                            align-items: flex-start;
                            gap: 8px;
                        }

                        .section-title {
                            font-size: 18px;
                        }

                        .section-btn {
                            width: 100%;
                            text-align: center;
                            justify-content: center;
                        }
                    }

                    @media (max-width: 480px) {
                        .section-title {
                            font-size: 16px;
                        }
                    }
                `}</style>
            </main>
        </>
    );
}
