'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

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

// 文档类型标签
const DOC_TYPE_LABELS = {
    TEST_REPORT: '测试报告',
    TEST_CASE: '测试用例',
    ACCEPTANCE_REPORT: '验收报告',
    BACKUP_SCREENSHOT: '备份截图',
    PROD_TEST_REPORT: '正式环境测试报告',
    OTHER: '其他文档'
};

// 根据文件名获取对应的图标
const getFileIcon = (filename) => {
    if (!filename) return '📄';
    const ext = filename.split('.').pop()?.toLowerCase();
    const iconMap = {
        'png': '🖼️', 'jpg': '🖼️', 'jpeg': '🖼️', 'gif': '🖼️', 'svg': '🖼️', 'webp': '🖼️', 'ico': '🖼️', 'bmp': '🖼️',
        'pdf': '📕', 'doc': '📘', 'docx': '📘', 'txt': '📝', 'md': '📝',
        'xls': '📊', 'xlsx': '📊', 'csv': '📊',
        'ppt': '📙', 'pptx': '📙',
        'zip': '📦', 'rar': '📦', '7z': '📦', 'tar': '📦', 'gz': '📦',
        'js': '💻', 'ts': '💻', 'jsx': '💻', 'tsx': '💻', 'py': '💻', 'java': '💻', 'sql': '🗄️', 'json': '📋', 'xml': '📋', 'html': '🌐', 'css': '🎨',
        'log': '📜', 'sh': '⚙️', 'bat': '⚙️',
    };
    return iconMap[ext] || '📄';
};

