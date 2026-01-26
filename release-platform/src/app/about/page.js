'use client';

import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default function AboutPage() {
    return (
        <>
            <Navbar />
            <main className="page-container">
                <div className="container" style={{ maxWidth: '800px' }}>
                    {/* 页面头部 */}
                    <div className="page-header text-center" style={{ flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '48px 0' }}>
                        <div className="brand-logo-wrapper" style={{ width: '80px', height: '80px' }}>
                            <div className="brand-logo-glow"></div>
                            <div className="brand-logo-ring"></div>
                            <div className="brand-logo">
                                <img src="/logo.png" alt="今天发什么" />
                            </div>
                        </div>
                        <div>
                            <h1 className="page-title" style={{ fontSize: '32px', justifyContent: 'center' }}>今天发什么</h1>
                            <p className="page-subtitle" style={{ fontSize: '16px' }}>
                                轻量级、现代化的发版管理协作平台
                            </p>
                        </div>
                    </div>

                    {/* 项目简介 */}
                    <div className="card mb-4">
                        <div className="card-header">
                            <h2 className="card-title">🚀 项目简介</h2>
                        </div>
                        <div className="card-body">
                            <p className="text-secondary" style={{ lineHeight: '1.8', fontSize: '15px' }}>
                                “今天发什么” 是一款专注于提升研发团队发版效率的协作工具。它解决了传统发版过程中信息不透明、沟通成本高、流程混乱等痛点，
                                通过标准化的发版流程、清晰的角色分工和实时的进度追踪，让每一次发版都井然有序。
                            </p>
                            <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '24px' }}>
                                <div className="feature-item" style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>📋 规范化流程</h3>
                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>从提测到上线，全流程标准化管理，杜绝遗漏。</p>
                                </div>
                                <div className="feature-item" style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>👥 多角色协作</h3>
                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>开发、测试、运维、DBA 各司其职，高效配合。</p>
                                </div>
                                <div className="feature-item" style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>🔍 可追溯记录</h3>
                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>完整的发版历史和变更记录，随时可查可回溯。</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 开源信息 */}
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">❤️ 开源共建</h2>
                        </div>
                        <div className="card-body">
                            <p className="text-secondary mb-4">
                                这是一个开源项目，致力于为中小团队提供好用的发版管理工具。如果您觉得好用，欢迎 Star 支持！
                            </p>
                            
                            <div className="links-group" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                <a 
                                    href="https://github.com/dick86114/98pct" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="link-card"
                                    style={{ 
                                        flex: 1, 
                                        minWidth: '240px',
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '12px', 
                                        padding: '16px', 
                                        background: 'var(--bg-secondary)', 
                                        borderRadius: '12px',
                                        border: '1px solid var(--border-color)',
                                        textDecoration: 'none',
                                        color: 'var(--text-primary)',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ width: '40px', height: '40px', background: '#24292e', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: '600' }}>GitHub</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>查看源码、提交 Issue、贡献代码</div>
                                    </div>
                                    <div style={{ marginLeft: 'auto' }}>↗</div>
                                </a>

                                <a 
                                    href="https://hub.docker.com/r/dick86114/98pct" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="link-card"
                                    style={{ 
                                        flex: 1, 
                                        minWidth: '240px',
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '12px', 
                                        padding: '16px', 
                                        background: 'var(--bg-secondary)', 
                                        borderRadius: '12px',
                                        border: '1px solid var(--border-color)',
                                        textDecoration: 'none',
                                        color: 'var(--text-primary)',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ width: '40px', height: '40px', background: '#0db7ed', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: '600' }}>Docker Hub</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>获取最新镜像，快速部署</div>
                                    </div>
                                    <div style={{ marginLeft: 'auto' }}>↗</div>
                                </a>
                            </div>
                        </div>
                    </div>
                    
                    <div className="text-center mt-8 text-secondary" style={{ fontSize: '12px' }}>
                        <p>© {new Date().getFullYear()} 98pct Release Platform. All rights reserved.</p>
                    </div>
                </div>
            </main>
        </>
    );
}
