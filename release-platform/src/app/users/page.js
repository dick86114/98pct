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
        password: '', // 可选，仅当修改密码时填写
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
        // 将 user.role (string) 解析为 array
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
                role: editSelectedRoles, // Send array
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

            // 刷新列表
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
            // 支持多种分隔符：逗号、制表符
            const parts = line.split(/[,\t]+/).map(p => p.trim());
            if (parts.length >= 5) {
                users.push({
                    username: parts[0],
                    name: parts[1],
                    email: parts[2],
                    phone: parts[3],
                    role: parts[4],
                    password: parts[5] || '123456', // 默认密码
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
                <div className="container" style={{ maxWidth: '1000px' }}>
                    <div className="page-header">
                        <div>
                            <h1 className="page-title">用户管理</h1>
                            <p className="page-subtitle">管理团队成员与权限 (共 {users.length} 人)</p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
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
                                    {users.map((user) => (
                                        <tr key={user.id}>
                                            <td style={{ fontWeight: 500, color: 'var(--primary-light)' }}>{user.username || '-'}</td>
                                            <td style={{ fontWeight: 500 }}>{user.name}</td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{user.phone || '-'}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                    {(user.role || '').split(',').map(role => (
                                                        <span
                                                            key={role}
                                                            className={`badge ${role === 'PM' ? 'badge-primary' :
                                                                role === 'RD' ? 'badge-info' :
                                                                    role === 'OP' ? 'badge-warning' : 'badge-success'
                                                                }`}
                                                        >
                                                            {getRoleLabel(role)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                                {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                                            </td>
                                            <td className="text-right">
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                    <button
                                                        className="btn btn-secondary"
                                                        style={{ padding: '6px 12px', fontSize: '12px' }}
                                                        onClick={() => startEdit(user)}
                                                    >
                                                        编辑
                                                    </button>
                                                    <button
                                                        className="btn btn-danger"
                                                        style={{ padding: '6px 12px', fontSize: '12px' }}
                                                        onClick={() => handleDelete(user.id)}
                                                    >
                                                        删除
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* 编辑弹窗 */}
                {editingUser && (
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.7)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }}>
                        <div className="card" style={{ width: '450px', maxWidth: '90%' }}>
                            <div className="card-header">
                                <h3 className="card-title">编辑用户</h3>
                                <button
                                    onClick={() => setEditingUser(null)}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px' }}
                                >
                                    ×
                                </button>
                            </div>

                            <form onSubmit={handleUpdate}>
                                <div className="form-group">
                                    <label className="form-label">用户名 <span style={{ color: 'var(--danger)' }}>*</span></label>
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
                                    <label className="form-label">姓名</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">邮箱</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        value={editForm.email}
                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">手机号 <span style={{ color: 'var(--danger)' }}>*</span></label>
                                    <input
                                        type="tel"
                                        className="form-input"
                                        placeholder="请输入手机号"
                                        value={editForm.phone}
                                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>角色</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        {roles.map(r => {
                                            const isSelected = editSelectedRoles.includes(r.code);
                                            return (
                                                <div
                                                    key={r.code}
                                                    onClick={() => handleRoleChange(r.code)}
                                                    style={{
                                                        padding: '8px 12px',
                                                        border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                                                        borderRadius: 'var(--radius-sm)',
                                                        background: isSelected ? 'rgba(52, 120, 246, 0.1)' : 'var(--bg-tertiary)',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        fontSize: '13px'
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => { }}
                                                        style={{ marginRight: '8px' }}
                                                    />
                                                    {r.name}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">新密码 (可选)</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        placeholder="不修改请留空"
                                        value={editForm.password}
                                        onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>保存</button>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setEditingUser(null)}
                                        style={{ flex: 1 }}
                                    >
                                        取消
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <ConfirmModal
                    isOpen={confirmConfig.isOpen}
                    onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                    {...confirmConfig}
                />

                {/* 批量导入弹窗 */}
                {showBatchModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.7)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }}>
                        <div className="card" style={{ width: '600px', maxWidth: '90%', maxHeight: '90vh', overflow: 'auto' }}>
                            <div className="card-header">
                                <h3 className="card-title">批量导入用户</h3>
                                <button
                                    onClick={() => {
                                        setShowBatchModal(false);
                                        setBatchText('');
                                        setBatchResult(null);
                                    }}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px' }}
                                >
                                    ×
                                </button>
                            </div>

                            <div style={{ padding: '0 16px 16px' }}>
                                {/* 格式说明 */}
                                <div style={{
                                    background: 'var(--bg-tertiary)',
                                    padding: '12px',
                                    borderRadius: 'var(--radius-sm)',
                                    marginBottom: '16px',
                                    fontSize: '13px'
                                }}>
                                    <div style={{ fontWeight: 500, marginBottom: '8px', color: 'var(--text-primary)' }}>📋 数据格式说明</div>
                                    <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                        每行一个用户，字段用逗号或制表符分隔：<br />
                                        <code style={{ background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px' }}>
                                            用户名, 姓名, 邮箱, 手机号, 角色, 密码(可选)
                                        </code><br />
                                        角色可选：PM, RD, QA, PO, DBA, OP（多角色用/分隔如 RD/QA）<br />
                                        密码不填则默认为 123456
                                    </div>
                                </div>

                                {/* 示例 */}
                                <div style={{
                                    background: 'var(--bg-secondary)',
                                    padding: '12px',
                                    borderRadius: 'var(--radius-sm)',
                                    marginBottom: '16px',
                                    fontSize: '12px',
                                    fontFamily: 'monospace',
                                    color: 'var(--text-muted)'
                                }}>
                                    zhangsan, 张三, zhangsan@example.com, 13800138001, RD<br />
                                    lisi, 李四, lisi@example.com, 13800138002, QA, mypassword<br />
                                    wangwu, 王五, wangwu@example.com, 13800138003, RD
                                </div>

                                {/* 文件上传 */}
                                <div style={{ marginBottom: '16px' }}>
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
                                        style={{ fontSize: '13px' }}
                                    >
                                        📁 上传文件 (.txt/.csv)
                                    </button>
                                </div>

                                {/* 文本输入 */}
                                <div className="form-group">
                                    <label className="form-label">用户数据</label>
                                    <textarea
                                        className="form-input"
                                        rows={8}
                                        placeholder="粘贴或输入用户数据..."
                                        value={batchText}
                                        onChange={(e) => setBatchText(e.target.value)}
                                        style={{ fontFamily: 'monospace', fontSize: '13px' }}
                                    />
                                </div>

                                {/* 预览解析结果 */}
                                {batchText && (
                                    <div style={{
                                        background: 'var(--bg-tertiary)',
                                        padding: '12px',
                                        borderRadius: 'var(--radius-sm)',
                                        marginBottom: '16px',
                                        fontSize: '13px'
                                    }}>
                                        <div style={{ fontWeight: 500, marginBottom: '8px' }}>
                                            📊 解析预览：共 {parseBatchText(batchText).length} 条有效数据
                                        </div>
                                        {parseBatchText(batchText).slice(0, 5).map((u, i) => (
                                            <div key={i} style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                                                {i + 1}. {u.username} | {u.name} | {u.phone} | {u.role}
                                            </div>
                                        ))}
                                        {parseBatchText(batchText).length > 5 && (
                                            <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
                                                ... 还有 {parseBatchText(batchText).length - 5} 条
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 执行结果 */}
                                {batchResult && (
                                    <div style={{
                                        background: batchResult.errorCount > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                                        border: `1px solid ${batchResult.errorCount > 0 ? 'var(--danger)' : 'var(--success)'}`,
                                        padding: '12px',
                                        borderRadius: 'var(--radius-sm)',
                                        marginBottom: '16px',
                                        fontSize: '13px'
                                    }}>
                                        <div style={{ fontWeight: 500, marginBottom: '8px' }}>
                                            {batchResult.errorCount > 0 ? '⚠️' : '✅'} {batchResult.message}
                                        </div>
                                        {batchResult.errors?.length > 0 && (
                                            <div style={{ marginTop: '8px' }}>
                                                <div style={{ color: 'var(--danger)', fontWeight: 500, marginBottom: '4px' }}>失败详情：</div>
                                                {batchResult.errors.map((err, i) => (
                                                    <div key={i} style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                                                        第 {err.row} 行 {err.name ? `(${err.name})` : ''}: {err.error}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 操作按钮 */}
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={executeBatchCreate}
                                        disabled={batchLoading || !batchText.trim()}
                                        style={{ flex: 1 }}
                                    >
                                        {batchLoading ? '导入中...' : '确认导入'}
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => {
                                            setShowBatchModal(false);
                                            setBatchText('');
                                            setBatchResult(null);
                                        }}
                                        style={{ flex: 1 }}
                                    >
                                        关闭
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}
