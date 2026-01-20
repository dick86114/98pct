'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Navbar from '@/components/Navbar';
import ConfirmModal from '@/components/ConfirmModal';

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

    // 删除确认弹窗状态
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [feedbackToDelete, setFeedbackToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

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
        setDeleting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/feedback/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('删除失败');

            toast.success('删除成功');
            setShowDeleteModal(false);
            setFeedbackToDelete(null);
            fetchFeedbacks();
        } catch (error) {
            console.error('Delete feedback error:', error);
            toast.error(`删除失败: ${error.message}`);
        } finally {
            setDeleting(false);
        }
    };

    const handleDeleteClick = (feedback) => {
        setFeedbackToDelete(feedback);
        setShowDeleteModal(true);
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
                                                onClick={() => handleDeleteClick(feedback)}
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

            {/* 详情弹窗 - 重新设计 */}
            {showDetailModal && selectedFeedback && (
                <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
                    <div className="feedback-detail-modal" onClick={(e) => e.stopPropagation()}>
                        {/* 头部 */}
                        <div className="feedback-detail-header">
                            <div className="feedback-detail-header-content">
                                <div className="feedback-detail-icon">💡</div>
                                <div className="feedback-detail-header-text">
                                    <h3 className="feedback-detail-title-text">反馈详情</h3>
                                    <p className="feedback-detail-subtitle">查看并处理用户反馈</p>
                                </div>
                            </div>
                            <button
                                className="feedback-detail-close"
                                onClick={() => setShowDetailModal(false)}
                            >
                                ×
                            </button>
                        </div>

                        {/* 主体内容 */}
                        <div className="feedback-detail-body">
                            {/* 类型和状态卡片 */}
                            <div className="feedback-meta-cards">
                                <div className="feedback-meta-card">
                                    <div className="feedback-meta-label">反馈类型</div>
                                    <div className="feedback-meta-value">
                                        {TYPE_LABELS[selectedFeedback.type]}
                                    </div>
                                </div>
                                <div className="feedback-meta-card">
                                    <div className="feedback-meta-label">当前状态</div>
                                    <div className="feedback-meta-value">
                                        <span className={`badge badge-${STATUS_COLORS[selectedFeedback.status]}`}>
                                            {STATUS_LABELS[selectedFeedback.status]}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* 标题卡片 */}
                            <div className="feedback-content-card">
                                <div className="feedback-content-label">
                                    <span className="feedback-content-icon">📝</span>
                                    反馈标题
                                </div>
                                <div className="feedback-content-text feedback-title-large">
                                    {selectedFeedback.title}
                                </div>
                            </div>

                            {/* 详细描述卡片 */}
                            <div className="feedback-content-card">
                                <div className="feedback-content-label">
                                    <span className="feedback-content-icon">📄</span>
                                    详细描述
                                </div>
                                <div className="feedback-content-text feedback-description">
                                    {selectedFeedback.content}
                                </div>
                            </div>

                            {/* 提交信息卡片 */}
                            <div className="feedback-info-grid">
                                <div className="feedback-info-item">
                                    <div className="feedback-info-icon">👤</div>
                                    <div className="feedback-info-content">
                                        <div className="feedback-info-label">提交人</div>
                                        <div className="feedback-info-value">
                                            {selectedFeedback.user?.name || '未知'}
                                        </div>
                                    </div>
                                </div>
                                <div className="feedback-info-item">
                                    <div className="feedback-info-icon">🕐</div>
                                    <div className="feedback-info-content">
                                        <div className="feedback-info-label">提交时间</div>
                                        <div className="feedback-info-value">
                                            {new Date(selectedFeedback.createdAt).toLocaleString('zh-CN', {
                                                year: 'numeric',
                                                month: '2-digit',
                                                day: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                second: '2-digit'
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 管理员回复区域 */}
                            <div className="feedback-reply-card">
                                <div className="feedback-content-label">
                                    <span className="feedback-content-icon">💬</span>
                                    管理员回复
                                </div>
                                <textarea
                                    className="feedback-reply-textarea"
                                    placeholder="输入回复内容（可选）..."
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    rows={4}
                                />
                            </div>
                        </div>

                        {/* 底部操作栏 */}
                        <div className="feedback-detail-footer">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowDetailModal(false)}
                            >
                                取消
                            </button>
                            <div className="feedback-status-actions">
                                <button
                                    className="feedback-status-btn feedback-status-pending"
                                    onClick={() => handleUpdateStatus('pending')}
                                    disabled={updating}
                                >
                                    待处理
                                </button>
                                <button
                                    className="feedback-status-btn feedback-status-processing"
                                    onClick={() => handleUpdateStatus('processing')}
                                    disabled={updating}
                                >
                                    处理中
                                </button>
                                <button
                                    className="feedback-status-btn feedback-status-resolved"
                                    onClick={() => handleUpdateStatus('resolved')}
                                    disabled={updating}
                                >
                                    已解决
                                </button>
                                <button
                                    className="feedback-status-btn feedback-status-rejected"
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

            {/* 删除确认弹窗 */}
            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setFeedbackToDelete(null);
                }}
                onConfirm={() => handleDelete(feedbackToDelete?.id)}
                title="确认删除"
                message={`确定要删除反馈"${feedbackToDelete?.title}"吗？此操作无法撤销。`}
                confirmText="删除"
                cancelText="取消"
                type="danger"
                loading={deleting}
            />
        </>
    );
}
