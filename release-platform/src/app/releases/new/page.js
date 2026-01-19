'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import DatePicker from '@/components/DatePicker';
import CustomSelect from '@/components/CustomSelect';
import TreeMemberSelector from '@/components/TreeMemberSelector';
import useDictionary from '@/hooks/useDictionary';
import toast from 'react-hot-toast';

// 角色标签映射
const ROLE_LABELS = {
    PM: '项目经理',
    RD: '开发',
    QA: '测试',
    PO: '产品',
    DBA: 'DBA',
    OP: '运维'
};

export default function NewReleasePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // 用户与权限
    const [user, setUser] = useState(null);
    const [allUsers, setAllUsers] = useState([]);
    // selectedMembers 改为对象数组: [{ userId: number, role: string }]
    const [selectedMembers, setSelectedMembers] = useState([]);
    
    // 从字典获取发版类型和影响范围
    const { items: releaseTypes } = useDictionary('releaseType');
    const { items: impactScopes } = useDictionary('impactScope');

    // 表单数据
    const [formData, setFormData] = useState({
        projectName: '',
        version: '',
        description: '',
        plannedDate: new Date().toISOString().split('T')[0],
        releaseType: '',
        impactScope: '',
        downtime: '',
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
        
        if (selectedMembers.length === 0) {
            toast.error('请至少选择一名参与人员');
            return;
        }
        
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
                    // 传递成员及其在该发版中的角色
                    members: selectedMembers
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

    // 获取角色显示
    const getRoleDisplay = (roleStr) => {
        return (roleStr || '').split(',')
            .filter(r => r && r !== 'ADMIN')
            .map(r => ROLE_LABELS[r] || r)
            .join(' / ');
    };

    // 获取角色徽章样式
    const getRoleBadgeClass = (role) => {
        const styles = {
            'PM': 'badge-primary',
            'RD': 'badge-info',
            'QA': 'badge-success',
            'PO': 'badge-warning',
            'DBA': 'badge-secondary',
            'OP': 'badge-tertiary',
        };
        return styles[role] || 'badge-secondary';
    };

    return (
        <>
            <Navbar />
            <main className="page-container">
                <div className="container" style={{ maxWidth: '900px' }}>
                    {/* 页面头部 */}
                    <div className="page-header">
                        <div className="page-header-content">
                            <div className="page-header-icon">🚀</div>
                            <div>
                                <h1 className="page-title">新建发版申请</h1>
                                <p className="page-subtitle">填写基本信息并选择参与人员，详细变更内容请在详情页填报</p>
                            </div>
                        </div>
                        <button
                            className="btn btn-secondary"
                            onClick={() => router.back()}
                        >
                            ← 返回
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* 基本信息卡片 */}
                        <div className="card-static">
                            <div className="card-header">
                                <h3 className="card-title">
                                    <span className="title-icon">📋</span>
                                    基本信息
                                </h3>
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    项目名称 <span className="required">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="如: 用户中心、订单系统等"
                                    value={formData.projectName}
                                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                                    required
                                />
                                <span className="form-hint">请输入本次发版所属的项目名称</span>
                            </div>

                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">
                                        版本号 <span className="required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="如: v1.2.0"
                                        value={formData.version}
                                        onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                                        required
                                    />
                                    <span className="form-hint">建议使用语义化版本号</span>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">计划发版日期</label>
                                    <DatePicker
                                        value={formData.plannedDate}
                                        onChange={value => setFormData({ ...formData, plannedDate: value })}
                                        placeholder="选择计划日期"
                                    />
                                </div>
                            </div>

                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">发版类型</label>
                                    <CustomSelect
                                        value={formData.releaseType}
                                        onChange={value => setFormData({ ...formData, releaseType: value })}
                                        options={releaseTypes.map(t => ({ value: t.name, label: t.name }))}
                                        placeholder="选择发版类型"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">影响范围</label>
                                    <CustomSelect
                                        value={formData.impactScope}
                                        onChange={value => setFormData({ ...formData, impactScope: value })}
                                        options={impactScopes.map(s => ({ value: s.name, label: s.name }))}
                                        placeholder="选择影响范围"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">预计停服时长（分钟）</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    placeholder="如: 30"
                                    value={formData.downtime}
                                    onChange={(e) => setFormData({ ...formData, downtime: e.target.value })}
                                    min="0"
                                />
                                <span className="form-hint">预计停服时长，单位：分钟</span>
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    发版描述 <span className="required">*</span>
                                </label>
                                <textarea
                                    className="form-input"
                                    placeholder="简要描述本次发版的主要内容和目的..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    required
                                    rows={4}
                                />
                            </div>
                        </div>

                        {/* 人员选择卡片 */}
                        <div className="card-static">
                            <div className="card-header">
                                <h3 className="card-title">
                                    <span className="title-icon">👥</span>
                                    参与人员
                                </h3>
                                <span className="selected-count">
                                    已选择 <span className="count-num">{selectedMembers.length}</span> 人
                                </span>
                            </div>

                            <p className="card-desc" style={{ marginBottom: '16px' }}>
                                选择涉及本次发版的人员（RD、QA、OP、DBA 等）
                            </p>

                            {allUsers.filter(u => u.id !== user?.id).length === 0 ? (
                                <div className="empty-state-sm">
                                    <span className="empty-icon">👤</span>
                                    <span>暂无可选人员</span>
                                </div>
                            ) : (
                                <TreeMemberSelector
                                    allUsers={allUsers.filter(u => u.id !== user?.id)}
                                    selectedMembers={selectedMembers}
                                    onChange={setSelectedMembers}
                                    excludeRoles={['PM', 'LD']}
                                />
                            )}

                            {selectedMembers.length === 0 && (
                                <div className="warning-hint">
                                    <span className="warning-icon">⚠️</span>
                                    <span>请至少选择一名参与人员</span>
                                </div>
                            )}
                        </div>

                        {/* 提交按钮 */}
                        <div className="submit-section">
                            <button
                                type="button"
                                className="btn btn-secondary btn-lg"
                                onClick={() => router.back()}
                            >
                                取消
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary btn-glow btn-lg"
                                disabled={loading || selectedMembers.length === 0}
                            >
                                {loading ? (
                                    <>
                                        <span className="loading-spinner-sm"></span>
                                        提交中...
                                    </>
                                ) : (
                                    <>
                                        <span className="btn-icon">✨</span>
                                        创建发版申请
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </>
    );
}
