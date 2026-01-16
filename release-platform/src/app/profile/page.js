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

    // 获取角色徽章
    const getRoleBadges = (role) => {
        const roleStyles = {
            'ADMIN': 'badge-danger',
            'PM': 'badge-primary',
            'RD': 'badge-info',
            'QA': 'badge-success',
            'PO': 'badge-warning',
            'DBA': 'badge-secondary',
            'OP': 'badge-tertiary',
        };
        const roleLabels = {
            'ADMIN': '管理员',
            'PM': 'PM',
            'RD': 'RD',
            'QA': 'QA',
            'PO': 'PO',
            'DBA': 'DBA',
            'OP': 'OP',
        };
        return (role || '').split(',').filter(r => r).map(r => ({
            class: roleStyles[r] || 'badge-secondary',
            label: roleLabels[r] || r
        }));
    };

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="loading">
                    <div className="loading-spinner"></div>
                </div>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <main className="page-container">
                <div className="container" style={{ maxWidth: '700px' }}>
                    {/* 页面头部 */}
                    <div className="page-header">
                        <div className="page-header-content">
                            <div className="page-header-icon">👤</div>
                            <div>
                                <h1 className="page-title">个人信息</h1>
                                <p className="page-subtitle">管理您的账户信息和安全设置</p>
                            </div>
                        </div>
                    </div>

                    {/* 用户头像卡片 */}
                    <div className="profile-hero-card">
                        <div className="profile-avatar-large">
                            {(user?.name || '?').slice(-1)}
                        </div>
                        <div className="profile-hero-info">
                            <h2 className="profile-name">{user?.name}</h2>
                            <p className="profile-username">@{user?.username}</p>
                            <div className="profile-roles">
                                {getRoleBadges(user?.role).map((badge, i) => (
                                    <span key={i} className={`badge ${badge.class}`}>{badge.label}</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 账户信息 */}
                    <div className="card-static">
                        <div className="card-header">
                            <h3 className="card-title">
                                <span className="title-icon">📋</span>
                                账户信息
                            </h3>
                        </div>
                        <div className="profile-info-grid">
                            <div className="profile-info-item">
                                <span className="info-icon">👤</span>
                                <div className="info-content">
                                    <label>用户名</label>
                                    <span>{user?.username || '-'}</span>
                                </div>
                            </div>
                            <div className="profile-info-item">
                                <span className="info-icon">📛</span>
                                <div className="info-content">
                                    <label>姓名</label>
                                    <span>{user?.name || '-'}</span>
                                </div>
                            </div>
                            <div className="profile-info-item">
                                <span className="info-icon">🎭</span>
                                <div className="info-content">
                                    <label>角色</label>
                                    <span>{getRoleLabel(user?.role)}</span>
                                </div>
                            </div>
                            <div className="profile-info-item">
                                <span className="info-icon">📅</span>
                                <div className="info-content">
                                    <label>注册时间</label>
                                    <span>
                                        {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('zh-CN') : '-'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 联系方式 */}
                    <div className="card-static">
                        <div className="card-header">
                            <h3 className="card-title">
                                <span className="title-icon">📞</span>
                                联系方式
                            </h3>
                        </div>
                        <form onSubmit={handleSaveBasicInfo}>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">
                                        <span className="label-icon">📧</span>
                                        邮箱地址
                                    </label>
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
                                    <label className="form-label">
                                        <span className="label-icon">📱</span>
                                        手机号
                                    </label>
                                    <input
                                        type="tel"
                                        className="form-input"
                                        placeholder="请输入手机号"
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                    />
                                </div>
                            </div>
                            <button 
                                type="submit" 
                                className="btn btn-primary btn-glow"
                                disabled={saving}
                                style={{ width: '100%', marginTop: '8px' }}
                            >
                                {saving ? (
                                    <>
                                        <span className="loading-spinner-sm"></span>
                                        保存中...
                                    </>
                                ) : (
                                    <>
                                        <span className="btn-icon">💾</span>
                                        保存修改
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* 密码修改 */}
                    <div className="card-static">
                        <div className="card-header">
                            <h3 className="card-title">
                                <span className="title-icon">🔐</span>
                                安全设置
                            </h3>
                            {!showPasswordSection && (
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setShowPasswordSection(true)}
                                >
                                    修改密码
                                </button>
                            )}
                        </div>
                        
                        {showPasswordSection ? (
                            <form onSubmit={handleChangePassword}>
                                <div className="form-group">
                                    <label className="form-label">
                                        当前密码 <span className="required">*</span>
                                    </label>
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
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label className="form-label">
                                            新密码 <span className="required">*</span>
                                        </label>
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
                                        <label className="form-label">
                                            确认新密码 <span className="required">*</span>
                                        </label>
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
                                </div>
                                <div className="button-group">
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
                                    >
                                        取消
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="btn btn-primary"
                                        disabled={saving}
                                    >
                                        {saving ? '保存中...' : '确认修改'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="security-hint">
                                <span className="hint-icon">💡</span>
                                <p>定期修改密码可以提高账户安全性</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </>
    );
}
