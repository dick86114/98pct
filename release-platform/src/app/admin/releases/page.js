'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import DatePicker from '@/components/DatePicker';
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

    // 获取阶段徽章样式
    const getStageBadgeClass = (stage) => {
        const styles = {
            'PREPARATION': 'badge-info',
            'IMPLEMENTATION': 'badge-warning',
            'VERIFICATION': 'badge-primary',
            'COMPLETED': 'badge-success',
            'ROLLBACK': 'badge-danger',
        };
        return styles[stage] || 'badge-secondary';
    };

    // 获取状态徽章样式
    const getStatusBadgeClass = (status) => {
        const styles = {
            'DRAFT': 'badge-secondary',
            'PENDING_REVIEW': 'badge-warning',
            'IN_PROGRESS': 'badge-info',
            'SUCCESS': 'badge-success',
            'FAILED': 'badge-danger',
        };
        return styles[status] || 'badge-secondary';
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
                <div className="container" style={{ maxWidth: '1400px' }}>
                    {/* 页面头部 */}
                    <div className="page-header">
                        <div className="page-header-content">
                            <div className="page-header-icon">📋</div>
                            <div>
                                <h1 className="page-title">发版记录管理</h1>
                                <p className="page-subtitle">
                                    管理所有发版记录 · 共 <span className="text-glow">{releases.length}</span> 条
                                </p>
                            </div>
                        </div>
                        <div className="page-header-actions">
                            <button
                                className="btn btn-primary"
                                onClick={() => router.push('/releases/new')}
                            >
                                ➕ 新建发版
                            </button>
                        </div>
                    </div>

                    {/* 发版列表 */}
                    <div className="table-container">
                        <table className="table admin-table">
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
                                {releases.length === 0 ? (
                                    <tr>
                                        <td colSpan={8}>
                                            <div className="empty-state">
                                                <div className="empty-icon">📋</div>
                                                <h3>暂无发版记录</h3>
                                                <p>点击"新建发版"创建第一个发版</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    releases.map((release, index) => (
                                        <tr key={release.id} style={{ animationDelay: `${index * 0.03}s` }}>
                                            <td>
                                                <span 
                                                    className="version-link"
                                                    onClick={() => router.push(`/releases/${release.id}`)}
                                                >
                                                    {release.version}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="desc-cell" title={release.description}>
                                                    {release.description}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge ${getStageBadgeClass(release.stage)}`}>
                                                    {STAGE_LABELS[release.stage]}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge ${getStatusBadgeClass(release.status)}`}>
                                                    {STATUS_LABELS[release.status]}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="text-muted text-sm">
                                                    {release.plannedDate 
                                                        ? new Date(release.plannedDate).toLocaleDateString('zh-CN') 
                                                        : '-'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="creator-cell">
                                                    <span className="creator-avatar">
                                                        {(release.createdBy?.name || '?').slice(-1)}
                                                    </span>
                                                    <span>{release.createdBy?.name}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="text-muted text-sm">
                                                    {new Date(release.createdAt).toLocaleDateString('zh-CN')}
                                                </span>
                                            </td>
                                            <td className="text-right">
                                                <div className="action-buttons">
                                                    <button
                                                        className="btn btn-sm btn-ghost"
                                                        onClick={() => router.push(`/releases/${release.id}`)}
                                                    >
                                                        👁️ 查看
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-ghost"
                                                        onClick={() => startEdit(release)}
                                                    >
                                                        ✏️ 编辑
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-ghost btn-danger-ghost"
                                                        onClick={() => handleDelete(release)}
                                                    >
                                                        🗑️ 删除
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 编辑弹窗 */}
                {editingRelease && (
                    <div className="modal-overlay" onClick={() => setEditingRelease(null)}>
                        <div className="modal modal-md" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3 className="modal-title">
                                    <span className="modal-icon">✏️</span>
                                    编辑发版信息
                                </h3>
                                <button className="modal-close" onClick={() => setEditingRelease(null)}>×</button>
                            </div>

                            <form onSubmit={handleUpdate} className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">
                                        版本号 <span className="required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={editForm.version}
                                        onChange={(e) => setEditForm({ ...editForm, version: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">
                                        描述 <span className="required">*</span>
                                    </label>
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
                                    <DatePicker
                                        value={editForm.plannedDate}
                                        onChange={value => setEditForm({ ...editForm, plannedDate: value })}
                                        placeholder="选择计划日期"
                                    />
                                </div>

                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setEditingRelease(null)}>
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

                <ConfirmModal
                    isOpen={confirmConfig.isOpen}
                    onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                    {...confirmConfig}
                />
            </main>
        </>
    );
}
