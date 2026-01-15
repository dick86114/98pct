'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import StageProgress from '@/components/StageProgress';
import ChecklistPanel from '@/components/ChecklistPanel';
import FileUpload from '@/components/FileUpload';
import ConfirmModal from '@/components/ConfirmModal';
import ReleaseSummary from '@/components/ReleaseSummary';
import { toast } from 'react-hot-toast';
import { STAGES, STAGE_LABELS, getAllChecklists, PREPARATION_CHECKLIST } from '@/lib/constants';
import useDictionary from '@/hooks/useDictionary';

const STATUS_STYLES = {
    DRAFT: { label: '草稿', class: 'badge-secondary' },
    PENDING_REVIEW: { label: '待评审', class: 'badge-warning' },
    IN_PROGRESS: { label: '进行中', class: 'badge-info' },
    SUCCESS: { label: '发版成功', class: 'badge-success' },
    FAILED: { label: '发版失败', class: 'badge-danger' },
};

// 系统选项（已改为使用字典）

export default function ReleaseDetailPage({ params }) {
    const { id } = params;
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [release, setRelease] = useState(null);
    const [checklists, setChecklists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    
    // 从字典获取数据库变更类型和所属系统
    const { items: dbChangeTypes } = useDictionary('dbChangeType');
    const { items: systemOptions } = useDictionary('system');

    // 开发人员内容填报状态
    const [contentForm, setContentForm] = useState({
        devName: '',
        devPhone: '',
        system: '',
        contentDesc: '',
        dbChanges: [],
        configChanges: []
    });

    // 当字典加载完成后设置默认系统
    useEffect(() => {
        if (systemOptions.length > 0 && !contentForm.system) {
            setContentForm(prev => ({ ...prev, system: systemOptions[0].name }));
        }
    }, [systemOptions]);

    const [hasDbChange, setHasDbChange] = useState(false);
    const [hasConfigChange, setHasConfigChange] = useState(false);

    // QA 测试信息状态
    const [qaForm, setQaForm] = useState({
        qaName: '',
        qaPhone: '',
        qaTestDate: ''
    });

    // PO 验收信息状态
    const [poForm, setPoForm] = useState({
        poName: '',
        poPhone: '',
        poAcceptDate: ''
    });

    // DBA 审核信息状态
    const [dbaForm, setDbaForm] = useState({
        dbaName: '',
        dbaPhone: '',
        dbaReviewDate: ''
    });

    // DBA 实施结果状态
    const [dbaExecForm, setDbaExecForm] = useState({
        dbaExecTime: '',
        dbaExecName: '',
        dbaExecPhone: '',
        dbaExecResult: '',
        dbaRollbackInfo: '',
        dbaExecRemark: ''
    });

    // OP 运维信息状态
    const [opForm, setOpForm] = useState({
        opName: '',
        opPhone: '',
        opBackupDate: '',
        rollbackPlan: ''
    });

    // PM 信息编辑状态
    const [isEditingInfo, setIsEditingInfo] = useState(false);
    const [infoForm, setInfoForm] = useState({
        version: '',
        description: '',
        plannedDate: ''
    });

    // 确认弹窗状态
    const [confirmConfig, setConfirmConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'warning',
        onConfirm: () => { },
    });

    // 当前激活的标签页（初始值会在获取用户信息后根据角色设置）
    const [activeTab, setActiveTab] = useState('info');
    const [defaultTabSet, setDefaultTabSet] = useState(false);

    // 成员详情弹窗状态
    const [viewingMember, setViewingMember] = useState(null);

    // 局部刷新状态
    const [refreshing, setRefreshing] = useState(false);

    // 局部刷新函数
    const handleRefresh = async () => {
        setRefreshing(true);
        const token = localStorage.getItem('token');
        await fetchReleaseDetail(token);
        setRefreshing(false);
        toast.success('数据已刷新');
    };

    // 根据用户角色和阶段设置默认标签页
    useEffect(() => {
        if (user && release && !defaultTabSet) {
            const userRoles = (user.role || '').split(',');
            let defaultTab = 'info';
            
            // 判断当前用户是否是发版创建者
            const isCreator = release.createdById === user?.id;
            const isAdmin = userRoles.includes('ADMIN');
            const isPM = userRoles.includes('PM');
            
            // 管理视图权限判断：
            // - ADMIN 始终有管理视图
            // - PM 只有在自己创建的发版中才有管理视图
            const hasPMView = isAdmin || (isPM && isCreator);
            
            // 准备阶段的默认标签页
            if (release.stage === 'PREPARATION' || release.stage === 'DRAFT') {
                if (!hasPMView && userRoles.includes('RD')) {
                    defaultTab = 'content'; // 开发人员 -> 变更填报
                } else if (!hasPMView && userRoles.includes('QA')) {
                    defaultTab = 'test-report'; // 测试人员 -> 测试报告上传
                } else if (!hasPMView && userRoles.includes('DBA')) {
                    defaultTab = 'db-changes'; // DBA -> 数据库变更内容
                } else if (!hasPMView && userRoles.includes('OP')) {
                    defaultTab = 'backup'; // 运维人员 -> 备份与回滚
                } else if (hasPMView) {
                    defaultTab = 'progress'; // 管理员/项目经理 -> 团队进度
                } else if (userRoles.includes('PO')) {
                    defaultTab = 'checklist'; // 产品人员 -> 自查清单
                }
            } else if (release.stage === 'IMPLEMENTATION' || release.stage === 'VERIFICATION') {
                // 实施/验证阶段：PM/ADMIN 默认显示自查清单，其他角色显示发版信息
                if (hasPMView) {
                    defaultTab = 'checklist';
                } else {
                    defaultTab = 'info';
                }
            } else if (release.stage === 'COMPLETED' || release.stage === 'ROLLBACK') {
                // 完成/回滚阶段：PM/ADMIN 默认显示发版总结，其他角色显示发版信息
                if (hasPMView) {
                    defaultTab = 'summary';
                } else {
                    defaultTab = 'info';
                }
            }
            
            setActiveTab(defaultTab);
            setDefaultTabSet(true);
        }
    }, [user, release, defaultTabSet]);

    useEffect(() => {
        const initPage = async () => {
            const token = localStorage.getItem('token');
            const userStr = localStorage.getItem('user');

            if (!token || !userStr) {
                router.push('/login');
                return;
            }

            let currentUser = JSON.parse(userStr);

            try {
                const meRes = await fetch('/api/auth/me', {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (meRes.ok) {
                    const meData = await meRes.json();
                    currentUser = meData.user;
                    localStorage.setItem('user', JSON.stringify(currentUser));
                    setUser(currentUser);
                } else {
                    setUser(currentUser);
                }
            } catch (error) {
                console.error('获取用户信息失败:', error);
                setUser(currentUser);
            }

            fetchReleaseDetail(token);
        };

        initPage();
    }, [id, router]);

    const fetchReleaseDetail = async (token) => {
        try {
            const releaseRes = await fetch(`/api/releases/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (releaseRes.status === 401) {
                router.push('/login');
                return;
            }
            if (releaseRes.status === 404) {
                router.push('/releases');
                return;
            }

            const releaseData = await releaseRes.json();
            const r = releaseData.release;
            setRelease(r);

            // 初始化表单
            const myMember = r.members.find(m => m.userId === user?.id || (JSON.parse(localStorage.getItem('user'))?.id === m.userId));
            const c = myMember?.content || {};
            const currentUser = user || JSON.parse(localStorage.getItem('user'));

            setContentForm({
                devName: c.devName || currentUser?.name || '',
                devPhone: c.devPhone || currentUser?.phone || '',
                system: c.system || '门户',
                contentDesc: c.contentDesc || '',
                dbChanges: c.dbChanges || [],
                configChanges: c.configChanges || []
            });

            setHasDbChange((c.dbChanges || []).length > 0);
            setHasConfigChange((c.configChanges || []).length > 0);

            // 初始化 QA 表单
            setQaForm({
                qaName: c.qaName || currentUser?.name || '',
                qaPhone: c.qaPhone || currentUser?.phone || '',
                qaTestDate: c.qaTestDate ? c.qaTestDate.split('T')[0] : ''
            });

            // 初始化 PO 表单
            setPoForm({
                poName: c.poName || currentUser?.name || '',
                poPhone: c.poPhone || currentUser?.phone || '',
                poAcceptDate: c.poAcceptDate ? c.poAcceptDate.split('T')[0] : ''
            });

            // 初始化 DBA 表单
            setDbaForm({
                dbaName: c.dbaName || currentUser?.name || '',
                dbaPhone: c.dbaPhone || currentUser?.phone || '',
                dbaReviewDate: c.dbaReviewDate ? c.dbaReviewDate.split('T')[0] : ''
            });

            // 初始化 DBA 实施结果表单
            setDbaExecForm({
                dbaExecTime: c.dbaExecTime ? c.dbaExecTime.split('T')[0] + 'T' + c.dbaExecTime.split('T')[1]?.substring(0, 5) : '',
                dbaExecName: c.dbaExecName || currentUser?.name || '',
                dbaExecPhone: c.dbaExecPhone || currentUser?.phone || '',
                dbaExecResult: c.dbaExecResult || '',
                dbaRollbackInfo: c.dbaRollbackInfo || '',
                dbaExecRemark: c.dbaExecRemark || ''
            });

            // 初始化 OP 表单
            setOpForm({
                opName: c.opName || currentUser?.name || '',
                opPhone: c.opPhone || currentUser?.phone || '',
                opBackupDate: c.opBackupDate ? c.opBackupDate.split('T')[0] : '',
                rollbackPlan: c.rollbackPlan || ''
            });

            setInfoForm({
                version: r.version,
                description: r.description,
                plannedDate: r.plannedDate ? r.plannedDate.split('T')[0] : ''
            });

            setChecklists(r.checklists || []);
        } catch (error) {
            console.error('获取详情失败:', error);
            toast.error('获取详情失败');
        } finally {
            setLoading(false);
        }
    };

    // 数据库变更操作
    const addDbChange = () => {
        setContentForm(prev => ({
            ...prev,
            dbChanges: [...prev.dbChanges, {
                reason: '',
                changeType: '新增字段',
                dbName: '',
                tableName: '',
                sql: '',
                impact: '',
                affectsOnline: false
            }]
        }));
    };

    const removeDbChange = (index) => {
        setContentForm(prev => ({
            ...prev,
            dbChanges: prev.dbChanges.filter((_, i) => i !== index)
        }));
    };

    const updateDbChange = (index, field, value) => {
        const newDb = [...contentForm.dbChanges];
        newDb[index][field] = value;
        setContentForm({ ...contentForm, dbChanges: newDb });
    };

    // 配置变更操作
    const addConfigChange = () => {
        setContentForm(prev => ({
            ...prev,
            configChanges: [...prev.configChanges, {
                reason: '',
                content: '',
                impact: '',
                affectsOnline: false
            }]
        }));
    };

    const removeConfigChange = (index) => {
        setContentForm(prev => ({
            ...prev,
            configChanges: prev.configChanges.filter((_, i) => i !== index)
        }));
    };

    const updateConfigChange = (index, field, value) => {
        const newCfg = [...contentForm.configChanges];
        newCfg[index][field] = value;
        setContentForm({ ...contentForm, configChanges: newCfg });
    };

    // 批量提交检查清单
    const handleChecklistBatchSubmit = async (checkedMap) => {
        const token = localStorage.getItem('token');
        try {
            await fetch(`/api/releases/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ action: 'update_checklist', items: checkedMap }),
            });

            toast.success('检查项确认成功');
            fetchReleaseDetail(token);
        } catch (e) {
            toast.error('提交失败');
        }
    };

    // 保存开发人员内容
    const handleSaveContent = async () => {
        // 验证必填项
        if (!contentForm.devName?.trim()) {
            toast.error('请填写开发人员姓名');
            return;
        }
        if (!contentForm.contentDesc?.trim()) {
            toast.error('请填写变更内容描述');
            return;
        }

        // 验证数据库变更必填项
        if (hasDbChange) {
            if (contentForm.dbChanges.length === 0) {
                toast.error('请添加至少一条数据库变更记录');
                return;
            }
            for (let i = 0; i < contentForm.dbChanges.length; i++) {
                const db = contentForm.dbChanges[i];
                if (!db.reason?.trim()) {
                    toast.error(`数据库变更 ${i + 1}：请填写变更原因`);
                    return;
                }
                if (!db.changeType?.trim()) {
                    toast.error(`数据库变更 ${i + 1}：请选择变更类型`);
                    return;
                }
                if (!db.dbName?.trim()) {
                    toast.error(`数据库变更 ${i + 1}：请填写数据库名`);
                    return;
                }
                if (!db.tableName?.trim()) {
                    toast.error(`数据库变更 ${i + 1}：请填写表名`);
                    return;
                }
                if (!db.sql?.trim()) {
                    toast.error(`数据库变更 ${i + 1}：请填写SQL语句`);
                    return;
                }
                if (!db.impact?.trim()) {
                    toast.error(`数据库变更 ${i + 1}：请填写可能带来的影响`);
                    return;
                }
            }
        }

        // 验证配置变更必填项
        if (hasConfigChange) {
            if (contentForm.configChanges.length === 0) {
                toast.error('请添加至少一条配置变更记录');
                return;
            }
            for (let i = 0; i < contentForm.configChanges.length; i++) {
                const cfg = contentForm.configChanges[i];
                if (!cfg.reason?.trim()) {
                    toast.error(`配置变更 ${i + 1}：请填写变更原因`);
                    return;
                }
                if (!cfg.content?.trim()) {
                    toast.error(`配置变更 ${i + 1}：请填写变更内容`);
                    return;
                }
                if (!cfg.impact?.trim()) {
                    toast.error(`配置变更 ${i + 1}：请填写可能带来的影响`);
                    return;
                }
            }
        }

        setActionLoading(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/releases/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    action: 'update_content',
                    ...contentForm,
                    dbChanges: hasDbChange ? contentForm.dbChanges : [],
                    configChanges: hasConfigChange ? contentForm.configChanges : []
                }),
            });

            if (res.ok) {
                toast.success('内容保存成功');
                fetchReleaseDetail(token);
            } else {
                toast.error('保存失败');
            }
        } catch (e) {
            toast.error('保存出错');
        } finally {
            setActionLoading(false);
        }
    };

    // 保存 QA 内容
    const handleSaveQaContent = async () => {
        // 验证必填项
        if (!qaForm.qaName?.trim()) {
            toast.error('请填写测试人员姓名');
            return;
        }
        if (!qaForm.qaTestDate) {
            toast.error('请填写测试时间');
            return;
        }

        setActionLoading(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/releases/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    action: 'update_qa_content',
                    ...qaForm,
                }),
            });

            if (res.ok) {
                toast.success('测试信息保存成功');
                fetchReleaseDetail(token);
            } else {
                toast.error('保存失败');
            }
        } catch (e) {
            toast.error('保存出错');
        } finally {
            setActionLoading(false);
        }
    };

    // 保存 PO 验收信息
    const handleSavePoContent = async () => {
        // 验证必填项
        if (!poForm.poName?.trim()) {
            toast.error('请填写产品人员姓名');
            return;
        }
        if (!poForm.poAcceptDate) {
            toast.error('请填写验收时间');
            return;
        }

        setActionLoading(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/releases/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    action: 'update_po_content',
                    ...poForm,
                }),
            });

            if (res.ok) {
                toast.success('验收信息保存成功');
                fetchReleaseDetail(token);
            } else {
                toast.error('保存失败');
            }
        } catch (e) {
            toast.error('保存出错');
        } finally {
            setActionLoading(false);
        }
    };

    // 保存 DBA 审核信息
    const handleSaveDbaContent = async () => {
        // 验证必填项
        if (!dbaForm.dbaName?.trim()) {
            toast.error('请填写DBA姓名');
            return;
        }
        if (!dbaForm.dbaReviewDate) {
            toast.error('请填写审核时间');
            return;
        }

        setActionLoading(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/releases/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    action: 'update_dba_content',
                    ...dbaForm,
                }),
            });

            if (res.ok) {
                toast.success('审核信息保存成功');
                fetchReleaseDetail(token);
            } else {
                toast.error('保存失败');
            }
        } catch (e) {
            toast.error('保存出错');
        } finally {
            setActionLoading(false);
        }
    };

    // 保存 DBA 实施结果
    const handleSaveDbaExec = async () => {
        // 验证必填项
        if (!dbaExecForm.dbaExecName?.trim()) {
            toast.error('请填写执行人姓名');
            return;
        }
        if (!dbaExecForm.dbaExecResult?.trim()) {
            toast.error('请填写执行结果');
            return;
        }

        setActionLoading(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/releases/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    action: 'update_dba_exec',
                    ...dbaExecForm,
                }),
            });

            if (res.ok) {
                toast.success('DBA执行结果保存成功');
                fetchReleaseDetail(token);
            } else {
                const data = await res.json();
                toast.error(data.error || '保存失败');
            }
        } catch (e) {
            toast.error('保存出错');
        } finally {
            setActionLoading(false);
        }
    };

    // 保存 OP 运维信息
    const handleSaveOpContent = async () => {
        // 验证必填项
        if (!opForm.opName?.trim()) {
            toast.error('请填写运维人员姓名');
            return;
        }
        if (!opForm.opBackupDate) {
            toast.error('请填写备份时间');
            return;
        }
        if (!opForm.rollbackPlan?.trim()) {
            toast.error('请填写回滚具体方案');
            return;
        }

        setActionLoading(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/releases/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    action: 'update_op_content',
                    ...opForm,
                }),
            });

            if (res.ok) {
                toast.success('运维信息保存成功');
                fetchReleaseDetail(token);
            } else {
                toast.error('保存失败');
            }
        } catch (e) {
            toast.error('保存出错');
        } finally {
            setActionLoading(false);
        }
    };

    // 保存 PM 信息
    const handleSaveInfo = async () => {
        setActionLoading(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/releases/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    action: 'update_info',
                    version: infoForm.version,
                    description: infoForm.description,
                    plannedDate: infoForm.plannedDate
                }),
            });

            if (res.ok) {
                toast.success('信息更新成功');
                setIsEditingInfo(false);
                fetchReleaseDetail(token);
            } else {
                toast.error('更新失败');
            }
        } catch (e) {
            toast.error('更新出错');
        } finally {
            setActionLoading(false);
        }
    };

    // 推进阶段
    const executeAdvanceStage = async () => {
        setActionLoading(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/releases/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ action: 'advance_stage' }),
            });
            const data = await res.json();
            if (!res.ok) {
                // 显示详细的错误信息
                if (data.uncheckedItems && data.uncheckedItems.length > 0) {
                    console.log('未完成的检查项:', data.uncheckedItems);
                }
                toast.error(data.error || '阶段推进失败');
                return;
            }
            toast.success('已推进到下一阶段');
            fetchReleaseDetail(token);
        } catch (error) {
            console.error('推进阶段失败:', error);
            toast.error('操作失败');
        } finally {
            setActionLoading(false);
        }
    };

    const handleAdvanceStage = () => {
        setConfirmConfig({
            isOpen: true,
            title: '确认推进阶段',
            message: '确定要推进到下一阶段吗？请确保当前阶段的所有检查项已完成。',
            type: 'warning',
            confirmText: '确认推进',
            onConfirm: executeAdvanceStage
        });
    };

    // 回滚
    const executeRollback = async () => {
        setActionLoading(true);
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/releases/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ action: 'rollback' }),
            });
            if (!res.ok) throw new Error();
            toast.success('已标记为回滚');
            fetchReleaseDetail(token);
        } catch (error) {
            toast.error('操作失败');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRollback = () => {
        setConfirmConfig({
            isOpen: true,
            title: '确认回滚',
            message: '⚠️ 确定要标记此发版为回滚吗？此操作不可撤销。',
            type: 'danger',
            confirmText: '确定回滚',
            onConfirm: executeRollback
        });
    };

    // 上传成功后只更新文档列表，不刷新整个页面数据（避免丢失未保存的表单内容）
    const handleUploadSuccess = (document) => {
        // 将新上传的文档添加到现有文档列表中
        setRelease(prev => ({
            ...prev,
            documents: [document, ...(prev.documents || [])]
        }));
        toast.success(`文件 ${document?.filename || ''} 上传成功`);
    };

    if (loading) return <div className="loading"><div className="loading-spinner"></div></div>;
    if (!release) return null;

    const statusStyle = STATUS_STYLES[release.status] || STATUS_STYLES.DRAFT;
    const isFinished = release.stage === 'COMPLETED' || release.stage === 'ROLLBACK';

    // 权限判断
    const userRoleList = (user?.role || '').split(',');
    const isAdmin = userRoleList.includes('ADMIN');
    const isPM = userRoleList.includes('PM');
    const isRD = userRoleList.includes('RD');
    const isQA = userRoleList.includes('QA');
    const isPO = userRoleList.includes('PO');
    const isDBA = userRoleList.includes('DBA');
    const isOP = userRoleList.includes('OP');
    
    // 判断当前用户是否是发版创建者
    const isCreator = release.createdById === user?.id;
    
    // 管理视图权限判断：
    // - ADMIN 始终有管理视图（可以看所有发版的全貌）
    // - PM 只有在自己创建的发版中才有管理视图，作为成员参与时显示对应角色视图
    const hasPMView = isAdmin || (isPM && isCreator);

    // 内容编辑权限
    const canEditContent = (release.stage === 'PREPARATION' || release.stage === 'DRAFT') && (isRD || isPM);
    const canEditQaContent = (release.stage === 'PREPARATION' || release.stage === 'DRAFT') && isQA;
    const canEditPoContent = (release.stage === 'PREPARATION' || release.stage === 'DRAFT') && isPO;
    const canEditDbaContent = (release.stage === 'PREPARATION' || release.stage === 'DRAFT') && isDBA;
    const canEditOpContent = (release.stage === 'PREPARATION' || release.stage === 'DRAFT') && isOP;

    // 成员进度计算
    const memberProgress = (release.members || []).map(m => {
        const userItems = checklists.filter(c => c.userId === m.userId && c.stage === release.stage);
        const completedCount = userItems.filter(c => c.checked).length;
        const totalCount = userItems.length;
        return {
            ...m.user,
            progress: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
            completedCount,
            totalCount
        };
    });

    const allDefinitions = getAllChecklists();
    const enrichedChecklists = checklists.map(c => {
        const def = allDefinitions.find(d => d.key === c.itemKey);
        return {
            ...c,
            label: def?.label || c.itemKey,
            allowedRoles: def?.roles || [],
            category: def?.category || ''
        };
    });

    // 当前用户的检查清单
    const myChecklists = enrichedChecklists.filter(c => c.userId === user?.id && c.stage === release.stage);
    
    // 开发人员自查清单（仅 RD 角色）
    const rdSelfCheckItems = myChecklists.filter(c => c.category === 'RD_SELF_CHECK' || c.itemKey.startsWith('rd_self'));

    return (
        <>
            <Navbar />
            <main className="release-detail-page">
                <div className="container">
                    {/* 页面头部 */}
                    <div className="page-header">
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="page-title">{release.version}</h1>
                                <span className={`badge ${statusStyle.class}`}>{statusStyle.label}</span>
                            </div>
                            <p className="page-subtitle">
                                由 {release.createdBy?.name} 创建于 {new Date(release.createdAt).toLocaleString('zh-CN')}
                            </p>
                        </div>
                        <button className="btn btn-secondary" onClick={() => router.push('/releases')}>
                            ← 返回列表
                        </button>
                    </div>

                    {/* 流程进度（含阶段指引） */}
                    <div className="card stage-card">
                        <StageProgress currentStage={release.stage} userRole={user?.role} />
                        {!isFinished && hasPMView && (
                            <div className="stage-actions">
                                <button className="btn btn-success" onClick={handleAdvanceStage} disabled={actionLoading}>
                                    {actionLoading ? '处理中...' : '✅ 推进到下一阶段'}
                                </button>
                                <button className="btn btn-danger" onClick={handleRollback} disabled={actionLoading}>
                                    ⚠️ 标记回滚
                                </button>
                            </div>
                        )}
                    </div>

                    {/* PM/ADMIN 管理视图 */}
                    {hasPMView && (
                        <div className="pm-workspace">
                            {/* 标签页导航 */}
                            <div className="tab-nav">
                                <button 
                                    className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('info')}
                                >
                                    📋 发版信息
                                </button>
                                {/* 准备阶段才显示团队进度 */}
                                {release.stage === 'PREPARATION' && (
                                    <button 
                                        className={`tab-btn ${activeTab === 'progress' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('progress')}
                                    >
                                        📊 团队进度
                                    </button>
                                )}
                                {/* 准备阶段才显示成员详情 tabs */}
                                {release.stage === 'PREPARATION' && (
                                    <>
                                        <button 
                                            className={`tab-btn ${activeTab === 'dev-changes' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('dev-changes')}
                                        >
                                            💻 开发变更
                                        </button>
                                        <button 
                                            className={`tab-btn ${activeTab === 'qa-content' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('qa-content')}
                                        >
                                            🧪 测试内容
                                        </button>
                                        <button 
                                            className={`tab-btn ${activeTab === 'dba-content' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('dba-content')}
                                        >
                                            🗄️ DBA审核
                                        </button>
                                        <button 
                                            className={`tab-btn ${activeTab === 'op-content' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('op-content')}
                                        >
                                            💾 运维工作
                                        </button>
                                    </>
                                )}
                                {/* 实施阶段显示 DBA 执行进度 */}
                                {release.stage === 'IMPLEMENTATION' && (
                                    <button 
                                        className={`tab-btn ${activeTab === 'dba-exec-progress' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('dba-exec-progress')}
                                    >
                                        🗄️ DBA执行进度
                                    </button>
                                )}
                                {/* 完成/回滚阶段显示发版总结，其他阶段显示自查清单 */}
                                {(release.stage === 'COMPLETED' || release.stage === 'ROLLBACK') ? (
                                    <button 
                                        className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('summary')}
                                    >
                                        📊 发版总结
                                    </button>
                                ) : (
                                    <button 
                                        className={`tab-btn ${activeTab === 'checklist' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('checklist')}
                                    >
                                        ✅ 自查清单
                                    </button>
                                )}
                            </div>

                            {/* 发版信息标签页 */}
                            {activeTab === 'info' && (
                                <div className="tab-content">
                                    <div className="card">
                                        <div className="card-header">
                                            <h3 className="card-title">📋 发版摘要</h3>
                                            {!isEditingInfo ? (
                                                <button className="btn btn-sm btn-secondary" onClick={() => setIsEditingInfo(true)}>
                                                    ✏️ 编辑
                                                </button>
                                            ) : null}
                                        </div>
                                        
                                        {!isEditingInfo ? (
                                            <>
                                                <div className="info-grid">
                                                    <div className="info-item">
                                                        <label>版本号</label>
                                                        <span>{release.version}</span>
                                                    </div>
                                                    <div className="info-item">
                                                        <label>计划时间</label>
                                                        <span>{release.plannedDate ? new Date(release.plannedDate).toLocaleDateString() : '未设置'}</span>
                                                    </div>
                                                    <div className="info-item">
                                                        <label>当前阶段</label>
                                                        <span className="badge badge-primary">{STAGE_LABELS[release.stage]}</span>
                                                    </div>
                                                    <div className="info-item">
                                                        <label>创建人</label>
                                                        <span>{release.createdBy?.name}</span>
                                                    </div>
                                                </div>
                                                <div className="info-desc">
                                                    <label>发版描述</label>
                                                    <p>{release.description || '暂无描述'}</p>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="edit-form">
                                                <div className="form-row">
                                                    <div className="form-group">
                                                        <label className="form-label">版本号</label>
                                                        <input
                                                            className="form-input"
                                                            value={infoForm.version}
                                                            onChange={e => setInfoForm({ ...infoForm, version: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="form-label">计划时间</label>
                                                        <input
                                                            type="date"
                                                            className="form-input"
                                                            value={infoForm.plannedDate}
                                                            onChange={e => setInfoForm({ ...infoForm, plannedDate: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">发版描述</label>
                                                    <textarea
                                                        className="form-textarea"
                                                        rows={3}
                                                        value={infoForm.description}
                                                        onChange={e => setInfoForm({ ...infoForm, description: e.target.value })}
                                                    />
                                                </div>
                                                <div className="btn-group">
                                                    <button className="btn btn-primary btn-sm" onClick={handleSaveInfo} disabled={actionLoading}>
                                                        💾 保存
                                                    </button>
                                                    <button className="btn btn-secondary btn-sm" onClick={() => setIsEditingInfo(false)}>
                                                        取消
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* 成员列表 */}
                                    <div className="card" style={{ marginTop: '20px' }}>
                                        <div className="card-header">
                                            <h3 className="card-title">👥 发版成员</h3>
                                            <span className="card-subtitle">共 {(release.members || []).length} 人参与</span>
                                        </div>
                                        <div className="pm-member-grid">
                                            {(release.members || []).map(member => {
                                                const memberRoles = (member.user?.role || '').split(',');
                                                const roleLabels = memberRoles.map(r => {
                                                    const labels = { PM: '项目经理', RD: '开发', QA: '测试', PO: '产品', DBA: 'DBA', OP: '运维' };
                                                    return labels[r] || r;
                                                }).join('/');
                                                return (
                                                    <div key={member.id} className="pm-member-card">
                                                        <div className="pm-member-avatar">{(member.user?.name || '?')[0]}</div>
                                                        <div className="pm-member-info">
                                                            <span className="pm-member-name">{member.user?.name}</span>
                                                            <span className="pm-member-role">{roleLabels}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* 实施/验证阶段显示准备阶段的所有填报内容 */}
                                    {(release.stage === 'IMPLEMENTATION' || release.stage === 'VERIFICATION' || release.stage === 'COMPLETED') && (
                                        <>
                                            {/* 开发人员变更内容 */}
                                            <div className="card" style={{ marginTop: '20px' }}>
                                                <div className="card-header">
                                                    <div>
                                                        <h3 className="card-title">💻 开发变更内容</h3>
                                                        <span className="card-subtitle">准备阶段开发人员提交的变更详情</span>
                                                    </div>
                                                </div>
                                                <div className="prep-content-list">
                                                    {(release.members || []).filter(m => {
                                                        const roles = (m.user?.role || '').split(',');
                                                        return roles.includes('RD') && m.content?.contentDesc;
                                                    }).length > 0 ? (
                                                        (release.members || []).filter(m => {
                                                            const roles = (m.user?.role || '').split(',');
                                                            return roles.includes('RD');
                                                        }).map(member => {
                                                            const content = member.content || {};
                                                            if (!content.contentDesc) return null;
                                                            return (
                                                                <div key={member.id} className="prep-content-item">
                                                                    <div className="prep-content-header">
                                                                        <div className="prep-content-avatar">{(member.user?.name || '?')[0]}</div>
                                                                        <div className="prep-content-info">
                                                                            <span className="prep-content-name">{content.devName || member.user?.name}</span>
                                                                            <span className="prep-content-meta">{content.devPhone || '-'} · {content.system || '门户'}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="prep-content-body">
                                                                        <div className="prep-content-desc">
                                                                            <label>发版涉及内容说明</label>
                                                                            <p>{content.contentDesc}</p>
                                                                        </div>
                                                                        
                                                                        {/* 数据库变更 */}
                                                                        {content.dbChanges?.length > 0 && (
                                                                            <div className="prep-db-changes">
                                                                                <h5>🗄️ 数据库变更 ({content.dbChanges.length} 条)</h5>
                                                                                {content.dbChanges.map((db, idx) => (
                                                                                    <div key={idx} className="prep-db-item">
                                                                                        <div className="prep-db-header">
                                                                                            <span className="prep-db-index">#{idx + 1}</span>
                                                                                            <span className="prep-db-type">{db.changeType}</span>
                                                                                            {db.affectsOnline && <span className="prep-db-warning">⚠️ 影响线上</span>}
                                                                                        </div>
                                                                                        <div className="prep-db-grid">
                                                                                            <div><b>数据库：</b>{db.dbName || '-'}</div>
                                                                                            <div><b>表名：</b>{db.tableName || '-'}</div>
                                                                                            <div><b>变更原因：</b>{db.reason || '-'}</div>
                                                                                        </div>
                                                                                        <div className="prep-db-sql">
                                                                                            <label>SQL 语句</label>
                                                                                            <pre>{db.sql || '-- 无'}</pre>
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                        
                                                                        {/* 配置变更 */}
                                                                        {content.configChanges?.length > 0 && (
                                                                            <div className="prep-config-changes">
                                                                                <h5>⚙️ 配置变更 ({content.configChanges.length} 条)</h5>
                                                                                {content.configChanges.map((cfg, idx) => (
                                                                                    <div key={idx} className="prep-config-item">
                                                                                        <div><b>变更原因：</b>{cfg.reason || '-'}</div>
                                                                                        <div><b>变更内容：</b>{cfg.content || '-'}</div>
                                                                                        <div><b>可能影响：</b>{cfg.impact || '-'}</div>
                                                                                        {cfg.affectsOnline && <span className="prep-config-warning">⚠️ 影响线上服务</span>}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    ) : (
                                                        <div className="empty-hint">
                                                            <span>📭</span>
                                                            <p>暂无开发变更内容</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* 测试信息 */}
                                            <div className="card" style={{ marginTop: '20px' }}>
                                                <div className="card-header">
                                                    <div>
                                                        <h3 className="card-title">🧪 测试信息</h3>
                                                        <span className="card-subtitle">准备阶段测试人员提交的信息</span>
                                                    </div>
                                                </div>
                                                <div className="prep-content-list">
                                                    {(release.members || []).filter(m => {
                                                        const roles = (m.user?.role || '').split(',');
                                                        return roles.includes('QA') && m.content?.qaName;
                                                    }).length > 0 ? (
                                                        (release.members || []).filter(m => {
                                                            const roles = (m.user?.role || '').split(',');
                                                            return roles.includes('QA') && m.content?.qaName;
                                                        }).map(member => {
                                                            const content = member.content || {};
                                                            return (
                                                                <div key={member.id} className="prep-content-item compact">
                                                                    <div className="prep-content-header">
                                                                        <div className="prep-content-avatar">{(member.user?.name || '?')[0]}</div>
                                                                        <div className="prep-content-info">
                                                                            <span className="prep-content-name">{content.qaName}</span>
                                                                            <span className="prep-content-meta">{content.qaPhone || '-'}</span>
                                                                        </div>
                                                                        <div className="prep-content-date">
                                                                            测试时间：{content.qaTestDate ? new Date(content.qaTestDate).toLocaleDateString('zh-CN') : '未填写'}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    ) : (
                                                        <div className="empty-hint">
                                                            <span>📭</span>
                                                            <p>暂无测试信息</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* DBA 审核信息 */}
                                            <div className="card" style={{ marginTop: '20px' }}>
                                                <div className="card-header">
                                                    <div>
                                                        <h3 className="card-title">🗄️ DBA 审核信息</h3>
                                                        <span className="card-subtitle">准备阶段 DBA 提交的审核信息</span>
                                                    </div>
                                                </div>
                                                <div className="prep-content-list">
                                                    {(release.members || []).filter(m => {
                                                        const roles = (m.user?.role || '').split(',');
                                                        return roles.includes('DBA') && m.content?.dbaName;
                                                    }).length > 0 ? (
                                                        (release.members || []).filter(m => {
                                                            const roles = (m.user?.role || '').split(',');
                                                            return roles.includes('DBA') && m.content?.dbaName;
                                                        }).map(member => {
                                                            const content = member.content || {};
                                                            return (
                                                                <div key={member.id} className="prep-content-item compact">
                                                                    <div className="prep-content-header">
                                                                        <div className="prep-content-avatar">{(member.user?.name || '?')[0]}</div>
                                                                        <div className="prep-content-info">
                                                                            <span className="prep-content-name">{content.dbaName}</span>
                                                                            <span className="prep-content-meta">{content.dbaPhone || '-'}</span>
                                                                        </div>
                                                                        <div className="prep-content-date">
                                                                            审核时间：{content.dbaReviewDate ? new Date(content.dbaReviewDate).toLocaleDateString('zh-CN') : '未填写'}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    ) : (
                                                        <div className="empty-hint">
                                                            <span>📭</span>
                                                            <p>暂无 DBA 审核信息</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* 运维信息 */}
                                            <div className="card" style={{ marginTop: '20px' }}>
                                                <div className="card-header">
                                                    <div>
                                                        <h3 className="card-title">💾 运维信息</h3>
                                                        <span className="card-subtitle">准备阶段运维人员提交的备份和回滚信息</span>
                                                    </div>
                                                </div>
                                                <div className="prep-content-list">
                                                    {(release.members || []).filter(m => {
                                                        const roles = (m.user?.role || '').split(',');
                                                        return roles.includes('OP') && m.content?.opName;
                                                    }).length > 0 ? (
                                                        (release.members || []).filter(m => {
                                                            const roles = (m.user?.role || '').split(',');
                                                            return roles.includes('OP') && m.content?.opName;
                                                        }).map(member => {
                                                            const content = member.content || {};
                                                            return (
                                                                <div key={member.id} className="prep-content-item">
                                                                    <div className="prep-content-header">
                                                                        <div className="prep-content-avatar">{(member.user?.name || '?')[0]}</div>
                                                                        <div className="prep-content-info">
                                                                            <span className="prep-content-name">{content.opName}</span>
                                                                            <span className="prep-content-meta">{content.opPhone || '-'}</span>
                                                                        </div>
                                                                        <div className="prep-content-date">
                                                                            备份时间：{content.opBackupDate ? new Date(content.opBackupDate).toLocaleDateString('zh-CN') : '未填写'}
                                                                        </div>
                                                                    </div>
                                                                    {content.rollbackPlan && (
                                                                        <div className="prep-content-body">
                                                                            <div className="prep-content-desc">
                                                                                <label>回滚方案</label>
                                                                                <p>{content.rollbackPlan}</p>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })
                                                    ) : (
                                                        <div className="empty-hint">
                                                            <span>📭</span>
                                                            <p>暂无运维信息</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* 相关文档 */}
                                            <div className="card" style={{ marginTop: '20px' }}>
                                                <div className="card-header">
                                                    <div>
                                                        <h3 className="card-title">📎 相关文档</h3>
                                                        <span className="card-subtitle">准备阶段上传的所有文档</span>
                                                    </div>
                                                </div>
                                                <div className="prep-docs-list">
                                                    {(release.documents || []).length > 0 ? (
                                                        <div className="prep-docs-grid">
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
                                                                    <a 
                                                                        key={doc.id} 
                                                                        href={doc.filepath} 
                                                                        target="_blank" 
                                                                        className="prep-doc-item"
                                                                    >
                                                                        <div className="prep-doc-icon">📄</div>
                                                                        <div className="prep-doc-info">
                                                                            <span className="prep-doc-name">{doc.filename}</span>
                                                                            <span className="prep-doc-meta">
                                                                                {typeLabels[doc.type] || doc.type} · {doc.uploadedBy?.name} · {new Date(doc.createdAt).toLocaleDateString('zh-CN')}
                                                                            </span>
                                                                        </div>
                                                                    </a>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <div className="empty-hint">
                                                            <span>📭</span>
                                                            <p>暂无上传文档</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* 团队进度标签页 */}
                            {activeTab === 'progress' && (
                                <div className="tab-content">
                                    <div className="card">
                                        <div className="card-header">
                                            <div>
                                                <h3 className="card-title">📊 团队执行进度</h3>
                                                <span className="card-subtitle">实时查看各成员的任务完成情况</span>
                                            </div>
                                            <button 
                                                className="btn btn-sm btn-secondary refresh-btn"
                                                onClick={handleRefresh}
                                                disabled={refreshing}
                                            >
                                                {refreshing ? '🔄 刷新中...' : '🔄 刷新'}
                                            </button>
                                        </div>
                                        
                                        <div className="pm-progress-list">
                                            {(release.members || []).map(member => {
                                                const memberRoles = (member.user?.role || '').split(',');
                                                const roleLabels = memberRoles.map(r => {
                                                    const labels = { PM: '项目经理', RD: '开发', QA: '测试', PO: '产品', DBA: 'DBA', OP: '运维' };
                                                    return labels[r] || r;
                                                }).join('/');
                                                
                                                // 计算该成员当前阶段的检查清单完成情况
                                                const memberChecklists = checklists.filter(c => c.userId === member.userId && c.stage === release.stage);
                                                const completedCount = memberChecklists.filter(c => c.checked).length;
                                                const totalCount = memberChecklists.length;
                                                const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                                                
                                                // 判断内容提交状态
                                                const content = member.content || {};
                                                const hasContent = content.devName || content.qaName || content.poName || content.dbaName || content.opName;
                                                
                                                return (
                                                    <div key={member.id} className="pm-progress-card">
                                                        <div className="pm-progress-header">
                                                            <div className="pm-progress-avatar">{(member.user?.name || '?')[0]}</div>
                                                            <div className="pm-progress-info">
                                                                <span className="pm-progress-name">{member.user?.name}</span>
                                                                <span className="pm-progress-role">{roleLabels}</span>
                                                            </div>
                                                            <button 
                                                                className="btn btn-sm btn-secondary"
                                                                onClick={() => setViewingMember(member)}
                                                                style={{ marginLeft: 'auto', marginRight: '12px', padding: '4px 12px', fontSize: '12px' }}
                                                            >
                                                                查看详情
                                                            </button>
                                                            <div className={`pm-progress-badge ${progress === 100 ? 'complete' : progress > 0 ? 'in-progress' : 'pending'}`}>
                                                                {progress === 100 ? '✅ 已完成' : progress > 0 ? `${progress}%` : '待开始'}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="pm-progress-stats">
                                                            <div className="pm-stat-item">
                                                                <span className="pm-stat-label">检查项</span>
                                                                <span className="pm-stat-value">{completedCount}/{totalCount}</span>
                                                            </div>
                                                            <div className="pm-stat-item">
                                                                <span className="pm-stat-label">内容提交</span>
                                                                <span className={`pm-stat-value ${hasContent ? 'done' : 'pending'}`}>
                                                                    {hasContent ? '已提交' : '未提交'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="pm-progress-bar">
                                                            <div className="pm-progress-fill" style={{ width: `${progress}%` }}></div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 开发变更内容标签页 */}
                            {activeTab === 'dev-changes' && (
                                <div className="tab-content">
                                    <div className="card">
                                        <div className="card-header">
                                            <div>
                                                <h3 className="card-title">💻 开发人员变更内容</h3>
                                                <span className="card-subtitle">查看所有开发人员提交的变更详情</span>
                                            </div>
                                            <button 
                                                className="btn btn-sm btn-secondary refresh-btn"
                                                onClick={handleRefresh}
                                                disabled={refreshing}
                                            >
                                                {refreshing ? '🔄 刷新中...' : '🔄 刷新'}
                                            </button>
                                        </div>
                                        
                                        <div className="pm-dev-list">
                                            {(release.members || []).filter(m => {
                                                const roles = (m.user?.role || '').split(',');
                                                return roles.includes('RD') && m.content;
                                            }).length > 0 ? (
                                                (release.members || []).filter(m => {
                                                    const roles = (m.user?.role || '').split(',');
                                                    return roles.includes('RD');
                                                }).map(member => {
                                                    const content = member.content || {};
                                                    return (
                                                        <div key={member.id} className="pm-dev-section">
                                                            <div className="pm-dev-header">
                                                                <div className="pm-dev-avatar">{(member.user?.name || '?')[0]}</div>
                                                                <div className="pm-dev-info">
                                                                    <span className="pm-dev-name">{content.devName || member.user?.name || '未知'}</span>
                                                                    <span className="pm-dev-phone">{content.devPhone || '-'}</span>
                                                                </div>
                                                                <span className="pm-dev-system">{content.system || '门户'}</span>
                                                            </div>
                                                            
                                                            {content.contentDesc ? (
                                                                <>
                                                                    <div className="pm-dev-content">
                                                                        <label>发版涉及内容说明</label>
                                                                        <p>{content.contentDesc}</p>
                                                                    </div>
                                                                    
                                                                    {/* 数据库变更 */}
                                                                    {content.dbChanges?.length > 0 && (
                                                                        <div className="pm-dev-db-changes">
                                                                            <h5>🗄️ 数据库变更 ({content.dbChanges.length} 条)</h5>
                                                                            {content.dbChanges.map((db, idx) => (
                                                                                <div key={idx} className="pm-db-item">
                                                                                    <div className="pm-db-header">
                                                                                        <span className="pm-db-index">#{idx + 1}</span>
                                                                                        <span className="pm-db-type">{db.changeType}</span>
                                                                                        {db.affectsOnline && <span className="pm-db-warning">⚠️ 影响线上</span>}
                                                                                    </div>
                                                                                    <div className="pm-db-details">
                                                                                        <div><b>数据库：</b>{db.dbName || '-'}</div>
                                                                                        <div><b>表名：</b>{db.tableName || '-'}</div>
                                                                                        <div><b>执行时间：</b>{db.executionTime || '-'}</div>
                                                                                        <div><b>变更原因：</b>{db.reason || '-'}</div>
                                                                                    </div>
                                                                                    <div className="pm-db-sql">
                                                                                        <label>SQL 语句</label>
                                                                                        <pre>{db.sql || '-- 无'}</pre>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                    
                                                                    {/* 配置变更 */}
                                                                    {content.configChanges?.length > 0 && (
                                                                        <div className="pm-dev-config-changes">
                                                                            <h5>⚙️ 配置变更 ({content.configChanges.length} 条)</h5>
                                                                            {content.configChanges.map((cfg, idx) => (
                                                                                <div key={idx} className="pm-config-item">
                                                                                    <div><b>变更原因：</b>{cfg.reason || '-'}</div>
                                                                                    <div><b>变更内容：</b>{cfg.content || '-'}</div>
                                                                                    <div><b>可能影响：</b>{cfg.impact || '-'}</div>
                                                                                    {cfg.affectsOnline && <span className="pm-config-warning">⚠️ 影响线上服务</span>}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <div className="pm-dev-empty">
                                                                    <span>📭</span>
                                                                    <p>该开发人员尚未提交变更内容</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="empty-hint">
                                                    <span>📭</span>
                                                    <p>暂无开发人员参与此发版</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 测试内容标签页 */}
                            {activeTab === 'qa-content' && (
                                <div className="tab-content">
                                    <div className="card">
                                        <div className="card-header">
                                            <div>
                                                <h3 className="card-title">🧪 测试人员提交内容</h3>
                                                <span className="card-subtitle">查看所有测试人员的测试进度和报告</span>
                                            </div>
                                            <button 
                                                className="btn btn-sm btn-secondary refresh-btn"
                                                onClick={handleRefresh}
                                                disabled={refreshing}
                                            >
                                                {refreshing ? '🔄 刷新中...' : '🔄 刷新'}
                                            </button>
                                        </div>
                                        
                                        <div className="pm-qa-list">
                                            {(release.members || []).filter(m => {
                                                const roles = (m.user?.role || '').split(',');
                                                return roles.includes('QA');
                                            }).length > 0 ? (
                                                (release.members || []).filter(m => {
                                                    const roles = (m.user?.role || '').split(',');
                                                    return roles.includes('QA');
                                                }).map(member => {
                                                    const content = member.content || {};
                                                    const qaChecklists = checklists.filter(c => 
                                                        c.userId === member.userId && 
                                                        c.itemKey.startsWith('qa_prep')
                                                    );
                                                    const completedCount = qaChecklists.filter(c => c.checked).length;
                                                    const totalCount = qaChecklists.length;
                                                    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                                                    
                                                    return (
                                                        <div key={member.id} className="pm-qa-card">
                                                            <div className="pm-qa-header">
                                                                <div className="pm-qa-avatar">{(member.user?.name || '?')[0]}</div>
                                                                <div className="pm-qa-info">
                                                                    <span className="pm-qa-name">{content.qaName || member.user?.name || '未知'}</span>
                                                                    <span className="pm-qa-phone">{content.qaPhone || member.user?.phone || '-'}</span>
                                                                </div>
                                                                <div className={`pm-qa-badge ${progress === 100 ? 'complete' : ''}`}>
                                                                    {progress}% 完成
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="pm-qa-stats">
                                                                <div className="pm-qa-stat">
                                                                    <span className="pm-qa-stat-label">测试时间</span>
                                                                    <span className="pm-qa-stat-value">
                                                                        {content.qaTestDate ? new Date(content.qaTestDate).toLocaleDateString() : '未填写'}
                                                                    </span>
                                                                </div>
                                                                <div className="pm-qa-stat">
                                                                    <span className="pm-qa-stat-label">检查项完成</span>
                                                                    <span className="pm-qa-stat-value">{completedCount}/{totalCount}</span>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="pm-qa-progress-bar">
                                                                <div className="pm-qa-progress-fill" style={{ width: `${progress}%` }}></div>
                                                            </div>
                                                            
                                                            {/* 测试报告 */}
                                                            <div className="pm-qa-reports">
                                                                <span className="pm-qa-reports-label">📄 相关文档：</span>
                                                                {(release.documents || []).length > 0 ? (
                                                                    <div className="pm-qa-reports-list">
                                                                        {release.documents.map(doc => (
                                                                            <a key={doc.id} href={doc.filepath} target="_blank" className="pm-qa-report-link">
                                                                                {doc.filename}
                                                                            </a>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <span className="pm-qa-no-report">暂无上传</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="empty-hint">
                                                    <span>📭</span>
                                                    <p>暂无测试人员参与此发版</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* DBA 审核内容标签页 */}
                            {activeTab === 'dba-content' && (
                                <div className="tab-content">
                                    <div className="card">
                                        <div className="card-header">
                                            <div>
                                                <h3 className="card-title">🗄️ DBA 审核内容</h3>
                                                <span className="card-subtitle">查看数据库管理员的审核情况</span>
                                            </div>
                                            <button 
                                                className="btn btn-sm btn-secondary refresh-btn"
                                                onClick={handleRefresh}
                                                disabled={refreshing}
                                            >
                                                {refreshing ? '🔄 刷新中...' : '🔄 刷新'}
                                            </button>
                                        </div>
                                        
                                        <div className="pm-dba-list">
                                            {(release.members || []).filter(m => {
                                                const roles = (m.user?.role || '').split(',');
                                                return roles.includes('DBA');
                                            }).length > 0 ? (
                                                (release.members || []).filter(m => {
                                                    const roles = (m.user?.role || '').split(',');
                                                    return roles.includes('DBA');
                                                }).map(member => {
                                                    const content = member.content || {};
                                                    const dbaChecklists = checklists.filter(c => 
                                                        c.userId === member.userId && 
                                                        c.itemKey.startsWith('dba_prep')
                                                    );
                                                    const completedCount = dbaChecklists.filter(c => c.checked).length;
                                                    const totalCount = dbaChecklists.length;
                                                    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                                                    
                                                    return (
                                                        <div key={member.id} className="pm-dba-card">
                                                            <div className="pm-dba-header">
                                                                <div className="pm-dba-avatar">{(member.user?.name || '?')[0]}</div>
                                                                <div className="pm-dba-info">
                                                                    <span className="pm-dba-name">{content.dbaName || member.user?.name || '未知'}</span>
                                                                    <span className="pm-dba-phone">{content.dbaPhone || member.user?.phone || '-'}</span>
                                                                </div>
                                                                <div className={`pm-dba-badge ${progress === 100 ? 'complete' : ''}`}>
                                                                    {progress === 100 ? '✅ 审核完成' : `${progress}%`}
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="pm-dba-stats">
                                                                <div className="pm-dba-stat">
                                                                    <span className="pm-dba-stat-label">审核时间</span>
                                                                    <span className="pm-dba-stat-value">
                                                                        {content.dbaReviewDate ? new Date(content.dbaReviewDate).toLocaleDateString() : '未填写'}
                                                                    </span>
                                                                </div>
                                                                <div className="pm-dba-stat">
                                                                    <span className="pm-dba-stat-label">检查项完成</span>
                                                                    <span className="pm-dba-stat-value">{completedCount}/{totalCount}</span>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="pm-dba-progress-bar">
                                                                <div className="pm-dba-progress-fill" style={{ width: `${progress}%` }}></div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="empty-hint">
                                                    <span>📭</span>
                                                    <p>暂无 DBA 参与此发版</p>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* 数据库变更汇总 */}
                                        <div className="pm-db-summary">
                                            <h4>📊 数据库变更汇总</h4>
                                            {(() => {
                                                const allDbChanges = (release.members || [])
                                                    .filter(m => m.content?.dbChanges?.length > 0)
                                                    .flatMap(m => m.content.dbChanges.map(db => ({
                                                        ...db,
                                                        devName: m.content.devName || m.user?.name
                                                    })));
                                                
                                                if (allDbChanges.length === 0) {
                                                    return <p className="pm-db-summary-empty">本次发版无数据库变更</p>;
                                                }
                                                
                                                return (
                                                    <div className="pm-db-summary-stats">
                                                        <div className="pm-db-summary-item">
                                                            <span className="pm-db-summary-num">{allDbChanges.length}</span>
                                                            <span className="pm-db-summary-label">总变更数</span>
                                                        </div>
                                                        <div className="pm-db-summary-item warning">
                                                            <span className="pm-db-summary-num">{allDbChanges.filter(d => d.affectsOnline).length}</span>
                                                            <span className="pm-db-summary-label">影响线上</span>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 运维工作内容标签页 */}
                            {activeTab === 'op-content' && (
                                <div className="tab-content">
                                    <div className="card">
                                        <div className="card-header">
                                            <div>
                                                <h3 className="card-title">💾 运维工作内容</h3>
                                                <span className="card-subtitle">查看运维人员的备份和回滚准备情况</span>
                                            </div>
                                            <button 
                                                className="btn btn-sm btn-secondary refresh-btn"
                                                onClick={handleRefresh}
                                                disabled={refreshing}
                                            >
                                                {refreshing ? '🔄 刷新中...' : '🔄 刷新'}
                                            </button>
                                        </div>
                                        
                                        <div className="pm-op-list">
                                            {(release.members || []).filter(m => {
                                                const roles = (m.user?.role || '').split(',');
                                                return roles.includes('OP');
                                            }).length > 0 ? (
                                                (release.members || []).filter(m => {
                                                    const roles = (m.user?.role || '').split(',');
                                                    return roles.includes('OP');
                                                }).map(member => {
                                                    const content = member.content || {};
                                                    const opChecklists = checklists.filter(c => 
                                                        c.userId === member.userId && 
                                                        (c.itemKey.startsWith('op_prep') || c.category === 'OP_SELF_CHECK')
                                                    );
                                                    const completedCount = opChecklists.filter(c => c.checked).length;
                                                    const totalCount = opChecklists.length;
                                                    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                                                    
                                                    return (
                                                        <div key={member.id} className="pm-op-card">
                                                            <div className="pm-op-header">
                                                                <div className="pm-op-avatar">{(member.user?.name || '?')[0]}</div>
                                                                <div className="pm-op-info">
                                                                    <span className="pm-op-name">{content.opName || member.user?.name || '未知'}</span>
                                                                    <span className="pm-op-phone">{content.opPhone || member.user?.phone || '-'}</span>
                                                                </div>
                                                                <div className={`pm-op-badge ${progress === 100 ? 'complete' : ''}`}>
                                                                    {progress === 100 ? '✅ 准备完成' : `${progress}%`}
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="pm-op-stats">
                                                                <div className="pm-op-stat">
                                                                    <span className="pm-op-stat-label">备份时间</span>
                                                                    <span className="pm-op-stat-value">
                                                                        {content.opBackupDate ? new Date(content.opBackupDate).toLocaleDateString() : '未填写'}
                                                                    </span>
                                                                </div>
                                                                <div className="pm-op-stat">
                                                                    <span className="pm-op-stat-label">检查项完成</span>
                                                                    <span className="pm-op-stat-value">{completedCount}/{totalCount}</span>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="pm-op-progress-bar">
                                                                <div className="pm-op-progress-fill" style={{ width: `${progress}%` }}></div>
                                                            </div>
                                                            
                                                            {/* 回滚方案 */}
                                                            {content.rollbackPlan && (
                                                                <div className="pm-op-rollback">
                                                                    <span className="pm-op-rollback-label">🔄 回滚方案：</span>
                                                                    <p className="pm-op-rollback-content">{content.rollbackPlan}</p>
                                                                </div>
                                                            )}
                                                            
                                                            {/* 备份截图 */}
                                                            <div className="pm-op-screenshots">
                                                                <span className="pm-op-screenshots-label">📸 备份截图：</span>
                                                                {(release.documents || []).filter(doc => doc.type === 'BACKUP_SCREENSHOT').length > 0 ? (
                                                                    <div className="pm-op-screenshots-list">
                                                                        {(release.documents || []).filter(doc => doc.type === 'BACKUP_SCREENSHOT').map(doc => (
                                                                            <a key={doc.id} href={doc.filepath} target="_blank" className="pm-op-screenshot-link">
                                                                                {doc.filename}
                                                                            </a>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <span className="pm-op-no-screenshot">暂无上传</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="empty-hint">
                                                    <span>📭</span>
                                                    <p>暂无运维人员参与此发版</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* DBA 执行进度标签页（实施阶段） */}
                            {activeTab === 'dba-exec-progress' && (
                                <div className="tab-content">
                                    <div className="card">
                                        <div className="card-header">
                                            <div>
                                                <h3 className="card-title">🗄️ DBA 执行进度</h3>
                                                <span className="card-subtitle">查看 DBA 在实施阶段的执行情况</span>
                                            </div>
                                            <button 
                                                className="btn btn-sm btn-secondary refresh-btn"
                                                onClick={handleRefresh}
                                                disabled={refreshing}
                                            >
                                                {refreshing ? '🔄 刷新中...' : '🔄 刷新'}
                                            </button>
                                        </div>
                                        
                                        <div className="pm-dba-exec-list">
                                            {(release.members || []).filter(m => {
                                                const roles = (m.user?.role || '').split(',');
                                                return roles.includes('DBA');
                                            }).length > 0 ? (
                                                (release.members || []).filter(m => {
                                                    const roles = (m.user?.role || '').split(',');
                                                    return roles.includes('DBA');
                                                }).map(member => {
                                                    const content = member.content || {};
                                                    const hasExecResult = content.dbaExecResult;
                                                    
                                                    return (
                                                        <div key={member.id} className="pm-dba-exec-card">
                                                            <div className="pm-dba-exec-header">
                                                                <div className="pm-dba-exec-avatar">{(member.user?.name || '?')[0]}</div>
                                                                <div className="pm-dba-exec-info">
                                                                    <span className="pm-dba-exec-name">{content.dbaExecName || member.user?.name || '未知'}</span>
                                                                    <span className="pm-dba-exec-phone">{content.dbaExecPhone || member.user?.phone || '-'}</span>
                                                                </div>
                                                                <div className={`pm-dba-exec-badge ${hasExecResult ? 'complete' : 'pending'}`}>
                                                                    {hasExecResult ? '✅ 已填报' : '⏳ 待填报'}
                                                                </div>
                                                            </div>
                                                            
                                                            {hasExecResult ? (
                                                                <div className="pm-dba-exec-details">
                                                                    <div className="pm-dba-exec-row">
                                                                        <div className="pm-dba-exec-item">
                                                                            <span className="pm-dba-exec-label">执行时间</span>
                                                                            <span className="pm-dba-exec-value">
                                                                                {content.dbaExecTime ? new Date(content.dbaExecTime).toLocaleString('zh-CN') : '未填写'}
                                                                            </span>
                                                                        </div>
                                                                        <div className="pm-dba-exec-item">
                                                                            <span className="pm-dba-exec-label">执行人</span>
                                                                            <span className="pm-dba-exec-value">{content.dbaExecName || '-'}</span>
                                                                        </div>
                                                                        <div className="pm-dba-exec-item">
                                                                            <span className="pm-dba-exec-label">联系电话</span>
                                                                            <span className="pm-dba-exec-value">{content.dbaExecPhone || '-'}</span>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div className="pm-dba-exec-result">
                                                                        <span className="pm-dba-exec-label">执行结果</span>
                                                                        <div className="pm-dba-exec-result-content">
                                                                            <pre>{content.dbaExecResult || '未填写'}</pre>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    {content.dbaRollbackInfo && (
                                                                        <div className="pm-dba-exec-rollback">
                                                                            <span className="pm-dba-exec-label">🔄 回滚情况</span>
                                                                            <div className="pm-dba-exec-rollback-content">
                                                                                <pre>{content.dbaRollbackInfo}</pre>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    
                                                                    {content.dbaExecRemark && (
                                                                        <div className="pm-dba-exec-remark">
                                                                            <span className="pm-dba-exec-label">📝 备注</span>
                                                                            <p>{content.dbaExecRemark}</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="pm-dba-exec-empty">
                                                                    <span>⏳</span>
                                                                    <p>该 DBA 尚未填报执行结果</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="empty-hint">
                                                    <span>📭</span>
                                                    <p>暂无 DBA 参与此发版</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 自查清单标签页 */}
                            {activeTab === 'checklist' && (
                                <div className="tab-content">
                                    <div className="card">
                                        <div className="card-header">
                                            <h3 className="card-title">
                                                ✅ {release.stage === 'PREPARATION' ? '项目经理自查清单' : 
                                                    release.stage === 'IMPLEMENTATION' ? '实施阶段检查清单' : 
                                                    release.stage === 'VERIFICATION' ? '验证阶段检查清单' : '自查清单'}
                                            </h3>
                                            <p className="card-subtitle">
                                                {release.stage === 'PREPARATION' ? '请在确认各项准备工作完成后勾选' :
                                                 release.stage === 'IMPLEMENTATION' ? '请在确认各项实施工作完成后勾选' :
                                                 release.stage === 'VERIFICATION' ? '请在确认各项验证工作完成后勾选' : ''}
                                            </p>
                                        </div>
                                        
                                        {/* 根据当前阶段显示对应的检查清单 */}
                                        {myChecklists.length > 0 ? (
                                            <ChecklistPanel
                                                checklists={myChecklists}
                                                stage={release.stage}
                                                userRole={user?.role}
                                                onSubmit={handleChecklistBatchSubmit}
                                            />
                                        ) : (
                                            <div className="pm-checklist-info">
                                                <p className="pm-checklist-note">💡 提示：请先将自己添加为发版成员，即可操作检查清单。</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 发版总结标签页（完成/回滚阶段） */}
                            {activeTab === 'summary' && (
                                <div className="tab-content">
                                    <div className="card">
                                        <div className="card-header">
                                            <h3 className="card-title">📊 发版总结</h3>
                                            <p className="card-subtitle">本次发版的完整记录和统计信息</p>
                                        </div>
                                        <ReleaseSummary release={release} checklists={enrichedChecklists} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 开发人员视图 */}
                    {isRD && (
                        <div className="rd-workspace">
                            {/* 标签页导航 */}
                            <div className="tab-nav">
                                <button 
                                    className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('info')}
                                >
                                    📋 发版信息
                                </button>
                                {/* 准备阶段才显示变更填报和自查清单 */}
                                {release.stage === 'PREPARATION' && (
                                    <>
                                        <button 
                                            className={`tab-btn ${activeTab === 'content' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('content')}
                                        >
                                            📝 变更填报
                                        </button>
                                        <button 
                                            className={`tab-btn ${activeTab === 'checklist' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('checklist')}
                                        >
                                            ✅ 自查清单
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* 发版信息标签页 */}
                            {activeTab === 'info' && (
                                <div className="tab-content">
                                    <div className="card">
                                        <div className="card-header">
                                            <h3 className="card-title">📋 发版摘要</h3>
                                        </div>
                                        <div className="info-grid">
                                            <div className="info-item">
                                                <label>版本号</label>
                                                <span>{release.version}</span>
                                            </div>
                                            <div className="info-item">
                                                <label>计划时间</label>
                                                <span>{release.plannedDate ? new Date(release.plannedDate).toLocaleDateString() : '未设置'}</span>
                                            </div>
                                            <div className="info-item">
                                                <label>当前阶段</label>
                                                <span className="badge badge-primary">{STAGE_LABELS[release.stage]}</span>
                                            </div>
                                            <div className="info-item">
                                                <label>创建人</label>
                                                <span>{release.createdBy?.name}</span>
                                            </div>
                                        </div>
                                        <div className="info-desc">
                                            <label>发版描述</label>
                                            <p>{release.description || '暂无描述'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 变更填报标签页 */}
                            {activeTab === 'content' && (
                                <div className="tab-content">
                                    <div className="content-form-wrapper">
                                        {/* 保存按钮 */}
                                        {canEditContent && (
                                            <div className="form-actions-top">
                                                <button
                                                    className="btn btn-primary"
                                                    onClick={handleSaveContent}
                                                    disabled={actionLoading}
                                                >
                                                    💾 {actionLoading ? '保存中...' : '保存填报内容'}
                                                </button>
                                            </div>
                                        )}

                                        {/* 基本信息 */}
                                        <div className="form-section">
                                            <div className="section-header">
                                                <h4 className="section-title">👤 基本信息</h4>
                                                <span className="required-hint">* 为必填项</span>
                                            </div>
                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label className="form-label label-required">姓名</label>
                                                    <input
                                                        className="form-input"
                                                        disabled={!canEditContent}
                                                        value={contentForm.devName}
                                                        onChange={e => setContentForm({ ...contentForm, devName: e.target.value })}
                                                        placeholder="请输入姓名"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label label-required">手机号</label>
                                                    <input
                                                        className="form-input"
                                                        disabled={!canEditContent}
                                                        value={contentForm.devPhone}
                                                        onChange={e => setContentForm({ ...contentForm, devPhone: e.target.value })}
                                                        placeholder="请输入手机号"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label label-required">所属系统</label>
                                                    <select
                                                        className="form-input"
                                                        disabled={!canEditContent}
                                                        value={contentForm.system}
                                                        onChange={e => setContentForm({ ...contentForm, system: e.target.value })}
                                                    >
                                                        {systemOptions.map(opt => (
                                                            <option key={opt.code} value={opt.name}>{opt.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label label-required">发版涉及内容说明</label>
                                                <textarea
                                                    className="form-textarea"
                                                    rows={3}
                                                    disabled={!canEditContent}
                                                    value={contentForm.contentDesc}
                                                    onChange={e => setContentForm({ ...contentForm, contentDesc: e.target.value })}
                                                    placeholder="请详细描述本次发版涉及的功能变更、修复的问题等..."
                                                />
                                            </div>
                                        </div>

                                        {/* 数据库变更 */}
                                        <div className="form-section">
                                            <div className="section-header">
                                                <h4 className="section-title">🗄️ 数据库变更信息</h4>
                                                <div className="toggle-group">
                                                    <span className="toggle-label">是否有变更：</span>
                                                    <label className="toggle-switch">
                                                        <input
                                                            type="checkbox"
                                                            disabled={!canEditContent}
                                                            checked={hasDbChange}
                                                            onChange={e => {
                                                                setHasDbChange(e.target.checked);
                                                                if (e.target.checked && contentForm.dbChanges.length === 0) addDbChange();
                                                            }}
                                                        />
                                                        <span className="toggle-slider"></span>
                                                    </label>
                                                    <span className={`toggle-status ${hasDbChange ? 'yes' : 'no'}`}>
                                                        {hasDbChange ? '有' : '无'}
                                                    </span>
                                                </div>
                                            </div>

                                            {hasDbChange ? (
                                                <div className="change-list">
                                                    {contentForm.dbChanges.map((db, idx) => (
                                                        <div key={idx} className="change-card">
                                                            <div className="change-card-header">
                                                                <span className="change-index">变更记录 #{idx + 1}</span>
                                                                {canEditContent && (
                                                                    <button 
                                                                        className="btn-icon-danger" 
                                                                        onClick={() => removeDbChange(idx)}
                                                                        title="删除此记录"
                                                                    >
                                                                        🗑️
                                                                    </button>
                                                                )}
                                                            </div>
                                                            
                                                            <div className="form-group">
                                                                <label className="form-label label-required">变更原因</label>
                                                                <input 
                                                                    className="form-input" 
                                                                    disabled={!canEditContent} 
                                                                    value={db.reason} 
                                                                    onChange={e => updateDbChange(idx, 'reason', e.target.value)}
                                                                    placeholder="说明为什么需要此数据库变更" 
                                                                />
                                                            </div>

                                                            <div className="form-row form-row-4">
                                                                <div className="form-group">
                                                                    <label className="form-label label-required">变更类型</label>
                                                                    <select 
                                                                        className="form-input" 
                                                                        disabled={!canEditContent} 
                                                                        value={db.changeType} 
                                                                        onChange={e => updateDbChange(idx, 'changeType', e.target.value)}
                                                                    >
                                                                        {dbChangeTypes.map(t => (
                                                                            <option key={t.code} value={t.name}>{t.name}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                                <div className="form-group">
                                                                    <label className="form-label label-required">数据库名</label>
                                                                    <input 
                                                                        className="form-input" 
                                                                        disabled={!canEditContent} 
                                                                        value={db.dbName} 
                                                                        onChange={e => updateDbChange(idx, 'dbName', e.target.value)}
                                                                        placeholder="数据库名称"
                                                                    />
                                                                </div>
                                                                <div className="form-group">
                                                                    <label className="form-label label-required">表名</label>
                                                                    <input 
                                                                        className="form-input" 
                                                                        disabled={!canEditContent} 
                                                                        value={db.tableName} 
                                                                        onChange={e => updateDbChange(idx, 'tableName', e.target.value)}
                                                                        placeholder="涉及的表名"
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div className="form-group">
                                                                <label className="form-label label-required">变更的 SQL 语句</label>
                                                                <textarea 
                                                                    className="form-textarea code-textarea" 
                                                                    rows={4} 
                                                                    disabled={!canEditContent} 
                                                                    value={db.sql} 
                                                                    onChange={e => updateDbChange(idx, 'sql', e.target.value)}
                                                                    placeholder="请输入完整的 SQL 语句..."
                                                                />
                                                            </div>

                                                            <div className="form-row">
                                                                <div className="form-group" style={{flex: 2}}>
                                                                    <label className="form-label label-required">可能带来的影响</label>
                                                                    <textarea 
                                                                        className="form-textarea" 
                                                                        rows={2}
                                                                        disabled={!canEditContent} 
                                                                        value={db.impact} 
                                                                        onChange={e => updateDbChange(idx, 'impact', e.target.value)}
                                                                        placeholder="描述此变更可能带来的影响"
                                                                    />
                                                                </div>
                                                                <div className="form-group checkbox-group">
                                                                    <label className="checkbox-label">
                                                                        <input 
                                                                            type="checkbox" 
                                                                            disabled={!canEditContent} 
                                                                            checked={db.affectsOnline} 
                                                                            onChange={e => updateDbChange(idx, 'affectsOnline', e.target.checked)}
                                                                        />
                                                                        <span className="checkbox-text">是否影响线上服务</span>
                                                                    </label>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    
                                                    {canEditContent && (
                                                        <button className="btn btn-dashed" onClick={addDbChange}>
                                                            + 新增数据库变更记录
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="empty-hint">
                                                    <span>📭</span>
                                                    <p>无数据库变更</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* 公共配置变更 */}
                                        <div className="form-section">
                                            <div className="section-header">
                                                <h4 className="section-title">⚙️ 公共配置变更</h4>
                                                <div className="toggle-group">
                                                    <span className="toggle-label">是否有变更：</span>
                                                    <label className="toggle-switch">
                                                        <input
                                                            type="checkbox"
                                                            disabled={!canEditContent}
                                                            checked={hasConfigChange}
                                                            onChange={e => {
                                                                setHasConfigChange(e.target.checked);
                                                                if (e.target.checked && contentForm.configChanges.length === 0) addConfigChange();
                                                            }}
                                                        />
                                                        <span className="toggle-slider"></span>
                                                    </label>
                                                    <span className={`toggle-status ${hasConfigChange ? 'yes' : 'no'}`}>
                                                        {hasConfigChange ? '有' : '无'}
                                                    </span>
                                                </div>
                                            </div>

                                            {hasConfigChange ? (
                                                <div className="change-list">
                                                    {contentForm.configChanges.map((cfg, idx) => (
                                                        <div key={idx} className="change-card">
                                                            <div className="change-card-header">
                                                                <span className="change-index">配置记录 #{idx + 1}</span>
                                                                {canEditContent && (
                                                                    <button 
                                                                        className="btn-icon-danger" 
                                                                        onClick={() => removeConfigChange(idx)}
                                                                        title="删除此记录"
                                                                    >
                                                                        🗑️
                                                                    </button>
                                                                )}
                                                            </div>
                                                            
                                                            <div className="form-group">
                                                                <label className="form-label label-required">变更原因</label>
                                                                <input 
                                                                    className="form-input" 
                                                                    disabled={!canEditContent} 
                                                                    value={cfg.reason} 
                                                                    onChange={e => updateConfigChange(idx, 'reason', e.target.value)}
                                                                    placeholder="说明为什么需要此配置变更" 
                                                                />
                                                            </div>

                                                            <div className="form-group">
                                                                <label className="form-label label-required">变更内容</label>
                                                                <textarea 
                                                                    className="form-textarea" 
                                                                    rows={3} 
                                                                    disabled={!canEditContent} 
                                                                    value={cfg.content} 
                                                                    onChange={e => updateConfigChange(idx, 'content', e.target.value)}
                                                                    placeholder="详细描述配置变更的内容..."
                                                                />
                                                            </div>

                                                            <div className="form-row">
                                                                <div className="form-group" style={{flex: 2}}>
                                                                    <label className="form-label label-required">可能带来的影响</label>
                                                                    <textarea 
                                                                        className="form-textarea" 
                                                                        rows={2}
                                                                        disabled={!canEditContent} 
                                                                        value={cfg.impact} 
                                                                        onChange={e => updateConfigChange(idx, 'impact', e.target.value)}
                                                                        placeholder="描述此变更可能带来的影响"
                                                                    />
                                                                </div>
                                                                <div className="form-group checkbox-group">
                                                                    <label className="checkbox-label">
                                                                        <input 
                                                                            type="checkbox" 
                                                                            disabled={!canEditContent} 
                                                                            checked={cfg.affectsOnline} 
                                                                            onChange={e => updateConfigChange(idx, 'affectsOnline', e.target.checked)}
                                                                        />
                                                                        <span className="checkbox-text">是否影响线上服务</span>
                                                                    </label>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    
                                                    {canEditContent && (
                                                        <button className="btn btn-dashed" onClick={addConfigChange}>
                                                            + 新增配置变更记录
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="empty-hint">
                                                    <span>📭</span>
                                                    <p>无配置变更</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* 附件上传 */}
                                        <div className="form-section">
                                            <div className="section-header">
                                                <h4 className="section-title">📎 附件上传</h4>
                                                {canEditContent && (
                                                    <FileUpload
                                                        releaseId={release.id}
                                                        documents={release.documents || []}
                                                        onUploadSuccess={handleUploadSuccess}
                                                        showList={false}
                                                        label="📤 上传文件"
                                                    />
                                                )}
                                            </div>
                                            <p className="section-hint">支持上传代码压缩包、文件或代码截图等</p>
                                            
                                            <div className="file-list-grid">
                                                {(release.documents || []).length > 0 ? (
                                                    release.documents.map(doc => (
                                                        <a 
                                                            key={doc.id} 
                                                            href={doc.filepath} 
                                                            target="_blank" 
                                                            className="file-item-card"
                                                        >
                                                            <span className="file-icon">📄</span>
                                                            <span className="file-name">{doc.filename}</span>
                                                        </a>
                                                    ))
                                                ) : (
                                                    <div className="empty-hint small">
                                                        <span>📭</span>
                                                        <p>暂无附件</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 自查清单标签页 */}
                            {activeTab === 'checklist' && (
                                <div className="tab-content">
                                    <div className="card">
                                        <div className="card-header">
                                            <h3 className="card-title">✅ 开发人员自查清单</h3>
                                            <p className="card-subtitle">请在完成相关工作后勾选确认</p>
                                        </div>
                                        
                                        <ChecklistPanel
                                            checklists={rdSelfCheckItems.length > 0 ? rdSelfCheckItems : myChecklists}
                                            stage={release.stage}
                                            userRole={user?.role}
                                            onSubmit={handleChecklistBatchSubmit}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* QA 视图 */}
                    {isQA && !isRD && !isPM && (
                        <div className="qa-workspace">
                            {/* 标签页导航 */}
                            <div className="tab-nav">
                                <button 
                                    className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('info')}
                                >
                                    📋 发版信息
                                </button>
                                {/* 准备阶段才显示这些 tabs */}
                                {release.stage === 'PREPARATION' && (
                                    <>
                                        <button 
                                            className={`tab-btn ${activeTab === 'dev-changes' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('dev-changes')}
                                        >
                                            📝 开发变更内容
                                        </button>
                                        <button 
                                            className={`tab-btn ${activeTab === 'test-report' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('test-report')}
                                        >
                                            🧪 测试报告上传
                                        </button>
                                        <button 
                                            className={`tab-btn ${activeTab === 'checklist' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('checklist')}
                                        >
                                            ✅ 自查清单
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* 发版信息标签页 */}
                            {activeTab === 'info' && (
                                <div className="tab-content">
                                    <div className="card">
                                        <div className="card-header">
                                            <h3 className="card-title">📋 发版摘要</h3>
                                        </div>
                                        <div className="info-grid">
                                            <div className="info-item">
                                                <label>版本号</label>
                                                <span>{release.version}</span>
                                            </div>
                                            <div className="info-item">
                                                <label>计划时间</label>
                                                <span>{release.plannedDate ? new Date(release.plannedDate).toLocaleDateString() : '未设置'}</span>
                                            </div>
                                            <div className="info-item">
                                                <label>当前阶段</label>
                                                <span className="badge badge-primary">{STAGE_LABELS[release.stage]}</span>
                                            </div>
                                            <div className="info-item">
                                                <label>创建人</label>
                                                <span>{release.createdBy?.name}</span>
                                            </div>
                                        </div>
                                        <div className="info-desc">
                                            <label>发版描述</label>
                                            <p>{release.description || '暂无描述'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 开发变更内容标签页 */}
                            {activeTab === 'dev-changes' && (
                                <div className="tab-content">
                                    <div className="card">
                                        <div className="card-header">
                                            <h3 className="card-title">📝 开发人员填报的变更内容</h3>
                                            <span className="card-subtitle">展示所有开发人员已提交的本次发版变更基本信息</span>
                                        </div>
                                        
                                        <div className="dev-changes-grid">
                                            {(release.members || []).filter(m => m.content).length > 0 ? (
                                                (release.members || []).map(member => {
                                                    const content = member.content;
                                                    if (!content) return null;
                                                    return (
                                                        <div key={member.id} className="dev-change-card">
                                                            <div className="dev-change-header">
                                                                <div className="dev-avatar">
                                                                    {(member.user?.name || '?')[0]}
                                                                </div>
                                                                <div className="dev-info">
                                                                    <span className="dev-name">{member.user?.name || '未知'}</span>
                                                                    <span className="dev-phone">{content.devPhone || '-'}</span>
                                                                </div>
                                                                <span className="dev-system-badge">{content.system || '门户'}</span>
                                                            </div>
                                                            <div className="dev-change-content">
                                                                <label>发版涉及内容说明</label>
                                                                <p>{content.contentDesc || '暂无说明'}</p>
                                                            </div>
                                                            <div className="dev-change-stats">
                                                                <div className="stat-item">
                                                                    <span className="stat-icon">🗄️</span>
                                                                    <span className="stat-label">数据库变更</span>
                                                                    <span className={`stat-value ${(content.dbChanges?.length || 0) > 0 ? 'has-change' : ''}`}>
                                                                        {content.dbChanges?.length || 0} 条
                                                                    </span>
                                                                </div>
                                                                <div className="stat-item">
                                                                    <span className="stat-icon">⚙️</span>
                                                                    <span className="stat-label">配置变更</span>
                                                                    <span className={`stat-value ${(content.configChanges?.length || 0) > 0 ? 'has-change' : ''}`}>
                                                                        {content.configChanges?.length || 0} 条
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="empty-hint">
                                                    <span>📭</span>
                                                    <p>暂无开发人员提交变更内容</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 测试报告上传标签页 */}
                            {activeTab === 'test-report' && (
                                <div className="tab-content">
                                    <div className="content-form-wrapper">
                                        {/* 保存按钮 */}
                                        {canEditQaContent && (
                                            <div className="form-actions-top">
                                                <button
                                                    className="btn btn-primary"
                                                    onClick={handleSaveQaContent}
                                                    disabled={actionLoading}
                                                >
                                                    💾 {actionLoading ? '保存中...' : '保存测试信息'}
                                                </button>
                                            </div>
                                        )}

                                        {/* 基本信息 */}
                                        <div className="form-section">
                                            <div className="section-header">
                                                <h4 className="section-title">👤 基本信息</h4>
                                                <span className="required-hint">* 为必填项</span>
                                            </div>
                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label className="form-label label-required">姓名</label>
                                                    <input
                                                        className="form-input"
                                                        disabled={!canEditQaContent}
                                                        value={qaForm.qaName}
                                                        onChange={e => setQaForm({ ...qaForm, qaName: e.target.value })}
                                                        placeholder="请输入姓名"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label label-required">手机号</label>
                                                    <input
                                                        className="form-input"
                                                        disabled={!canEditQaContent}
                                                        value={qaForm.qaPhone}
                                                        onChange={e => setQaForm({ ...qaForm, qaPhone: e.target.value })}
                                                        placeholder="请输入手机号"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label label-required">测试时间</label>
                                                    <input
                                                        type="date"
                                                        className="form-input"
                                                        disabled={!canEditQaContent}
                                                        value={qaForm.qaTestDate}
                                                        onChange={e => setQaForm({ ...qaForm, qaTestDate: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* 附件上传 */}
                                        <div className="form-section">
                                            <div className="section-header">
                                                <h4 className="section-title">📎 附件上传</h4>
                                                <span className="required-hint">* 必须上传测试用例和测试报告</span>
                                            </div>
                                            
                                            <div className="upload-area">
                                                <div className="upload-hint">
                                                    <p>📋 请上传以下文件：</p>
                                                    <ul>
                                                        <li>测试用例文档</li>
                                                        <li>测试报告</li>
                                                    </ul>
                                                </div>
                                                
                                                {canEditQaContent && (
                                                    <div className="upload-btn-wrapper">
                                                        <FileUpload
                                                            releaseId={release.id}
                                                            documents={release.documents || []}
                                                            onUploadSuccess={handleUploadSuccess}
                                                            showList={false}
                                                            label="📤 点击上传文件"
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="uploaded-files">
                                                <h5>已上传的文件</h5>
                                                <div className="file-list-grid">
                                                    {(release.documents || []).length > 0 ? (
                                                        release.documents.map(doc => (
                                                            <a 
                                                                key={doc.id} 
                                                                href={doc.filepath} 
                                                                target="_blank" 
                                                                className="file-item-card"
                                                            >
                                                                <span className="file-icon">📄</span>
                                                                <span className="file-name">{doc.filename}</span>
                                                            </a>
                                                        ))
                                                    ) : (
                                                        <div className="empty-hint small">
                                                            <span>📭</span>
                                                            <p>暂无上传文件</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 自查清单标签页 */}
                            {activeTab === 'checklist' && (
                                <div className="tab-content">
                                    <div className="card">
                                        <div className="card-header">
                                            <h3 className="card-title">✅ 测试人员自查清单</h3>
                                            <p className="card-subtitle">请在完成相关工作后勾选确认</p>
                                        </div>
                                        
                                        {/* 如果有数据库中的检查清单，使用 ChecklistPanel */}
                                        {myChecklists.filter(c => c.category === 'QA_SELF_CHECK' || c.itemKey.startsWith('qa_prep')).length > 0 ? (
                                            <ChecklistPanel
                                                checklists={myChecklists.filter(c => c.category === 'QA_SELF_CHECK' || c.itemKey.startsWith('qa_prep'))}
                                                stage={release.stage}
                                                userRole={user?.role}
                                                onSubmit={handleChecklistBatchSubmit}
                                            />
                                        ) : (
                                            /* 如果没有数据库检查清单，显示静态清单（需要先被添加为成员） */
                                            <div className="static-checklist">
                                                <div className="checklist-notice">
                                                    <span className="notice-icon">ℹ️</span>
                                                    <p>您尚未被添加为此发版的成员，以下为测试人员自查清单预览。请联系项目经理将您添加为成员后即可操作。</p>
                                                </div>
                                                <div className="checklist">
                                                    {PREPARATION_CHECKLIST.filter(item => item.category === 'QA_SELF_CHECK').map((item) => (
                                                        <div key={item.key} className="checklist-item disabled">
                                                            <div className="checklist-checkbox"></div>
                                                            <div className="checklist-content">
                                                                <div className="checklist-label">{item.label}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* PO 产品人员视图 */}
                    {isPO && !isRD && !isPM && !isQA && (
                        <div className="po-workspace">
                            {/* 标签页导航 */}
                            <div className="tab-nav">
                                <button 
                                    className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('info')}
                                >
                                    📋 发版信息
                                </button>
                                {/* 准备阶段才显示这些 tabs */}
                                {release.stage === 'PREPARATION' && (
                                    <>
                                        <button 
                                            className={`tab-btn ${activeTab === 'dev-changes' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('dev-changes')}
                                        >
                                            📝 开发变更内容
                                        </button>
                                        <button 
                                            className={`tab-btn ${activeTab === 'qa-status' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('qa-status')}
                                        >
                                            🧪 测试完成情况
                                        </button>
                                        <button 
                                            className={`tab-btn ${activeTab === 'acceptance' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('acceptance')}
                                        >
                                            ✅ 功能验收
                                        </button>
                                        <button 
                                            className={`tab-btn ${activeTab === 'checklist' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('checklist')}
                                        >
                                            📋 自查清单
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* 发版信息标签页 */}
                            {activeTab === 'info' && (
                                <div className="tab-content">
                                    <div className="card">
                                        <div className="card-header">
                                            <h3 className="card-title">📋 发版摘要</h3>
                                        </div>
                                        <div className="info-grid">
                                            <div className="info-item">
                                                <label>版本号</label>
                                                <span>{release.version}</span>
                                            </div>
                                            <div className="info-item">
                                                <label>计划时间</label>
                                                <span>{release.plannedDate ? new Date(release.plannedDate).toLocaleDateString() : '未设置'}</span>
                                            </div>
                                            <div className="info-item">
                                                <label>当前阶段</label>
                                                <span className="badge badge-primary">{STAGE_LABELS[release.stage]}</span>
                                            </div>
                                            <div className="info-item">
                                                <label>创建人</label>
                                                <span>{release.createdBy?.name}</span>
                                            </div>
                                        </div>
                                        <div className="info-desc">
                                            <label>发版描述</label>
                                            <p>{release.description || '暂无描述'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 开发变更内容标签页 */}
                            {activeTab === 'dev-changes' && (
                                <div className="tab-content">
                                    <div className="card">
                                        <div className="card-header">
                                            <h3 className="card-title">📝 开发人员填报的变更内容</h3>
                                            <span className="card-subtitle">展示所有开发人员已提交的本次发版变更基本信息</span>
                                        </div>
                                        
                                        <div className="dev-changes-grid">
                                            {(release.members || []).filter(m => m.content).length > 0 ? (
                                                (release.members || []).map(member => {
                                                    const content = member.content;
                                                    if (!content) return null;
                                                    return (
                                                        <div key={member.id} className="dev-change-card">
                                                            <div className="dev-change-header">
                                                                <div className="dev-avatar">
                                                                    {(member.user?.name || '?')[0]}
                                                                </div>
                                                                <div className="dev-info">
                                                                    <span className="dev-name">{member.user?.name || '未知'}</span>
                                                                    <span className="dev-phone">{content.devPhone || '-'}</span>
                                                                </div>
                                                                <span className="dev-system-badge">{content.system || '门户'}</span>
                                                            </div>
                                                            <div className="dev-change-content">
                                                                <label>发版涉及内容说明</label>
                                                                <p>{content.contentDesc || '暂无说明'}</p>
                                                            </div>
                                                            <div className="dev-change-stats">
                                                                <div className="stat-item">
                                                                    <span className="stat-icon">🗄️</span>
                                                                    <span className="stat-label">数据库变更</span>
                                                                    <span className={`stat-value ${(content.dbChanges?.length || 0) > 0 ? 'has-change' : ''}`}>
                                                                        {content.dbChanges?.length || 0} 条
                                                                    </span>
                                                                </div>
                                                                <div className="stat-item">
                                                                    <span className="stat-icon">⚙️</span>
                                                                    <span className="stat-label">配置变更</span>
                                                                    <span className={`stat-value ${(content.configChanges?.length || 0) > 0 ? 'has-change' : ''}`}>
                                                                        {content.configChanges?.length || 0} 条
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="empty-hint">
                                                    <span>📭</span>
                                                    <p>暂无开发人员提交变更内容</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 测试完成情况标签页 */}
                            {activeTab === 'qa-status' && (
                                <div className="tab-content">
                                    <div className="card">
                                        <div className="card-header">
                                            <h3 className="card-title">🧪 测试人员完成情况</h3>
                                            <span className="card-subtitle">查看测试人员的测试进度和测试报告</span>
                                        </div>
                                        
                                        <div className="qa-status-list">
                                            {(release.members || []).filter(m => {
                                                const memberRoles = (m.user?.role || '').split(',');
                                                return memberRoles.includes('QA');
                                            }).length > 0 ? (
                                                (release.members || []).filter(m => {
                                                    const memberRoles = (m.user?.role || '').split(',');
                                                    return memberRoles.includes('QA');
                                                }).map(member => {
                                                    const content = member.content;
                                                    const qaChecklists = checklists.filter(c => 
                                                        c.userId === member.userId && 
                                                        c.stage === 'PREPARATION' &&
                                                        c.itemKey.startsWith('qa_prep')
                                                    );
                                                    const completedCount = qaChecklists.filter(c => c.checked).length;
                                                    const totalCount = qaChecklists.length;
                                                    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                                                    
                                                    return (
                                                        <div key={member.id} className="qa-status-card">
                                                            <div className="qa-status-header">
                                                                <div className="qa-avatar">
                                                                    {(member.user?.name || '?')[0]}
                                                                </div>
                                                                <div className="qa-info">
                                                                    <span className="qa-name">{member.user?.name || '未知'}</span>
                                                                    <span className="qa-phone">{content?.qaPhone || member.user?.phone || '-'}</span>
                                                                </div>
                                                                <div className={`qa-progress-badge ${progress === 100 ? 'complete' : ''}`}>
                                                                    {progress}% 完成
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="qa-status-info">
                                                                <div className="qa-info-row">
                                                                    <span className="qa-info-label">测试时间</span>
                                                                    <span className="qa-info-value">
                                                                        {content?.qaTestDate ? new Date(content.qaTestDate).toLocaleDateString() : '未填写'}
                                                                    </span>
                                                                </div>
                                                                <div className="qa-info-row">
                                                                    <span className="qa-info-label">检查项完成</span>
                                                                    <span className="qa-info-value">{completedCount} / {totalCount}</span>
                                                                </div>
                                                            </div>

                                                            <div className="qa-progress-bar">
                                                                <div className="qa-progress-fill" style={{ width: `${progress}%` }}></div>
                                                            </div>

                                                            {/* 测试报告链接 */}
                                                            <div className="qa-reports">
                                                                <span className="qa-reports-label">📄 测试报告：</span>
                                                                {(release.documents || []).length > 0 ? (
                                                                    <div className="qa-reports-list">
                                                                        {release.documents.slice(0, 3).map(doc => (
                                                                            <a 
                                                                                key={doc.id} 
                                                                                href={doc.filepath} 
                                                                                target="_blank" 
                                                                                className="qa-report-link"
                                                                            >
                                                                                {doc.filename}
                                                                            </a>
                                                                        ))}
                                                                        {release.documents.length > 3 && (
                                                                            <span className="qa-reports-more">+{release.documents.length - 3} 更多</span>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <span className="qa-no-report">暂无上传</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="empty-hint">
                                                    <span>📭</span>
                                                    <p>暂无测试人员参与此发版</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 功能验收标签页 */}
                            {activeTab === 'acceptance' && (
                                <div className="tab-content">
                                    <div className="content-form-wrapper">
                                        {/* 保存按钮 */}
                                        {canEditPoContent && (
                                            <div className="form-actions-top">
                                                <button
                                                    className="btn btn-primary"
                                                    onClick={handleSavePoContent}
                                                    disabled={actionLoading}
                                                >
                                                    💾 {actionLoading ? '保存中...' : '保存验收信息'}
                                                </button>
                                            </div>
                                        )}

                                        {/* 基本信息 */}
                                        <div className="form-section">
                                            <div className="section-header">
                                                <h4 className="section-title">👤 基本信息</h4>
                                                <span className="required-hint">* 为必填项</span>
                                            </div>
                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label className="form-label label-required">姓名</label>
                                                    <input
                                                        className="form-input"
                                                        disabled={!canEditPoContent}
                                                        value={poForm.poName}
                                                        onChange={e => setPoForm({ ...poForm, poName: e.target.value })}
                                                        placeholder="请输入姓名"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label label-required">手机号</label>
                                                    <input
                                                        className="form-input"
                                                        disabled={!canEditPoContent}
                                                        value={poForm.poPhone}
                                                        onChange={e => setPoForm({ ...poForm, poPhone: e.target.value })}
                                                        placeholder="请输入手机号"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label label-required">验收时间</label>
                                                    <input
                                                        type="date"
                                                        className="form-input"
                                                        disabled={!canEditPoContent}
                                                        value={poForm.poAcceptDate}
                                                        onChange={e => setPoForm({ ...poForm, poAcceptDate: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* 验收说明 */}
                                        <div className="form-section">
                                            <div className="section-header">
                                                <h4 className="section-title">📋 验收要点</h4>
                                            </div>
                                            <div className="acceptance-tips">
                                                <p>产品验收重点关注以下方面：</p>
                                                <ul>
                                                    <li>核对当次发版需求范围是否完整</li>
                                                    <li>核对核心业务流程是否正常运行</li>
                                                    <li>确认测试报告中记录的问题是否影响本次发版</li>
                                                    <li>核对列表、详情页的数字、状态、文案显示</li>
                                                    <li>检查有无错别字、按钮错位、报错信息是否友好</li>
                                                    <li>检查移动端相关功能是否正常</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 自查清单标签页 */}
                            {activeTab === 'checklist' && (
                                <div className="tab-content">
                                    <div className="card">
                                        <div className="card-header">
                                            <h3 className="card-title">✅ 产品人员自查清单</h3>
                                            <p className="card-subtitle">请在完成相关验收工作后勾选确认</p>
                                        </div>
                                        
                                        {/* 如果有数据库中的检查清单，使用 ChecklistPanel */}
                                        {myChecklists.filter(c => c.category === 'PO_SELF_CHECK' || c.itemKey.startsWith('po_prep')).length > 0 ? (
                                            <ChecklistPanel
                                                checklists={myChecklists.filter(c => c.category === 'PO_SELF_CHECK' || c.itemKey.startsWith('po_prep'))}
                                                stage={release.stage}
                                                userRole={user?.role}
                                                onSubmit={handleChecklistBatchSubmit}
                                            />
                                        ) : (
                                            /* 如果没有数据库检查清单，显示静态清单（需要先被添加为成员） */
                                            <div className="static-checklist">
                                                <div className="checklist-notice">
                                                    <span className="notice-icon">ℹ️</span>
                                                    <p>您尚未被添加为此发版的成员，以下为产品人员自查清单预览。请联系项目经理将您添加为成员后即可操作。</p>
                                                </div>
                                                <div className="checklist">
                                                    {PREPARATION_CHECKLIST.filter(item => item.category === 'PO_SELF_CHECK').map((item) => (
                                                        <div key={item.key} className="checklist-item disabled">
                                                            <div className="checklist-checkbox"></div>
                                                            <div className="checklist-content">
                                                                <div className="checklist-label">{item.label}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* DBA 数据库管理员视图 */}
                    {isDBA && !isRD && !isPM && !isQA && !isPO && (
                        <div className="dba-workspace">
                            {/* 标签页导航 */}
                            <div className="tab-nav">
                                <button 
                                    className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('info')}
                                >
                                    📋 发版信息
                                </button>
                                {/* 准备阶段才显示这些 tabs */}
                                {release.stage === 'PREPARATION' && (
                                    <>
                                        <button 
                                            className={`tab-btn ${activeTab === 'db-changes' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('db-changes')}
                                        >
                                            🗄️ 数据库变更内容
                                        </button>
                                        <button 
                                            className={`tab-btn ${activeTab === 'review' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('review')}
                                        >
                                            📝 审核信息
                                        </button>
                                        <button 
                                            className={`tab-btn ${activeTab === 'checklist' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('checklist')}
                                        >
                                            ✅ 自查清单
                                        </button>
                                    </>
                                )}
                                {/* 实施阶段显示执行结果填报 */}
                                {release.stage === 'IMPLEMENTATION' && (
                                    <button 
                                        className={`tab-btn ${activeTab === 'dba-exec' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('dba-exec')}
                                    >
                                        📝 执行结果填报
                                    </button>
                                )}
                            </div>

                            {/* 发版信息标签页 */}
                            {activeTab === 'info' && (
                                <div className="tab-content">
                                    <div className="card">
                                        <div className="card-header">
                                            <h3 className="card-title">📋 发版摘要</h3>
                                        </div>
                                        <div className="info-grid">
                                            <div className="info-item">
                                                <label>版本号</label>
                                                <span>{release.version}</span>
                                            </div>
                                            <div className="info-item">
                                                <label>计划时间</label>
                                                <span>{release.plannedDate ? new Date(release.plannedDate).toLocaleDateString() : '未设置'}</span>
                                            </div>
                                            <div className="info-item">
                                                <label>当前阶段</label>
                                                <span className="badge badge-primary">{STAGE_LABELS[release.stage]}</span>
                                            </div>
                                            <div className="info-item">
                                                <label>创建人</label>
                                                <span>{release.createdBy?.name}</span>
                                            </div>
                                        </div>
                                        <div className="info-desc">
                                            <label>发版描述</label>
                                            <p>{release.description || '暂无描述'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 数据库变更内容标签页 */}
                            {activeTab === 'db-changes' && (
                                <div className="tab-content">
                                    <div className="card">
                                        <div className="card-header">
                                            <h3 className="card-title">🗄️ 开发人员提报的数据库变更</h3>
                                            <span className="card-subtitle">审核所有开发人员提交的数据库变更脚本</span>
                                        </div>
                                        
                                        <div className="db-changes-list">
                                            {(release.members || []).filter(m => m.content?.dbChanges?.length > 0).length > 0 ? (
                                                (release.members || []).map(member => {
                                                    const content = member.content;
                                                    if (!content?.dbChanges?.length) return null;
                                                    return (
                                                        <div key={member.id} className="db-member-section">
                                                            <div className="db-member-header">
                                                                <div className="db-member-avatar">
                                                                    {(member.user?.name || '?')[0]}
                                                                </div>
                                                                <div className="db-member-info">
                                                                    <span className="db-member-name">{member.user?.name || '未知'}</span>
                                                                    <span className="db-member-phone">{content.devPhone || '-'}</span>
                                                                </div>
                                                                <span className="db-member-system">{content.system || '门户'}</span>
                                                                <span className="db-change-count">{content.dbChanges.length} 条变更</span>
                                                            </div>
                                                            
                                                            <div className="db-changes-detail">
                                                                {content.dbChanges.map((db, idx) => (
                                                                    <div key={idx} className="db-change-item">
                                                                        <div className="db-change-item-header">
                                                                            <span className="db-change-index">变更 #{idx + 1}</span>
                                                                            <span className="db-change-type">{db.changeType}</span>
                                                                            {db.affectsOnline && (
                                                                                <span className="db-affects-online">⚠️ 影响线上</span>
                                                                            )}
                                                                        </div>
                                                                        
                                                                        <div className="db-change-info-grid">
                                                                            <div className="db-info-row">
                                                                                <label>变更原因</label>
                                                                                <p>{db.reason || '-'}</p>
                                                                            </div>
                                                                            <div className="db-info-row">
                                                                                <label>数据库名</label>
                                                                                <p>{db.dbName || '-'}</p>
                                                                            </div>
                                                                            <div className="db-info-row">
                                                                                <label>表名</label>
                                                                                <p>{db.tableName || '-'}</p>
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        <div className="db-sql-section">
                                                                            <label>SQL 语句</label>
                                                                            <pre className="db-sql-code">{db.sql || '-- 无 SQL'}</pre>
                                                                        </div>
                                                                        
                                                                        <div className="db-impact-section">
                                                                            <label>可能带来的影响</label>
                                                                            <p>{db.impact || '无'}</p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="empty-hint">
                                                    <span>📭</span>
                                                    <p>暂无开发人员提交数据库变更</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 审核信息标签页 */}
                            {activeTab === 'review' && (
                                <div className="tab-content">
                                    <div className="content-form-wrapper">
                                        {/* 保存按钮 */}
                                        {canEditDbaContent && (
                                            <div className="form-actions-top">
                                                <button
                                                    className="btn btn-primary"
                                                    onClick={handleSaveDbaContent}
                                                    disabled={actionLoading}
                                                >
                                                    💾 {actionLoading ? '保存中...' : '保存审核信息'}
                                                </button>
                                            </div>
                                        )}

                                        {/* 基本信息 */}
                                        <div className="form-section">
                                            <div className="section-header">
                                                <h4 className="section-title">👤 基本信息</h4>
                                                <span className="required-hint">* 为必填项</span>
                                            </div>
                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label className="form-label label-required">姓名</label>
                                                    <input
                                                        className="form-input"
                                                        disabled={!canEditDbaContent}
                                                        value={dbaForm.dbaName}
                                                        onChange={e => setDbaForm({ ...dbaForm, dbaName: e.target.value })}
                                                        placeholder="请输入姓名"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label label-required">手机号</label>
                                                    <input
                                                        className="form-input"
                                                        disabled={!canEditDbaContent}
                                                        value={dbaForm.dbaPhone}
                                                        onChange={e => setDbaForm({ ...dbaForm, dbaPhone: e.target.value })}
                                                        placeholder="请输入手机号"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label label-required">审核时间</label>
                                                    <input
                                                        type="date"
                                                        className="form-input"
                                                        disabled={!canEditDbaContent}
                                                        value={dbaForm.dbaReviewDate}
                                                        onChange={e => setDbaForm({ ...dbaForm, dbaReviewDate: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* 审核要点 */}
                                        <div className="form-section">
                                            <div className="section-header">
                                                <h4 className="section-title">📋 审核要点</h4>
                                            </div>
                                            <div className="review-tips">
                                                <p>DBA 审核重点关注以下方面：</p>
                                                <ul>
                                                    <li>检查 SQL 语句语法是否正确</li>
                                                    <li>评估变更对数据库性能的影响</li>
                                                    <li>确认变更是否会影响线上服务</li>
                                                    <li>验证回滚方案是否可行</li>
                                                    <li>确认执行时间是否合理</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* DBA 执行结果填报标签页（实施阶段） */}
                            {activeTab === 'dba-exec' && (
                                <div className="tab-content">
                                    <div className="content-form-wrapper">
                                        {/* 保存按钮 */}
                                        <div className="form-actions-top">
                                            <button
                                                className="btn btn-primary"
                                                onClick={handleSaveDbaExec}
                                                disabled={actionLoading}
                                            >
                                                💾 {actionLoading ? '保存中...' : '保存执行结果'}
                                            </button>
                                        </div>

                                        {/* 执行人信息 */}
                                        <div className="form-section">
                                            <div className="section-header">
                                                <h4 className="section-title">👤 执行人信息</h4>
                                                <span className="required-hint">* 为必填项</span>
                                            </div>
                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label className="form-label label-required">执行人姓名</label>
                                                    <input
                                                        className="form-input"
                                                        value={dbaExecForm.dbaExecName}
                                                        onChange={e => setDbaExecForm({ ...dbaExecForm, dbaExecName: e.target.value })}
                                                        placeholder="实际执行的DBA姓名"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">执行人手机</label>
                                                    <input
                                                        className="form-input"
                                                        value={dbaExecForm.dbaExecPhone}
                                                        onChange={e => setDbaExecForm({ ...dbaExecForm, dbaExecPhone: e.target.value })}
                                                        placeholder="执行人联系电话"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">实际执行时间</label>
                                                    <input
                                                        type="datetime-local"
                                                        className="form-input"
                                                        value={dbaExecForm.dbaExecTime}
                                                        onChange={e => setDbaExecForm({ ...dbaExecForm, dbaExecTime: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* 执行结果 */}
                                        <div className="form-section">
                                            <div className="section-header">
                                                <h4 className="section-title">📝 执行结果</h4>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label label-required">执行结果</label>
                                                <textarea
                                                    className="form-textarea"
                                                    rows={5}
                                                    value={dbaExecForm.dbaExecResult}
                                                    onChange={e => setDbaExecForm({ ...dbaExecForm, dbaExecResult: e.target.value })}
                                                    placeholder="记录最终执行结果，执行输出的关键信息或日志摘要。失败时必须填写原因和定位"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">回滚情况</label>
                                                <textarea
                                                    className="form-textarea"
                                                    rows={3}
                                                    value={dbaExecForm.dbaRollbackInfo}
                                                    onChange={e => setDbaExecForm({ ...dbaExecForm, dbaRollbackInfo: e.target.value })}
                                                    placeholder="如执行失败或出现问题，记录是否执行了回滚及结果"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">备注</label>
                                                <textarea
                                                    className="form-textarea"
                                                    rows={2}
                                                    value={dbaExecForm.dbaExecRemark}
                                                    onChange={e => setDbaExecForm({ ...dbaExecForm, dbaExecRemark: e.target.value })}
                                                    placeholder="其他需要补充说明的内容"
                                                />
                                            </div>
                                        </div>

                                        {/* 执行提示 */}
                                        <div className="form-section">
                                            <div className="section-header">
                                                <h4 className="section-title">💡 执行提示</h4>
                                            </div>
                                            <div className="review-tips">
                                                <p>请在执行数据库变更后填写以下信息：</p>
                                                <ul>
                                                    <li>记录实际执行时间，便于追溯</li>
                                                    <li>详细记录执行结果和关键日志</li>
                                                    <li>如有异常，务必记录回滚情况</li>
                                                    <li>保存后项目经理可实时查看进度</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 自查清单标签页 */}
                            {activeTab === 'checklist' && (
                                <div className="tab-content">
                                    <div className="card">
                                        <div className="card-header">
                                            <h3 className="card-title">✅ DBA 自查清单</h3>
                                            <p className="card-subtitle">请在完成相关审核工作后勾选确认</p>
                                        </div>
                                        
                                        {/* 如果有数据库中的检查清单，使用 ChecklistPanel */}
                                        {myChecklists.filter(c => c.category === 'DBA_SELF_CHECK' || c.itemKey.startsWith('dba_prep')).length > 0 ? (
                                            <ChecklistPanel
                                                checklists={myChecklists.filter(c => c.category === 'DBA_SELF_CHECK' || c.itemKey.startsWith('dba_prep'))}
                                                stage={release.stage}
                                                userRole={user?.role}
                                                onSubmit={handleChecklistBatchSubmit}
                                            />
                                        ) : (
                                            /* 如果没有数据库检查清单，显示静态清单（需要先被添加为成员） */
                                            <div className="static-checklist">
                                                <div className="checklist-notice">
                                                    <span className="notice-icon">ℹ️</span>
                                                    <p>您尚未被添加为此发版的成员，以下为 DBA 自查清单预览。请联系项目经理将您添加为成员后即可操作。</p>
                                                </div>
                                                <div className="checklist">
                                                    {PREPARATION_CHECKLIST.filter(item => item.category === 'DBA_SELF_CHECK').map((item) => (
                                                        <div key={item.key} className="checklist-item disabled">
                                                            <div className="checklist-checkbox"></div>
                                                            <div className="checklist-content">
                                                                <div className="checklist-label">{item.label}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* OP 运维人员视图 */}
                    {isOP && !isRD && !isPM && !isQA && !isPO && !isDBA && (
                        <div className="op-workspace">
                            {/* 标签页导航 */}
                            <div className="tab-nav">
                                <button 
                                    className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('info')}
                                >
                                    📋 发版信息
                                </button>
                                {/* 准备阶段才显示这些 tabs */}
                                {release.stage === 'PREPARATION' && (
                                    <>
                                        <button 
                                            className={`tab-btn ${activeTab === 'backup' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('backup')}
                                        >
                                            💾 备份与回滚
                                        </button>
                                        <button 
                                            className={`tab-btn ${activeTab === 'checklist' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('checklist')}
                                        >
                                            ✅ 自查清单
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* 发版信息标签页 */}
                            {activeTab === 'info' && (
                                <div className="tab-content">
                                    <div className="card">
                                        <div className="card-header">
                                            <h3 className="card-title">📋 发版摘要</h3>
                                        </div>
                                        <div className="info-grid">
                                            <div className="info-item">
                                                <label>版本号</label>
                                                <span>{release.version}</span>
                                            </div>
                                            <div className="info-item">
                                                <label>计划时间</label>
                                                <span>{release.plannedDate ? new Date(release.plannedDate).toLocaleDateString() : '未设置'}</span>
                                            </div>
                                            <div className="info-item">
                                                <label>当前阶段</label>
                                                <span className="badge badge-primary">{STAGE_LABELS[release.stage]}</span>
                                            </div>
                                            <div className="info-item">
                                                <label>创建人</label>
                                                <span>{release.createdBy?.name}</span>
                                            </div>
                                        </div>
                                        <div className="info-desc">
                                            <label>发版描述</label>
                                            <p>{release.description || '暂无描述'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 备份与回滚标签页 */}
                            {activeTab === 'backup' && (
                                <div className="tab-content">
                                    <div className="content-form-wrapper">
                                        {/* 保存按钮 */}
                                        {canEditOpContent && (
                                            <div className="form-actions-top">
                                                <button
                                                    className="btn btn-primary"
                                                    onClick={handleSaveOpContent}
                                                    disabled={actionLoading}
                                                >
                                                    💾 {actionLoading ? '保存中...' : '保存运维信息'}
                                                </button>
                                            </div>
                                        )}

                                        {/* 基本信息 */}
                                        <div className="form-section">
                                            <div className="section-header">
                                                <h4 className="section-title">👤 基本信息</h4>
                                                <span className="required-hint">* 为必填项</span>
                                            </div>
                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label className="form-label label-required">姓名</label>
                                                    <input
                                                        className="form-input"
                                                        disabled={!canEditOpContent}
                                                        value={opForm.opName}
                                                        onChange={e => setOpForm({ ...opForm, opName: e.target.value })}
                                                        placeholder="请输入姓名"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label label-required">手机号</label>
                                                    <input
                                                        className="form-input"
                                                        disabled={!canEditOpContent}
                                                        value={opForm.opPhone}
                                                        onChange={e => setOpForm({ ...opForm, opPhone: e.target.value })}
                                                        placeholder="请输入手机号"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label label-required">备份时间</label>
                                                    <input
                                                        type="date"
                                                        className="form-input"
                                                        disabled={!canEditOpContent}
                                                        value={opForm.opBackupDate}
                                                        onChange={e => setOpForm({ ...opForm, opBackupDate: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* 回滚方案 */}
                                        <div className="form-section">
                                            <div className="section-header">
                                                <h4 className="section-title">🔄 回滚方案</h4>
                                                <span className="required-hint">* 为必填项</span>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label label-required">回滚具体方案</label>
                                                <textarea
                                                    className="form-textarea"
                                                    rows={6}
                                                    disabled={!canEditOpContent}
                                                    value={opForm.rollbackPlan}
                                                    onChange={e => setOpForm({ ...opForm, rollbackPlan: e.target.value })}
                                                    placeholder="请详细描述回滚方案，包括：&#10;1. 回滚触发条件&#10;2. 回滚步骤&#10;3. 回滚后验证方法&#10;4. 预计回滚时间"
                                                />
                                            </div>
                                            
                                            <div className="op-tips">
                                                <p>运维工作重点：</p>
                                                <ul>
                                                    <li>确保数据库、代码、配置文件已完成备份</li>
                                                    <li>准备好回滚脚本和操作步骤</li>
                                                    <li>确认回滚方案已与项目经理沟通确认</li>
                                                    <li>发版期间保持在线，随时准备执行回滚</li>
                                                </ul>
                                            </div>
                                        </div>

                                        {/* 备份截图上传 */}
                                        <div className="form-section">
                                            <div className="section-header">
                                                <h4 className="section-title">📸 备份截图</h4>
                                                <span className="section-subtitle">请上传备份完成的截图作为凭证</span>
                                            </div>
                                            <FileUpload
                                                releaseId={release.id}
                                                documents={release.documents?.filter(doc => doc.type === 'BACKUP_SCREENSHOT') || []}
                                                onUploadSuccess={handleUploadSuccess}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 自查清单标签页 */}
                            {activeTab === 'checklist' && (
                                <div className="tab-content">
                                    <div className="card">
                                        <div className="card-header">
                                            <h3 className="card-title">✅ 运维人员自查清单</h3>
                                            <p className="card-subtitle">请在完成相关工作后勾选确认</p>
                                        </div>
                                        
                                        {myChecklists.filter(c => c.category === 'OP_SELF_CHECK' || c.itemKey.startsWith('op_prep')).length > 0 ? (
                                            <ChecklistPanel
                                                checklists={myChecklists.filter(c => c.category === 'OP_SELF_CHECK' || c.itemKey.startsWith('op_prep'))}
                                                stage={release.stage}
                                                userRole={user?.role}
                                                onSubmit={handleChecklistBatchSubmit}
                                            />
                                        ) : (
                                            <div className="static-checklist">
                                                <div className="checklist-notice">
                                                    <span className="notice-icon">ℹ️</span>
                                                    <p>您尚未被添加为此发版的成员，以下为运维人员自查清单预览。请联系项目经理将您添加为成员后即可操作。</p>
                                                </div>
                                                <div className="checklist">
                                                    {PREPARATION_CHECKLIST.filter(item => item.category === 'OP_SELF_CHECK').map((item) => (
                                                        <div key={item.key} className="checklist-item disabled">
                                                            <div className="checklist-checkbox"></div>
                                                            <div className="checklist-content">
                                                                <div className="checklist-label">{item.label}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 其他角色视图 */}
                    {!isRD && !isPM && !isQA && !isPO && !isDBA && !isOP && (
                        <div className="grid grid-2">
                            <div className="column-stack">
                                <div className="card">
                                    <div className="card-header">
                                        <h3 className="card-title">📋 发版信息</h3>
                                    </div>
                                    <div className="info-display">
                                        <div className="info-row">
                                            <label>版本号</label>
                                            <p>{release.version}</p>
                                        </div>
                                        <div className="info-row">
                                            <label>发版描述</label>
                                            <p>{release.description}</p>
                                        </div>
                                        <div className="info-row">
                                            <label>计划时间</label>
                                            <p>{release.plannedDate ? new Date(release.plannedDate).toLocaleDateString() : '未设置'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="column-stack">
                                <ChecklistPanel
                                    checklists={myChecklists}
                                    stage={release.stage}
                                    userRole={user?.role}
                                    onSubmit={handleChecklistBatchSubmit}
                                />
                            </div>
                        </div>
                    )}

                    <ConfirmModal
                        isOpen={confirmConfig.isOpen}
                        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                        {...confirmConfig}
                    />
                </div>
            </main>

            <style jsx>{`
                .release-detail-page {
                    padding: 32px 24px;
                }

                /* 阶段卡片 */
                .stage-card {
                    margin-bottom: 24px;
                }
                .stage-actions {
                    display: flex;
                    justify-content: center;
                    gap: 16px;
                    padding-top: 20px;
                    border-top: 1px solid var(--border-color);
                    margin-top: 16px;
                }

                /* 标签页导航 */
                .tab-nav {
                    display: flex;
                    gap: 4px;
                    background: var(--bg-tertiary);
                    padding: 4px;
                    border-radius: var(--radius-lg);
                    margin-bottom: 24px;
                }
                .tab-btn {
                    flex: 1;
                    padding: 12px 20px;
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--text-secondary);
                    background: transparent;
                    border: none;
                    border-radius: var(--radius-md);
                    cursor: pointer;
                    transition: all var(--transition-fast);
                }
                .tab-btn:hover {
                    color: var(--text-primary);
                    background: var(--bg-secondary);
                }
                .tab-btn.active {
                    color: var(--text-primary);
                    background: var(--primary);
                    box-shadow: var(--shadow-md);
                }

                /* 标签页内容 */
                .tab-content {
                    animation: fadeIn 0.3s ease;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                /* 信息网格 */
                .info-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 16px;
                    margin-bottom: 20px;
                }
                .info-item {
                    padding: 16px;
                    background: var(--bg-tertiary);
                    border-radius: var(--radius-md);
                }
                .info-item label {
                    display: block;
                    font-size: 12px;
                    color: var(--text-muted);
                    margin-bottom: 6px;
                }
                .info-item span {
                    font-size: 15px;
                    font-weight: 600;
                    color: var(--text-primary);
                }
                .info-desc {
                    padding: 16px;
                    background: var(--bg-tertiary);
                    border-radius: var(--radius-md);
                }
                .info-desc label {
                    display: block;
                    font-size: 12px;
                    color: var(--text-muted);
                    margin-bottom: 8px;
                }
                .info-desc p {
                    font-size: 14px;
                    line-height: 1.6;
                }

                /* 表单区块 */
                .content-form-wrapper {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }
                .form-actions-top {
                    display: flex;
                    justify-content: flex-end;
                    padding: 16px 20px;
                    background: var(--bg-card);
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--border-light);
                    position: sticky;
                    top: 80px;
                    z-index: 10;
                }
                .form-section {
                    background: var(--bg-card);
                    border: 1px solid var(--border-light);
                    border-radius: var(--radius-lg);
                    padding: 24px;
                }
                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 16px;
                    border-bottom: 1px solid var(--border-color);
                }
                .section-title {
                    font-size: 16px;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin: 0;
                }
                .required-hint {
                    font-size: 12px;
                    color: var(--text-muted);
                }
                .section-hint {
                    font-size: 13px;
                    color: var(--text-muted);
                    margin-bottom: 16px;
                }

                /* 表单行 */
                .form-row {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 16px;
                }
                .form-row-4 {
                    grid-template-columns: repeat(4, 1fr);
                }
                @media (max-width: 1024px) {
                    .form-row, .form-row-4 {
                        grid-template-columns: repeat(2, 1fr);
                    }
                    .info-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }
                @media (max-width: 640px) {
                    .form-row, .form-row-4 {
                        grid-template-columns: 1fr;
                    }
                    .info-grid {
                        grid-template-columns: 1fr;
                    }
                }

                /* 开关组件 */
                .toggle-group {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .toggle-label {
                    font-size: 13px;
                    color: var(--text-secondary);
                }
                .toggle-switch {
                    position: relative;
                    width: 44px;
                    height: 24px;
                }
                .toggle-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                .toggle-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: var(--bg-tertiary);
                    border: 1px solid var(--border-color);
                    border-radius: 24px;
                    transition: 0.3s;
                }
                .toggle-slider:before {
                    position: absolute;
                    content: "";
                    height: 18px;
                    width: 18px;
                    left: 2px;
                    bottom: 2px;
                    background-color: var(--text-muted);
                    border-radius: 50%;
                    transition: 0.3s;
                }
                .toggle-switch input:checked + .toggle-slider {
                    background-color: var(--primary);
                    border-color: var(--primary);
                }
                .toggle-switch input:checked + .toggle-slider:before {
                    transform: translateX(20px);
                    background-color: white;
                }
                .toggle-status {
                    font-size: 13px;
                    font-weight: 600;
                    padding: 2px 8px;
                    border-radius: 4px;
                }
                .toggle-status.yes {
                    color: var(--success);
                    background: rgba(16, 185, 129, 0.15);
                }
                .toggle-status.no {
                    color: var(--text-muted);
                    background: var(--bg-tertiary);
                }

                /* 变更卡片 */
                .change-list {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .change-card {
                    padding: 20px;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                }
                .change-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                }
                .change-index {
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--primary-light);
                    padding: 4px 10px;
                    background: rgba(99, 102, 241, 0.15);
                    border-radius: var(--radius-sm);
                }
                .btn-icon-danger {
                    background: none;
                    border: none;
                    font-size: 16px;
                    cursor: pointer;
                    padding: 4px 8px;
                    border-radius: var(--radius-sm);
                    transition: all var(--transition-fast);
                }
                .btn-icon-danger:hover {
                    background: rgba(239, 68, 68, 0.15);
                }

                /* 代码文本框 */
                .code-textarea {
                    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                    font-size: 13px;
                    background: var(--bg-primary);
                }

                /* 复选框组 */
                .checkbox-group {
                    display: flex;
                    align-items: flex-end;
                    padding-bottom: 12px;
                }
                .checkbox-label {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                }
                .checkbox-label input[type="checkbox"] {
                    width: 18px;
                    height: 18px;
                    accent-color: var(--primary);
                }
                .checkbox-text {
                    font-size: 13px;
                    color: var(--text-secondary);
                }

                /* 虚线按钮 */
                .btn-dashed {
                    width: 100%;
                    padding: 14px;
                    background: transparent;
                    border: 2px dashed var(--border-color);
                    border-radius: var(--radius-md);
                    color: var(--text-secondary);
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all var(--transition-fast);
                }
                .btn-dashed:hover {
                    border-color: var(--primary);
                    color: var(--primary);
                    background: rgba(99, 102, 241, 0.05);
                }

                /* 空状态提示 */
                .empty-hint {
                    text-align: center;
                    padding: 32px 20px;
                    color: var(--text-muted);
                }
                .empty-hint span {
                    font-size: 32px;
                    display: block;
                    margin-bottom: 8px;
                    opacity: 0.5;
                }
                .empty-hint p {
                    font-size: 14px;
                    margin: 0;
                }
                .empty-hint.small {
                    padding: 20px;
                }
                .empty-hint.small span {
                    font-size: 24px;
                }

                /* 文件列表 */
                .file-list-grid {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                }
                .file-item-card {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 14px;
                    background: var(--bg-tertiary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    text-decoration: none;
                    color: var(--text-primary);
                    font-size: 13px;
                    transition: all var(--transition-fast);
                }
                .file-item-card:hover {
                    border-color: var(--primary);
                    background: rgba(99, 102, 241, 0.1);
                }
                .file-icon {
                    font-size: 16px;
                }
                .file-name {
                    max-width: 200px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                /* 列布局 */
                .column-stack {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }

                /* 成员网格 */
                .member-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 12px;
                }
                .member-card {
                    padding: 14px;
                    background: var(--bg-tertiary);
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border-color);
                }
                .member-info {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 10px;
                }
                .member-name {
                    font-weight: 600;
                    font-size: 13px;
                }
                .member-progress {
                    font-size: 12px;
                    color: var(--primary);
                }
                .member-progress.complete {
                    color: var(--success);
                }
                .progress-bar {
                    height: 4px;
                    background: var(--border-color);
                    border-radius: 100px;
                    overflow: hidden;
                }
                .progress-fill {
                    height: 100%;
                    background: var(--primary);
                    border-radius: 100px;
                    transition: width 0.3s ease;
                }

                /* 信息展示 */
                .info-display {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .info-row label {
                    display: block;
                    font-size: 12px;
                    color: var(--text-muted);
                    margin-bottom: 4px;
                }
                .info-row p {
                    font-size: 14px;
                    margin: 0;
                }

                /* 编辑表单 */
                .edit-form {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .btn-group {
                    display: flex;
                    gap: 8px;
                }
                .btn-sm {
                    padding: 6px 12px;
                    font-size: 12px;
                }

                /* 成员变更列表 */
                .member-changes-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .member-change-card {
                    padding: 14px;
                    background: var(--bg-tertiary);
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border-color);
                }
                .member-change-name {
                    font-weight: 600;
                    font-size: 14px;
                    margin-bottom: 10px;
                    color: var(--primary-light);
                }
                .member-change-info {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    font-size: 13px;
                    color: var(--text-secondary);
                }
                .member-change-info b {
                    color: var(--text-muted);
                    font-weight: 500;
                }

                /* 表单内部区块 */
                .form-section-inner {
                    padding: 16px;
                    background: var(--bg-secondary);
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border-color);
                }

                /* 卡片副标题 */
                .card-subtitle {
                    font-size: 13px;
                    color: var(--text-muted);
                    margin-top: 4px;
                }

                /* 必填标记 */
                .label-required::after {
                    content: " *";
                    color: var(--error);
                }

                /* ==================== QA 视图样式 ==================== */
                
                .qa-workspace {
                    width: 100%;
                }

                /* 开发变更内容网格 */
                .dev-changes-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 16px;
                }
                @media (max-width: 1024px) {
                    .dev-changes-grid {
                        grid-template-columns: 1fr;
                    }
                }

                /* 开发变更卡片 */
                .dev-change-card {
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    padding: 20px;
                    transition: all var(--transition-fast);
                }
                .dev-change-card:hover {
                    border-color: var(--primary);
                    box-shadow: var(--shadow-md);
                }

                .dev-change-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 16px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid var(--border-color);
                }

                .dev-avatar {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                    font-weight: 700;
                    color: white;
                    flex-shrink: 0;
                }

                .dev-info {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .dev-name {
                    font-size: 15px;
                    font-weight: 600;
                    color: var(--text-primary);
                }

                .dev-phone {
                    font-size: 12px;
                    color: var(--text-muted);
                }

                .dev-system-badge {
                    font-size: 11px;
                    font-weight: 600;
                    padding: 4px 10px;
                    background: rgba(59, 130, 246, 0.15);
                    color: var(--info);
                    border-radius: 100px;
                }

                .dev-change-content {
                    margin-bottom: 16px;
                }
                .dev-change-content label {
                    display: block;
                    font-size: 12px;
                    color: var(--text-muted);
                    margin-bottom: 6px;
                }
                .dev-change-content p {
                    font-size: 14px;
                    line-height: 1.6;
                    color: var(--text-secondary);
                    margin: 0;
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .dev-change-stats {
                    display: flex;
                    gap: 16px;
                    padding-top: 12px;
                    border-top: 1px solid var(--border-color);
                }

                .stat-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 13px;
                }

                .stat-icon {
                    font-size: 14px;
                }

                .stat-label {
                    color: var(--text-muted);
                }

                .stat-value {
                    font-weight: 600;
                    color: var(--text-secondary);
                }
                .stat-value.has-change {
                    color: var(--warning);
                }

                /* 上传区域 */
                .upload-area {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 20px;
                    background: var(--bg-secondary);
                    border: 2px dashed var(--border-color);
                    border-radius: var(--radius-md);
                    margin-bottom: 20px;
                }

                .upload-hint {
                    flex: 1;
                }
                .upload-hint p {
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin: 0 0 8px 0;
                }
                .upload-hint ul {
                    margin: 0;
                    padding-left: 20px;
                    font-size: 13px;
                    color: var(--text-secondary);
                }
                .upload-hint li {
                    margin-bottom: 4px;
                }

                .upload-btn-wrapper {
                    flex-shrink: 0;
                }

                .uploaded-files {
                    margin-top: 16px;
                }
                .uploaded-files h5 {
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--text-secondary);
                    margin: 0 0 12px 0;
                }

                /* 静态清单样式（未加入成员时显示） */
                .static-checklist {
                    margin-top: 16px;
                }
                .checklist-notice {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    padding: 16px;
                    background: rgba(245, 158, 11, 0.1);
                    border: 1px solid rgba(245, 158, 11, 0.3);
                    border-radius: var(--radius-md);
                    margin-bottom: 20px;
                }
                .notice-icon {
                    font-size: 20px;
                    flex-shrink: 0;
                }
                .checklist-notice p {
                    margin: 0;
                    font-size: 13px;
                    color: var(--warning);
                    line-height: 1.5;
                }
                .checklist-item.disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .checklist-item.disabled .checklist-checkbox {
                    background: var(--bg-tertiary);
                }

                /* ==================== PO 视图样式 ==================== */
                
                .po-workspace {
                    width: 100%;
                }

                /* QA 状态列表 */
                .qa-status-list {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .qa-status-card {
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    padding: 20px;
                    transition: all var(--transition-fast);
                }
                .qa-status-card:hover {
                    border-color: var(--primary);
                }

                .qa-status-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 16px;
                }

                .qa-avatar {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, var(--success) 0%, #059669 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                    font-weight: 700;
                    color: white;
                    flex-shrink: 0;
                }

                .qa-info {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .qa-name {
                    font-size: 15px;
                    font-weight: 600;
                    color: var(--text-primary);
                }

                .qa-phone {
                    font-size: 12px;
                    color: var(--text-muted);
                }

                .qa-progress-badge {
                    font-size: 12px;
                    font-weight: 600;
                    padding: 6px 12px;
                    background: rgba(245, 158, 11, 0.15);
                    color: var(--warning);
                    border-radius: 100px;
                }
                .qa-progress-badge.complete {
                    background: rgba(16, 185, 129, 0.15);
                    color: var(--success);
                }

                .qa-status-info {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 12px;
                    margin-bottom: 12px;
                }

                .qa-info-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 12px;
                    background: var(--bg-tertiary);
                    border-radius: var(--radius-sm);
                }

                .qa-info-label {
                    font-size: 12px;
                    color: var(--text-muted);
                }

                .qa-info-value {
                    font-size: 13px;
                    font-weight: 500;
                    color: var(--text-primary);
                }

                .qa-progress-bar {
                    height: 6px;
                    background: var(--border-color);
                    border-radius: 100px;
                    overflow: hidden;
                    margin-bottom: 12px;
                }

                .qa-progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, var(--success) 0%, #059669 100%);
                    border-radius: 100px;
                    transition: width 0.3s ease;
                }

                .qa-reports {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-wrap: wrap;
                    padding-top: 12px;
                    border-top: 1px solid var(--border-color);
                }

                .qa-reports-label {
                    font-size: 13px;
                    color: var(--text-muted);
                }

                .qa-reports-list {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                }

                .qa-report-link {
                    font-size: 12px;
                    padding: 4px 10px;
                    background: rgba(59, 130, 246, 0.15);
                    color: var(--info);
                    border-radius: var(--radius-sm);
                    text-decoration: none;
                    transition: all var(--transition-fast);
                    max-width: 150px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .qa-report-link:hover {
                    background: rgba(59, 130, 246, 0.25);
                }

                .qa-reports-more {
                    font-size: 12px;
                    color: var(--text-muted);
                }

                .qa-no-report {
                    font-size: 12px;
                    color: var(--text-muted);
                    font-style: italic;
                }

                /* 验收提示 */
                .acceptance-tips {
                    padding: 16px;
                    background: var(--bg-secondary);
                    border-radius: var(--radius-md);
                    border-left: 4px solid var(--primary);
                }
                .acceptance-tips p {
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin: 0 0 12px 0;
                }
                .acceptance-tips ul {
                    margin: 0;
                    padding-left: 20px;
                    font-size: 13px;
                    color: var(--text-secondary);
                    line-height: 1.8;
                }
                .acceptance-tips li {
                    margin-bottom: 4px;
                }

                /* ==================== DBA 视图样式 ==================== */
                
                .dba-workspace {
                    width: 100%;
                }

                /* 数据库变更列表 */
                .db-changes-list {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }

                .db-member-section {
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                }

                .db-member-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 16px 20px;
                    background: var(--bg-tertiary);
                    border-bottom: 1px solid var(--border-color);
                }

                .db-member-avatar {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                    font-weight: 700;
                    color: white;
                    flex-shrink: 0;
                }

                .db-member-info {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .db-member-name {
                    font-size: 15px;
                    font-weight: 600;
                    color: var(--text-primary);
                }

                .db-member-phone {
                    font-size: 12px;
                    color: var(--text-muted);
                }

                .db-member-system {
                    font-size: 11px;
                    font-weight: 600;
                    padding: 4px 10px;
                    background: rgba(59, 130, 246, 0.15);
                    color: var(--info);
                    border-radius: 100px;
                }

                .db-change-count {
                    font-size: 12px;
                    font-weight: 600;
                    padding: 4px 10px;
                    background: rgba(245, 158, 11, 0.15);
                    color: var(--warning);
                    border-radius: 100px;
                }

                .db-changes-detail {
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .db-change-item {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    padding: 16px;
                }

                .db-change-item-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 16px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid var(--border-color);
                }

                .db-change-index {
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--primary-light);
                    padding: 4px 10px;
                    background: rgba(99, 102, 241, 0.15);
                    border-radius: var(--radius-sm);
                }

                .db-change-type {
                    font-size: 12px;
                    font-weight: 600;
                    padding: 4px 10px;
                    background: rgba(16, 185, 129, 0.15);
                    color: var(--success);
                    border-radius: var(--radius-sm);
                }

                .db-affects-online {
                    font-size: 12px;
                    font-weight: 600;
                    padding: 4px 10px;
                    background: rgba(239, 68, 68, 0.15);
                    color: var(--error);
                    border-radius: var(--radius-sm);
                    margin-left: auto;
                }

                .db-change-info-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 12px;
                    margin-bottom: 16px;
                }
                @media (max-width: 768px) {
                    .db-change-info-grid {
                        grid-template-columns: 1fr;
                    }
                }

                .db-info-row {
                    padding: 10px 12px;
                    background: var(--bg-tertiary);
                    border-radius: var(--radius-sm);
                }
                .db-info-row label {
                    display: block;
                    font-size: 11px;
                    color: var(--text-muted);
                    margin-bottom: 4px;
                }
                .db-info-row p {
                    font-size: 13px;
                    font-weight: 500;
                    color: var(--text-primary);
                    margin: 0;
                }

                .db-sql-section {
                    margin-bottom: 16px;
                }
                .db-sql-section label {
                    display: block;
                    font-size: 12px;
                    color: var(--text-muted);
                    margin-bottom: 8px;
                }

                .db-sql-code {
                    background: var(--bg-primary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    padding: 16px;
                    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                    font-size: 13px;
                    line-height: 1.6;
                    color: var(--text-primary);
                    overflow-x: auto;
                    white-space: pre-wrap;
                    word-break: break-all;
                    margin: 0;
                }

                .db-impact-section label {
                    display: block;
                    font-size: 12px;
                    color: var(--text-muted);
                    margin-bottom: 6px;
                }
                .db-impact-section p {
                    font-size: 13px;
                    color: var(--text-secondary);
                    margin: 0;
                    padding: 10px 12px;
                    background: var(--bg-tertiary);
                    border-radius: var(--radius-sm);
                }

                /* 审核提示 */
                .review-tips {
                    padding: 16px;
                    background: var(--bg-secondary);
                    border-radius: var(--radius-md);
                    border-left: 4px solid var(--warning);
                }
                .review-tips p {
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin: 0 0 12px 0;
                }
                .review-tips ul {
                    margin: 0;
                    padding-left: 20px;
                    font-size: 13px;
                    color: var(--text-secondary);
                    line-height: 1.8;
                }
                .review-tips li {
                    margin-bottom: 4px;
                }

                /* ==================== PM 视图样式 ==================== */
                
                .pm-workspace {
                    width: 100%;
                }

                /* PM 成员网格 */
                .pm-member-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 12px;
                }
                @media (max-width: 1024px) {
                    .pm-member-grid {
                        grid-template-columns: repeat(3, 1fr);
                    }
                }
                @media (max-width: 768px) {
                    .pm-member-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }

                .pm-member-card {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 12px;
                    background: var(--bg-tertiary);
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border-color);
                }

                .pm-member-avatar {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    font-weight: 700;
                    color: white;
                    flex-shrink: 0;
                }

                .pm-member-info {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .pm-member-name {
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--text-primary);
                }

                .pm-member-role {
                    font-size: 11px;
                    color: var(--text-muted);
                }

                /* PM 进度列表 */
                .pm-progress-list {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .pm-progress-card {
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    padding: 20px;
                    transition: all var(--transition-fast);
                }
                .pm-progress-card:hover {
                    border-color: var(--primary);
                }

                .pm-progress-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 16px;
                }

                .pm-progress-avatar {
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                    font-weight: 700;
                    color: white;
                    flex-shrink: 0;
                }

                .pm-progress-info {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .pm-progress-name {
                    font-size: 15px;
                    font-weight: 600;
                    color: var(--text-primary);
                }

                .pm-progress-role {
                    font-size: 12px;
                    color: var(--text-muted);
                }

                .pm-progress-badge {
                    font-size: 12px;
                    font-weight: 600;
                    padding: 6px 12px;
                    border-radius: 100px;
                }
                .pm-progress-badge.complete {
                    background: rgba(16, 185, 129, 0.15);
                    color: var(--success);
                }
                .pm-progress-badge.in-progress {
                    background: rgba(245, 158, 11, 0.15);
                    color: var(--warning);
                }
                .pm-progress-badge.pending {
                    background: var(--bg-tertiary);
                    color: var(--text-muted);
                }

                .pm-progress-stats {
                    display: flex;
                    gap: 24px;
                    margin-bottom: 12px;
                }

                .pm-stat-item {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .pm-stat-label {
                    font-size: 11px;
                    color: var(--text-muted);
                }

                .pm-stat-value {
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--text-primary);
                }
                .pm-stat-value.done {
                    color: var(--success);
                }
                .pm-stat-value.pending {
                    color: var(--text-muted);
                }

                .pm-progress-bar {
                    height: 6px;
                    background: var(--border-color);
                    border-radius: 100px;
                    overflow: hidden;
                }

                .pm-progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, var(--primary) 0%, var(--primary-light) 100%);
                    border-radius: 100px;
                    transition: width 0.3s ease;
                }

                /* PM 开发列表 */
                .pm-dev-list {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }

                .pm-dev-section {
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                }

                .pm-dev-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 16px 20px;
                    background: var(--bg-tertiary);
                    border-bottom: 1px solid var(--border-color);
                }

                .pm-dev-avatar {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                    font-weight: 700;
                    color: white;
                    flex-shrink: 0;
                }

                .pm-dev-info {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .pm-dev-name {
                    font-size: 15px;
                    font-weight: 600;
                    color: var(--text-primary);
                }

                .pm-dev-phone {
                    font-size: 12px;
                    color: var(--text-muted);
                }

                .pm-dev-system {
                    font-size: 11px;
                    font-weight: 600;
                    padding: 4px 10px;
                    background: rgba(59, 130, 246, 0.15);
                    color: var(--info);
                    border-radius: 100px;
                }

                .pm-dev-content {
                    padding: 16px 20px;
                    border-bottom: 1px solid var(--border-color);
                }
                .pm-dev-content label {
                    display: block;
                    font-size: 12px;
                    color: var(--text-muted);
                    margin-bottom: 6px;
                }
                .pm-dev-content p {
                    font-size: 14px;
                    line-height: 1.6;
                    color: var(--text-secondary);
                    margin: 0;
                }

                .pm-dev-db-changes,
                .pm-dev-config-changes {
                    padding: 16px 20px;
                    border-bottom: 1px solid var(--border-color);
                }
                .pm-dev-db-changes h5,
                .pm-dev-config-changes h5 {
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin: 0 0 12px 0;
                }

                .pm-db-item,
                .pm-config-item {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    padding: 14px;
                    margin-bottom: 10px;
                }
                .pm-db-item:last-child,
                .pm-config-item:last-child {
                    margin-bottom: 0;
                }

                .pm-db-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 10px;
                }

                .pm-db-index {
                    font-size: 12px;
                    font-weight: 600;
                    color: var(--primary);
                }

                .pm-db-type {
                    font-size: 11px;
                    font-weight: 600;
                    padding: 2px 8px;
                    background: rgba(16, 185, 129, 0.15);
                    color: var(--success);
                    border-radius: var(--radius-sm);
                }

                .pm-db-warning,
                .pm-config-warning {
                    font-size: 11px;
                    font-weight: 600;
                    padding: 2px 8px;
                    background: rgba(239, 68, 68, 0.15);
                    color: var(--error);
                    border-radius: var(--radius-sm);
                    margin-left: auto;
                }

                .pm-db-details {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 8px;
                    font-size: 13px;
                    color: var(--text-secondary);
                    margin-bottom: 10px;
                }
                .pm-db-details b {
                    color: var(--text-muted);
                    font-weight: 500;
                }

                .pm-db-sql {
                    margin-top: 10px;
                }
                .pm-db-sql label {
                    display: block;
                    font-size: 11px;
                    color: var(--text-muted);
                    margin-bottom: 6px;
                }
                .pm-db-sql pre {
                    background: var(--bg-primary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-sm);
                    padding: 10px;
                    font-family: 'Monaco', 'Menlo', monospace;
                    font-size: 12px;
                    color: var(--text-primary);
                    overflow-x: auto;
                    white-space: pre-wrap;
                    margin: 0;
                }

                .pm-config-item {
                    font-size: 13px;
                    color: var(--text-secondary);
                }
                .pm-config-item b {
                    color: var(--text-muted);
                    font-weight: 500;
                }

                .pm-dev-empty {
                    padding: 24px 20px;
                    text-align: center;
                    color: var(--text-muted);
                }
                .pm-dev-empty span {
                    font-size: 24px;
                    display: block;
                    margin-bottom: 8px;
                    opacity: 0.5;
                }
                .pm-dev-empty p {
                    font-size: 13px;
                    margin: 0;
                }

                /* PM QA 列表 */
                .pm-qa-list {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .pm-qa-card {
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    padding: 20px;
                }

                .pm-qa-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 16px;
                }

                .pm-qa-avatar {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, var(--success) 0%, #059669 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                    font-weight: 700;
                    color: white;
                    flex-shrink: 0;
                }

                .pm-qa-info {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .pm-qa-name {
                    font-size: 15px;
                    font-weight: 600;
                    color: var(--text-primary);
                }

                .pm-qa-phone {
                    font-size: 12px;
                    color: var(--text-muted);
                }

                .pm-qa-badge {
                    font-size: 12px;
                    font-weight: 600;
                    padding: 6px 12px;
                    background: rgba(245, 158, 11, 0.15);
                    color: var(--warning);
                    border-radius: 100px;
                }
                .pm-qa-badge.complete {
                    background: rgba(16, 185, 129, 0.15);
                    color: var(--success);
                }

                .pm-qa-stats {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 12px;
                    margin-bottom: 12px;
                }

                .pm-qa-stat {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 12px;
                    background: var(--bg-tertiary);
                    border-radius: var(--radius-sm);
                }

                .pm-qa-stat-label {
                    font-size: 12px;
                    color: var(--text-muted);
                }

                .pm-qa-stat-value {
                    font-size: 13px;
                    font-weight: 500;
                    color: var(--text-primary);
                }

                .pm-qa-progress-bar {
                    height: 6px;
                    background: var(--border-color);
                    border-radius: 100px;
                    overflow: hidden;
                    margin-bottom: 12px;
                }

                .pm-qa-progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, var(--success) 0%, #059669 100%);
                    border-radius: 100px;
                    transition: width 0.3s ease;
                }

                .pm-qa-reports {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-wrap: wrap;
                    padding-top: 12px;
                    border-top: 1px solid var(--border-color);
                }

                .pm-qa-reports-label {
                    font-size: 13px;
                    color: var(--text-muted);
                }

                .pm-qa-reports-list {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                }

                .pm-qa-report-link {
                    font-size: 12px;
                    padding: 4px 10px;
                    background: rgba(59, 130, 246, 0.15);
                    color: var(--info);
                    border-radius: var(--radius-sm);
                    text-decoration: none;
                    transition: all var(--transition-fast);
                }
                .pm-qa-report-link:hover {
                    background: rgba(59, 130, 246, 0.25);
                }

                .pm-qa-no-report {
                    font-size: 12px;
                    color: var(--text-muted);
                    font-style: italic;
                }

                /* PM DBA 列表 */
                .pm-dba-list {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    margin-bottom: 24px;
                }

                .pm-dba-card {
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    padding: 20px;
                }

                .pm-dba-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 16px;
                }

                .pm-dba-avatar {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                    font-weight: 700;
                    color: white;
                    flex-shrink: 0;
                }

                .pm-dba-info {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .pm-dba-name {
                    font-size: 15px;
                    font-weight: 600;
                    color: var(--text-primary);
                }

                .pm-dba-phone {
                    font-size: 12px;
                    color: var(--text-muted);
                }

                .pm-dba-badge {
                    font-size: 12px;
                    font-weight: 600;
                    padding: 6px 12px;
                    background: rgba(245, 158, 11, 0.15);
                    color: var(--warning);
                    border-radius: 100px;
                }
                .pm-dba-badge.complete {
                    background: rgba(16, 185, 129, 0.15);
                    color: var(--success);
                }

                .pm-dba-stats {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 12px;
                    margin-bottom: 12px;
                }

                .pm-dba-stat {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 12px;
                    background: var(--bg-tertiary);
                    border-radius: var(--radius-sm);
                }

                .pm-dba-stat-label {
                    font-size: 12px;
                    color: var(--text-muted);
                }

                .pm-dba-stat-value {
                    font-size: 13px;
                    font-weight: 500;
                    color: var(--text-primary);
                }

                .pm-dba-progress-bar {
                    height: 6px;
                    background: var(--border-color);
                    border-radius: 100px;
                    overflow: hidden;
                }

                .pm-dba-progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%);
                    border-radius: 100px;
                    transition: width 0.3s ease;
                }

                /* PM 数据库变更汇总 */
                .pm-db-summary {
                    padding: 20px;
                    background: var(--bg-tertiary);
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--border-color);
                }
                .pm-db-summary h4 {
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin: 0 0 16px 0;
                }

                .pm-db-summary-empty {
                    font-size: 13px;
                    color: var(--text-muted);
                    margin: 0;
                }

                .pm-db-summary-stats {
                    display: flex;
                    gap: 24px;
                }

                .pm-db-summary-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 16px 24px;
                    background: var(--bg-card);
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border-color);
                }
                .pm-db-summary-item.warning {
                    border-color: rgba(239, 68, 68, 0.3);
                    background: rgba(239, 68, 68, 0.05);
                }

                .pm-db-summary-num {
                    font-size: 28px;
                    font-weight: 700;
                    color: var(--text-primary);
                }
                .pm-db-summary-item.warning .pm-db-summary-num {
                    color: var(--error);
                }

                .pm-db-summary-label {
                    font-size: 12px;
                    color: var(--text-muted);
                    margin-top: 4px;
                }

                /* PM 检查清单提示样式 */
                .pm-checklist-info {
                    padding: 20px;
                }
                .pm-checklist-hint {
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin: 0 0 16px 0;
                }
                .pm-checklist-items {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    margin-bottom: 20px;
                }
                .pm-checklist-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 12px 16px;
                    background: var(--bg-tertiary);
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border-color);
                }
                .pm-checklist-icon {
                    font-size: 16px;
                    color: var(--text-muted);
                }
                .pm-checklist-label {
                    font-size: 14px;
                    color: var(--text-secondary);
                }
                .pm-checklist-note {
                    font-size: 13px;
                    color: var(--warning);
                    margin: 0;
                    padding: 12px 16px;
                    background: rgba(245, 158, 11, 0.1);
                    border-radius: var(--radius-md);
                    border: 1px solid rgba(245, 158, 11, 0.2);
                }

                /* PM 运维列表 */
                .pm-op-list {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .pm-op-card {
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    padding: 20px;
                }

                .pm-op-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 16px;
                }

                .pm-op-avatar {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                    font-weight: 700;
                    color: white;
                    flex-shrink: 0;
                }

                .pm-op-info {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .pm-op-name {
                    font-size: 15px;
                    font-weight: 600;
                    color: var(--text-primary);
                }

                .pm-op-phone {
                    font-size: 12px;
                    color: var(--text-muted);
                }

                .pm-op-badge {
                    font-size: 12px;
                    font-weight: 600;
                    padding: 6px 12px;
                    background: rgba(139, 92, 246, 0.15);
                    color: #8b5cf6;
                    border-radius: 100px;
                }
                .pm-op-badge.complete {
                    background: rgba(16, 185, 129, 0.15);
                    color: var(--success);
                }

                .pm-op-stats {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 12px;
                    margin-bottom: 12px;
                }

                .pm-op-stat {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 12px;
                    background: var(--bg-tertiary);
                    border-radius: var(--radius-sm);
                }

                .pm-op-stat-label {
                    font-size: 12px;
                    color: var(--text-muted);
                }

                .pm-op-stat-value {
                    font-size: 13px;
                    font-weight: 500;
                    color: var(--text-primary);
                }

                .pm-op-progress-bar {
                    height: 6px;
                    background: var(--border-color);
                    border-radius: 100px;
                    overflow: hidden;
                    margin-bottom: 12px;
                }

                .pm-op-progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #8b5cf6 0%, #7c3aed 100%);
                    border-radius: 100px;
                    transition: width 0.3s ease;
                }

                .pm-op-rollback {
                    padding: 12px;
                    background: var(--bg-tertiary);
                    border-radius: var(--radius-md);
                    margin-bottom: 12px;
                }

                .pm-op-rollback-label {
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--text-primary);
                    display: block;
                    margin-bottom: 8px;
                }

                .pm-op-rollback-content {
                    font-size: 13px;
                    color: var(--text-secondary);
                    line-height: 1.6;
                    margin: 0;
                    white-space: pre-wrap;
                }

                .pm-op-screenshots {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex-wrap: wrap;
                    padding-top: 12px;
                    border-top: 1px solid var(--border-color);
                }

                .pm-op-screenshots-label {
                    font-size: 13px;
                    color: var(--text-muted);
                }

                .pm-op-screenshots-list {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                }

                .pm-op-screenshot-link {
                    font-size: 12px;
                    padding: 4px 10px;
                    background: rgba(139, 92, 246, 0.15);
                    color: #8b5cf6;
                    border-radius: var(--radius-sm);
                    text-decoration: none;
                    transition: all var(--transition-fast);
                }
                .pm-op-screenshot-link:hover {
                    background: rgba(139, 92, 246, 0.25);
                }

                .pm-op-no-screenshot {
                    font-size: 12px;
                    color: var(--text-muted);
                    font-style: italic;
                }

                /* ==================== OP 视图样式 ==================== */
                
                .op-workspace {
                    width: 100%;
                }

                /* 运维提示 */
                .op-tips {
                    padding: 16px;
                    background: var(--bg-secondary);
                    border-radius: var(--radius-md);
                    border-left: 4px solid var(--info);
                    margin-top: 16px;
                }
                .op-tips p {
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin: 0 0 12px 0;
                }
                .op-tips ul {
                    margin: 0;
                    padding-left: 20px;
                    font-size: 13px;
                    color: var(--text-secondary);
                    line-height: 1.8;
                }
                .op-tips li {
                    margin-bottom: 4px;
                }

                /* ==================== 成员详情弹窗样式 ==================== */
                .member-detail-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: 20px;
                }
                .member-detail-content {
                    background: var(--bg-primary);
                    border-radius: var(--radius-lg);
                    width: 100%;
                    max-width: 700px;
                    max-height: 85vh;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }
                .member-detail-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 20px 24px;
                    border-bottom: 1px solid var(--border-color);
                    background: var(--bg-secondary);
                }
                .member-detail-title {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .member-detail-avatar {
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, var(--primary), var(--primary-light));
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: 600;
                    font-size: 18px;
                }
                .member-detail-info h3 {
                    margin: 0;
                    font-size: 18px;
                    color: var(--text-primary);
                }
                .member-detail-info span {
                    font-size: 13px;
                    color: var(--text-muted);
                }
                .member-detail-close {
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    font-size: 24px;
                    cursor: pointer;
                    padding: 4px;
                    line-height: 1;
                }
                .member-detail-close:hover {
                    color: var(--text-primary);
                }
                .member-detail-body {
                    flex: 1;
                    overflow-y: auto;
                    padding: 24px;
                }
                .member-detail-section {
                    margin-bottom: 24px;
                }
                .member-detail-section:last-child {
                    margin-bottom: 0;
                }
                .member-detail-section h4 {
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin: 0 0 12px 0;
                    padding-bottom: 8px;
                    border-bottom: 1px solid var(--border-color);
                }
                .member-checklist-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .member-checklist-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 12px;
                    background: var(--bg-secondary);
                    border-radius: var(--radius-sm);
                    font-size: 13px;
                }
                .member-checklist-item.checked {
                    background: rgba(34, 197, 94, 0.1);
                }
                .member-checklist-item.unchecked {
                    background: rgba(239, 68, 68, 0.1);
                }
                .member-checklist-icon {
                    font-size: 16px;
                }
                .member-checklist-label {
                    flex: 1;
                    color: var(--text-primary);
                }
                .member-checklist-status {
                    font-size: 12px;
                    padding: 2px 8px;
                    border-radius: 4px;
                }
                .member-checklist-status.done {
                    background: rgba(34, 197, 94, 0.2);
                    color: var(--success);
                }
                .member-checklist-status.pending {
                    background: rgba(239, 68, 68, 0.2);
                    color: var(--danger);
                }
                .member-content-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 12px;
                }
                .member-content-item {
                    padding: 12px;
                    background: var(--bg-secondary);
                    border-radius: var(--radius-sm);
                }
                .member-content-item.full-width {
                    grid-column: 1 / -1;
                }
                .member-content-item label {
                    display: block;
                    font-size: 12px;
                    color: var(--text-muted);
                    margin-bottom: 4px;
                }
                .member-content-item p {
                    margin: 0;
                    font-size: 14px;
                    color: var(--text-primary);
                    word-break: break-word;
                }
                .member-content-item pre {
                    margin: 0;
                    font-size: 12px;
                    background: var(--bg-tertiary);
                    padding: 8px;
                    border-radius: 4px;
                    overflow-x: auto;
                    white-space: pre-wrap;
                    word-break: break-word;
                }
                .member-db-change {
                    padding: 12px;
                    background: var(--bg-secondary);
                    border-radius: var(--radius-sm);
                    margin-bottom: 12px;
                    border-left: 3px solid var(--primary);
                }
                .member-db-change:last-child {
                    margin-bottom: 0;
                }
                .member-db-change-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 8px;
                }
                .member-db-change-type {
                    font-size: 12px;
                    padding: 2px 8px;
                    background: rgba(52, 120, 246, 0.2);
                    color: var(--primary-light);
                    border-radius: 4px;
                }
                .member-db-change-warning {
                    font-size: 11px;
                    padding: 2px 6px;
                    background: rgba(239, 68, 68, 0.2);
                    color: var(--danger);
                    border-radius: 4px;
                }
                .member-no-content {
                    text-align: center;
                    padding: 24px;
                    color: var(--text-muted);
                    font-size: 14px;
                }
            `}</style>

            {/* 成员详情弹窗 */}
            {viewingMember && (
                <div className="member-detail-modal" onClick={() => setViewingMember(null)}>
                    <div className="member-detail-content" onClick={e => e.stopPropagation()}>
                        <div className="member-detail-header">
                            <div className="member-detail-title">
                                <div className="member-detail-avatar">
                                    {(viewingMember.user?.name || '?')[0]}
                                </div>
                                <div className="member-detail-info">
                                    <h3>{viewingMember.user?.name}</h3>
                                    <span>
                                        {(viewingMember.user?.role || '').split(',').map(r => {
                                            const labels = { PM: '项目经理', RD: '开发', QA: '测试', PO: '产品', DBA: 'DBA', OP: '运维' };
                                            return labels[r] || r;
                                        }).join(' / ')}
                                    </span>
                                </div>
                            </div>
                            <button className="member-detail-close" onClick={() => setViewingMember(null)}>×</button>
                        </div>
                        
                        <div className="member-detail-body">
                            {/* 检查清单完成情况 */}
                            <div className="member-detail-section">
                                <h4>📋 检查清单完成情况</h4>
                                {(() => {
                                    const memberChecklistItems = enrichedChecklists.filter(
                                        c => c.userId === viewingMember.userId && c.stage === release.stage
                                    );
                                    if (memberChecklistItems.length === 0) {
                                        return <div className="member-no-content">该成员在当前阶段没有检查项</div>;
                                    }
                                    return (
                                        <div className="member-checklist-list">
                                            {memberChecklistItems.map(item => (
                                                <div 
                                                    key={item.id} 
                                                    className={`member-checklist-item ${item.checked ? 'checked' : 'unchecked'}`}
                                                >
                                                    <span className="member-checklist-icon">
                                                        {item.checked ? '✅' : '⬜'}
                                                    </span>
                                                    <span className="member-checklist-label">{item.label}</span>
                                                    <span className={`member-checklist-status ${item.checked ? 'done' : 'pending'}`}>
                                                        {item.checked ? '已完成' : '未完成'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* 填报内容 */}
                            {(() => {
                                const content = viewingMember.content || {};
                                const memberRoles = (viewingMember.user?.role || '').split(',');
                                
                                // 开发人员内容
                                if (memberRoles.includes('RD') && (content.devName || content.contentDesc)) {
                                    return (
                                        <div className="member-detail-section">
                                            <h4>💻 开发变更内容</h4>
                                            <div className="member-content-grid">
                                                <div className="member-content-item">
                                                    <label>开发人员</label>
                                                    <p>{content.devName || '-'}</p>
                                                </div>
                                                <div className="member-content-item">
                                                    <label>联系电话</label>
                                                    <p>{content.devPhone || '-'}</p>
                                                </div>
                                                <div className="member-content-item">
                                                    <label>所属系统</label>
                                                    <p>{content.system || '-'}</p>
                                                </div>
                                                <div className="member-content-item full-width">
                                                    <label>发版涉及内容说明</label>
                                                    <p>{content.contentDesc || '-'}</p>
                                                </div>
                                            </div>
                                            
                                            {/* 数据库变更 */}
                                            {content.dbChanges?.length > 0 && (
                                                <div style={{ marginTop: '16px' }}>
                                                    <h5 style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
                                                        🗄️ 数据库变更 ({content.dbChanges.length} 条)
                                                    </h5>
                                                    {content.dbChanges.map((db, idx) => (
                                                        <div key={idx} className="member-db-change">
                                                            <div className="member-db-change-header">
                                                                <span style={{ fontWeight: 600, fontSize: '13px' }}>#{idx + 1}</span>
                                                                <span className="member-db-change-type">{db.changeType}</span>
                                                                {db.affectsOnline && <span className="member-db-change-warning">⚠️ 影响线上</span>}
                                                            </div>
                                                            <div className="member-content-grid" style={{ marginTop: '8px' }}>
                                                                <div className="member-content-item">
                                                                    <label>数据库</label>
                                                                    <p>{db.dbName || '-'}</p>
                                                                </div>
                                                                <div className="member-content-item">
                                                                    <label>表名</label>
                                                                    <p>{db.tableName || '-'}</p>
                                                                </div>
                                                                <div className="member-content-item full-width">
                                                                    <label>变更原因</label>
                                                                    <p>{db.reason || '-'}</p>
                                                                </div>
                                                                <div className="member-content-item full-width">
                                                                    <label>SQL 语句</label>
                                                                    <pre>{db.sql || '-- 无'}</pre>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            
                                            {/* 配置变更 */}
                                            {content.configChanges?.length > 0 && (
                                                <div style={{ marginTop: '16px' }}>
                                                    <h5 style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
                                                        ⚙️ 配置变更 ({content.configChanges.length} 条)
                                                    </h5>
                                                    {content.configChanges.map((cfg, idx) => (
                                                        <div key={idx} className="member-db-change" style={{ borderLeftColor: 'var(--warning)' }}>
                                                            <div className="member-content-grid">
                                                                <div className="member-content-item full-width">
                                                                    <label>变更原因</label>
                                                                    <p>{cfg.reason || '-'}</p>
                                                                </div>
                                                                <div className="member-content-item full-width">
                                                                    <label>变更内容</label>
                                                                    <p>{cfg.content || '-'}</p>
                                                                </div>
                                                                <div className="member-content-item full-width">
                                                                    <label>可能影响</label>
                                                                    <p>{cfg.impact || '-'}</p>
                                                                </div>
                                                            </div>
                                                            {cfg.affectsOnline && (
                                                                <div style={{ marginTop: '8px' }}>
                                                                    <span className="member-db-change-warning">⚠️ 影响线上服务</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }
                                
                                // QA 测试内容
                                if (memberRoles.includes('QA') && content.qaName) {
                                    return (
                                        <div className="member-detail-section">
                                            <h4>🧪 测试信息</h4>
                                            <div className="member-content-grid">
                                                <div className="member-content-item">
                                                    <label>测试人员</label>
                                                    <p>{content.qaName || '-'}</p>
                                                </div>
                                                <div className="member-content-item">
                                                    <label>联系电话</label>
                                                    <p>{content.qaPhone || '-'}</p>
                                                </div>
                                                <div className="member-content-item">
                                                    <label>测试时间</label>
                                                    <p>{content.qaTestDate ? new Date(content.qaTestDate).toLocaleDateString('zh-CN') : '-'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                                
                                // PO 验收内容
                                if (memberRoles.includes('PO') && content.poName) {
                                    return (
                                        <div className="member-detail-section">
                                            <h4>✅ 产品验收信息</h4>
                                            <div className="member-content-grid">
                                                <div className="member-content-item">
                                                    <label>产品人员</label>
                                                    <p>{content.poName || '-'}</p>
                                                </div>
                                                <div className="member-content-item">
                                                    <label>联系电话</label>
                                                    <p>{content.poPhone || '-'}</p>
                                                </div>
                                                <div className="member-content-item">
                                                    <label>验收时间</label>
                                                    <p>{content.poAcceptDate ? new Date(content.poAcceptDate).toLocaleDateString('zh-CN') : '-'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                                
                                // DBA 审核内容
                                if (memberRoles.includes('DBA') && content.dbaName) {
                                    return (
                                        <div className="member-detail-section">
                                            <h4>🗄️ DBA 审核信息</h4>
                                            <div className="member-content-grid">
                                                <div className="member-content-item">
                                                    <label>DBA</label>
                                                    <p>{content.dbaName || '-'}</p>
                                                </div>
                                                <div className="member-content-item">
                                                    <label>联系电话</label>
                                                    <p>{content.dbaPhone || '-'}</p>
                                                </div>
                                                <div className="member-content-item">
                                                    <label>审核时间</label>
                                                    <p>{content.dbaReviewDate ? new Date(content.dbaReviewDate).toLocaleDateString('zh-CN') : '-'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                                
                                // OP 运维内容
                                if (memberRoles.includes('OP') && content.opName) {
                                    return (
                                        <div className="member-detail-section">
                                            <h4>💾 运维信息</h4>
                                            <div className="member-content-grid">
                                                <div className="member-content-item">
                                                    <label>运维人员</label>
                                                    <p>{content.opName || '-'}</p>
                                                </div>
                                                <div className="member-content-item">
                                                    <label>联系电话</label>
                                                    <p>{content.opPhone || '-'}</p>
                                                </div>
                                                <div className="member-content-item">
                                                    <label>备份时间</label>
                                                    <p>{content.opBackupDate ? new Date(content.opBackupDate).toLocaleDateString('zh-CN') : '-'}</p>
                                                </div>
                                                <div className="member-content-item full-width">
                                                    <label>回滚方案</label>
                                                    <p>{content.rollbackPlan || '-'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                                
                                // 没有填报内容
                                return (
                                    <div className="member-detail-section">
                                        <h4>📝 填报内容</h4>
                                        <div className="member-no-content">该成员尚未提交填报内容</div>
                                    </div>
                                );
                            })()}

                            {/* 该成员上传的附件 */}
                            {(() => {
                                const memberDocs = (release.documents || []).filter(
                                    doc => doc.uploadedById === viewingMember.userId
                                );
                                const typeLabels = {
                                    TEST_REPORT: '测试报告',
                                    TEST_CASE: '测试用例',
                                    ACCEPTANCE_REPORT: '验收报告',
                                    BACKUP_SCREENSHOT: '备份截图',
                                    PROD_TEST_REPORT: '正式环境测试报告',
                                    OTHER: '其他文档'
                                };
                                
                                return (
                                    <div className="member-detail-section">
                                        <h4>📎 上传的附件 ({memberDocs.length})</h4>
                                        {memberDocs.length > 0 ? (
                                            <div className="member-docs-list">
                                                {memberDocs.map(doc => (
                                                    <a 
                                                        key={doc.id} 
                                                        href={doc.filepath} 
                                                        target="_blank" 
                                                        className="member-doc-item"
                                                    >
                                                        <span className="member-doc-icon">📄</span>
                                                        <div className="member-doc-info">
                                                            <span className="member-doc-name">{doc.filename}</span>
                                                            <span className="member-doc-meta">
                                                                {typeLabels[doc.type] || doc.type} · {new Date(doc.createdAt).toLocaleString('zh-CN')}
                                                            </span>
                                                        </div>
                                                    </a>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="member-no-content">该成员尚未上传附件</div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
