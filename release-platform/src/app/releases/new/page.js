'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import toast from 'react-hot-toast';

export default function NewReleasePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // User & Permissions
    const [user, setUser] = useState(null);
    const [allUsers, setAllUsers] = useState([]);
    const [selectedMembers, setSelectedMembers] = useState([]);

    // Form
    const [formData, setFormData] = useState({
        version: '',
        description: '',
        plannedDate: new Date().toISOString().split('T')[0], // Default today
    });

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');

        if (!token || !userStr) {
            router.push('/login');
            return;
        }

        const userData = JSON.parse(userStr);
        setUser(userData);

        const roles = (userData.role || '').split(',');
        const canCreate = roles.includes('PM');

        if (!canCreate) {
            toast.error('只有项目经理可以创建发版申请');
            router.push('/releases');
            return;
        }

        fetchAllUsers(token);
    }, [router]);

    const fetchAllUsers = async (token) => {
        try {
            // 添加 forRelease=true 参数，让 PM 可以获取用户列表用于选择成员
            const res = await fetch('/api/users?forRelease=true', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                // 过滤掉 ADMIN 角色的用户
                const filteredUsers = (data.users || []).filter(u => 
                    !u.role?.split(',').includes('ADMIN')
                );
                setAllUsers(filteredUsers);
            }
        } catch (error) {
            console.error('Fetch users error:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/releases', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ...formData,
                    memberIds: selectedMembers
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || '创建失败');
            }

            toast.success('发版申请创建成功！');
            router.push(`/releases/${data.release.id}`);
        } catch (err) {
            console.error('Submit error:', err);
            toast.error(`创建失败: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Navbar />
            <main style={{ padding: '32px 24px' }}>
                <div className="container" style={{ maxWidth: '800px' }}>
                    <div className="page-header">
                        <div>
                            <h1 className="page-title">新建发版申请</h1>
                            <p className="page-subtitle">仅填写基本信息，详细变更内容请在详情页填报</p>
                        </div>
                        <button
                            className="btn btn-secondary"
                            onClick={() => router.back()}
                        >
                            ← 返回
                        </button>
                    </div>

                    <div className="card">
                        <form onSubmit={handleSubmit}>
                            {/* 基本信息 */}
                            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', color: 'var(--primary-light)' }}>
                                📋 基本信息
                            </h3>

                            <div className="grid grid-2">
                                <div className="form-group">
                                    <label className="form-label">版本号 *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="如: v1.2.0"
                                        value={formData.version}
                                        onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">计划发版日期</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={formData.plannedDate}
                                        onChange={(e) => setFormData({ ...formData, plannedDate: e.target.value })}
                                        style={{
                                            appearance: 'none',
                                            position: 'relative',
                                            paddingRight: '30px'
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">发版描述 *</label>
                                <textarea
                                    className="form-textarea"
                                    placeholder="简要描述本次发版的主要内容和目的"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    required
                                    rows={3}
                                />
                            </div>

                            {/* 人员选择 */}
                            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', marginTop: '32px', color: 'var(--primary-light)' }}>
                                👥 参与人员选择
                            </h3>
                            <div className="form-group">
                                <label className="form-label">选择涉及本次发版的人员 (RD, QA, OP, DBA等) *</label>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                    gap: '12px',
                                    maxHeight: '300px',
                                    overflowY: 'auto',
                                    padding: '12px',
                                    backgroundColor: 'var(--bg-tertiary)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-color)'
                                }}>
                                    {allUsers.filter(u => u.id !== user?.id).map(u => (
                                        <div
                                            key={u.id}
                                            onClick={() => {
                                                if (selectedMembers.includes(u.id)) {
                                                    setSelectedMembers(selectedMembers.filter(id => id !== u.id));
                                                } else {
                                                    setSelectedMembers([...selectedMembers, u.id]);
                                                }
                                            }}
                                            style={{
                                                padding: '10px',
                                                borderRadius: 'var(--radius-sm)',
                                                border: `1px solid ${selectedMembers.includes(u.id) ? 'var(--primary)' : 'transparent'}`,
                                                backgroundColor: selectedMembers.includes(u.id) ? 'rgba(52, 120, 246, 0.1)' : 'var(--bg-secondary)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <div style={{ fontWeight: 600, fontSize: '14px' }}>{u.name}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{u.role}</div>
                                        </div>
                                    ))}
                                </div>
                                {selectedMembers.length === 0 && (
                                    <p style={{ fontSize: '12px', color: 'var(--error)', marginTop: '8px' }}>
                                        请至少选择一名参与人员
                                    </p>
                                )}
                            </div>

                            {/* 提交按钮 */}
                            <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={loading}
                                    style={{ flex: 1 }}
                                >
                                    {loading ? '提交中...' : '🚀 创建发版申请'}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => router.back()}
                                >
                                    取消
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
        </>
    );
}
