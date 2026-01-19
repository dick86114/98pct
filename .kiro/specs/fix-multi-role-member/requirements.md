# 需求文档：修复多角色成员业务逻辑问题

## 问题描述

当用户拥有多个角色（如同时是开发和运维）时，在选择参与发版时指定了某个角色（如运维），但系统在以下场景中使用了错误的角色判断逻辑：

1. **内容填报表单**：显示的是用户全部角色的表单，而不是参与角色的表单
2. **检查清单**：显示的是用户全部角色的清单，而不是参与角色的清单  
3. **团队进度显示**：按用户全部角色分组，而不是按参与角色分组
4. **标签页显示**：显示的是用户全部角色的标签页，而不是参与角色的标签页

## 根本原因

代码中使用了 `member.user.role`（用户的全部角色）来判断，而应该使用 `member.role`（成员在该发版中的参与角色）。

## 需求

### Requirement 1: 修复角色判断逻辑

**User Story:** 作为项目经理，我希望多角色成员按照其在发版中的参与角色工作，以便业务逻辑清晰一致。

#### Acceptance Criteria

1. WHEN 过滤显示开发人员变更内容时，THE 系统 SHALL 使用 `member.role` 而不是 `member.user.role` 判断
2. WHEN 过滤显示测试人员信息时，THE 系统 SHALL 使用 `member.role` 而不是 `member.user.role` 判断
3. WHEN 过滤显示 DBA 审核信息时，THE 系统 SHALL 使用 `member.role` 而不是 `member.user.role` 判断
4. WHEN 过滤显示运维信息时，THE 系统 SHALL 使用 `member.role` 而不是 `member.user.role` 判断
5. WHEN 过滤显示 DBA 执行结果时，THE 系统 SHALL 使用 `member.role` 而不是 `member.user.role` 判断
6. WHEN 在团队进度中按角色分组时，THE 系统 SHALL 使用 `member.role` 而不是 `member.user.role` 分组

### Requirement 2: 修复检查清单角色判断

**User Story:** 作为发版成员，我希望只看到我参与角色对应的检查清单，而不是我所有角色的检查清单。

#### Acceptance Criteria

1. WHEN 获取检查清单时，THE 系统 SHALL 根据 `member.role` 过滤检查清单
2. WHEN 用户有多个角色但只以一个角色参与发版时，THE 系统 SHALL 只显示该参与角色的检查清单

### Requirement 3: 修复内容填报表单显示

**User Story:** 作为发版成员，我希望只看到我参与角色对应的内容填报表单，而不是我所有角色的表单。

#### Acceptance Criteria

1. WHEN 用户以开发角色参与时，THE 系统 SHALL 只显示开发人员内容填报表单
2. WHEN 用户以测试角色参与时，THE 系统 SHALL 只显示测试人员信息填报表单
3. WHEN 用户以 DBA 角色参与时，THE 系统 SHALL 只显示 DBA 审核信息填报表单
4. WHEN 用户以运维角色参与时，THE 系统 SHALL 只显示运维信息填报表单

### Requirement 4: 修复标签页和视图显示

**User Story:** 作为发版成员，我希望只看到我参与角色对应的标签页和视图，而不是我所有角色的标签页。

#### Acceptance Criteria

1. WHEN 用户以运维角色参与发版时，THE 系统 SHALL 只显示运维角色的标签页（如备份与回滚）
2. WHEN 用户以开发角色参与发版时，THE 系统 SHALL 只显示开发角色的标签页（如变更填报）
3. WHEN 用户以测试角色参与发版时，THE 系统 SHALL 只显示测试角色的标签页（如测试报告上传）
4. WHEN 用户以 DBA 角色参与发版时，THE 系统 SHALL 只显示 DBA 角色的标签页（如数据库变更内容）
5. WHEN 用户以产品角色参与发版时，THE 系统 SHALL 只显示产品角色的标签页（如自查清单）
6. WHEN 判断用户应该看到哪个默认标签页时，THE 系统 SHALL 使用当前用户在该发版中的参与角色判断

## 修复内容

### 1. 修复成员过滤逻辑（已完成）
- 将所有 `m.user?.role` 改为 `m.role`
- 将所有 `member.user?.role` 改为 `member.role`
- 影响：开发变更内容、测试信息、DBA 审核信息、运维信息、DBA 执行结果的过滤

### 2. 修复权限判断逻辑（已完成）
- 在权限判断部分，从 `release.members` 中查找当前用户的成员记录
- 如果用户是成员，使用 `member.role`（参与角色）
- 如果用户不是成员，使用 `user.role`（全部角色）
- 影响：`isRD`、`isQA`、`isPO`、`isDBA`、`isOP` 等角色判断变量

### 3. 修复默认标签页设置逻辑（已完成）
- 在设置默认标签页时，从 `release.members` 中查找当前用户的成员记录
- 如果用户是成员，使用 `member.role`（参与角色）
- 如果用户不是成员，使用 `user.role`（全部角色）
- 影响：准备阶段、实施阶段、验证阶段的默认标签页选择

## 影响范围

修改的文件：
- `release-platform/src/app/releases/[id]/page.js` - 发版详情页面的所有角色判断逻辑

## 测试场景

1. 用户同时拥有开发和运维角色
2. 在发版中选择该用户，并指定参与角色为"运维"
3. 验证：
   - ✅ 项目经理视图中，该用户显示在"运维"分组下
   - ✅ 该用户登录后，只看到运维角色的标签页（备份与回滚）
   - ✅ 该用户只能填写运维相关的内容
   - ✅ 该用户只能看到运维角色的检查清单
   - ✅ 默认标签页是运维角色对应的标签页
