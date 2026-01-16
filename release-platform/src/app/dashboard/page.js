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
    const [mounted, setMounted] = useState(false);
    const [stats, setStats] = useState({
        total: 0,
        inProgress: 0,
        success: 0,
        failed: 0,
    });

    useEffect(() => {
        setMounted(true);
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
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (res.status === 401) {
                router.push('/login');
                return;
            }

            const data = await res.json();
            const releaseList = data.releases || [];
            setReleases(releaseList);

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
                <div className="loading">
                    <div className="loading-spinner" />
                </div>
            </>
        );
    }

    const activeReleases = releases.filter(r =>
        r.status === 'IN_PROGRESS' || r.status === 'PENDING_REVIEW' || r.status === 'DRAFT'
    );

    const recentCompleted = releases.filter(r =>
        r.status === 'SUCCESS' || r.status === 'FAILED'
    ).slice(0, 4);

    const isPM = user?.role?.split(',').includes('PM');

    return (
        <>
            <Navbar />
            <main className={`dashboard-page ${mounted ? 'mounted' : ''}`}>
                <div className="container">
                    {/* 欢迎区域 */}
                    <div className="welcome-section">
                        <div className="welcome-content">
                            <div className="welcome-badge">
                                <span className="badge-dot" />
                                <span>工作台</span>
                            </div>
                            <h1 className="welcome-title">
                                {getGreeting()}，{user?.name}
                            </h1>
                            <p className="welcome-subtitle">
                                {isPM ? '管理你的发版流程，确保每次发布顺利进行' : '查看你参与的发版任务，完成待办事项'}
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

                    {/* 统计卡片 */}
                    <div className="stats-grid">
                        <div className="stat-card" style={{ '--accent': 'var(--primary)' }}>
                            <div className="stat-icon">
                                <TotalIcon />
                            </div>
                            <div className="stat-content">
                                <span className="stat-value">{stats.total}</span>
                                <span className="stat-label">总发版数</span>
                            </div>
                            <div className="stat-glow" />
                        </div>
                        
                        <div className="stat-card" style={{ '--accent': 'var(--info)' }}>
                            <div className="stat-icon">
                                <ProgressIcon />
                            </div>
                            <div className="stat-content">
                                <span className="stat-value">{stats.inProgress}</span>
                                <span className="stat-label">进行中</span>
                            </div>
                            <div className="stat-glow" />
                        </div>
                        
                        <div className="stat-card" style={{ '--accent': 'var(--success)' }}>
                            <div className="stat-icon">
                                <SuccessIcon />
                            </div>
                            <div className="stat-content">
                                <span className="stat-value">{stats.success}</span>
                                <span className="stat-label">成功发版</span>
                            </div>
                            <div className="stat-glow" />
                        </div>
                        
                        <div className="stat-card" style={{ '--accent': 'var(--error)' }}>
                            <div className="stat-icon">
                                <FailedIcon />
                            </div>
                            <div className="stat-content">
                                <span className="stat-value">{stats.failed}</span>
                                <span className="stat-label">失败/回滚</span>
                            </div>
                            <div className="stat-glow" />
                        </div>
                    </div>

                    {/* 进行中的发版 */}
                    <section className="section">
                        <div className="section-header">
                            <div className="section-title-wrap">
                                <div className="section-icon">
                                    <ActiveIcon />
                                </div>
                                <h2 className="section-title">进行中的发版</h2>
                                <span className="section-count">{activeReleases.length}</span>
                            </div>
                            <button
                                className="view-all-btn"
                                onClick={() => router.push('/releases')}
                            >
                                查看全部
                                <ArrowRightIcon />
                            </button>
                        </div>

                        {activeReleases.length > 0 ? (
                            <div className="releases-grid">
                                {activeReleases.slice(0, 6).map((release, index) => (
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
                                <div className="empty-icon">🎉</div>
                                <h3 className="empty-title">暂无进行中的发版</h3>
                                <p className="empty-text">所有发版都已完成，点击右上角按钮创建新发版</p>
                            </div>
                        )}
                    </section>

                    {/* 最近完成 */}
                    {recentCompleted.length > 0 && (
                        <section className="section">
                            <div className="section-header">
                                <div className="section-title-wrap">
                                    <div className="section-icon completed">
                                        <CompletedIcon />
                                    </div>
                                    <h2 className="section-title">最近完成</h2>
                                </div>
                            </div>
                            <div className="releases-grid">
                                {recentCompleted.map((release, index) => (
                                    <div 
                                        key={release.id} 
                                        className="release-item"
                                        style={{ animationDelay: `${index * 0.05}s` }}
                                    >
                                        <ReleaseCard release={release} />
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </main>
        </>
    );
}

// 获取问候语
function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 6) return '夜深了';
    if (hour < 9) return '早上好';
    if (hour < 12) return '上午好';
    if (hour < 14) return '中午好';
    if (hour < 18) return '下午好';
    if (hour < 22) return '晚上好';
    return '夜深了';
}


// 图标组件
function PlusIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
    );
}

function TotalIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
    );
}

function ProgressIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    );
}

function SuccessIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    );
}

function FailedIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
    );
}

function ActiveIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
    );
}

function CompletedIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    );
}

function ArrowRightIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
        </svg>
    );
}
