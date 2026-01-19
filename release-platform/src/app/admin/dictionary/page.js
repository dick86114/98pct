'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import toast from 'react-hot-toast';
import ConfirmModal from '@/components/ConfirmModal';

// 字典类型定义
const DICT_TYPES = [
    { code: 'system', name: '所属系统', desc: '开发人员填报变更时选择的系统', icon: '💻' },
    { code: 'status', name: '发版状态', desc: '发版记录的状态选项', icon: '📊' },
    { code: 'releaseType', name: '发版类型', desc: '发版申请时的类型选项', icon: '🚀' },
    { code: 'impactScope', name: '影响范围', desc: '发版影响范围选项', icon: '🎯' },
    { code: 'docType', name: '文档类型', desc: '上传文档时的类型选项', icon: '📄' },
    { code: 'dbChangeType', name: '数据库变更类型', desc: '数据库变更的类型选项', icon: '🗄️' },
];

export default function DictionaryPage() {
    const router = useRouter();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeType, setActiveType] = useState('system');
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
                            <div className="page-header-icon">📚</div>
                            <div>
                                <h1 className="page-title">数据字典管理</h1>
                                <p className="page-subtitle">管理系统下拉选项和配置项</p>
                            </div>
                        </div>
                    </div>

                    {/* 类型切换标签 */}
                    <div className="dict-type-tabs">
                        {DICT_TYPES.map(type => (
                            <button
                                key={type.code}
                                className={`dict-type-tab ${activeType === type.code ? 'active' : ''}`}
                                onClick={() => setActiveType(type.code)}
                            >
                                <span className="tab-icon">{type.icon}</span>
                                <span className="tab-name">{type.name}</span>
                            </button>
                        ))}
                    </div>

                    {/* 字典内容卡片 */}
                    <div className="card-static">
                        <div className="card-header">
                            <div className="card-header-info">
                                <h3 className="card-title">
                                    <span className="title-icon">{currentTypeInfo?.icon}</span>
                                    {currentTypeInfo?.name}
                                </h3>
                                <p className="card-desc">{currentTypeInfo?.desc}</p>
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
                        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                            <table className="table dict-table">
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
                                            <td colSpan={5}>
                                                <div className="empty-state">
                                                    <div className="empty-icon">📝</div>
                                                    <h3>暂无数据</h3>
                                                    <p>点击上方按钮添加第一个选项</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        items.map((item, index) => (
                                            <tr 
                                                key={item.id} 
                                                className={!item.enabled ? 'row-disabled' : ''}
                                                style={{ animationDelay: `${index * 0.05}s` }}
                                            >
                                                <td>
                                                    <code className="code-tag">{item.code}</code>
                                                </td>
                                                <td>
                                                    <span className="item-name">{item.name}</span>
                                                </td>
                                                <td>
                                                    <span className="sort-order">{item.sortOrder}</span>
                                                </td>
                                                <td>
                                                    <span className={`badge ${item.enabled ? 'badge-success' : 'badge-secondary'}`}>
                                                        {item.enabled ? '启用' : '禁用'}
                                                    </span>
                                                </td>
                                                <td className="text-right">
                                                    <div className="action-buttons">
                                                        <button
                                                            className={`btn btn-sm btn-ghost ${item.enabled ? '' : 'btn-success-ghost'}`}
                                                            onClick={() => handleToggleEnabled(item)}
                                                        >
                                                            {item.enabled ? '🚫 禁用' : '✅ 启用'}
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-ghost"
                                                            onClick={() => startEdit(item)}
                                                        >
                                                            ✏️ 编辑
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-ghost btn-danger-ghost"
                                                            onClick={() => handleDelete(item)}
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
                </div>

                {/* 添加弹窗 */}
                {showAddModal && (
                    <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                        <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3 className="modal-title">
                                    <span className="modal-icon">➕</span>
                                    添加{currentTypeInfo?.name}选项
                                </h3>
                                <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
                            </div>

                            <form onSubmit={handleAdd} className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">
                                        编码 <span className="required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="如：PORTAL"
                                        value={form.code}
                                        onChange={(e) => setForm({ ...form, code: e.target.value })}
                                        required
                                    />
                                    <span className="form-hint">唯一标识，建议使用大写英文</span>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">
                                        名称 <span className="required">*</span>
                                    </label>
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
                                    <span className="form-hint">数字越小越靠前</span>
                                </div>

                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                                        取消
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        添加
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* 编辑弹窗 */}
                {editingItem && (
                    <div className="modal-overlay" onClick={() => setEditingItem(null)}>
                        <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3 className="modal-title">
                                    <span className="modal-icon">✏️</span>
                                    编辑选项
                                </h3>
                                <button className="modal-close" onClick={() => setEditingItem(null)}>×</button>
                            </div>

                            <form onSubmit={handleUpdate} className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">编码</label>
                                    <input
                                        type="text"
                                        className="form-input form-input-disabled"
                                        value={form.code}
                                        disabled
                                    />
                                    <span className="form-hint">编码不可修改</span>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">
                                        名称 <span className="required">*</span>
                                    </label>
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

                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setEditingItem(null)}>
                                        取消
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        保存
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
