# Story 4.1 手工验收文档
# 状态栏第一行可配置显示功能

## 测试信息
- **Story ID**: 4.1
- **Feature**: 状态栏第一行可配置显示
- **Test Date**: 2025-08-25
- **Tester**: [测试人员姓名]
- **Environment**: Development/Staging/Production
- **Build Version**: 1.1.2+

## 验收标准概览

### AC1: UserConfig接口扩展支持line1配置
✅ line1配置结构与line2/line3一致  
✅ 包含enabled和items配置项  
✅ 默认配置保持现有5个元素行为

### AC2: 支持完整的line1显示元素
✅ 支持所有6个显示元素类型  
✅ pet-name元素显示占位符

### AC3: StatusBarFormatter支持line1配置
✅ 第一行支持配置化格式  
✅ 与line2/line3配置逻辑一致

### AC4: 向后兼容性保证
✅ 无line1配置时使用默认行为  
✅ 现有配置文件无需迁移

### AC5: 配置验证和错误处理
✅ 验证无效配置项  
✅ 提供清晰错误信息

---

## 测试用例 1: 基本line1配置功能
**测试目标**: 验证基本的line1配置设置和显示

### 1.1 默认配置验证
**步骤**:
1. 确保没有现有配置文件: `rm ~/.claude-pet/config.json`
2. 运行CLI: `node dist/ccpet.js`
3. 检查配置: `node dist/ccpet.js config list`

**预期结果**:
- 显示包含完整5个元素: 表情、能量条、能量值、累积token、终身token
- 配置文件包含默认line1设置:
```json
{
  "display": {
    "line1": {
      "enabled": true,
      "items": ["expression", "energy-bar", "energy-value", "accumulated-tokens", "lifetime-tokens"]
    }
  }
}
```

**实际结果**: ✅ Pass / ❌ Fail  
**备注**: _记录任何差异_

---

### 1.2 自定义line1配置
**步骤**:
1. 设置自定义line1配置:
   ```bash
   node dist/ccpet.js config set display.line1.items "expression,energy-value"
   ```
2. 运行CLI查看结果: `node dist/ccpet.js`
3. 验证配置: `node dist/ccpet.js config list`

**预期结果**:
- 状态栏第一行只显示: `🐶(^_^) 75.00` (表情和能量值)
- 配置文件正确更新items数组

**实际结果**: ✅ Pass / ❌ Fail  
**备注**: _记录显示内容_

---

### 1.3 line1启用/禁用功能
**步骤**:
1. 禁用line1: `node dist/ccpet.js config set display.line1.enabled false`
2. 运行CLI: `node dist/ccpet.js`
3. 重新启用: `node dist/ccpet.js config set display.line1.enabled true`
4. 再次运行CLI: `node dist/ccpet.js`

**预期结果**:
- 禁用时: 不显示第一行，直接显示line2/line3内容
- 启用后: 恢复第一行显示

**实际结果**: ✅ Pass / ❌ Fail  
**备注**: _记录显示行数变化_

---

## 测试用例 2: 所有支持的line1元素类型
**测试目标**: 验证每个支持的元素类型正确显示

### 2.1 单个元素测试
**步骤**: 依次测试每个支持的元素

#### expression (表情符号)
```bash
node dist/ccpet.js config set display.line1.items "expression"
node dist/ccpet.js
```
**预期**: 只显示动物表情如 `🐶(^_^)`

#### energy-bar (能量条)
```bash
node dist/ccpet.js config set display.line1.items "energy-bar"
node dist/ccpet.js
```
**预期**: 只显示能量条如 `●●●●●●●○○○`

#### energy-value (能量数值)
```bash
node dist/ccpet.js config set display.line1.items "energy-value"
node dist/ccpet.js
```
**预期**: 只显示数值如 `75.23`

#### accumulated-tokens (累积token)
```bash
node dist/ccpet.js config set display.line1.items "accumulated-tokens"
node dist/ccpet.js
```
**预期**: 只显示如 `(2.5K)`

