'use client';

import { STAGE_LABELS } from '@/lib/constants';

/**
 * 发版信息展示组件
 * @param {Object} release - 发版对象
 * @param {Object} statusStyle - 状态样式对象 { label, class }
 * @param {Function} renderImplementationStageContent - 渲染实施阶段内容的函数（可选）
 */
export default function ReleaseInfo({ release, statusStyle, renderImplementationStageContent }) {
    return (
        <div className="tab-content">
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">📋 发版摘要</h3>
                </div>
                <div className="info-grid">
                    <div className="info-item">
                        <label>项目名称</label>
                        <span>{release.projectName || '门户'}</span>
                    </div>
                    <div className="info-item">
                        <label>版本号</label>
                        <span>{release.version}</span>
                    </div>
                    <div className="info-item">
                        <label>发版类型</label>
                        <span>{release.releaseType || '常规发版'}</span>
                    </div>
                    <div className="info-item">
                        <label>影响范围</label>
                        <span>{release.impactScope || '全量'}</span>
                    </div>
                    <div className="info-item">
                        <label>计划时间</label>
                        <span>{release.plannedDate ? new Date(release.plannedDate).toLocaleString('zh-CN') : '未设置'}</span>
                    </div>
                    <div className="info-item">
                        <label>预计停服时长</label>
                        <span>{release.downtime ? `${release.downtime} 分钟` : '无需停服'}</span>
                    </div>
                    <div className="info-item">
                        <label>当前阶段</label>
                        <span className="badge badge-primary">{STAGE_LABELS[release.stage]}</span>
                    </div>
                    <div className="info-item">
                        <label>当前状态</label>
                        <span className={`badge ${statusStyle.class}`}>{statusStyle.label}</span>
                    </div>
                    <div className="info-item">
                        <label>创建人</label>
                        <span>{release.createdBy?.name}</span>
                    </div>
                    <div className="info-item">
                        <label>创建时间</label>
                        <span>{new Date(release.createdAt).toLocaleString('zh-CN')}</span>
                    </div>
                </div>
                <div className="info-desc">
                    <label>发版描述</label>
                    <p>{release.description || '暂无描述'}</p>
                </div>
            </div>
            
            {/* 参与人员列表 */}
            <div className="card" style={{ marginTop: '20px' }}>
                <div className="card-header">
                    <h3 className="card-title">👥 参与人员</h3>
                    <span className="card-subtitle">共 {(release.members || []).length} 人</span>
                </div>
                <div className="members-grid">
                    {(release.members || []).map(member => {
                        const memberRoles = (member.role || '').split(',').filter(r => r);
                        const roleLabels = memberRoles.map(r => {
                            const labels = { PM: '项目经理', RD: '开发', QA: '测试', PO: '产品', DBA: 'DBA', OP: '运维' };
                            return labels[r] || r;
                        }).join('/');
                        
                        return (
                            <div key={member.id} className="member-card">
                                <div className="member-avatar">{(member.user?.name || '?').slice(-1)}</div>
                                <div className="member-info">
                                    <span className="member-name">{member.user?.name}</span>
                                    <span className="member-role">{roleLabels}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {/* 实施/验证阶段显示所有填报内容 */}
            {renderImplementationStageContent && renderImplementationStageContent()}
        </div>
    );
}
