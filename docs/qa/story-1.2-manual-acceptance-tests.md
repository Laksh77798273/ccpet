# Story 1.2 Manual Acceptance Tests - Energy Logic Core

## 测试信息
- **故事编号**: 1.2
- **故事标题**: Energy Logic Core
- **测试日期**: 待执行
- **测试人员**: [待填写]
- **版本**: v1.0

## 验收标准映射

### AC1: Create independent energy logic module managing 0-100 energy value
### AC2: Module provides add, decrease, and get current energy functions
### AC3: Module defines energy thresholds for states (happy, hungry, sick, dead)
### AC4: All core logic must have unit test coverage

## 测试场景

### 测试场景 1: 能量管理方法功能验证 (AC1, AC2)

**目标**: 验证新增的能量管理方法能正确管理0-100范围内的能量值

#### 测试步骤 1.1: addEnergy() 方法测试
1. 构建测试环境并编译项目
   ```bash
   npm run build
   ```
2. 运行单元测试验证 addEnergy 方法
   ```bash
   npm test -- --testNamePattern="addEnergy"
   ```
3. 检查测试结果是否包含以下验证点:
   - 正常能量增加 (能量值从50增加到70)
   - 边界条件处理 (能量值不超过100)
   - 无效输入处理 (负数、NaN、非数字类型)

**预期结果**: 
- [ ] 所有 addEnergy 相关测试通过
- [ ] 能量值正确维持在0-100范围内
- [ ] 无效输入抛出适当错误信息

**实际结果**: [待填写]

#### 测试步骤 1.2: decreaseEnergy() 方法测试
1. 运行单元测试验证 decreaseEnergy 方法
   ```bash
   npm test -- --testNamePattern="decreaseEnergy"
   ```
2. 检查测试结果是否包含以下验证点:
   - 正常能量减少 (能量值从50减少到30)
   - 边界条件处理 (能量值不低于0)
   - 无效输入处理 (负数、NaN、非数字类型)

**预期结果**:
- [ ] 所有 decreaseEnergy 相关测试通过
- [ ] 能量值正确维持在0-100范围内
- [ ] 无效输入抛出适当错误信息

**实际结果**: [待填写]

#### 测试步骤 1.3: getCurrentEnergy() 方法测试
1. 运行单元测试验证 getCurrentEnergy 方法
   ```bash
   npm test -- --testNamePattern="getCurrentEnergy"
   ```
2. 检查测试结果验证方法返回正确的当前能量值

**预期结果**:
- [ ] getCurrentEnergy 正确返回当前能量值
- [ ] 返回值始终在0-100范围内

**实际结果**: [待填写]

### 测试场景 2: 能量状态阈值验证 (AC3)

**目标**: 验证能量阈值配置和状态表达式的正确定义

#### 测试步骤 2.1: 配置对象验证
1. 检查 `src/core/config.ts` 文件内容
2. 验证 STATE_THRESHOLDS 配置包含:
   - HAPPY: 80
   - HUNGRY: 40
   - SICK: 10
   - DEAD: 0
3. 验证 STATE_EXPRESSIONS 配置包含:
   - HAPPY: '(^_^)'
   - HUNGRY: '(o_o)'
   - SICK: '(u_u)'
   - DEAD: '(x_x)'

**预期结果**:
- [ ] STATE_THRESHOLDS 配置正确定义
- [ ] STATE_EXPRESSIONS 配置正确定义
- [ ] 配置值符合故事要求

**实际结果**: [待填写]

#### 测试步骤 2.2: 状态转换测试
1. 运行状态转换相关测试
   ```bash
   npm test -- --testNamePattern="state|threshold|expression"
   ```
2. 验证不同能量级别对应正确的表达式:
   - 能量 ≥80: 显示 '(^_^)' (happy)
   - 能量 ≥40 且 <80: 显示 '(o_o)' (hungry)
   - 能量 ≥10 且 <40: 显示 '(u_u)' (sick)
   - 能量 <10: 显示 '(x_x)' (dead)

**预期结果**:
- [ ] 所有状态转换测试通过
- [ ] 表达式与能量级别正确对应
- [ ] 边界值处理正确

**实际结果**: [待填写]

### 测试场景 3: 现有功能集成验证 (AC1, AC2)

**目标**: 验证新的能量管理方法与现有 feed() 和 applyTimeDecay() 方法的集成

#### 测试步骤 3.1: feed() 方法集成测试
1. 运行集成测试验证 feed() 方法使用新的 addEnergy()
   ```bash
   npm test -- --testNamePattern="feed"
   ```
2. 验证 feed() 方法:
   - 调用 addEnergy() 而不是直接修改能量
   - 正确更新 lastFeedTime 和 totalTokensConsumed
   - 触发观察者通知

