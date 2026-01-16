'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import toast from 'react-hot-toast';
import ConfirmModal from '@/components/ConfirmModal';
import useRoles from '@/hooks/useRoles';

export default function UsersPage() {
    const router = useRouter();
    const { roles, getRoleLabel } = useRoles();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState(null);
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [batchText, setBatchText] = useState('');
    const [batchLoading, setBatchLoading] = useState(false);
    const [batchResult, setBatchResult] = useState(null);
    const fileInputRef = useRef(null);

    // 编辑表单状态
    const [editForm, setEditForm] = useState({
        username: '',
        name: '',
        email: '',
        phone: '',
        password: '',
    });
    const [editSelectedRoles, setEditSelectedRoles] = useState([]);

    // 确认弹窗状态
    const [confirmConfig, setConfirmConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'warning',
        onConfirm: () => { },
    });

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }
        fetchUsers(token);
    }, [router]);

    const fetchUsers = async (token) => {
        try {
            const res = await fetch('/api/users', {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (res.status === 401) return router.push('/login');
            if (res.status === 403) {
                toast.error('无权访问');
                return router.push('/dashboard');
            }

            const data = await res.json();
            setUsers(data.users || []);
        } catch (error) {
            console.error('获取用户失败:', error);
            toast.error('获取用户列表失败');
        } finally {
            setLoading(false);
        }
    };

    const startEdit = (user) => {
        setEditingUser(user);
        setEditForm({
            username: user.username || '',
            name: user.name,
            email: user.email,
            phone: user.phone || '',
            password: '',
        });
        setEditSelectedRoles((user.role || '').split(',').filter(r => r));
    };

    const handleRoleChange = (roleValue) => {
        if (editSelectedRoles.includes(roleValue)) {
            if (editSelectedRoles.length > 1) {
                setEditSelectedRoles(editSelectedRoles.filter(r => r !== roleValue));
            }
        } else {
            setEditSelectedRoles([...editSelectedRoles, roleValue]);
        }
    };

    const executeUpdate = async () => {
        const token = localStorage.getItem('token');
        try {
            const body = {
                username: editForm.username,
                name: editForm.name,
                email: editForm.email,
                phone: editForm.phone,
                role: editSelectedRoles,
            };
            if (editForm.password) body.password = editForm.password;

            const res = await fetch(`/api/users/${editingUser.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || '更新失败');

            fetchUsers(token);
            setEditingUser(null);
            toast.success('更新成功');
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleUpdate = (e) => {
        e.preventDefault();
        if (!editingUser) return;

        if (editSelectedRoles.length === 0) {
            toast.error('请至少选择一个角色');
            return;
        }

        setConfirmConfig({
            isOpen: true,
            title: '保存修改',
            message: `确定要保存对用户 "${editForm.name}" 的修改吗？`,
            type: 'warning',
            confirmText: '保存',
            onConfirm: executeUpdate
        });
    };

    const executeDelete = async (userId) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || '删除失败');
            }

            setUsers(users.filter(u => u.id !== userId));
            toast.success('删除成功');
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleDelete = (userId) => {
        setConfirmConfig({
            isOpen: true,
            title: '删除用户',
            message: '⚠️ 确定要删除该用户吗？此操作不可撤销，删除后该用户将无法登录。',
            type: 'danger',
            confirmText: '确认删除',
            onConfirm: () => executeDelete(userId)
        });
    };

    // 解析批量导入文本
    const parseBatchText = (text) => {
        const lines = text.trim().split('\n').filter(line => line.trim());
        const users = [];

        for (const line of lines) {
            const parts = line.split(/[,\t]+/).map(p => p.trim());
            if (parts.length >= 5) {
                users.push({
                    username: parts[0],
                    name: parts[1],
                    email: parts[2],
                    phone: parts[3],
                    role: parts[4],
                    password: parts[5] || '123456',
                });
            }
        }
        return users;
    };

    // 处理文件上传
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            setBatchText(event.target.result);
        };
        reader.readAsText(file);
    };

    // 执行批量创建
    const executeBatchCreate = async () => {
        const users = parseBatchText(batchText);
        if (users.length === 0) {
            toast.error('未解析到有效用户数据');
            return;
        }

        setBatchLoading(true);
        setBatchResult(null);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/users/batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ users }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setBatchResult(data);
            if (data.successCount > 0) {
                toast.success(`成功创建 ${data.successCount} 个用户`);
                fetchUsers(token);
            }
            if (data.errorCount > 0) {
                toast.error(`${data.errorCount} 个用户创建失败`);
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setBatchLoading(false);
        }
    };

    // 获取角色徽章样式
    const getRoleBadgeClass = (role) => {
        const roleStyles = {
            'ADMIN': 'badge-danger',
            'PM': 'badge-primary',
            'RD': 'badge-info',
            'QA': 'badge-success',
            'PO': 'badge-warning',
            'DBA': 'badge-purple',
            'OP': 'badge-cyan'
        };
        return roleStyles[role] || 'badge-secondary';
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
                <div className="container">
                    {/* 页面头部 */}
                    <div className="page-header">
                        <div className="page-header-content">
                            <div className="page-header-icon">👤</div>
                            <div>
                                <h1 className="page-title">用户管理</h1>
                                <p className="page-subtitle">
                                    管理团队成员与权限 · 共 <span className="text-glow">{users.length}</span> 人
                                </p>
                            </div>
                        </div>
                        <div className="page-header-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowBatchModal(true)}
                            >
                                📋 批量导入
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={() => router.push('/register')}
                            >
                                ➕ 添加用户
                            </button>
                        </div>
                    </div>

                    {/* 用户列表卡片 */}
                    <div className="card">
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>用户名</th>
                                        <th>姓名</th>
                                        <th>手机号</th>
                                        <th>角色</th>
                                        <th>加入时间</th>
                                        <th className="text-right">操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user, index) => (
                                        <tr key={user.id} style={{ animationDelay: `${index * 0.05}s` }}>
                                            <td>
                                                <span className="text-mono text-glow">{user.username || '-'}</span>
                                            </td>
                                            <td>
                                                <div className="user-cell">
                                                    <div className="user-avatar">
                                                        {(user.name || '?')[0]}
                                                    </div>
                                                    <span className="user-name">{user.name}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="text-muted">{user.phone || '-'}</span>
                                            </td>
                                            <td>
                                                <div className="badge-group">
                                                    {(user.role || '').split(',').filter(r => r).map(role => (
                                                        <span
                                                            key={role}
                                                            className={`badge ${getRoleBadgeClass(role)}`}
                                                        >
                                                            {getRoleLabel(role)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td>
                                                <span className="text-muted text-sm">
                                                    {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                                                </span>
                                            </td>
                                            <td className="text-right">
                                                <div className="action-buttons">
                                                    <button
                                                        className="btn btn-sm btn-ghost"
                                                        onClick={() => startEdit(user)}
                                                    >
                                                        ✏️ 编辑
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-ghost btn-danger-ghost"
                                                        onClick={() => handleDelete(user.id)}
                                                    >
                                                        🗑️ 删除
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {users.length === 0 && (
                            <div className="empty-state">
                                <div className="empty-icon">👤</div>
                                <h3>暂无用户</h3>
                                <p>点击"添加用户"创建第一个团队成员</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 编辑用户弹窗 */}
                {editingUser && (
                    <div className="modal-overlay" onClick={() => setEditingUser(null)}>
                        <div className="modal modal-md" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3 className="modal-title">
                                    <span className="modal-icon">✏️</span>
                                    编辑用户
                                </h3>
                                <button
                                    className="modal-close"
                                    onClick={() => setEditingUser(null)}
                                >
                                    ×
                                </button>
                            </div>

                            <form onSubmit={handleUpdate} className="modal-body">
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label className="form-label">
                                            用户名 <span className="required">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="用于登录的用户名"
                                            value={editForm.username}
                                            onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
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
                                            placeholder="真实姓名"
                                            value={editForm.name}
                                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-grid">
                                    <div className="form-group">
                                        <label className="form-label">邮箱</label>
                                        <input
                                            type="email"
                                            className="form-input"
                                            placeholder="email@example.com"
                                            value={editForm.email}
                                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
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
                                            value={editForm.phone}
                                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">角色 <span className="required">*</span></label>
                                    <div className="role-selector">
                                        {roles.map(r => {
                                            const isSelected = editSelectedRoles.includes(r.code);
                                            return (
                                                <div
                                                    key={r.code}
                                                    className={`role-option ${isSelected ? 'selected' : ''}`}
                                                    onClick={() => handleRoleChange(r.code)}
                                                >
                                                    <div className="role-checkbox">
                                                        {isSelected && <span>✓</span>}
                                                    </div>
                                                    <span className="role-name">{r.name}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">新密码</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        placeholder="不修改请留空"
                                        value={editForm.password}
                                        onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                                    />
                                    <span className="form-hint">留空则保持原密码不变</span>
                                </div>

                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setEditingUser(null)}>
                                        取消
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        保存修改
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* 批量导入弹窗 */}
                {showBatchModal && (
                    <div className="modal-overlay" onClick={() => {
                        setShowBatchModal(false);
                        setBatchText('');
                        setBatchResult(null);
                    }}>
                        <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3 className="modal-title">
                                    <span className="modal-icon">📋</span>
                                    批量导入用户
                                </h3>
                                <button
                                    className="modal-close"
                                    onClick={() => {
                                        setShowBatchModal(false);
                                        setBatchText('');
                                        setBatchResult(null);
                                    }}
                                >
                                    ×
                                </button>
                            </div>

                            <div className="modal-body">
                                {/* 格式说明 */}
                                <div className="info-panel">
                                    <div className="info-panel-header">
                                        <span className="info-icon">📋</span>
                                        <span className="info-title">数据格式说明</span>
                                    </div>
                                    <div className="info-panel-content">
                                        <p>每行一个用户，字段用逗号或制表符分隔：</p>
                                        <code className="code-block">
                                            用户名, 姓名, 邮箱, 手机号, 角色, 密码(可选)
                                        </code>
                                        <p className="text-muted">
                                            角色可选：PM, RD, QA, PO, DBA, OP（多角色用/分隔如 RD/QA）<br />
                                            密码不填则默认为 123456
                                        </p>
                                    </div>
                                </div>

                                {/* 示例 */}
                                <div className="code-example">
                                    <div className="code-example-header">示例数据</div>
                                    <pre className="code-example-content">
{`zhangsan, 张三, zhangsan@example.com, 13800138001, RD
lisi, 李四, lisi@example.com, 13800138002, QA, mypassword
wangwu, 王五, wangwu@example.com, 13800138003, RD`}
                                    </pre>
                                </div>

                                {/* 文件上传 */}
                                <div className="upload-section">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        accept=".txt,.csv"
                                        onChange={handleFileUpload}
                                        style={{ display: 'none' }}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        📁 上传文件 (.txt/.csv)
                                    </button>
                                </div>

                                {/* 文本输入 */}
                                <div className="form-group">
                                    <label className="form-label">用户数据</label>
                                    <textarea
                                        className="form-input form-textarea"
                                        rows={8}
                                        placeholder="粘贴或输入用户数据..."
                                        value={batchText}
                                        onChange={(e) => setBatchText(e.target.value)}
                                    />
                                </div>

                                {/* 预览解析结果 */}
                                {batchText && (
                                    <div className="preview-panel">
                                        <div className="preview-header">
                                            <span className="preview-icon">📊</span>
                                            <span>解析预览：共 {parseBatchText(batchText).length} 条有效数据</span>
                                        </div>
                                        <div className="preview-content">
                                            {parseBatchText(batchText).slice(0, 5).map((u, i) => (
                                                <div key={i} className="preview-item">
                                                    <span className="preview-index">{i + 1}.</span>
                                                    <span>{u.username}</span>
                                                    <span className="text-muted">|</span>
                                                    <span>{u.name}</span>
                                                    <span className="text-muted">|</span>
                                                    <span>{u.phone}</span>
                                                    <span className="text-muted">|</span>
                                                    <span className="badge badge-info">{u.role}</span>
                                                </div>
                                            ))}
                                            {parseBatchText(batchText).length > 5 && (
                                                <div className="preview-more">
                                                    ... 还有 {parseBatchText(batchText).length - 5} 条
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* 执行结果 */}
                                {batchResult && (
                                    <div className={`result-panel ${batchResult.errorCount > 0 ? 'result-error' : 'result-success'}`}>
                                        <div className="result-header">
                                            <span className="result-icon">
                                                {batchResult.errorCount > 0 ? '⚠️' : '✅'}
                                            </span>
                                            <span>{batchResult.message}</span>
                                        </div>
                                        {batchResult.errors?.length > 0 && (
                                            <div className="result-errors">
                                                <div className="error-title">失败详情：</div>
                                                {batchResult.errors.map((err, i) => (
                                                    <div key={i} className="error-item">
                                                        第 {err.row} 行 {err.name ? `(${err.name})` : ''}: {err.error}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setShowBatchModal(false);
                                        setBatchText('');
                                        setBatchResult(null);
                                    }}
                                >
                                    关闭
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={executeBatchCreate}
                                    disabled={batchLoading || !batchText.trim()}
                                >
                                    {batchLoading ? (
                                        <>
                                            <span className="loading-spinner-sm"></span>
                                            导入中...
                                        </>
                                    ) : (
                                        <>
                                            🚀 开始导入
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <ConfirmModal
                    isOpen={confirmConfig.isOpen}
                    onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                    {...confirmConfig}
                />
            </main>
        </>
    );
}
