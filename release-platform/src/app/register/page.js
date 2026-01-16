'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import toast from 'react-hot-toast';

const ROLES = [
    { value: 'ADMIN', label: '超级管理员', icon: '👑', desc: '系统管理、用户管理、数据字典管理' },
    { value: 'PM', label: '项目经理', icon: '📊', desc: '流程发起者与总协调人' },
    { value: 'RD', label: '开发人员', icon: '💻', desc: '负责代码合并、提交变更说明' },
    { value: 'QA', label: '测试人员', icon: '🧪', desc: '负责功能验收和冒烟测试' },
    { value: 'PO', label: '产品经理', icon: '📋', desc: '负责业务验收' },
    { value: 'DBA', label: '数据库管理员', icon: '🗄️', desc: '负责数据安全与SQL审核' },
    { value: 'OP', label: '应用运维', icon: '⚙️', desc: '负责代码部署与服务管理' },
];

// 简单的 hasRole 实现
function hasRole(userRoleString, targetRole) {
    if (!userRoleString) return false;
    return userRoleString.split(',').includes(targetRole);
}

export default function RegisterPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        username: '',
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
    });
    const [selectedRoles, setSelectedRoles] = useState(['RD']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // 检查权限
    useEffect(() => {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');

        if (!token || !userStr) {
            router.push('/login');
            return;
        }

        try {
            const user = JSON.parse(userStr);
            if (!hasRole(user.role, 'ADMIN')) {
                toast.error('只有超级管理员可以添加用户');
                router.push('/dashboard');
            }
        } catch (e) {
            router.push('/login');
        }
    }, [router]);

    const handleRoleChange = (roleValue) => {
        if (selectedRoles.includes(roleValue)) {
            if (selectedRoles.length > 1) {
                setSelectedRoles(selectedRoles.filter(r => r !== roleValue));
            }
        } else {
            setSelectedRoles([...selectedRoles, roleValue]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('两次输入的密码不一致');
            toast.error('两次输入的密码不一致');
            setLoading(false);
            return;
        }

        if (formData.password.length < 6) {
            setError('密码长度至少6位');
            toast.error('密码长度至少6位');
            setLoading(false);
            return;
        }

        if (selectedRoles.length === 0) {
            setError('请至少选择一个角色');
            toast.error('请至少选择一个角色');
            setLoading(false);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    username: formData.username,
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    password: formData.password,
                    role: selectedRoles,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || '添加失败');
            }

            toast.success(`用户 ${formData.name} 添加成功`);
            router.push('/users');

        } catch (err) {
            setError(err.message);
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Navbar />
            <main className="page-container">
                <div className="container" style={{ maxWidth: '700px' }}>
                    {/* 页面头部 */}
                    <div className="page-header">
                        <div className="page-header-content">
                            <div className="page-header-icon">➕</div>
                            <div>
                                <h1 className="page-title">添加新成员</h1>
                                <p className="page-subtitle">为团队创建新账号，支持多角色分配</p>
                            </div>
                        </div>
                        <button
                            className="btn btn-secondary"
                            onClick={() => router.back()}
                        >
                            ← 返回
                        </button>
                    </div>

                    <div className="card-static">
                        {error && (
                            <div className="alert alert-error">
                                <span className="alert-icon">⚠️</span>
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            {/* 基本信息 */}
                            <div className="form-section">
                                <h4 className="form-section-title">
                                    <span className="section-icon">📝</span>
                                    基本信息
                                </h4>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label className="form-label">
                                            用户名 <span className="required">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="用于登录的用户名"
                                            value={formData.username}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">
                                            姓名 <span className="required">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="请输入真实姓名"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label className="form-label">邮箱地址</label>
                                        <input
                                            type="email"
                                            className="form-input"
                                            placeholder="your@email.com"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">
                                            手机号 <span className="required">*</span>
                                        </label>
                                        <input
                                            type="tel"
                                            className="form-input"
                                            placeholder="请输入手机号"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 角色选择 */}
                            <div className="form-section">
                                <h4 className="form-section-title">
                                    <span className="section-icon">🎭</span>
                                    角色分配
                                    <span className="section-hint">（可多选）</span>
                                </h4>
                                <div className="role-grid">
                                    {ROLES.map((role) => {
                                        const isSelected = selectedRoles.includes(role.value);
                                        return (
                                            <div
                                                key={role.value}
                                                className={`role-card ${isSelected ? 'selected' : ''}`}
                                                onClick={() => handleRoleChange(role.value)}
                                            >
                                                <div className="role-card-header">
                                                    <span className="role-icon">{role.icon}</span>
                                                    <div className="role-checkbox">
                                                        {isSelected && <span>✓</span>}
                                                    </div>
                                                </div>
                                                <div className="role-card-body">
                                                    <span className="role-label">{role.label}</span>
                                                    <span className="role-code">{role.value}</span>
                                                </div>
                                                <p className="role-desc">{role.desc}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 密码设置 */}
                            <div className="form-section">
                                <h4 className="form-section-title">
                                    <span className="section-icon">🔐</span>
                                    密码设置
                                </h4>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label className="form-label">
                                            初始密码 <span className="required">*</span>
                                        </label>
                                        <input
                                            type="password"
                                            className="form-input"
                                            placeholder="至少6位密码"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            required
                                            minLength={6}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">
                                            确认密码 <span className="required">*</span>
                                        </label>
                                        <input
                                            type="password"
                                            className="form-input"
                                            placeholder="再次输入密码"
                                            value={formData.confirmPassword}
                                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary btn-glow btn-lg"
                                disabled={loading}
                                style={{ width: '100%' }}
                            >
                                {loading ? (
                                    <>
                                        <span className="loading-spinner-sm"></span>
                                        创建中...
                                    </>
                                ) : (
                                    <>
                                        <span className="btn-icon">✨</span>
                                        确认添加
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </main>
        </>
    );
}
