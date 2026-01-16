'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        account: '',
        password: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [mounted, setMounted] = useState(false);
    const [focusedField, setFocusedField] = useState(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    account: formData.account,
                    password: formData.password,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || '登录失败');
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            router.push('/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            {/* 动态背景 */}
            <div className="bg-effects">
                <div className="gradient-orb orb-1" />
                <div className="gradient-orb orb-2" />
                <div className="gradient-orb orb-3" />
                <div className="grid-overlay" />
                {/* 浮动粒子 */}
                <div className="particles">
                    {[...Array(20)].map((_, i) => (
                        <div 
                            key={i} 
                            className="particle"
                            style={{
                                left: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 20}s`,
                                animationDuration: `${15 + Math.random() * 10}s`,
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* 登录卡片 */}
            <div className={`login-card ${mounted ? 'animate-in' : ''}`}>
                {/* 装饰边框 */}
                <div className="card-border" />
                
                {/* Logo 区域 */}
                <div className="logo-section">
                    <div className="logo-glow" />
                    <img src="/logo.png" alt="九成八" className="logo-img" />
                    <h1 className="logo-title">九成八</h1>
                    <p className="logo-subtitle">发版管理平台</p>
                </div>

                {/* 错误提示 */}
                {error && (
                    <div className="error-alert">
                        <AlertIcon />
                        <span>{error}</span>
                    </div>
                )}

                {/* 登录表单 */}
                <form onSubmit={handleSubmit} className="login-form">
                    <div className={`input-group ${focusedField === 'account' ? 'focused' : ''}`}>
                        <label className="input-label">
                            <UserIcon />
                            <span>账号</span>
                        </label>
                        <div className="input-wrapper">
                            <input
                                type="text"
                                className="input-field"
                                placeholder="用户名或手机号"
                                value={formData.account}
                                onChange={(e) => setFormData({ ...formData, account: e.target.value })}
                                onFocus={() => setFocusedField('account')}
                                onBlur={() => setFocusedField(null)}
                                required
                                autoComplete="username"
                            />
                            <div className="input-glow" />
                        </div>
                    </div>

                    <div className={`input-group ${focusedField === 'password' ? 'focused' : ''}`}>
                        <label className="input-label">
                            <LockIcon />
                            <span>密码</span>
                        </label>
                        <div className="input-wrapper">
                            <input
                                type="password"
                                className="input-field"
                                placeholder="输入密码"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                onFocus={() => setFocusedField('password')}
                                onBlur={() => setFocusedField(null)}
                                required
                                autoComplete="current-password"
                            />
                            <div className="input-glow" />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className={`submit-btn ${loading ? 'loading' : ''}`}
                        disabled={loading}
                    >
                        <span className="btn-bg" />
                        {loading ? (
                            <>
                                <span className="spinner" />
                                <span>登录中...</span>
                            </>
                        ) : (
                            <>
                                <span>登 录</span>
                                <ArrowIcon />
                            </>
                        )}
                    </button>
                </form>

                {/* 底部提示 */}
                <div className="login-footer">
                    <span>如需账号请联系项目经理</span>
                </div>
            </div>
        </div>
    );
}

// 图标组件
function UserIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    );
}

function LockIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    );
}

function ArrowIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
        </svg>
    );
}

function AlertIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    );
}
