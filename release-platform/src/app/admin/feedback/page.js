'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Navbar from '@/components/Navbar';

const TYPE_LABELS = {
    bug: '🐛 Bug反馈',
    feature: '✨ 功能建议',
    improvement: '🚀 改进建议',
    other: '💬 其他'
};

const STATUS_LABELS = {
    pending: '待处理',
    processing: '处理中',
    resolved: '已解决',
    rejected: '已拒绝'
};

const STATUS_COLORS = {
    pending: 'warning',
    processing: 'info',
    resolved: 'success',
    rejected: 'secondary'
};

export default function FeedbackManagementPage() {
    const router = useRouter();
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedFeedback, setSelectedFeedback] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [updating, setUpdating] = useState(false);

    // 筛选和搜索状态
    const [filterType, setFilterType] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [searchText, setSearchText] = useState('');

    useEffect(() => {
        checkAuth();
        fetchFeedbacks();
    }, []);

    const checkAuth = () => {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        if (!token || !user.role?.includes('ADMIN')) {
            toast.error('无权访问');
            router.push('/dashboard');
        }
    };

    const fetchFeedbacks = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/feedback', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('获取反馈失败');

            const data = await res.json();
            setFeedbacks(data);
        } catch (error) {
            console.error('Fetch feedbacks error:', error);
            toast.error(`获取反馈失败: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetail = (feedback) => {
        setSelectedFeedback(feedback);
        setReplyText(feedback.adminReply || '');
        setShowDetailModal(true);
    };

    const handleUpdateStatus = async (status) => {
        if (!selectedFeedback) return;

        setUpdating(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/feedback/${selectedFeedback.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    status,
                    adminReply: replyText || undefined
                })
            });

            if (!res.ok) throw new Error('更新失败');

            toast.success('更新成功');
            setShowDetailModal(false);
            fetchFeedbacks();
        } catch (error) {
            console.error('Update feedback error:', error);
            toast.error(`更新失败: ${error.message}`);
        } finally {
            setUpdating(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('确定要删除这条反馈吗？')) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/feedback/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('删除失败');

            toast.success('删除成功');
            fetchFeedbacks();
        } catch (error) {
            console.error('Delete feedback error:', error);
            toast.error(`删除失败: ${error.message}`);
        }
    };

    // 筛选和搜索后的反馈列表
    const filteredFeedbacks = () => {
        let result = [...feedbacks];

        // 筛选：按类型
        if (filterType) {
            result = result.filter(feedback => feedback.type === filterType);
        }

        // 筛选：按状态
        if (filterStatus) {
            result = result.filter(feedback => feedback.status === filterStatus);
        }

        // 筛选：按搜索文本
        if (searchText) {
            const search = searchText.toLowerCase();
            result = result.filter(feedback =>
                (feedback.title && feedback.title.toLowerCase().includes(search)) ||
                (feedback.content && feedback.content.toLowerCase().includes(search)) ||
                (feedback.user?.name && feedback.user.name.toLowerCase().includes(search))
            );
        }

        return result;
    };

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="container">
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>加载中...</p>
                    </div>
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
                            <div className="page-header-icon">💡</div>
                            <div>
                                <h1 className="page-title">意见反馈管理</h1>
                                <p className="page-subtitle">
                                    查看和处理用户反馈 · 共 <span className="text-glow">{filteredFeedbacks().length}</span> 条
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
                                placeholder="搜索标题、内容或提交人..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                            />
                        </div>
                        <div className="filter-group">
                            <label className="filter-label">📋 类型筛选</label>
                            <select
                                className="filter-select"
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                            >
                                <option value="">全部类型</option>
                                <option value="bug">🐛 Bug反馈</option>
                                <option value="feature">✨ 功能建议</option>
                                <option value="improvement">🚀 改进建议</option>
                                <option value="other">💬 其他</option>
                            </select>
                        </div>
                        <div className="filter-group">
                            <label className="filter-label">📊 状态筛选</label>
                            <select
                                className="filter-select"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                <option value="">全部状态</option>
                                <option value="pending">待处理</option>
                                <option value="processing">处理中</option>
                                <option value="resolved">已解决</option>
                                <option value="rejected">已拒绝</option>
                            </select>
                        </div>
                        {(searchText || filterType || filterStatus) && (
                            <button
                                className="btn btn-sm btn-ghost"
                                onClick={() => {
                                    setSearchText('');
                                    setFilterType('');
                                    setFilterStatus('');
                                }}
                            >
                                ✕ 清除筛选
                            </button>
                        )}
                    </div>

                    {/* 反馈列表卡片 */}
                    <div className="card">
                        <div className="table-container">
                            <table className="table">
                        <thead>
                            <tr>
                                <th>类型</th>
                                <th>标题</th>
                                <th>提交人</th>
                                <th>状态</th>
                                <th>提交时间</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredFeedbacks().map((feedback, index) => (
                                <tr key={feedback.id} style={{ animationDelay: `${index * 0.05}s` }}>
                                    <td>
                                        <span className="feedback-type-badge">
                                            {TYPE_LABELS[feedback.type]}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="feedback-title">{feedback.title}</div>
                                    </td>
                                    <td>
                                        <span className="text-muted">{feedback.user?.name || '未知'}</span>
                                    </td>
                                    <td>
                                        <span className={`badge badge-${STATUS_COLORS[feedback.status]}`}>
                                            {STATUS_LABELS[feedback.status]}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="text-muted">
                                            {new Date(feedback.createdAt).toLocaleString('zh-CN')}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                className="btn btn-sm btn-ghost"
                                                onClick={() => handleViewDetail(feedback)}
                                            >
                                                👁️ 查看
                                            </button>
                                            <button
                                                className="btn btn-sm btn-ghost btn-danger-ghost"
                                                onClick={() => handleDelete(feedback.id)}
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

                        {filteredFeedbacks().length === 0 && (
                            <div className="empty-state">
                                <div className="empty-icon">📭</div>
                                <h3>{searchText || filterType || filterStatus ? '没有符合条件的反馈' : '暂无反馈'}</h3>
                                <p>{searchText || filterType || filterStatus ? '尝试调整筛选条件' : '还没有用户提交反馈'}</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* 详情弹窗 */}
            {showDetailModal && selectedFeedback && (
                <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
                    <div className="modal modal-md" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                <span className="modal-icon">💡</span>
                                反馈详情
                            </h3>
                            <button
                                className="modal-close"
                                onClick={() => setShowDetailModal(false)}
                            >
                                ×
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="feedback-detail-section">
                                <div className="feedback-detail-label">类型</div>
                                <div className="feedback-type-badge">
                                    {TYPE_LABELS[selectedFeedback.type]}
                                </div>
                            </div>

                            <div className="feedback-detail-section">
                                <div className="feedback-detail-label">标题</div>
                                <div className="feedback-detail-value">{selectedFeedback.title}</div>
                            </div>

                            <div className="feedback-detail-section">
                                <div className="feedback-detail-label">详细描述</div>
                                <div className="feedback-detail-content">{selectedFeedback.content}</div>
                            </div>

                            <div className="feedback-detail-section">
                                <div className="feedback-detail-label">提交人</div>
                                <div className="feedback-detail-value">{selectedFeedback.user?.name || '未知'}</div>
                            </div>

                            <div className="feedback-detail-section">
                                <div className="feedback-detail-label">提交时间</div>
                                <div className="feedback-detail-value">
                                    {new Date(selectedFeedback.createdAt).toLocaleString('zh-CN')}
                                </div>
                            </div>

                            <div className="feedback-detail-section">
                                <div className="feedback-detail-label">当前状态</div>
                                <span className={`badge badge-${STATUS_COLORS[selectedFeedback.status]}`}>
                                    {STATUS_LABELS[selectedFeedback.status]}
                                </span>
                            </div>

                            <div className="form-group">
                                <label className="form-label">管理员回复</label>
                                <textarea
                                    className="form-input"
                                    placeholder="输入回复内容（可选）..."
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    rows={4}
                                />
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowDetailModal(false)}
                            >
                                取消
                            </button>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => handleUpdateStatus('pending')}
                                    disabled={updating}
                                >
                                    待处理
                                </button>
                                <button
                                    className="btn btn-sm"
                                    style={{ background: 'var(--info)', color: 'white' }}
                                    onClick={() => handleUpdateStatus('processing')}
                                    disabled={updating}
                                >
                                    处理中
                                </button>
                                <button
                                    className="btn btn-sm btn-success"
                                    onClick={() => handleUpdateStatus('resolved')}
                                    disabled={updating}
                                >
                                    已解决
                                </button>
                                <button
                                    className="btn btn-sm"
                                    style={{ background: 'var(--text-muted)', color: 'white' }}
                                    onClick={() => handleUpdateStatus('rejected')}
                                    disabled={updating}
                                >
                                    已拒绝
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