#### lifetime-tokens (终身token)
```bash
node dist/ccpet.js config set display.line1.items "lifetime-tokens"
node dist/ccpet.js
```
**预期**: 只显示如 `💖44.77M`

#### pet-name (宠物名称占位符)
```bash
node dist/ccpet.js config set display.line1.items "pet-name"
node dist/ccpet.js
```
**预期**: 显示占位符 `Pet`

**测试结果汇总**:
- expression: ✅ Pass / ❌ Fail
- energy-bar: ✅ Pass / ❌ Fail  
- energy-value: ✅ Pass / ❌ Fail
- accumulated-tokens: ✅ Pass / ❌ Fail
- lifetime-tokens: ✅ Pass / ❌ Fail
- pet-name: ✅ Pass / ❌ Fail

### 2.2 元素组合测试
**步骤**:
```bash
node dist/ccpet.js config set display.line1.items "expression,pet-name,energy-value"
node dist/ccpet.js
```

**预期结果**: 显示如 `🐶(^_^) Pet 75.23`

**实际结果**: ✅ Pass / ❌ Fail

---

## 测试用例 3: 配置验证和错误处理
**测试目标**: 验证无效配置的处理机制

### 3.1 无效元素过滤
**步骤**:
```bash
node dist/ccpet.js config set display.line1.items "expression,invalid-item,energy-bar,another-bad-item"
node dist/ccpet.js
```

**预期结果**:
- 控制台显示警告: "Invalid line1 items ignored: invalid-item, another-bad-item"
- 实际显示只包含有效元素: 表情和能量条

**实际结果**: ✅ Pass / ❌ Fail  
**警告信息**: _记录实际警告内容_

### 3.2 全部无效元素处理
**步骤**:
```bash
node dist/ccpet.js config set display.line1.items "invalid1,invalid2,bad-item"
node dist/ccpet.js
```

**预期结果**:
- 显示警告消息
- 自动回退到默认5元素显示

**实际结果**: ✅ Pass / ❌ Fail

### 3.3 空配置数组处理
**步骤**:
```bash
node dist/ccpet.js config set display.line1.items ""
node dist/ccpet.js
```

**预期结果**:
- 使用默认配置显示
- 无错误或崩溃

**实际结果**: ✅ Pass / ❌ Fail

---

## 测试用例 4: 向后兼容性验证
**测试目标**: 确保现有配置和无配置情况正常工作

### 4.1 无line1配置的旧配置文件
**步骤**:
1. 创建不包含line1的配置文件:
```bash
cat > ~/.claude-pet/config.json << 'EOF'
{
  "colors": {
    "petExpression": "#FF0000"
  },
  "display": {
    "maxLines": 2,
    "line2": {
      "enabled": true,
      "items": ["input", "output"]
    }
  }
}
EOF
```
2. 运行CLI: `node dist/ccpet.js`

**预期结果**:
- 第一行显示默认的5个元素
- 第二行显示配置的input/output
- 无错误或警告

**实际结果**: ✅ Pass / ❌ Fail

### 4.2 完全无配置文件场景
**步骤**:
1. 删除配置文件: `rm ~/.claude-pet/config.json`
2. 运行CLI: `node dist/ccpet.js`

**预期结果**:
- 创建包含line1默认配置的新配置文件
- 显示默认的3行布局

**实际结果**: ✅ Pass / ❌ Fail

---

## 测试用例 5: 与其他配置选项集成
**测试目标**: 验证line1配置与现有功能的协调工作

### 5.1 maxLines限制测试
**步骤**:
```bash
node dist/ccpet.js config set display.maxLines 1
node dist/ccpet.js config set display.line1.enabled true
node dist/ccpet.js config set display.line2.enabled true
node dist/ccpet.js
```

**预期结果**: 只显示第一行，遵循maxLines=1限制

**实际结果**: ✅ Pass / ❌ Fail

### 5.2 多行配置协调
**步骤**:
```bash
node dist/ccpet.js config set display.maxLines 3
node dist/ccpet.js config set display.line1.items "expression,energy-value"
node dist/ccpet.js config set display.line2.items "input,total"
node dist/ccpet.js config set display.line3.items "cost"
```

