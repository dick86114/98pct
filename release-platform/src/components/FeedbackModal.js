'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';

const FEEDBACK_TYPES = [
    { value: 'bug', label: 'Bug反馈', icon: '🐛', desc: '报告系统错误或异常', color: 'error' },
    { value: 'feature', label: '功能建议', icon: '✨', desc: '建议新增功能', color: 'primary' },
    { value: 'improvement', label: '改进建议', icon: '🚀', desc: '优化现有功能', color: 'success' },
    { value: 'other', label: '其他反馈', icon: '💬', desc: '其他意见或建议', color: 'secondary' }
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

    const selectedType = FEEDBACK_TYPES.find(t => t.value === formData.type);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="feedback-submit-modal" onClick={(e) => e.stopPropagation()}>
                {/* 头部 */}
                <div className="feedback-submit-header">
                    <div className="feedback-submit-header-content">
                        <div className="feedback-submit-icon">💡</div>
                        <div className="feedback-submit-header-text">
                            <h3 className="feedback-submit-title-text">意见反馈</h3>
                            <p className="feedback-submit-subtitle">您的反馈对我们非常重要</p>
                        </div>
                    </div>
                    <button
                        className="feedback-submit-close"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* 主体内容 */}
                    <div className="feedback-submit-body">
                        {/* 反馈类型选择 */}
                        <div className="feedback-submit-section">
                            <label className="feedback-submit-label">
                                <span className="feedback-submit-label-icon">📋</span>
                                选择反馈类型
                            </label>
                            <div className="feedback-type-grid">
                                {FEEDBACK_TYPES.map(type => (
                                    <button
                                        key={type.value}
                                        type="button"
                                        className={`feedback-type-card ${formData.type === type.value ? 'active' : ''}`}
                                        onClick={() => setFormData({ ...formData, type: type.value })}
                                    >
                                        <div className="feedback-type-card-icon">{type.icon}</div>
                                        <div className="feedback-type-card-content">
                                            <div className="feedback-type-card-name">{type.label}</div>
                                            <div className="feedback-type-card-desc">{type.desc}</div>
                                        </div>
                                        {formData.type === type.value && (
                                            <div className="feedback-type-card-check">✓</div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 反馈标题 */}
                        <div className="feedback-submit-section">
                            <label className="feedback-submit-label">
                                <span className="feedback-submit-label-icon">📝</span>
                                反馈标题
                                <span className="feedback-submit-required">*</span>
                            </label>
                            <input
                                type="text"
                                className="feedback-submit-input"
                                placeholder="用一句话概括您的反馈..."
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                                maxLength={100}
                            />
                            <div className="feedback-submit-char-count">{formData.title.length}/100</div>
                        </div>

                        {/* 反馈内容 */}
                        <div className="feedback-submit-section">
                            <label className="feedback-submit-label">
                                <span className="feedback-submit-label-icon">📄</span>
                                详细描述
                                <span className="feedback-submit-required">*</span>
                            </label>
                            <textarea
                                className="feedback-submit-textarea"
                                placeholder={`请详细描述您的${selectedType?.label}...\n\n${selectedType?.value === 'bug' ? '建议包含：\n• 问题出现的页面或功能\n• 具体的操作步骤\n• 预期结果和实际结果' : '建议包含：\n• 具体的使用场景\n• 期望的功能或改进\n• 对您工作的帮助'}`}
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                required
                                rows={8}
                                maxLength={1000}
                            />
                            <div className="feedback-submit-char-count">{formData.content.length}/1000</div>
                        </div>
                    </div>

                    {/* 底部操作栏 */}
                    <div className="feedback-submit-footer">
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
                            {loading ? (
                                <>
                                    <span className="spinner"></span>
                                    提交中...
                                </>
                            ) : (
                                <>
                                    <span>✓</span>
                                    提交反馈
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
