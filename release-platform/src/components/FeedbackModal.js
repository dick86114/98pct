'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';

const FEEDBACK_TYPES = [
    { value: 'bug', label: '🐛 Bug反馈', desc: '报告系统错误或异常' },
    { value: 'feature', label: '✨ 功能建议', desc: '建议新增功能' },
    { value: 'improvement', label: '🚀 改进建议', desc: '优化现有功能' },
    { value: 'other', label: '💬 其他', desc: '其他意见或建议' }
];

export default function FeedbackModal({ isOpen, onClose }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        type: 'feature',
        title: '',
        content: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.title.trim() || !formData.content.trim()) {
            toast.error('请填写完整的反馈信息');
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || '提交失败');
            }

            toast.success('感谢您的反馈！我们会尽快处理');
            setFormData({ type: 'feature', title: '', content: '' });
            onClose();
        } catch (error) {
            console.error('Submit feedback error:', error);
            toast.error(`提交失败: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content feedback-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">💡 意见反馈</h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <p className="feedback-intro">
                            您的反馈对我们非常重要！请告诉我们您的想法和建议。
                        </p>

                        {/* 反馈类型 */}
                        <div className="form-group">
                            <label className="form-label">反馈类型</label>
                            <div className="feedback-type-grid">
                                {FEEDBACK_TYPES.map(type => (
                                    <div
                                        key={type.value}
                                        className={`feedback-type-card ${formData.type === type.value ? 'active' : ''}`}
                                        onClick={() => setFormData({ ...formData, type: type.value })}
                                    >
                                        <div className="feedback-type-label">{type.label}</div>
                                        <div className="feedback-type-desc">{type.desc}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 反馈标题 */}
                        <div className="form-group">
                            <label className="form-label">
                                标题 <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="简要描述您的反馈..."
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                            />
                        </div>

                        {/* 反馈内容 */}
                        <div className="form-group">
                            <label className="form-label">
                                详细描述 <span className="required">*</span>
                            </label>
                            <textarea
                                className="form-input"
                                placeholder="请详细描述您的问题或建议..."
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                required
                                rows={6}
                            />
                            <span className="form-hint">
                                提示：如果是Bug反馈，请说明复现步骤；如果是功能建议，请说明使用场景
                            </span>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                            disabled={loading}
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? '提交中...' : '提交反馈'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