运行后给宠物喂食一些token并查看完整显示

**预期结果**:
- Line1: 表情 + 能量值
- Line2: Input + Total token信息  
- Line3: Cost信息
- 3行协调显示，格式正确

**实际结果**: ✅ Pass / ❌ Fail

---

## 测试用例 6: 颜色配置兼容性
**测试目标**: 验证line1元素的颜色配置正常工作

### 6.1 自定义颜色设置
**步骤**:
```bash
node dist/ccpet.js config set colors.petExpression "#00FF00"
node dist/ccpet.js config set colors.energyValue "#FF0000"
node dist/ccpet.js config set display.line1.items "expression,energy-value"
node dist/ccpet.js
```

**预期结果**: 
- 表情显示绿色
- 能量值显示红色
- 其他元素使用默认颜色

**实际结果**: ✅ Pass / ❌ Fail  
**注意**: 在支持ANSI颜色的终端中测试

---

## 测试用例 7: 性能和稳定性
**测试目标**: 验证配置变更的性能和稳定性

### 7.1 频繁配置变更
**步骤**: 快速执行多次配置变更
```bash
for i in {1..10}; do
  node dist/ccpet.js config set display.line1.items "expression"
  node dist/ccpet.js config set display.line1.items "energy-bar"
  node dist/ccpet.js >/dev/null
done
```

**预期结果**: 
- 无崩溃或错误
- 配置正确保存和加载
- 性能稳定

**实际结果**: ✅ Pass / ❌ Fail

---

## 边界条件测试

### 7.1 极长配置字符串
**步骤**:
```bash
# 测试非常长的无效项列表
node dist/ccpet.js config set display.line1.items "$(python3 -c 'print(",".join(["invalid"+str(i) for i in range(100)]))')"
```

**预期结果**: 系统优雅处理，显示适当警告

### 7.2 特殊字符处理
**步骤**: 测试包含特殊字符的配置项
```bash
node dist/ccpet.js config set display.line1.items "expression,energy-bar,@#$%^&*()"
```

**预期结果**: 过滤无效字符，保留有效项

---

## 验收签署

### 功能验收结果
- [ ] AC1 - UserConfig接口扩展: ✅ Pass / ❌ Fail
- [ ] AC2 - 完整显示元素支持: ✅ Pass / ❌ Fail
- [ ] AC3 - StatusBarFormatter支持: ✅ Pass / ❌ Fail
- [ ] AC4 - 向后兼容性: ✅ Pass / ❌ Fail
- [ ] AC5 - 配置验证处理: ✅ Pass / ❌ Fail

### 测试总结
**通过的测试用例**: ___/30  
**失败的测试用例**: ___/30  
**阻塞问题**: ___个  
**非阻塞问题**: ___个  

### 已知问题
1. **问题描述**: _如有问题请详细描述_
   - 严重程度: High/Medium/Low
   - 影响: _描述用户影响_

### 验收决定
- [ ] ✅ **PASS** - 功能满足验收标准，可以发布
- [ ] ❌ **FAIL** - 存在阻塞问题，需要修复后重新测试
- [ ] ⏸️ **HOLD** - 存在非阻塞问题，建议修复但不阻塞发布

### 签名确认
**测试人员**: _________________ **日期**: _______  
**产品负责人**: _________________ **日期**: _______  
**技术负责人**: _________________ **日期**: _______

---

## 附录

### 测试环境信息
- **操作系统**: _____________
- **Node.js版本**: _____________
- **终端**: _____________
- **Claude Code版本**: _____________

### 测试数据备份
**配置文件位置**: `~/.claude-pet/config.json`
**宠物状态文件**: `~/.claude-pet/pet-state.json`

### 回滚计划
如果验收失败，回滚步骤:
1. 恢复到Story 3.1版本
2. 验证原有功能正常
3. 通知开发团队修复问题

---

**文档版本**: 1.0  
**最后更新**: 2025-08-25  
**创建者**: Dev Agent James