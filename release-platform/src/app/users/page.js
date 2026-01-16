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
            setConfirmConfig(prev => ({ ...prev, isOpen: false }));
            toast.success('更新成功');
        } catch (error) {
            setConfirmConfig(prev => ({ ...prev, isOpen: false }));
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
            setConfirmConfig(prev => ({ ...prev, isOpen: false }));
            toast.success('删除成功');
        } catch (error) {
            setConfirmConfig(prev => ({ ...prev, isOpen: false }));
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
                                                        {(user.name || '?').slice(-1)}
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
                        <div className="modal modal-lg batch-import-modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header batch-modal-header">
                                <h3 className="modal-title">
                                    <span className="batch-title-icon">👥</span>
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

                            <div className="modal-body batch-modal-body">
                                <div className="batch-import-layout">
                                    {/* 左侧：格式说明 */}
                                    <div className="batch-import-guide">
                                        <div className="guide-section">
                                            <div className="guide-header">
                                                <span className="guide-icon">📋</span>
                                                <h4>数据格式</h4>
                                            </div>
                                            <div className="guide-content">
                                                <p className="guide-desc">每行一个用户，字段用逗号或制表符分隔</p>
                                                <div className="format-fields">
                                                    <span className="field-tag field-required">用户名</span>
                                                    <span className="field-tag field-required">姓名</span>
                                                    <span className="field-tag field-required">邮箱</span>
                                                    <span className="field-tag field-required">手机号</span>
                                                    <span className="field-tag field-required">角色</span>
                                                    <span className="field-tag field-optional">密码</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="guide-section">
                                            <div className="guide-header">
                                                <span className="guide-icon">🏷️</span>
                                                <h4>可用角色</h4>
                                            </div>
                                            <div className="guide-content">
                                                <div className="role-tags">
                                                    <span className="role-tag role-pm">PM</span>
                                                    <span className="role-tag role-rd">RD</span>
                                                    <span className="role-tag role-qa">QA</span>
                                                    <span className="role-tag role-po">PO</span>
                                                    <span className="role-tag role-dba">DBA</span>
                                                    <span className="role-tag role-op">OP</span>
                                                </div>
                                                <p className="guide-tip">💡 多角色用 / 分隔，如 RD/QA</p>
                                            </div>
                                        </div>

                                        <div className="guide-section">
                                            <div className="guide-header">
                                                <span className="guide-icon">📝</span>
                                                <h4>示例数据</h4>
                                            </div>
                                            <div className="example-code">
                                                <div className="example-line">
                                                    <span className="line-num">1</span>
                                                    <span className="line-content">zhangsan, 张三, zhangsan@example.com, 13800138001, RD</span>
                                                </div>
                                                <div className="example-line">
                                                    <span className="line-num">2</span>
                                                    <span className="line-content">lisi, 李四, lisi@example.com, 13800138002, QA, pwd123</span>
                                                </div>
                                                <div className="example-line">
                                                    <span className="line-num">3</span>
                                                    <span className="line-content">wangwu, 王五, wangwu@example.com, 13800138003, RD/QA</span>
                                                </div>
                                            </div>
                                            <p className="guide-tip">🔐 密码不填默认为 123456</p>
                                        </div>
                                    </div>

                                    {/* 右侧：数据输入 */}
                                    <div className="batch-import-input">
                                        <div className="input-header">
                                            <h4>用户数据</h4>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                accept=".txt,.csv"
                                                onChange={handleFileUpload}
                                                style={{ display: 'none' }}
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline"
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                <span className="btn-icon">📁</span>
                                                导入文件
                                            </button>
                                        </div>
                                        
                                        <div className="textarea-wrapper">
                                            <textarea
                                                className="batch-textarea"
                                                placeholder="在此粘贴或输入用户数据，每行一个用户..."
                                                value={batchText}
                                                onChange={(e) => setBatchText(e.target.value)}
                                            />
                                            {!batchText && (
                                                <div className="textarea-placeholder-icon">
                                                    <span>📋</span>
                                                    <span>粘贴数据</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* 解析预览 */}
                                        {batchText && parseBatchText(batchText).length > 0 && (
                                            <div className="parse-preview">
                                                <div className="preview-badge">
                                                    <span className="preview-count">{parseBatchText(batchText).length}</span>
                                                    <span>条有效数据</span>
                                                </div>
                                                <div className="preview-list">
                                                    {parseBatchText(batchText).slice(0, 3).map((u, i) => (
                                                        <div key={i} className="preview-user">
                                                            <span className="preview-avatar">{u.name.slice(-1)}</span>
                                                            <span className="preview-name">{u.name}</span>
                                                            <span className="preview-role">{u.role}</span>
                                                        </div>
                                                    ))}
                                                    {parseBatchText(batchText).length > 3 && (
                                                        <div className="preview-more-badge">
                                                            +{parseBatchText(batchText).length - 3} 更多
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* 执行结果 */}
                                        {batchResult && (
                                            <div className={`batch-result ${batchResult.errorCount > 0 ? 'result-has-error' : 'result-all-success'}`}>
                                                <div className="result-summary">
                                                    <span className="result-icon-lg">
                                                        {batchResult.errorCount > 0 ? '⚠️' : '✅'}
                                                    </span>
                                                    <div className="result-text">
                                                        <span className="result-title">{batchResult.message}</span>
                                                        <span className="result-detail">
                                                            成功 {batchResult.successCount} 个
                                                            {batchResult.errorCount > 0 && `，失败 ${batchResult.errorCount} 个`}
                                                        </span>
                                                    </div>
                                                </div>
                                                {batchResult.errors?.length > 0 && (
                                                    <div className="result-error-list">
                                                        {batchResult.errors.slice(0, 5).map((err, i) => (
                                                            <div key={i} className="error-row">
                                                                <span className="error-badge">第{err.row}行</span>
                                                                <span className="error-msg">{err.error}</span>
                                                            </div>
                                                        ))}
                                                        {batchResult.errors.length > 5 && (
                                                            <div className="error-more">还有 {batchResult.errors.length - 5} 个错误...</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer batch-modal-footer">
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
                                    className="btn btn-primary btn-glow"
                                    onClick={executeBatchCreate}
                                    disabled={batchLoading || !batchText.trim() || parseBatchText(batchText).length === 0}
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