export default function ReleaseSummary({ release, checklists }) {
    const [exporting, setExporting] = useState(false);
    const [downloading, setDownloading] = useState(false);

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

    const completionRate = stats.totalChecklists > 0 
        ? Math.round(stats.completedChecklists / stats.totalChecklists * 100) 
        : 0;

    // 导出为 Excel（完整版）
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
                ['完成时间', new Date(release.updatedAt).toLocaleString('zh-CN')],
                ['当前状态', STATUS_LABELS[release.status] || release.status],
                ['当前阶段', STAGE_LABELS[release.stage] || release.stage],
                [],
                ['统计信息'],
                ['参与人数', stats.totalMembers],
                ['检查项总数', stats.totalChecklists],
                ['已完成检查项', stats.completedChecklists],
                ['完成率', `${completionRate}%`],
                ['上传文档数', stats.totalDocuments],
                ['数据库变更数', stats.dbChangesCount],
                ['配置变更数', stats.configChangesCount],
            ];
            const ws1 = XLSX.utils.aoa_to_sheet(basicInfo);
            ws1['!cols'] = [{ wch: 15 }, { wch: 60 }];
            XLSX.utils.book_append_sheet(wb, ws1, '基本信息');

            // 2. 参与人员表
            const membersData = [
                ['参与人员列表'],
                [],
                ['姓名', '角色', '用户名', '邮箱', '手机']
            ];
            (release.members || []).forEach(member => {
                const roles = (member.user?.role || '').split(',').map(r => ROLE_LABELS[r] || r).join('/');
                membersData.push([
                    member.user?.name || '-',
                    roles,
                    member.user?.username || '-',
                    member.user?.email || '-',
                    member.user?.phone || '-'
                ]);
            });
            const ws2 = XLSX.utils.aoa_to_sheet(membersData);
            ws2['!cols'] = [{ wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 15 }];
            XLSX.utils.book_append_sheet(wb, ws2, '参与人员');

            // 3. 开发变更内容表（RD）
            const devChangesData = [
                ['开发变更内容（RD）'],
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
            ws3['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 80 }];
            XLSX.utils.book_append_sheet(wb, ws3, '开发变更');

            // 4. 数据库变更表
            const dbChangesData = [
                ['数据库变更记录'],
                [],
                ['开发人员', '变更类型', '数据库', '表名', '变更原因', '执行时间', 'SQL语句', '影响说明', '影响线上']
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
                        db.executionTime ? new Date(db.executionTime).toLocaleString('zh-CN') : '-',
                        db.sql || '-',
                        db.impact || '-',
                        db.affectsOnline ? '是' : '否'
                    ]);
                });
            });
            const ws4 = XLSX.utils.aoa_to_sheet(dbChangesData);
            ws4['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 60 }, { wch: 30 }, { wch: 10 }];
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
            ws5['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 50 }, { wch: 30 }, { wch: 10 }];
            XLSX.utils.book_append_sheet(wb, ws5, '配置变更');

            // 6. QA 测试信息表
            const qaData = [
                ['QA 测试信息'],
                [],
                ['测试人员', '手机', '测试时间']
            ];
            (release.members || []).forEach(member => {
                const content = member.content || {};
                if (content.qaName) {
                    qaData.push([
                        content.qaName || '-',
                        content.qaPhone || '-',
                        content.qaTestDate ? new Date(content.qaTestDate).toLocaleDateString('zh-CN') : '-'
                    ]);
                }
            });
            const ws6 = XLSX.utils.aoa_to_sheet(qaData);
            ws6['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 20 }];
            XLSX.utils.book_append_sheet(wb, ws6, 'QA测试');

            // 7. PO 验收信息表
            const poData = [
                ['PO 验收信息'],
                [],
                ['验收人员', '手机', '验收时间', '验收意见']
            ];
            (release.members || []).forEach(member => {
                const content = member.content || {};
                if (content.poName) {
                    poData.push([
                        content.poName || '-',
                        content.poPhone || '-',
                        content.poAcceptDate ? new Date(content.poAcceptDate).toLocaleDateString('zh-CN') : '-',
                        content.poAcceptComment || '-'
                    ]);
                }
            });
            const ws7 = XLSX.utils.aoa_to_sheet(poData);
            ws7['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 50 }];
            XLSX.utils.book_append_sheet(wb, ws7, 'PO验收');

            // 8. DBA 审核信息表
            const dbaReviewData = [
                ['DBA 审核信息'],
                [],
                ['DBA姓名', '手机', '审核时间', '审核意见']
            ];
            (release.members || []).forEach(member => {
                const content = member.content || {};
                if (content.dbaName) {
                    dbaReviewData.push([
                        content.dbaName || '-',
                        content.dbaPhone || '-',
                        content.dbaReviewDate ? new Date(content.dbaReviewDate).toLocaleDateString('zh-CN') : '-',
                        content.dbaReviewComment || '-'
                    ]);
                }
            });
            const ws8 = XLSX.utils.aoa_to_sheet(dbaReviewData);
            ws8['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 50 }];
            XLSX.utils.book_append_sheet(wb, ws8, 'DBA审核');

            // 9. DBA 执行结果表
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
            const ws9 = XLSX.utils.aoa_to_sheet(dbaExecData);
            ws9['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 50 }, { wch: 30 }, { wch: 30 }];
            XLSX.utils.book_append_sheet(wb, ws9, 'DBA执行结果');

            // 10. OP 运维信息表
            const opData = [
                ['OP 运维信息'],
                [],
                ['运维人员', '手机', '备份时间', '回滚方案']
            ];
            (release.members || []).forEach(member => {
                const content = member.content || {};
                if (content.opName) {
                    opData.push([
                        content.opName || '-',
                        content.opPhone || '-',
                        content.opBackupDate ? new Date(content.opBackupDate).toLocaleDateString('zh-CN') : '-',
                        content.rollbackPlan || '-'
                    ]);
                }
            });
            const ws10 = XLSX.utils.aoa_to_sheet(opData);
            ws10['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 60 }];
            XLSX.utils.book_append_sheet(wb, ws10, 'OP运维');

            // 11. 检查清单完成情况表
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
            const ws11 = XLSX.utils.aoa_to_sheet(checklistData);
            ws11['!cols'] = [{ wch: 12 }, { wch: 40 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 20 }];
            XLSX.utils.book_append_sheet(wb, ws11, '检查清单');

            // 12. 文档列表表
            const docsData = [
                ['上传文档列表'],
                [],
                ['文件名', '类型', '上传人', '上传时间', '文件路径']
            ];
            (release.documents || []).forEach(doc => {
                docsData.push([
                    doc.filename || '-',
                    DOC_TYPE_LABELS[doc.type] || doc.type,
                    doc.uploadedBy?.name || '-',
                    new Date(doc.createdAt).toLocaleString('zh-CN'),
                    doc.filepath || '-'
                ]);
            });
            const ws12 = XLSX.utils.aoa_to_sheet(docsData);
            ws12['!cols'] = [{ wch: 40 }, { wch: 20 }, { wch: 12 }, { wch: 20 }, { wch: 50 }];
            XLSX.utils.book_append_sheet(wb, ws12, '上传文档');

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

    // 批量下载附件
    const handleDownloadAllFiles = async () => {
        const documents = release.documents || [];
        if (documents.length === 0) {
            toast.error('没有可下载的附件');
            return;
        }

        setDownloading(true);
        try {
            const zip = new JSZip();
            const folder = zip.folder(`发版附件_${release.version}`);
            
            // 按文档类型分组
            const typeGroups = {};
            documents.forEach(doc => {
                const typeName = DOC_TYPE_LABELS[doc.type] || '其他';
                if (!typeGroups[typeName]) {
                    typeGroups[typeName] = [];
                }
                typeGroups[typeName].push(doc);
            });

            let successCount = 0;
            let failCount = 0;

            // 下载每个文件并添加到 zip
            for (const [typeName, docs] of Object.entries(typeGroups)) {
                const typeFolder = folder.folder(typeName);
                
                for (const doc of docs) {
                    try {
                        const response = await fetch(doc.filepath);
                        if (response.ok) {
                            const blob = await response.blob();
                            typeFolder.file(doc.filename, blob);
                            successCount++;
                        } else {
                            console.error(`下载失败: ${doc.filename}`);
                            failCount++;
                        }
                    } catch (err) {
                        console.error(`下载失败: ${doc.filename}`, err);
                        failCount++;
                    }
                }
            }

            if (successCount === 0) {
                toast.error('所有文件下载失败');
                return;
            }

            // 生成并下载 zip 文件
            const content = await zip.generateAsync({ type: 'blob' });
            const zipFileName = `发版附件_${release.version}_${new Date().toISOString().split('T')[0]}.zip`;
            saveAs(content, zipFileName);
            
            if (failCount > 0) {
                toast.success(`下载完成，成功 ${successCount} 个，失败 ${failCount} 个`);
            } else {
                toast.success(`附件打包下载成功（共 ${successCount} 个文件）`);
            }
        } catch (error) {
            console.error('批量下载失败:', error);
            toast.error('批量下载失败');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="release-summary">
            {/* 发版结果横幅 */}
            <div className={`summary-banner ${release.status === 'SUCCESS' ? 'banner-success' : 'banner-failed'}`}>
                <div className="banner-content">
                    <div className="banner-icon">
                        {release.status === 'SUCCESS' ? '🎉' : '⚠️'}
                    </div>
                    <div className="banner-text">
                        <h2>{release.status === 'SUCCESS' ? '发版成功' : '发版失败'}</h2>
                        <p>版本 {release.version} · 完成于 {new Date(release.updatedAt).toLocaleString('zh-CN')}</p>
                    </div>
                </div>
                <div className="banner-actions">
                    <button 
                        className="btn btn-primary btn-glow"
                        onClick={handleExportExcel}
                        disabled={exporting}
                    >
                        {exporting ? (
                            <>
                                <span className="loading-spinner-sm"></span>
                                导出中...
                            </>
                        ) : (
                            <>
                                <span className="export-icon">📊</span>
                                导出 Excel
                            </>
                        )}
                    </button>
                    <button 
                        className="btn btn-secondary"
                        onClick={handleDownloadAllFiles}
                        disabled={downloading || (release.documents || []).length === 0}
                    >
                        {downloading ? (
                            <>
                                <span className="loading-spinner-sm"></span>
                                打包中...
                            </>
                        ) : (
                            <>
                                <span className="export-icon">📦</span>
                                下载附件 ({(release.documents || []).length})
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* 统计卡片 */}
            <div className="summary-stats-grid">
                <div className="summary-stat-card">
                    <div className="stat-icon-wrapper stat-icon-blue">
                        <span>👥</span>
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.totalMembers}</span>
                        <span className="stat-label">参与人数</span>
                    </div>
                </div>
                <div className="summary-stat-card">
                    <div className="stat-icon-wrapper stat-icon-green">
                        <span>✅</span>
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.completedChecklists}/{stats.totalChecklists}</span>
                        <span className="stat-label">检查项完成</span>
                    </div>
                </div>
                <div className="summary-stat-card">
                    <div className="stat-icon-wrapper stat-icon-purple">
                        <span>🗄️</span>
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.dbChangesCount}</span>
                        <span className="stat-label">数据库变更</span>
                    </div>
                </div>
                <div className="summary-stat-card">
                    <div className="stat-icon-wrapper stat-icon-orange">
                        <span>⚙️</span>
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.configChangesCount}</span>
                        <span className="stat-label">配置变更</span>
                    </div>
                </div>
                <div className="summary-stat-card">
                    <div className="stat-icon-wrapper stat-icon-cyan">
                        <span>📄</span>
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.totalDocuments}</span>
                        <span className="stat-label">上传文档</span>
                    </div>
                </div>
            </div>

            {/* 基本信息 */}
            <div className="summary-section">
                <div className="section-header">
                    <span className="section-icon">📋</span>
                    <h3 className="section-title">基本信息</h3>
                </div>
                <div className="info-grid-summary">
                    <div className="info-item-summary">
                        <label>版本号</label>
                        <span className="text-glow">{release.version}</span>
                    </div>
                    <div className="info-item-summary">
                        <label>所属平台</label>
                        <span>{release.platform || '门户'}</span>
                    </div>
                    <div className="info-item-summary">
                        <label>计划时间</label>
                        <span>{release.plannedDate ? new Date(release.plannedDate).toLocaleDateString('zh-CN') : '未设置'}</span>
                    </div>
                    <div className="info-item-summary">
                        <label>创建人</label>
                        <span>{release.createdBy?.name}</span>
                    </div>
                    <div className="info-item-summary">
                        <label>创建时间</label>
                        <span>{new Date(release.createdAt).toLocaleString('zh-CN')}</span>
                    </div>
                    <div className="info-item-summary">
                        <label>完成时间</label>
                        <span>{new Date(release.updatedAt).toLocaleString('zh-CN')}</span>
                    </div>
                </div>
                {release.description && (
                    <div className="info-desc-summary">
                        <label>发版描述</label>
                        <p>{release.description}</p>
                    </div>
                )}
            </div>

            {/* 参与人员 */}
            <div className="summary-section">
                <div className="section-header">
                    <span className="section-icon">👥</span>
                    <h3 className="section-title">参与人员</h3>
                </div>
                <div className="members-grid-summary">
                    {(release.members || []).map(member => {
                        const roles = (member.user?.role || '').split(',').map(r => ROLE_LABELS[r] || r).join(' / ');
                        return (
                            <div key={member.id} className="member-card-summary">
                                <div className="member-avatar-summary">
                                    {(member.user?.name || '?')[0]}
                                </div>
                                <div className="member-info-summary">
                                    <span className="member-name-summary">{member.user?.name}</span>
                                    <span className="member-role-summary">{roles}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 开发变更内容 */}
            <div className="summary-section">
                <div className="section-header">
                    <span className="section-icon">💻</span>
                    <h3 className="section-title">开发变更内容</h3>
                </div>
                {(release.members || []).filter(m => m.content?.contentDesc).length > 0 ? (
                    <div className="changes-list-summary">
                        {(release.members || []).filter(m => m.content?.contentDesc).map(member => {
                            const content = member.content || {};
                            return (
                                <div key={member.id} className="change-card-summary">
                                    <div className="change-header-summary">
                                        <div className="change-author-summary">
                                            <span className="author-avatar">{(content.devName || member.user?.name || '?')[0]}</span>
                                            <span className="author-name">{content.devName || member.user?.name}</span>
                                        </div>
                                        <span className="badge badge-info">{content.system || '门户'}</span>
                                    </div>
                                    <p className="change-desc-summary">{content.contentDesc}</p>
                                    
                                    {content.dbChanges?.length > 0 && (
                                        <div className="sub-changes-summary">
                                            <div className="sub-changes-header">
                                                <span className="sub-icon">🗄️</span>
                                                <span>数据库变更 ({content.dbChanges.length})</span>
                                            </div>
                                            <div className="sub-changes-list">
                                                {content.dbChanges.map((db, idx) => (
                                                    <div key={idx} className="sub-change-item">
                                                        <span className="change-type">{db.changeType}</span>
                                                        <span className="change-target">{db.dbName}.{db.tableName}</span>
                                                        {db.affectsOnline && (
                                                            <span className="badge badge-danger">影响线上</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {content.configChanges?.length > 0 && (
                                        <div className="sub-changes-summary">
                                            <div className="sub-changes-header">
                                                <span className="sub-icon">⚙️</span>
                                                <span>配置变更 ({content.configChanges.length})</span>
                                            </div>
                                            <div className="sub-changes-list">
                                                {content.configChanges.map((cfg, idx) => (
                                                    <div key={idx} className="sub-change-item">
                                                        <span className="change-reason">{cfg.reason}</span>
                                                        {cfg.affectsOnline && (
                                                            <span className="badge badge-danger">影响线上</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="empty-state-sm">
                        <span className="empty-icon">📝</span>
                        <span>暂无开发变更内容</span>
                    </div>
                )}
            </div>

            {/* DBA 执行结果 */}
            <div className="summary-section">
                <div className="section-header">
                    <span className="section-icon">🗄️</span>
                    <h3 className="section-title">DBA 执行结果</h3>
                </div>
                {(release.members || []).filter(m => m.content?.dbaExecResult).length > 0 ? (
                    <div className="dba-exec-list-summary">
                        {(release.members || []).filter(m => m.content?.dbaExecResult).map(member => {
                            const content = member.content || {};
                            return (
                                <div key={member.id} className="dba-exec-card-summary">
                                    <div className="dba-exec-header-summary">
                                        <div className="dba-info">
                                            <span className="dba-avatar">{(content.dbaExecName || member.user?.name || '?')[0]}</span>
                                            <span className="dba-name">{content.dbaExecName || member.user?.name}</span>
                                        </div>
                                        <span className="dba-time">
                                            {content.dbaExecTime ? new Date(content.dbaExecTime).toLocaleString('zh-CN') : '-'}
                                        </span>
                                    </div>
                                    <div className="dba-exec-content-summary">
                                        <label>执行结果</label>
                                        <pre>{content.dbaExecResult}</pre>
                                    </div>
                                    {content.dbaRollbackInfo && (
                                        <div className="dba-rollback-summary">
                                            <label>回滚情况</label>
                                            <pre>{content.dbaRollbackInfo}</pre>
                                        </div>
                                    )}
                                    {content.dbaExecRemark && (
                                        <div className="dba-remark-summary">
                                            <label>备注</label>
                                            <p>{content.dbaExecRemark}</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="empty-state-sm">
                        <span className="empty-icon">🗄️</span>
                        <span>暂无 DBA 执行结果</span>
                    </div>
                )}
            </div>

            {/* 上传文档 */}
            <div className="summary-section">
                <div className="section-header">
                    <span className="section-icon">📎</span>
                    <h3 className="section-title">上传文档</h3>
                </div>
                {(release.documents || []).length > 0 ? (
                    <div className="docs-grid-summary">
                        {(release.documents || []).map(doc => (
                            <a key={doc.id} href={doc.filepath} target="_blank" rel="noopener noreferrer" className="doc-card-summary">
                                <div className="doc-icon-summary">{getFileIcon(doc.filename)}</div>
                                <div className="doc-info-summary">
                                    <span className="doc-name-summary">{doc.filename}</span>
                                    <span className="doc-meta-summary">
                                        {DOC_TYPE_LABELS[doc.type] || doc.type} · {doc.uploadedBy?.name}
                                    </span>
                                </div>
                                <div className="doc-arrow">→</div>
                            </a>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state-sm">
                        <span className="empty-icon">📄</span>
                        <span>暂无上传文档</span>
                    </div>
                )}
            </div>
        </div>
    );
}
