'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        account: '',
        password: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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

            // 保存 token 和用户信息
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // 跳转到仪表盘
            router.push('/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="card auth-card">
                <div className="auth-logo">
                    <img src="/logo.png" alt="九成八" className="auth-logo-img" />
                </div>

                <h1 className="auth-title">欢迎回来</h1>
                <p className="auth-subtitle">登录您的账号以继续</p>

                {error && (
                    <div className="alert alert-error">
                        <span>⚠️</span>
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">用户名 / 手机号</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="请输入用户名或手机号"
                            value={formData.account}
                            onChange={(e) => setFormData({ ...formData, account: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">密码</label>
                        <input
                            type="password"
                            className="form-input"
                            placeholder="输入密码"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary login-submit-btn"
                        disabled={loading}
                    >
                        {loading ? '登录中...' : '登 录'}
                    </button>
                </form>

                <div className="auth-footer">
                    <span className="auth-hint">
                        提示：如需账号请联系项目经理
                    </span>
                </div>
            </div>

            <style jsx>{`
                .login-submit-btn {
                    width: 100%;
                    margin-top: 8px;
                }

                .auth-hint {
                    color: var(--text-muted);
                    font-size: 12px;
                }
            `}</style>
        </div>
    );
}
