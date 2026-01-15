'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import toast from 'react-hot-toast';

const ROLES = [
    { value: 'ADMIN', label: '超级管理员 (ADMIN)', desc: '系统管理、用户管理、数据字典管理' },
    { value: 'PM', label: '项目经理 (PM)', desc: '流程发起者与总协调人' },
    { value: 'RD', label: '开发人员 (RD)', desc: '负责代码合并、提交变更说明' },
    { value: 'QA', label: '测试人员 (QA)', desc: '负责功能验收和冒烟测试' },
    { value: 'PO', label: '产品经理 (PO)', desc: '负责业务验收' },
    { value: 'DBA', label: '数据库管理员', desc: '负责数据安全与SQL审核' },
    { value: 'OP', label: '应用运维', desc: '负责代码部署与服务管理' },
];

// 简单的 hasRole 实现，避免引入后端 auth 库
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
    const [selectedRoles, setSelectedRoles] = useState(['RD']); // 默认选中 RD
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
            // 只有 ADMIN 可以添加用户
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
            // 移除角色 (至少保留一个)
            if (selectedRoles.length > 1) {
                setSelectedRoles(selectedRoles.filter(r => r !== roleValue));
            }
        } else {
            // 添加角色
            setSelectedRoles([...selectedRoles, roleValue]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // 验证密码匹配
        if (formData.password !== formData.confirmPassword) {
            setError('两次输入的密码不一致');
            toast.error('两次输入的密码不一致');
            setLoading(false);
            return;
        }

        // 验证密码长度
        if (formData.password.length < 6) {
            setError('密码长度至少6位');
            toast.error('密码长度至少6位');
            setLoading(false);
            return;
        }

        // 验证角色
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
                    'Authorization': `Bearer ${token}` // 带上当前 PM 的 Token
                },
                body: JSON.stringify({
                    username: formData.username,
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    password: formData.password,
                    role: selectedRoles, // 发送数组
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
            <main style={{ padding: '32px 24px' }}>
                <div className="container" style={{ maxWidth: '600px' }}>
                    <div className="page-header">
                        <div>
                            <h1 className="page-title">添加新成员</h1>
                            <p className="page-subtitle">为团队创建新账号 (支持多角色)</p>
                        </div>
                        <button
                            className="btn btn-secondary"
                            onClick={() => router.back()}
                        >
                            取消
                        </button>
                    </div>

                    <div className="card">
                        {error && (
                            <div className="alert alert-error">
                                <span>⚠️</span>
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">用户名 <span style={{ color: 'var(--danger)' }}>*</span></label>
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
                                <label className="form-label">姓名</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="请输入姓名"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

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
                                <label className="form-label">手机号 <span style={{ color: 'var(--danger)' }}>*</span></label>
                                <input
                                    type="tel"
                                    className="form-input"
                                    placeholder="请输入手机号"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" style={{ marginBottom: '12px', display: 'block' }}>角色选择</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {ROLES.map((role) => {
                                        const isSelected = selectedRoles.includes(role.value);
                                        return (
                                            <div
                                                key={role.value}
                                                onClick={() => handleRoleChange(role.value)}
                                                style={{
                                                    padding: '12px',
                                                    border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                                                    borderRadius: 'var(--radius-sm)',
                                                    background: isSelected ? 'rgba(52, 120, 246, 0.1)' : 'var(--bg-tertiary)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => { }} // handled by div click
                                                    style={{ marginRight: '12px', width: '16px', height: '16px' }}
                                                />
                                                <div>
                                                    <div style={{ fontWeight: 500, color: isSelected ? 'var(--primary-light)' : 'var(--text-primary)' }}>
                                                        {role.label}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                        {role.desc}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">初始密码</label>
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
                                <label className="form-label">确认密码</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    placeholder="再次输入密码"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={{ width: '100%', marginTop: '8px' }}
                                disabled={loading}
                            >
                                {loading ? '创建中...' : '确认添加'}
                            </button>
                        </form>
                    </div>
                </div>
            </main>
        </>
    );
}