**预期结果**:
- [ ] feed() 方法正确使用 addEnergy()
- [ ] 所有相关测试通过
- [ ] 状态更新和通知机制正常工作

**实际结果**: [待填写]

#### 测试步骤 3.2: applyTimeDecay() 方法集成测试
1. 运行时间衰减相关测试
   ```bash
   npm test -- --testNamePattern="applyTimeDecay|time.*decay"
   ```
2. 验证 applyTimeDecay() 方法:
   - 调用 decreaseEnergy() 而不是直接修改能量
   - 正确计算时间差并应用衰减
   - 触发观察者通知

**预期结果**:
- [ ] applyTimeDecay() 方法正确使用 decreaseEnergy()
- [ ] 时间衰减逻辑正确
- [ ] 状态更新和通知机制正常工作

**实际结果**: [待填写]

### 测试场景 4: 单元测试覆盖率验证 (AC4)

**目标**: 验证所有核心逻辑都有足够的单元测试覆盖

#### 测试步骤 4.1: 测试覆盖率检查
1. 运行测试覆盖率报告
   ```bash
   npm run test:coverage
   ```
2. 检查覆盖率报告:
   - 总体覆盖率应 >80%
   - Pet.ts 文件覆盖率应 >80%
   - 新增的能量管理方法应有完整测试

**预期结果**:
- [ ] 总体测试覆盖率 >80%
- [ ] Pet.ts 核心逻辑覆盖率 >80%
- [ ] 所有新增方法都有测试覆盖

**实际结果**: [待填写]

#### 测试步骤 4.2: 测试套件完整性检查
1. 运行完整测试套件
   ```bash
   npm test
   ```
2. 验证所有测试通过，特别关注:
   - 能量边界条件测试
   - 错误处理测试
   - 状态转换测试
   - 观察者模式测试

**预期结果**:
- [ ] 所有单元测试通过
- [ ] 所有集成测试通过
- [ ] 没有测试失败或跳过

**实际结果**: [待填写]

### 测试场景 5: CLI 功能端到端验证

**目标**: 验证增强的能量逻辑在实际 CLI 执行中正常工作

#### 测试步骤 5.1: CLI 构建和执行测试
1. 构建 CLI 脚本
   ```bash
   npm run build
   ```
2. 执行 CLI 脚本并观察输出
   ```bash
   ./dist/ccpet.js
   ```
3. 验证输出包含:
   - 正确的宠物表达式 (基于当前能量水平)
   - 正确的能量条显示
   - 无错误信息

**预期结果**:
- [ ] CLI 脚本成功构建
- [ ] CLI 执行无错误
- [ ] 输出格式正确显示宠物状态

**实际结果**: [待填写]

#### 测试步骤 5.2: 状态持久化验证
1. **重置测试环境**：删除现有状态文件
   ```bash
   rm ~/.claude-pet/pet-state.json
   ```
2. **首次执行**：运行CLI脚本验证初始状态
   ```bash
   ./dist/ccpet.js
   ```
3. **等待短时间**：等待1-2分钟（模拟时间流逝但不足以触发小时级衰减）
4. **再次执行**：运行CLI脚本观察状态保持
   ```bash
   ./dist/ccpet.js
   ```
5. **检查状态文件**：验证状态正确保存
   ```bash
   cat ~/.claude-pet/pet-state.json
   ```

**预期结果**:
- [ ] 首次执行显示满能量状态：`(^_^) ●●●●●●●●●●`
- [ ] 状态文件正确创建包含energy:100, expression:"(^_^)"
- [ ] 短时间内能量保持稳定（衰减按小时计算，分钟级别无变化）
- [ ] 多次执行状态文件的lastFeedTime正确更新
- [ ] 状态在重启间正确保持

**实际结果**: [待填写]

## 测试结果汇总

### 缺陷记录
| 缺陷ID | 测试场景 | 缺陷描述 | 严重级别 | 状态 |
|--------|----------|----------|----------|------|
| [示例] | [场景编号] | [缺陷描述] | [高/中/低] | [打开/已修复/已验证] |

### 最终验收决策

**测试执行状态**: ⏳ 待执行

**验收标准完成度**:
- [ ] AC1: 独立能量逻辑模块管理0-100能量值 
- [ ] AC2: 模块提供添加、减少和获取当前能量功能
- [ ] AC3: 模块定义状态阈值 (happy, hungry, sick, dead)
- [ ] AC4: 所有核心逻辑都有单元测试覆盖

**最终验收结果**: ⏳ 待决策

**测试人员签名**: [待填写]
**日期**: [待填写]

## 备注
- 本文档基于 Story 1.2 的完成实现创建
- 测试应在清洁的环境中执行
- 如发现任何缺陷，请记录在缺陷记录表中
- 所有验收标准必须通过才能批准故事完成