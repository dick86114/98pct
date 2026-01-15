'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import toast from 'react-hot-toast';
import ConfirmModal from '@/components/ConfirmModal';

const STAGE_LABELS = {
    PREPARATION: '准备阶段',
    IMPLEMENTATION: '实施阶段',
    VERIFICATION: '验证阶段',
    COMPLETED: '已完成',
    ROLLBACK: '已回滚',
};

const STATUS_LABELS = {
    DRAFT: '草稿',
    PENDING_REVIEW: '待评审',
    IN_PROGRESS: '进行中',
    SUCCESS: '发版成功',
    FAILED: '发版失败',
};

export default function AdminReleasesPage() {
    const router = useRouter();
    const [releases, setReleases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingRelease, setEditingRelease] = useState(null);
    const [editForm, setEditForm] = useState({
        version: '',
        description: '',
        plannedDate: '',
        stage: '',
        status: '',
    });
    const [confirmConfig, setConfirmConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'warning',
        onConfirm: () => {},
    });

    useEffect(() => {
        checkPermission();
    }, []);

    const checkPermission = () => {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        if (!token || !userStr) {
            router.push('/login');
            return;
        }
        try {
            const user = JSON.parse(userStr);
            if (!user.role?.split(',').includes('ADMIN')) {
                toast.error('无权访问');
                router.push('/dashboard');
                return;
            }
            fetchReleases(token);
        } catch {
            router.push('/login');
        }
    };

    const fetchReleases = async (token) => {
        try {
            const res = await fetch('/api/releases', {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const data = await res.json();
            setReleases(data.releases || []);
        } catch (error) {
            toast.error('获取发版列表失败');
        } finally {
            setLoading(false);
        }
    };

    const startEdit = (release) => {
        setEditingRelease(release);
        setEditForm({
            version: release.version,
            description: release.description,
            plannedDate: release.plannedDate ? release.plannedDate.split('T')[0] : '',
            stage: release.stage,
            status: release.status,
        });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');

        try {
            // 更新基本信息
            const res = await fetch(`/api/releases/${editingRelease.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    action: 'update_info',
                    version: editForm.version,
                    description: editForm.description,
                    plannedDate: editForm.plannedDate || null,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }

            toast.success('更新成功');
            setEditingRelease(null);
            fetchReleases(token);
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleDelete = (release) => {
        setConfirmConfig({
            isOpen: true,
            title: '删除发版记录',
            message: `确定要删除发版 "${release.version}" 吗？此操作不可撤销，所有关联数据将被删除。`,
            type: 'danger',
            confirmText: '确认删除',
            onConfirm: () => executeDelete(release.id),
        });
    };

    const executeDelete = async (releaseId) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/releases/${releaseId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }

            toast.success('删除成功');
            fetchReleases(token);
        } catch (error) {
            toast.error(error.message);
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
            <main className="admin-releases-page">
                <div className="container">
                    <div className="page-header">
                        <div>
                            <h1 className="page-title">发版记录管理</h1>
                            <p className="page-subtitle">管理所有发版记录（共 {releases.length} 条）</p>
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={() => router.push('/releases/new')}
                        >
                            ➕ 新建发版
                        </button>
                    </div>

                    {/* 桌面端表格视图 */}
                    <div className="card desktop-table">
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>版本号</th>
                                        <th>描述</th>
                                        <th>阶段</th>
                                        <th>状态</th>
                                        <th>计划日期</th>
                                        <th>创建人</th>
                                        <th>创建时间</th>
                                        <th className="text-right">操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {releases.map((release) => (
                                        <tr key={release.id}>
                                            <td style={{ fontWeight: 500 }}>{release.version}</td>
                                            <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {release.description}
                                            </td>
                                            <td>
                                                <span className={`badge ${
                                                    release.stage === 'COMPLETED' ? 'badge-success' :
                                                    release.stage === 'ROLLBACK' ? 'badge-danger' : 'badge-info'
                                                }`}>
                                                    {STAGE_LABELS[release.stage]}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge ${
                                                    release.status === 'SUCCESS' ? 'badge-success' :
                                                    release.status === 'FAILED' ? 'badge-danger' :
                                                    release.status === 'IN_PROGRESS' ? 'badge-warning' : 'badge-secondary'
                                                }`}>
                                                    {STATUS_LABELS[release.status]}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: '13px' }}>
                                                {release.plannedDate ? new Date(release.plannedDate).toLocaleDateString('zh-CN') : '-'}
                                            </td>
                                            <td>{release.createdBy?.name}</td>
                                            <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                                {new Date(release.createdAt).toLocaleDateString('zh-CN')}
                                            </td>
                                            <td className="text-right">
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                    <button
                                                        className="btn btn-secondary"
                                                        style={{ padding: '6px 12px', fontSize: '12px' }}
                                                        onClick={() => router.push(`/releases/${release.id}`)}
                                                    >
                                                        查看
                                                    </button>
                                                    <button
                                                        className="btn btn-secondary"
                                                        style={{ padding: '6px 12px', fontSize: '12px' }}
                                                        onClick={() => startEdit(release)}
                                                    >
                                                        编辑
                                                    </button>
                                                    <button
                                                        className="btn btn-danger"
                                                        style={{ padding: '6px 12px', fontSize: '12px' }}
                                                        onClick={() => handleDelete(release)}
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

                    {/* 移动端卡片视图 */}
                    <div className="mobile-cards">
                        {releases.map((release) => (
                            <div key={release.id} className="card release-card-mobile">
                                <div className="release-card-mobile-header">
                                    <div className="release-card-mobile-title">{release.version}</div>
                                    <div className="release-card-mobile-badges">
                                        <span className={`badge ${
                                            release.stage === 'COMPLETED' ? 'badge-success' :
                                            release.stage === 'ROLLBACK' ? 'badge-danger' : 'badge-info'
                                        }`}>
                                            {STAGE_LABELS[release.stage]}
                                        </span>
                                    </div>
                                </div>
                                <div className="release-card-mobile-desc">{release.description}</div>
                                <div className="release-card-mobile-meta">
                                    <span>📅 {release.plannedDate ? new Date(release.plannedDate).toLocaleDateString('zh-CN') : '未设置'}</span>
                                    <span>👤 {release.createdBy?.name}</span>
                                </div>
                                <div className="release-card-mobile-actions">
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => router.push(`/releases/${release.id}`)}
                                    >
                                        查看
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => startEdit(release)}
                                    >
                                        编辑
                                    </button>
                                    <button
                                        className="btn btn-danger"
                                        onClick={() => handleDelete(release)}
                                    >
                                        删除
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 编辑弹窗 */}
                {editingRelease && (
                    <div className="modal-overlay">
                        <div className="card modal-card">
                            <div className="card-header">
                                <h3 className="card-title">编辑发版信息</h3>
                                <button
                                    onClick={() => setEditingRelease(null)}
                                    className="modal-close-btn"
                                >
                                    ×
                                </button>
                            </div>

                            <form onSubmit={handleUpdate}>
                                <div className="form-group">
                                    <label className="form-label">版本号</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={editForm.version}
                                        onChange={(e) => setEditForm({ ...editForm, version: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">描述</label>
                                    <textarea
                                        className="form-input"
                                        rows={3}
                                        value={editForm.description}
                                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">计划发版日期</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={editForm.plannedDate}
                                        onChange={(e) => setEditForm({ ...editForm, plannedDate: e.target.value })}
                                    />
                                </div>

                                <div className="modal-actions">
                                    <button type="submit" className="btn btn-primary">保存</button>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setEditingRelease(null)}
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

                <style jsx>{`
                    .admin-releases-page {
                        padding: 32px 24px;
                    }

                    .admin-releases-page .container {
                        max-width: 1200px;
                    }

                    .mobile-cards {
                        display: none;
                    }

                    .modal-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0,0,0,0.7);
                        backdrop-filter: blur(4px);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 1000;
                        padding: 16px;
                    }

                    .modal-card {
                        width: 500px;
                        max-width: 100%;
                        max-height: 90vh;
                        overflow-y: auto;
                    }

                    .modal-close-btn {
                        background: none;
                        border: none;
                        color: var(--text-muted);
                        cursor: pointer;
                        font-size: 20px;
                        padding: 4px 8px;
                    }

                    .modal-close-btn:hover {
                        color: var(--text-primary);
                    }

                    .modal-actions {
                        display: flex;
                        gap: 10px;
                        margin-top: 24px;
                    }

                    .modal-actions .btn {
                        flex: 1;
                    }

                    /* 移动端卡片样式 */
                    .release-card-mobile {
                        margin-bottom: 12px;
                    }

                    .release-card-mobile-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        gap: 12px;
                        margin-bottom: 8px;
                    }

                    .release-card-mobile-title {
                        font-size: 16px;
                        font-weight: 600;
                        color: var(--text-primary);
                    }

                    .release-card-mobile-badges {
                        display: flex;
                        gap: 4px;
                        flex-shrink: 0;
                    }

                    .release-card-mobile-desc {
                        font-size: 13px;
                        color: var(--text-secondary);
                        margin-bottom: 12px;
                        display: -webkit-box;
                        -webkit-line-clamp: 2;
                        -webkit-box-orient: vertical;
                        overflow: hidden;
                    }

                    .release-card-mobile-meta {
                        display: flex;
                        gap: 16px;
                        font-size: 12px;
                        color: var(--text-muted);
                        margin-bottom: 12px;
                    }

                    .release-card-mobile-actions {
                        display: flex;
                        gap: 8px;
                        padding-top: 12px;
                        border-top: 1px solid var(--border-color);
                    }

                    .release-card-mobile-actions .btn {
                        flex: 1;
                        padding: 8px 12px;
                        font-size: 12px;
                    }

                    @media (max-width: 768px) {
                        .admin-releases-page {
                            padding: 16px 12px;
                        }

                        .desktop-table {
                            display: none;
                        }

                        .mobile-cards {
                            display: block;
                        }

                        .modal-card {
                            width: 100%;
                        }
                    }
                `}</style>
            </main>
        </>
    );
}
