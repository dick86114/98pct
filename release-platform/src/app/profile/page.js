'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import toast from 'react-hot-toast';

export default function ProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [user, setUser] = useState(null);
    
    // 基本信息表单
    const [form, setForm] = useState({
        email: '',
        phone: '',
    });
    
    // 密码修改表单
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [showPasswordSection, setShowPasswordSection] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }
        fetchProfile(token);
    }, [router]);

    const fetchProfile = async (token) => {
        try {
            const res = await fetch('/api/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.status === 401) {
                router.push('/login');
                return;
            }
            
            const data = await res.json();
            if (res.ok) {
                setUser(data.user);
                setForm({
                    email: data.user.email || '',
                    phone: data.user.phone || '',
                });
            } else {
                toast.error(data.error || '获取用户信息失败');
            }
        } catch (error) {
            console.error('Fetch profile error:', error);
            toast.error('获取用户信息失败');
        } finally {
            setLoading(false);
        }
    };

    // 保存基本信息
    const handleSaveBasicInfo = async (e) => {
        e.preventDefault();
        setSaving(true);
        
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    email: form.email,
                    phone: form.phone,
                }),
            });
            
            const data = await res.json();
            if (res.ok) {
                toast.success('信息更新成功');
                // 更新本地存储的用户信息
                const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                localStorage.setItem('user', JSON.stringify({
                    ...storedUser,
                    email: data.user.email,
                    phone: data.user.phone,
                }));
                setUser(data.user);
            } else {
                toast.error(data.error || '更新失败');
            }
        } catch (error) {
            console.error('Save profile error:', error);
            toast.error('更新失败');
        } finally {
            setSaving(false);
        }
    };

    // 修改密码
    const handleChangePassword = async (e) => {
        e.preventDefault();
        
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            toast.error('两次输入的新密码不一致');
            return;
        }
        
        if (passwordForm.newPassword.length < 6) {
            toast.error('新密码长度至少6位');
            return;
        }
        
        setSaving(true);
        
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    currentPassword: passwordForm.currentPassword,
                    password: passwordForm.newPassword,
                }),
            });
            
            const data = await res.json();
            if (res.ok) {
                toast.success('密码修改成功');
                setPasswordForm({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                });
                setShowPasswordSection(false);
            } else {
                toast.error(data.error || '密码修改失败');
            }
        } catch (error) {
            console.error('Change password error:', error);
            toast.error('密码修改失败');
        } finally {
            setSaving(false);
        }
    };

    // 获取角色显示名称
    const getRoleLabel = (role) => {
        const roleMap = {
            'ADMIN': '超级管理员',
            'PM': '项目经理',
            'RD': '开发人员',
            'QA': '测试人员',
            'PO': '产品经理',
            'DBA': 'DBA',
            'OP': '运维人员',
        };
        return (role || '').split(',').map(r => roleMap[r] || r).join('、');
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
                <div className="container" style={{ maxWidth: '600px' }}>
                    <div className="page-header">
                        <div>
                            <h1 className="page-title">个人信息</h1>
                            <p className="page-subtitle">管理您的账户信息</p>
                        </div>
                    </div>

                    {/* 只读信息 */}
                    <div className="card" style={{ marginBottom: '24px' }}>
                        <div className="card-header">
                            <h3 className="card-title">账户信息</h3>
                        </div>
                        <div style={{ display: 'grid', gap: '16px' }}>
                            <div className="info-row">
                                <span className="info-label">用户名</span>
                                <span className="info-value">{user?.username || '-'}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">姓名</span>
                                <span className="info-value">{user?.name || '-'}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">角色</span>
                                <span className="info-value">{getRoleLabel(user?.role)}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">注册时间</span>
                                <span className="info-value">
                                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('zh-CN') : '-'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 可编辑信息 */}
                    <div className="card" style={{ marginBottom: '24px' }}>
                        <div className="card-header">
                            <h3 className="card-title">联系方式</h3>
                        </div>
                        <form onSubmit={handleSaveBasicInfo}>
                            <div className="form-group">
                                <label className="form-label">邮箱地址</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    placeholder="请输入邮箱地址"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">手机号</label>
                                <input
                                    type="tel"
                                    className="form-input"
                                    placeholder="请输入手机号"
                                    value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                />
                            </div>
                            <button 
                                type="submit" 
                                className="btn btn-primary"
                                disabled={saving}
                                style={{ width: '100%' }}
                            >
                                {saving ? '保存中...' : '保存修改'}
                            </button>
                        </form>
                    </div>

                    {/* 密码修改 */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">修改密码</h3>
                            {!showPasswordSection && (
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setShowPasswordSection(true)}
                                    style={{ padding: '6px 12px', fontSize: '13px' }}
                                >
                                    修改密码
                                </button>
                            )}
                        </div>
                        
                        {showPasswordSection ? (
                            <form onSubmit={handleChangePassword}>
                                <div className="form-group">
                                    <label className="form-label">当前密码 *</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        placeholder="请输入当前密码"
                                        value={passwordForm.currentPassword}
                                        onChange={(e) => setPasswordForm({ 
                                            ...passwordForm, 
                                            currentPassword: e.target.value 
                                        })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">新密码 *</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        placeholder="请输入新密码（至少6位）"
                                        value={passwordForm.newPassword}
                                        onChange={(e) => setPasswordForm({ 
                                            ...passwordForm, 
                                            newPassword: e.target.value 
                                        })}
                                        required
                                        minLength={6}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">确认新密码 *</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        placeholder="请再次输入新密码"
                                        value={passwordForm.confirmPassword}
                                        onChange={(e) => setPasswordForm({ 
                                            ...passwordForm, 
                                            confirmPassword: e.target.value 
                                        })}
                                        required
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button 
                                        type="submit" 
                                        className="btn btn-primary"
                                        disabled={saving}
                                        style={{ flex: 1 }}
                                    >
                                        {saving ? '保存中...' : '确认修改'}
                                    </button>
                                    <button 
                                        type="button" 
                                        className="btn btn-secondary"
                                        onClick={() => {
                                            setShowPasswordSection(false);
                                            setPasswordForm({
                                                currentPassword: '',
                                                newPassword: '',
                                                confirmPassword: '',
                                            });
                                        }}
                                        style={{ flex: 1 }}
                                    >
                                        取消
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                                点击右上角按钮修改密码
                            </p>
                        )}
                    </div>
                </div>

                <style jsx>{`
                    .info-row {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 8px 0;
                        border-bottom: 1px solid var(--border-color);
                    }
                    .info-row:last-child {
                        border-bottom: none;
                    }
                    .info-label {
                        color: var(--text-muted);
                        font-size: 14px;
                    }
                    .info-value {
                        color: var(--text-primary);
                        font-weight: 500;
                    }
                `}</style>
            </main>
        </>
    );
}
