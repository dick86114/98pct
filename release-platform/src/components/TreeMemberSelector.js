'use client';

import { useState, useMemo, useCallback } from 'react';

// 角色标签映射
const ROLE_LABELS = {
    PM: '项目经理',
    RD: '开发',
    QA: '测试',
    PO: '产品',
    DBA: 'DBA',
    OP: '运维',
    LD: '领导'
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
        'LD': 'badge-leader'
    };
    return styles[role] || 'badge-secondary';
};

/**
 * 树形人员选择器组件
 * @param {Array} allUsers - 所有用户列表
 * @param {Array} selectedMembers - 已选择的成员 [{ userId, role }]
 * @param {Function} onChange - 选择变化回调
 * @param {Array} excludeRoles - 要排除的角色列表,如 ['PM', 'LD']
 */
export default function TreeMemberSelector({ allUsers, selectedMembers, onChange, excludeRoles = [] }) {
    // 按角色分组的展开状态
    const [expandedRoles, setExpandedRoles] = useState({
        RD: true,  // 默认展开开发
        QA: false,
        PO: false,
        DBA: false,
        OP: false
    });

    // 使用 useMemo 缓存按角色分组的用户，避免每次渲染都重新计算
    const userGroups = useMemo(() => {
        const groups = {
            RD: [],
            QA: [],
            PO: [],
            DBA: [],
            OP: []
        };

        allUsers.forEach(user => {
            const roles = (user.role || '').split(',').filter(r => r && r !== 'ADMIN');
            roles.forEach(role => {
                // 排除指定角色
                if (!excludeRoles.includes(role) && groups[role]) {
                    // 避免重复添加
                    if (!groups[role].find(u => u.id === user.id)) {
                        groups[role].push(user);
                    }
                }
            });
        });

        // 对每个角色组的用户按拼音排序
        Object.keys(groups).forEach(role => {
            groups[role].sort((a, b) => {
                return (a.name || '').localeCompare(b.name || '', 'zh-CN');
            });
        });

        return groups;
    }, [allUsers, excludeRoles]);

    // 切换角色组展开状态
    const toggleRole = useCallback((role) => {
        setExpandedRoles(prev => ({
            ...prev,
            [role]: !prev[role]
        }));
    }, []);

    // 切换用户选择状态
    const toggleUser = useCallback((user, role) => {
        const memberEntry = selectedMembers.find(m => m.userId === user.id);
        
        if (memberEntry) {
            // 取消选择
            onChange(selectedMembers.filter(m => m.userId !== user.id));
        } else {
            // 选择成员,使用当前角色组的角色
            onChange([...selectedMembers, { userId: user.id, role }]);
        }
    }, [selectedMembers, onChange]);

    // 更改用户的参与角色
    const changeUserRole = useCallback((userId, newRole) => {
        onChange(selectedMembers.map(m => 
            m.userId === userId ? { ...m, role: newRole } : m
        ));
    }, [selectedMembers, onChange]);

    // 统计每个角色组的选中人数
    const getSelectedCount = useCallback((role) => {
        return selectedMembers.filter(m => m.role === role).length;
    }, [selectedMembers]);

    return (
        <div className="tree-member-selector">
            {Object.entries(userGroups).map(([role, users]) => {
                if (users.length === 0) return null;
                
                const isExpanded = expandedRoles[role];
                const selectedCount = getSelectedCount(role);
                
                return (
                    <div key={role} className="tree-role-group">
                        {/* 角色组头部 */}
                        <div 
                            className="tree-role-header"
                            onClick={() => toggleRole(role)}
                        >
                            <span className="tree-role-icon">
                                {isExpanded ? '▼' : '▶'}
                            </span>
                            <span className={`badge ${getRoleBadgeClass(role)}`}>
                                {ROLE_LABELS[role]}
                            </span>
                            <span className="tree-role-count">
                                {users.length} 人
                                {selectedCount > 0 && (
                                    <span className="tree-role-selected"> · 已选 {selectedCount}</span>
                                )}
                            </span>
                        </div>

                        {/* 角色组成员列表 */}
                        {isExpanded && (
                            <div className="tree-role-members">
                                {users.map(user => {
                                    const memberEntry = selectedMembers.find(m => m.userId === user.id);
                                    const isSelected = !!memberEntry;
                                    const userRoles = (user.role || '').split(',').filter(r => r && r !== 'ADMIN' && !excludeRoles.includes(r));
                                    
                                    return (
                                        <div
                                            key={user.id}
                                            className={`tree-member-item ${isSelected ? 'selected' : ''}`}
                                        >
                                            <div 
                                                className="tree-member-main"
                                                onClick={() => toggleUser(user, role)}
                                            >
                                                <div className="tree-member-checkbox">
                                                    {isSelected && <span>✓</span>}
                                                </div>
                                                <div className="tree-member-avatar">
                                                    {(user.name || '?').slice(-1)}
                                                </div>
                                                <div className="tree-member-info">
                                                    <span className="tree-member-name">{user.name}</span>
                                                    <span className="tree-member-meta">{user.phone || '-'}</span>
                                                </div>
                                            </div>

                                            {/* 如果用户有多个角色且已选中,显示角色选择器 */}
                                            {isSelected && userRoles.length > 1 && (
                                                <div className="tree-member-role-select">
                                                    <label>参与角色：</label>
                                                    <select
                                                        value={memberEntry.role}
                                                        onChange={(e) => changeUserRole(user.id, e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {userRoles.map(r => (
                                                            <option key={r} value={r}>
                                                                {ROLE_LABELS[r] || r}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
