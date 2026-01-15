'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';

// 角色标签映射
const ROLE_LABELS = {
    PM: '项目经理',
    RD: '开发',
    QA: '测试',
    PO: '产品',
    DBA: 'DBA',
    OP: '运维'
};

// 阶段标签映射
const STAGE_LABELS = {
    PREPARATION: '准备阶段',
    IMPLEMENTATION: '实施阶段',
    VERIFICATION: '验证阶段',
    COMPLETED: '已完成',
    ROLLBACK: '已回滚'
};

// 状态标签映射
const STATUS_LABELS = {
    DRAFT: '草稿',
    PENDING_REVIEW: '待评审',
    IN_PROGRESS: '进行中',
    SUCCESS: '发版成功',
    FAILED: '发版失败'
};

export default function ReleaseSummary({ release, checklists }) {
    const [exporting, setExporting] = useState(false);

    // 计算统计数据
    const stats = {
        totalMembers: (release.members || []).length,
        totalChecklists: checklists.length,
        completedChecklists: checklists.filter(c => c.checked).length,
        totalDocuments: (release.documents || []).length,
        dbChangesCount: (release.members || []).reduce((sum, m) => 
            sum + (m.content?.dbChanges?.length || 0), 0),
        configChangesCount: (release.members || []).reduce((sum, m) => 
            sum + (m.content?.configChanges?.length || 0), 0),
    };

    // 按角色分组成员
    const membersByRole = {};
    (release.members || []).forEach(member => {
        const roles = (member.user?.role || '').split(',');
        roles.forEach(role => {
            if (!membersByRole[role]) membersByRole[role] = [];
            membersByRole[role].push(member);
        });
    });

    // 导出为 Excel
    const handleExportExcel = async () => {
        setExporting(true);
        try {
            const wb = XLSX.utils.book_new();

            // 1. 基本信息表
            const basicInfo = [
                ['发版总结报告'],
                [],
                ['基本信息'],
                ['版本号', release.version],
                ['发版描述', release.description],
                ['所属平台', release.platform || '门户'],
                ['计划时间', release.plannedDate ? new Date(release.plannedDate).toLocaleDateString('zh-CN') : '未设置'],
                ['创建人', release.createdBy?.name],
                ['创建时间', new Date(release.createdAt).toLocaleString('zh-CN')],
                ['当前状态', STATUS_LABELS[release.status] || release.status],
                ['当前阶段', STAGE_LABELS[release.stage] || release.stage],
                [],
                ['统计信息'],
                ['参与人数', stats.totalMembers],
                ['检查项总数', stats.totalChecklists],
                ['已完成检查项', stats.completedChecklists],
                ['完成率', `${stats.totalChecklists > 0 ? Math.round(stats.completedChecklists / stats.totalChecklists * 100) : 0}%`],
                ['上传文档数', stats.totalDocuments],
                ['数据库变更数', stats.dbChangesCount],
                ['配置变更数', stats.configChangesCount],
            ];
            const ws1 = XLSX.utils.aoa_to_sheet(basicInfo);
            ws1['!cols'] = [{ wch: 15 }, { wch: 50 }];
            XLSX.utils.book_append_sheet(wb, ws1, '基本信息');

            // 2. 参与人员表
            const membersData = [
                ['参与人员列表'],
                [],
                ['姓名', '角色', '邮箱', '手机']
            ];
            (release.members || []).forEach(member => {
                const roles = (member.user?.role || '').split(',').map(r => ROLE_LABELS[r] || r).join('/');
                membersData.push([
                    member.user?.name || '-',
                    roles,
                    member.user?.email || '-',
                    member.user?.phone || '-'
                ]);
            });
            const ws2 = XLSX.utils.aoa_to_sheet(membersData);
            ws2['!cols'] = [{ wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 15 }];
            XLSX.utils.book_append_sheet(wb, ws2, '参与人员');

            // 3. 开发变更内容表
            const devChangesData = [
                ['开发变更内容'],
                [],
                ['开发人员', '手机', '所属系统', '变更内容说明']
            ];
            (release.members || []).forEach(member => {
                const content = member.content || {};
                if (content.contentDesc) {
                    devChangesData.push([
                        content.devName || member.user?.name || '-',
                        content.devPhone || '-',
                        content.system || '门户',
                        content.contentDesc || '-'
                    ]);
                }
            });
            const ws3 = XLSX.utils.aoa_to_sheet(devChangesData);
            ws3['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 60 }];
            XLSX.utils.book_append_sheet(wb, ws3, '开发变更');

            // 4. 数据库变更表
            const dbChangesData = [
                ['数据库变更记录'],
                [],
                ['开发人员', '变更类型', '数据库', '表名', '变更原因', 'SQL语句', '影响说明', '影响线上']
            ];
            (release.members || []).forEach(member => {
                const content = member.content || {};
                (content.dbChanges || []).forEach(db => {
                    dbChangesData.push([
                        content.devName || member.user?.name || '-',
                        db.changeType || '-',
                        db.dbName || '-',
                        db.tableName || '-',
                        db.reason || '-',
                        db.sql || '-',
                        db.impact || '-',
                        db.affectsOnline ? '是' : '否'
                    ]);
                });
            });
            const ws4 = XLSX.utils.aoa_to_sheet(dbChangesData);
            ws4['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 50 }, { wch: 30 }, { wch: 10 }];
            XLSX.utils.book_append_sheet(wb, ws4, '数据库变更');

            // 5. 配置变更表
            const configChangesData = [
                ['配置变更记录'],
                [],
                ['开发人员', '变更原因', '变更内容', '影响说明', '影响线上']
            ];
            (release.members || []).forEach(member => {
                const content = member.content || {};
                (content.configChanges || []).forEach(cfg => {
                    configChangesData.push([
                        content.devName || member.user?.name || '-',
                        cfg.reason || '-',
                        cfg.content || '-',
                        cfg.impact || '-',
                        cfg.affectsOnline ? '是' : '否'
                    ]);
                });
            });
            const ws5 = XLSX.utils.aoa_to_sheet(configChangesData);
            ws5['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 40 }, { wch: 30 }, { wch: 10 }];
            XLSX.utils.book_append_sheet(wb, ws5, '配置变更');

            // 6. DBA 执行结果表
            const dbaExecData = [
                ['DBA 执行结果'],
                [],
                ['DBA姓名', '手机', '执行时间', '执行结果', '回滚情况', '备注']
            ];
            (release.members || []).forEach(member => {
                const content = member.content || {};
                if (content.dbaExecResult) {
                    dbaExecData.push([
                        content.dbaExecName || member.user?.name || '-',
                        content.dbaExecPhone || '-',
                        content.dbaExecTime ? new Date(content.dbaExecTime).toLocaleString('zh-CN') : '-',
                        content.dbaExecResult || '-',
                        content.dbaRollbackInfo || '无',
                        content.dbaExecRemark || '-'
                    ]);
                }
            });
            const ws6 = XLSX.utils.aoa_to_sheet(dbaExecData);
            ws6['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 40 }, { wch: 30 }, { wch: 30 }];
            XLSX.utils.book_append_sheet(wb, ws6, 'DBA执行结果');

            // 7. 检查清单完成情况表
            const checklistData = [
                ['检查清单完成情况'],
                [],
                ['阶段', '检查项', '负责人', '状态', '确认人', '确认时间']
            ];
            checklists.forEach(item => {
                checklistData.push([
                    STAGE_LABELS[item.stage] || item.stage,
                    item.label || item.itemKey,
                    item.user?.name || '-',
                    item.checked ? '已完成' : '未完成',
                    item.confirmedBy?.name || '-',
                    item.confirmedAt ? new Date(item.confirmedAt).toLocaleString('zh-CN') : '-'
                ]);
            });
            const ws7 = XLSX.utils.aoa_to_sheet(checklistData);
            ws7['!cols'] = [{ wch: 12 }, { wch: 40 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 20 }];
            XLSX.utils.book_append_sheet(wb, ws7, '检查清单');

            // 8. 文档列表表
            const docsData = [
                ['上传文档列表'],
                [],
                ['文件名', '类型', '上传人', '上传时间']
            ];
            const docTypeLabels = {
                TEST_REPORT: '测试报告',
                TEST_CASE: '测试用例',
                ACCEPTANCE_REPORT: '验收报告',
                BACKUP_SCREENSHOT: '备份截图',
                PROD_TEST_REPORT: '正式环境测试报告',
                OTHER: '其他文档'
            };
            (release.documents || []).forEach(doc => {
                docsData.push([
                    doc.filename || '-',
                    docTypeLabels[doc.type] || doc.type,
                    doc.uploadedBy?.name || '-',
                    new Date(doc.createdAt).toLocaleString('zh-CN')
                ]);
            });
            const ws8 = XLSX.utils.aoa_to_sheet(docsData);
            ws8['!cols'] = [{ wch: 40 }, { wch: 20 }, { wch: 12 }, { wch: 20 }];
            XLSX.utils.book_append_sheet(wb, ws8, '上传文档');

            // 导出文件
            const fileName = `发版总结_${release.version}_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
            toast.success('Excel 导出成功');
        } catch (error) {
            console.error('导出失败:', error);
            toast.error('导出失败');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="release-summary">
            {/* 导出按钮 */}
            <div className="summary-actions">
                <button 
                    className="btn btn-primary"
                    onClick={handleExportExcel}
                    disabled={exporting}
                >
                    📊 {exporting ? '导出中...' : '导出 Excel'}
                </button>
            </div>

            {/* 发版结果 */}
            <div className="summary-result">
                <div className={`result-badge ${release.status === 'SUCCESS' ? 'success' : 'failed'}`}>
                    {release.status === 'SUCCESS' ? '🎉 发版成功' : '⚠️ 发版失败'}
                </div>
                <div className="result-info">
                    <span>版本号：{release.version}</span>
                    <span>完成时间：{new Date(release.updatedAt).toLocaleString('zh-CN')}</span>
                </div>
            </div>

            {/* 统计概览 */}
            <div className="summary-stats">
                <div className="stat-card">
                    <span className="stat-icon">👥</span>
                    <span className="stat-value">{stats.totalMembers}</span>
                    <span className="stat-label">参与人数</span>
                </div>
                <div className="stat-card">
                    <span className="stat-icon">✅</span>
                    <span className="stat-value">{stats.completedChecklists}/{stats.totalChecklists}</span>
                    <span className="stat-label">检查项完成</span>
                </div>
                <div className="stat-card">
                    <span className="stat-icon">🗄️</span>
                    <span className="stat-value">{stats.dbChangesCount}</span>
                    <span className="stat-label">数据库变更</span>
                </div>
                <div className="stat-card">
                    <span className="stat-icon">⚙️</span>
                    <span className="stat-value">{stats.configChangesCount}</span>
                    <span className="stat-label">配置变更</span>
                </div>
                <div className="stat-card">
                    <span className="stat-icon">📄</span>
                    <span className="stat-value">{stats.totalDocuments}</span>
                    <span className="stat-label">上传文档</span>
                </div>
            </div>

            {/* 基本信息 */}
            <div className="summary-section">
                <h4 className="section-title">📋 基本信息</h4>
                <div className="info-grid">
                    <div className="info-item">
                        <label>版本号</label>
                        <span>{release.version}</span>
                    </div>
                    <div className="info-item">
                        <label>所属平台</label>
                        <span>{release.platform || '门户'}</span>
                    </div>
                    <div className="info-item">
                        <label>计划时间</label>
                        <span>{release.plannedDate ? new Date(release.plannedDate).toLocaleDateString('zh-CN') : '未设置'}</span>
                    </div>
                    <div className="info-item">
                        <label>创建人</label>
                        <span>{release.createdBy?.name}</span>
                    </div>
                    <div className="info-item">
                        <label>创建时间</label>
                        <span>{new Date(release.createdAt).toLocaleString('zh-CN')}</span>
                    </div>
                    <div className="info-item">
                        <label>完成时间</label>
                        <span>{new Date(release.updatedAt).toLocaleString('zh-CN')}</span>
                    </div>
                </div>
                <div className="info-desc">
                    <label>发版描述</label>
                    <p>{release.description || '暂无描述'}</p>
                </div>
            </div>

            {/* 参与人员 */}
            <div className="summary-section">
                <h4 className="section-title">👥 参与人员</h4>
                <div className="members-grid">
                    {(release.members || []).map(member => {
                        const roles = (member.user?.role || '').split(',').map(r => ROLE_LABELS[r] || r).join('/');
                        return (
                            <div key={member.id} className="member-card">
                                <div className="member-avatar">{(member.user?.name || '?')[0]}</div>
                                <div className="member-info">
                                    <span className="member-name">{member.user?.name}</span>
                                    <span className="member-role">{roles}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 开发变更内容 */}
            <div className="summary-section">
                <h4 className="section-title">💻 开发变更内容</h4>
                {(release.members || []).filter(m => m.content?.contentDesc).length > 0 ? (
                    <div className="changes-list">
                        {(release.members || []).filter(m => m.content?.contentDesc).map(member => {
                            const content = member.content || {};
                            return (
                                <div key={member.id} className="change-item">
                                    <div className="change-header">
                                        <span className="change-author">{content.devName || member.user?.name}</span>
                                        <span className="change-system">{content.system || '门户'}</span>
                                    </div>
                                    <p className="change-desc">{content.contentDesc}</p>
                                    
                                    {/* 数据库变更 */}
                                    {content.dbChanges?.length > 0 && (
                                        <div className="sub-changes">
                                            <span className="sub-label">🗄️ 数据库变更 ({content.dbChanges.length})</span>
                                            <ul>
                                                {content.dbChanges.map((db, idx) => (
                                                    <li key={idx}>
                                                        <b>{db.changeType}</b> - {db.dbName}.{db.tableName}
                                                        {db.affectsOnline && <span className="warning-tag">影响线上</span>}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    
                                    {/* 配置变更 */}
                                    {content.configChanges?.length > 0 && (
                                        <div className="sub-changes">
                                            <span className="sub-label">⚙️ 配置变更 ({content.configChanges.length})</span>
                                            <ul>
                                                {content.configChanges.map((cfg, idx) => (
                                                    <li key={idx}>
                                                        {cfg.reason}
                                                        {cfg.affectsOnline && <span className="warning-tag">影响线上</span>}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="empty-text">暂无开发变更内容</p>
                )}
            </div>

            {/* DBA 执行结果 */}
            <div className="summary-section">
                <h4 className="section-title">🗄️ DBA 执行结果</h4>
                {(release.members || []).filter(m => m.content?.dbaExecResult).length > 0 ? (
                    <div className="dba-exec-list">
                        {(release.members || []).filter(m => m.content?.dbaExecResult).map(member => {
                            const content = member.content || {};
                            return (
                                <div key={member.id} className="dba-exec-item">
                                    <div className="dba-exec-header">
                                        <span className="dba-name">{content.dbaExecName || member.user?.name}</span>
                                        <span className="dba-time">
                                            {content.dbaExecTime ? new Date(content.dbaExecTime).toLocaleString('zh-CN') : '-'}
                                        </span>
                                    </div>
                                    <div className="dba-exec-content">
                                        <label>执行结果</label>
                                        <pre>{content.dbaExecResult}</pre>
                                    </div>
                                    {content.dbaRollbackInfo && (
                                        <div className="dba-rollback">
                                            <label>回滚情况</label>
                                            <pre>{content.dbaRollbackInfo}</pre>
                                        </div>
                                    )}
                                    {content.dbaExecRemark && (
                                        <div className="dba-remark">
                                            <label>备注</label>
                                            <p>{content.dbaExecRemark}</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="empty-text">暂无 DBA 执行结果</p>
                )}
            </div>

            {/* 上传文档 */}
            <div className="summary-section">
                <h4 className="section-title">📎 上传文档</h4>
                {(release.documents || []).length > 0 ? (
                    <div className="docs-grid">
                        {(release.documents || []).map(doc => {
                            const typeLabels = {
                                TEST_REPORT: '测试报告',
                                TEST_CASE: '测试用例',
                                ACCEPTANCE_REPORT: '验收报告',
                                BACKUP_SCREENSHOT: '备份截图',
                                PROD_TEST_REPORT: '正式环境测试报告',
                                OTHER: '其他文档'
                            };
                            return (
                                <a key={doc.id} href={doc.filepath} target="_blank" className="doc-item">
                                    <span className="doc-icon">📄</span>
                                    <div className="doc-info">
                                        <span className="doc-name">{doc.filename}</span>
                                        <span className="doc-meta">
                                            {typeLabels[doc.type] || doc.type} · {doc.uploadedBy?.name}
                                        </span>
                                    </div>
                                </a>
                            );
                        })}
                    </div>
                ) : (
                    <p className="empty-text">暂无上传文档</p>
                )}
            </div>
        </div>
    );
}
