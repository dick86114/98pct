'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import toast from 'react-hot-toast';
import ConfirmModal from '@/components/ConfirmModal';

// 字典类型定义
const DICT_TYPES = [
    { code: 'platform', name: '发版平台', desc: '发版申请时可选的平台' },
    { code: 'system', name: '所属系统', desc: '开发人员填报变更时选择的系统' },
    { code: 'status', name: '发版状态', desc: '发版记录的状态选项' },
    { code: 'docType', name: '文档类型', desc: '上传文档时的类型选项' },
    { code: 'dbChangeType', name: '数据库变更类型', desc: '数据库变更的类型选项' },
];

export default function DictionaryPage() {
    const router = useRouter();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeType, setActiveType] = useState('platform');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [form, setForm] = useState({ code: '', name: '', sortOrder: 0 });
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

    useEffect(() => {
        if (!loading) {
            fetchItems();
        }
    }, [activeType]);

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
            fetchItems();
        } catch {
            router.push('/login');
        }
    };

    const fetchItems = async () => {
        try {
            const res = await fetch(`/api/dictionary?type=${activeType}`);
            const data = await res.json();
            setItems(data.items || []);
        } catch (error) {
            toast.error('获取字典数据失败');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');

        try {
            const res = await fetch('/api/dictionary', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    type: activeType,
                    code: form.code,
                    name: form.name,
                    sortOrder: parseInt(form.sortOrder) || 0,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success('添加成功');
            setShowAddModal(false);
            setForm({ code: '', name: '', sortOrder: 0 });
            fetchItems();
        } catch (error) {
            toast.error(error.message);
        }
    };

    const startEdit = (item) => {
        setEditingItem(item);
        setForm({ code: item.code, name: item.name, sortOrder: item.sortOrder });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');

        try {
            const res = await fetch(`/api/dictionary/${editingItem.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: form.name,
                    sortOrder: parseInt(form.sortOrder) || 0,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success('更新成功');
            setEditingItem(null);
            setForm({ code: '', name: '', sortOrder: 0 });
            fetchItems();
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleToggleEnabled = async (item) => {
        const token = localStorage.getItem('token');

        try {
            const res = await fetch(`/api/dictionary/${item.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ enabled: !item.enabled }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }

            toast.success(item.enabled ? '已禁用' : '已启用');
            fetchItems();
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleDelete = (item) => {
        setConfirmConfig({
            isOpen: true,
            title: '删除字典项',
            message: `确定要删除 "${item.name}" 吗？`,
            type: 'danger',
            confirmText: '确认删除',
            onConfirm: () => executeDelete(item.id),
        });
    };

    const executeDelete = async (itemId) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/dictionary/${itemId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }

            toast.success('删除成功');
            fetchItems();
        } catch (error) {
            toast.error(error.message);
        }
    };

    const currentTypeInfo = DICT_TYPES.find(t => t.code === activeType);

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
            <main className="dictionary-page">
                <div className="container">
                    <div className="page-header">
                        <div>
                            <h1 className="page-title">数据字典管理</h1>
                            <p className="page-subtitle">管理系统下拉选项和配置项</p>
                        </div>
                    </div>

                    {/* 类型切换标签 */}
                    <div className="dict-type-tabs">
                        {DICT_TYPES.map(type => (
                            <button
                                key={type.code}
                                className={`btn ${activeType === type.code ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setActiveType(type.code)}
                            >
                                {type.name}
                            </button>
                        ))}
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <div>
                                <h3 className="card-title">{currentTypeInfo?.name}</h3>
                                <p className="dict-type-desc">
                                    {currentTypeInfo?.desc}
                                </p>
                            </div>
                            <button
                                className="btn btn-primary"
                                onClick={() => {
                                    setForm({ code: '', name: '', sortOrder: items.length });
                                    setShowAddModal(true);
                                }}
                            >
                                ➕ 添加选项
                            </button>
                        </div>

                        {/* 桌面端表格 */}
                        <div className="table-container desktop-table">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>编码</th>
                                        <th>名称</th>
                                        <th>排序</th>
                                        <th>状态</th>
                                        <th className="text-right">操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="empty-cell">
                                                暂无数据，点击上方按钮添加
                                            </td>
                                        </tr>
                                    ) : (
                                        items.map((item) => (
                                            <tr key={item.id} style={{ opacity: item.enabled ? 1 : 0.5 }}>
                                                <td><code className="code-tag">{item.code}</code></td>
                                                <td style={{ fontWeight: 500 }}>{item.name}</td>
                                                <td>{item.sortOrder}</td>
                                                <td>
                                                    <span className={`badge ${item.enabled ? 'badge-success' : 'badge-secondary'}`}>
                                                        {item.enabled ? '启用' : '禁用'}
                                                    </span>
                                                </td>
                                                <td className="text-right">
                                                    <div className="table-actions">
                                                        <button
                                                            className="btn btn-secondary btn-sm"
                                                            onClick={() => handleToggleEnabled(item)}
                                                        >
                                                            {item.enabled ? '禁用' : '启用'}
                                                        </button>
                                                        <button
                                                            className="btn btn-secondary btn-sm"
                                                            onClick={() => startEdit(item)}
                                                        >
                                                            编辑
                                                        </button>
                                                        <button
                                                            className="btn btn-danger btn-sm"
                                                            onClick={() => handleDelete(item)}
                                                        >
                                                            删除
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* 移动端卡片列表 */}
                        <div className="mobile-list">
                            {items.length === 0 ? (
                                <div className="empty-cell">
                                    暂无数据，点击上方按钮添加
                                </div>
                            ) : (
                                items.map((item) => (
                                    <div key={item.id} className={`dict-item-card ${!item.enabled ? 'disabled' : ''}`}>
                                        <div className="dict-item-header">
                                            <div>
                                                <code className="code-tag">{item.code}</code>
                                                <span className="dict-item-name">{item.name}</span>
                                            </div>
                                            <span className={`badge ${item.enabled ? 'badge-success' : 'badge-secondary'}`}>
                                                {item.enabled ? '启用' : '禁用'}
                                            </span>
                                        </div>
                                        <div className="dict-item-actions">
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => handleToggleEnabled(item)}
                                            >
                                                {item.enabled ? '禁用' : '启用'}
                                            </button>
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => startEdit(item)}
                                            >
                                                编辑
                                            </button>
                                            <button
                                                className="btn btn-danger"
                                                onClick={() => handleDelete(item)}
                                            >
                                                删除
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* 添加弹窗 */}
                {showAddModal && (
                    <div className="modal-overlay">
                        <div className="card modal-card">
                            <div className="card-header">
                                <h3 className="card-title">添加{currentTypeInfo?.name}选项</h3>
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="modal-close-btn"
                                >
                                    ×
                                </button>
                            </div>

                            <form onSubmit={handleAdd}>
                                <div className="form-group">
                                    <label className="form-label">编码 <span className="required">*</span></label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="如：PORTAL"
                                        value={form.code}
                                        onChange={(e) => setForm({ ...form, code: e.target.value })}
                                        required
                                    />
                                    <small className="form-hint">
                                        唯一标识，建议使用大写英文
                                    </small>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">名称 <span className="required">*</span></label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="如：门户系统"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">排序</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={form.sortOrder}
                                        onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                                    />
                                    <small className="form-hint">
                                        数字越小越靠前
                                    </small>
                                </div>

                                <div className="modal-actions">
                                    <button type="submit" className="btn btn-primary">添加</button>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setShowAddModal(false)}
                                    >
                                        取消
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* 编辑弹窗 */}
                {editingItem && (
                    <div className="modal-overlay">
                        <div className="card modal-card">
                            <div className="card-header">
                                <h3 className="card-title">编辑选项</h3>
                                <button
                                    onClick={() => setEditingItem(null)}
                                    className="modal-close-btn"
                                >
                                    ×
                                </button>
                            </div>

                            <form onSubmit={handleUpdate}>
                                <div className="form-group">
                                    <label className="form-label">编码</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={form.code}
                                        disabled
                                        style={{ background: 'var(--bg-tertiary)' }}
                                    />
                                    <small className="form-hint">
                                        编码不可修改
                                    </small>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">名称 <span className="required">*</span></label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">排序</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={form.sortOrder}
                                        onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                                    />
                                </div>

                                <div className="modal-actions">
                                    <button type="submit" className="btn btn-primary">保存</button>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setEditingItem(null)}
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
                    .dictionary-page {
                        padding: 32px 24px;
                    }

                    .dictionary-page .container {
                        max-width: 1000px;
                    }

                    .dict-type-tabs {
                        display: flex;
                        gap: 8px;
                        margin-bottom: 24px;
                        flex-wrap: wrap;
                    }

                    .dict-type-desc {
                        font-size: 13px;
                        color: var(--text-muted);
                        margin: 0;
                    }

                    .code-tag {
                        background: var(--bg-tertiary);
                        padding: 2px 6px;
                        border-radius: 4px;
                        font-size: 12px;
                    }

                    .table-actions {
                        display: flex;
                        justify-content: flex-end;
                        gap: 8px;
                    }

                    .btn-sm {
                        padding: 6px 12px;
                        font-size: 12px;
                    }

                    .empty-cell {
                        text-align: center;
                        color: var(--text-muted);
                        padding: 40px;
                    }

                    .mobile-list {
                        display: none;
                    }

                    .dict-item-card {
                        padding: 12px;
                        background: var(--bg-tertiary);
                        border-radius: var(--radius-sm);
                        margin-bottom: 8px;
                    }

                    .dict-item-card.disabled {
                        opacity: 0.5;
                    }

                    .dict-item-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 10px;
                    }

                    .dict-item-name {
                        font-weight: 500;
                        margin-left: 8px;
                    }

                    .dict-item-actions {
                        display: flex;
                        gap: 8px;
                    }

                    .dict-item-actions .btn {
                        flex: 1;
                        padding: 8px;
                        font-size: 12px;
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
                        width: 400px;
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
                    }

                    .modal-actions {
                        display: flex;
                        gap: 10px;
                        margin-top: 24px;
                    }

                    .modal-actions .btn {
                        flex: 1;
                    }

                    .required {
                        color: var(--error);
                    }

                    .form-hint {
                        color: var(--text-muted);
                        font-size: 12px;
                        display: block;
                        margin-top: 4px;
                    }

                    @media (max-width: 768px) {
                        .dictionary-page {
                            padding: 16px 12px;
                        }

                        .dict-type-tabs {
                            margin-bottom: 16px;
                        }

                        .dict-type-tabs .btn {
                            flex: 1 1 calc(50% - 4px);
                            min-width: 0;
                            font-size: 12px;
                            padding: 8px 12px;
                            text-align: center;
                        }

                        .desktop-table {
                            display: none;
                        }

                        .mobile-list {
                            display: block;
                        }
                    }
                `}</style>
            </main>
        </>
    );
}
