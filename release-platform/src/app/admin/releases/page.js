'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import DatePicker from '@/components/DatePicker';
import toast from 'react-hot-toast';
import ConfirmModal from '@/components/ConfirmModal';
import useDictionary from '@/hooks/useDictionary';

const STAGE_LABELS = {
    PREPARATION: '准备阶段',
    IMPLEMENTATION: '实施阶段',
    VERIFICATION: '验证阶段',
    COMPLETED: '已完成',
    ROLLBACK: '已回滚',
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

    // 排序和筛选状态
    const [sortField, setSortField] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');
    const [filterStage, setFilterStage] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [searchText, setSearchText] = useState('');
    
    // 从数据字典获取状态选项
    const { items: statusItems, getLabel: getStatusLabel } = useDictionary('status');

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
        // 先关闭确认弹窗
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        
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

    // 排序和筛选后的发版列表
    const filteredAndSortedReleases = () => {
        let result = [...releases];

        // 筛选：按阶段
        if (filterStage) {
            result = result.filter(release => release.stage === filterStage);
        }

        // 筛选：按状态
        if (filterStatus) {
            result = result.filter(release => release.status === filterStatus);
        }

        // 筛选：按搜索文本
        if (searchText) {
            const search = searchText.toLowerCase();
            result = result.filter(release =>
                (release.version && release.version.toLowerCase().includes(search)) ||
                (release.description && release.description.toLowerCase().includes(search)) ||
                (release.createdBy?.name && release.createdBy.name.toLowerCase().includes(search))
            );
        }

        // 排序
        result.sort((a, b) => {
            let aVal, bVal;

            switch (sortField) {
                case 'version':
                    aVal = (a.version || '').toLowerCase();
                    bVal = (b.version || '').toLowerCase();
                    break;
                case 'stage':
                    aVal = a.stage || '';
                    bVal = b.stage || '';
                    break;
                case 'status':
                    aVal = a.status || '';
                    bVal = b.status || '';
                    break;
                case 'plannedDate':
                    aVal = a.plannedDate ? new Date(a.plannedDate).getTime() : 0;
                    bVal = b.plannedDate ? new Date(b.plannedDate).getTime() : 0;
                    break;
                case 'createdAt':
                    aVal = new Date(a.createdAt).getTime();
                    bVal = new Date(b.createdAt).getTime();
                    break;
                default:
                    return 0;
            }

            if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    };

    // 处理排序
    const handleSort = (field) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    // 获取排序图标
    const getSortIcon = (field) => {
        if (sortField !== field) {
            return <span className="sort-icon">⇅</span>;
        }
        return sortOrder === 'asc' 
            ? <span className="sort-icon active">↑</span>
            : <span className="sort-icon active">↓</span>;
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
                                    管理所有发版记录 · 共 <span className="text-glow">{filteredAndSortedReleases().length}</span> 条
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 筛选和搜索栏 */}
                    <div className="filter-bar">
                        <div className="filter-group">
                            <label className="filter-label">🔍 搜索</label>
                            <input
                                type="text"
                                className="filter-input"
                                placeholder="搜索版本号、描述或创建人..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                            />
                        </div>
                        <div className="filter-group">
                            <label className="filter-label">📊 阶段筛选</label>
                            <select
                                className="filter-select"
                                value={filterStage}
                                onChange={(e) => setFilterStage(e.target.value)}
                            >
                                <option value="">全部阶段</option>
                                {Object.entries(STAGE_LABELS).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-group">
                            <label className="filter-label">🏷️ 状态筛选</label>
                            <select
                                className="filter-select"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                <option value="">全部状态</option>
                                {statusItems.map(item => (
                                    <option key={item.code} value={item.code}>{item.name}</option>
                                ))}
                            </select>
                        </div>
                        {(searchText || filterStage || filterStatus) && (
                            <button
                                className="btn btn-sm btn-ghost"
                                onClick={() => {
                                    setSearchText('');
                                    setFilterStage('');
                                    setFilterStatus('');
                                }}
                            >
                                ✕ 清除筛选
                            </button>
                        )}
                    </div>

                    {/* 发版列表 */}
                    <div className="table-container">
                        <table className="table admin-table">
                            <thead>
                                <tr>
                                    <th onClick={() => handleSort('version')} className="sortable">
                                        版本号 {getSortIcon('version')}
                                    </th>
                                    <th>描述</th>
                                    <th onClick={() => handleSort('stage')} className="sortable">
                                        阶段 {getSortIcon('stage')}
                                    </th>
                                    <th onClick={() => handleSort('status')} className="sortable">
                                        状态 {getSortIcon('status')}
                                    </th>
                                    <th onClick={() => handleSort('plannedDate')} className="sortable">
                                        计划日期 {getSortIcon('plannedDate')}
                                    </th>
                                    <th>创建人</th>
                                    <th onClick={() => handleSort('createdAt')} className="sortable">
                                        创建时间 {getSortIcon('createdAt')}
                                    </th>
                                    <th className="text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAndSortedReleases().length === 0 ? (
                                    <tr>
                                        <td colSpan={8}>
                                            <div className="empty-state">
                                                <div className="empty-icon">📋</div>
                                                <h3>{searchText || filterStage || filterStatus ? '没有符合条件的发版记录' : '暂无发版记录'}</h3>
                                                <p>{searchText || filterStage || filterStatus ? '尝试调整筛选条件' : '等待项目经理创建发版记录'}</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredAndSortedReleases().map((release, index) => (
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
                                                    {getStatusLabel(release.status)}
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
