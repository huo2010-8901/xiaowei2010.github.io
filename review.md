# 独立审查报告

- 审查对象：`酒店前台管理系统-最新版.html`、`自助入住系统-最新版.html`（共享 localStorage 键 `hms_lanting_v1`）
- 审查方式：独立代码走查（未采信 tasks.md 完成证据的结论，仅用作线索）+ 复跑确定性测试 + 自拟 16 项补充断言
- 审查日期：2026-09-21
- 审查范围：添加同住人功能（AC-1~AC-11）、顺带修复的 confirmSwapRoom 成功屏缺陷、既有流程回归面

## 结论（pass / fail）

**pass**

- AC-1~AC-10（rule 型）全部通过；AC-11（rubric）评分 **4/5**，达到 ≥4 阈值。
- 官方测试 `.trae/verify-tmp/test.mjs` 复跑结果：**ALL PASS，运行时错误 0**（28+ 项断言）。
- 审查员另建临时补充脚本（已按要求删除）覆盖官方测试盲区 16 项：**EXTRA ALL PASS，运行时错误 0**。
- 未发现严重/中级缺陷；仅有 3 条低级问题（其中 2 条为既存机制特性、非本功能引入）与 2 条信息项。
- 顺带修复（换房成功屏）经核实**正确且必要**，全文件无失效引用残留。

## AC 逐条裁定

| AC | 结论 | 证据：代码位置或测试用例 | 备注 |
|---|---|---|---|
| AC-1 旧数据兼容与两端互通 | **pass** | 前台 `load()` 兜底 [酒店前台管理系统-最新版.html#L2119-L2124](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/酒店前台管理系统-最新版.html#L2119-L2124)、seed `seq.companion:1` [#L2009](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/酒店前台管理系统-最新版.html#L2009)；自助 `loadFresh()` 兜底 [自助入住系统-最新版.html#L679-L680](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/自助入住系统-最新版.html#L679-L680)；官方用例 c9_cross/c9_channels；补充用例 x1_front_arrays/x1_front_seq/x2_self_arrays/x2_self_seq（手工构造"无 companions、无 seq.companion"旧数据，两端均兜底为 `[]`/`1`） | 两端同键同结构，前台写入→自助可见、反之亦然，均经实测 |
| AC-2 前台预订（reserved）可管理 | **pass** | 弹窗 [#L1498-L1525](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/酒店前台管理系统-最新版.html#L1498-L1525)；`openCompanions/renderCompanionList/submitCompanionForm/deleteCompanion` [#L3132-L3223](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/酒店前台管理系统-最新版.html#L3132-L3223)；reserved 入口 [#L2940-L2945](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/酒店前台管理系统-最新版.html#L2940-L2945)；用例 c1_added（addedBy="front"）、c1_badge（👥1）、c1_persist、c4_noname_blocked、c4_phone_blocked、c5_deleted、c5_readd | 新增/角标/持久化/删除四要素全部实测；删除有 confirm 二次确认 [#L3217](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/酒店前台管理系统-最新版.html#L3217) |
| AC-3 前台 checkedIn 两入口一致 | **pass** | 预订表 checkedIn 分支按钮 [#L2946-L2951](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/酒店前台管理系统-最新版.html#L2946-L2951)；在住表按钮 [#L3300](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/酒店前台管理系统-最新版.html#L3300)；两处共用 `companionsOfRes(resId)` [#L2192-L2197](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/酒店前台管理系统-最新版.html#L2192-L2197) 与同一弹窗；用例 c2_occupied（R1001/505） | 同一订单同一份数据，无分叉 |
| AC-4 walk-in/新建订单与终结态 | **pass** | 状态门禁 [#L3136-L3138](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/酒店前台管理系统-最新版.html#L3136-L3138)；提交时二次门禁 [#L3183-L3185](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/酒店前台管理系统-最新版.html#L3183-L3185)；终结态行渲染"—"无入口 [#L2952-L2954](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/酒店前台管理系统-最新版.html#L2952-L2954)；用例 c3_checkedout_rejected（R1005）；补充用例 x3_cancelled_rejected（手工置 cancelled，弹窗不打开） | 官方测试仅覆盖 checkedOut，cancelled 由补充测试确认，同一分支 |
| AC-5 自助独立菜单 | **pass** | 欢迎页第 7 个大按钮（`.big-btn`，👥，副标题"输入在住房号，为同行入住人办理实名登记"）[自助入住系统-最新版.html#L352-L355](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/自助入住系统-最新版.html#L352-L355)；首步屏 [#L560-L569](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/自助入住系统-最新版.html#L560-L569)；用例 c6_menu（精确断言 `button.big-btn[onclick="goCompanion()"]`）、c6_room_screen（首屏 active 且次屏不 active） | 大按钮为全宽堆叠布局，第 7 个不破坏排版 |
| AC-6 房号前置强制校验 | **pass** | 空值/无房/无在住订单三拦截 [#L2076-L2084](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/自助入住系统-最新版.html#L2076-L2084)，文案分别为"请输入房号""未找到房间 X""房间 X 当前没有在住订单…"；用例 c7_empty/c7_999/c7_702（702 为仅预订房 R1003）/c7_505/c7_info（概要含 505 与张伟）；补充 x4_maintenance_blocked（302 维修房）、x4_vacant_blocked（501 空房） | 三种错误均停留在本屏，合法才入第二步；维修/空房落入同一"无在住订单"分支，符合 FR-7 |
| AC-7 自助连续添加与展示 | **pass** | `submitCompanionSelf` [#L2121-L2143](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/自助入住系统-最新版.html#L2121-L2143)：姓名必填、手机≥5、`addedBy:"self"`、保存后 `renderCpSelf()` 清表单+toast+焦点回姓名框；列表渲染 [#L2105-L2114](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/自助入住系统-最新版.html#L2105-L2114)；用例 c8_noname、c8_counts（total3/self2/front1）、c8_list（孙/周自助 + 李在住同屏可见） | 连续添加两位实测通过；自助端无删除入口，符合 Non-Goal |
| AC-8 随机人工核验接入 | **pass** | 查询通过时 `recordQueryCount("同住人",房号,姓名,手机)`+`firePendingVerify(_trig)` [#L2088-L2092](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/自助入住系统-最新版.html#L2088-L2092)；成功后 `bumpVerifyCount("同住人", r)` [#L2140](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/自助入住系统-最新版.html#L2140)；浮层来源/客人直出 [#L1800](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/自助入住系统-最新版.html#L1800)；前台三处 source 直出：监控 [#L4775](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/酒店前台管理系统-最新版.html#L4775)、人工核验 [#L4621](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/酒店前台管理系统-最新版.html#L4621)、远程核验 [#L4917](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/酒店前台管理系统-最新版.html#L4917) 及详情 [#L4951](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/酒店前台管理系统-最新版.html#L4951)；用例 c7_no_overlay（未命中不弹）、e1_overlay/e1_source（"来源：同住人"+张伟）、e2_passed/e2_status（10 位码 passed 日志）/e2_closed、f_monitor/f_manual/f_passed_log/f_sslog=3 | 计数/触发/倒计时/处理码/日志完全复用既有函数，未复制逻辑；前台手动触发走通用 `triggerManualFromFront`（按 log id），代码路径同样适用 |
| AC-9 超时拉黑/黑名单一致 | **pass** | 房号查询时主客人守卫 [#L2086](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/自助入住系统-最新版.html#L2086)；提交时同住人守卫 [#L2131](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/自助入住系统-最新版.html#L2131)；黑名单浮层为既有 verifyOverlay 样式 [#L1602-L1617](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/自助入住系统-最新版.html#L1602-L1617)；超时拉黑复用 `onVerifyTimeout`，拉黑原因带来源 [#L1913-L1934](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/自助入住系统-最新版.html#L1913-L1934)；用例 g_blocked/g_notAdded；补充 x5_guest_blocked/x5_stay_room_screen/x5_no_log_written（主客张伟入黑名单→505 确认即弹"无法办理业务"、停留首屏、不写自助日志） | 官方测试只覆盖"同住人黑名单"，主客人黑名单由补充测试确认；超时路径未做时钟快进实测，但函数逐行未改动、调用点与其他业务相同，按逻辑复用裁定 |
| AC-10 换房/续住不丢同住人 | **pass** | companions 挂 reservation；换房仅改 `r.roomNo` 与房态 [#L1481-L1487](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/自助入住系统-最新版.html#L1481-L1487)；续住仅改 `outDate` [#L1366](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/自助入住系统-最新版.html#L1366)；前台入住/取消亦为原地改状态 [#L3074-L3126](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/酒店前台管理系统-最新版.html#L3074-L3126)，无对象重建；用例 ac10_swap（真实 confirmSwapRoom 后 companions 条数不变、房号已换）、ac10_query（新房号同住人屏可见孙自助/李在住）；补充 x9_self_kept/x9_front_sees（续住改 outDate 后数组逐字节不变且前台可见） | 官方测试只测换房，续住由补充测试确认 |
| AC-11 交互与视觉一致性 | **pass（4/5）** | 详见下方"AC-11 评分" | 达到 ≥4 阈值；扣分点：前台弹窗概要区 `.detail-row/.k/.v` 在前台无 CSS 定义（低级问题 L-1） |

## 测试复跑结果（ALL PASS 原文摘录、断言可信度评价）

### 复跑命令与原文摘录

在 `.trae/verify-tmp` 执行 `& "C:\Program Files\nodejs\node.exe" test.mjs`，退出码 0，原文末尾：

```
=== F2 跨端/监控 ===
{
 "c9_cross": true,
 "c9_channels": true,
 "f_monitor": true,
 "f_manual": true,
 "f_passed_log": true,
 "f_sslog": 3,
 "r1003_final": "赵重新"
}
=== 运行时错误 (0) ===
(none)
=== 结论 ===
ALL PASS
```

F1 段 9 项、S1 段 21 项（含 c8_counts 子断言 3 个）、F2 段 7 项全部 true。

### 断言可信度评价（未发现作弊式断言）

- **断言真实对应 AC**：均为"执行真实业务函数 → 校验真实 state/DOM"，例如 `resOf('R1003').companions[0].addedBy==='front'`、`companionBadge('R1003').indexOf('👥1')>=0`、`overlay.innerHTML.indexOf('来源：同住人')>=0`、`state.manualVerifyLogs.some(l=>l.source==='同住人'&&l.status==='passed')`。无永真断言、无只检查函数存在的空断言。
- **负向用例扎实**：缺姓名/短手机断言"数据未写入 **且** 错误区可见"；checkedOut 断言"条数不变 **且** 弹窗未打开"；黑名单断言"浮层文案 **且** 记录未写入"。
- **双端模型可信**：两个 JSDOM 注入同一 Map 模拟的 localStorage，等价同源双标签页；`confirm` 桩为 true（删除路径可执行）；VirtualConsole 收集 jsdomError，运行时错误计数为 0 是硬断言（process.exit 非 0）。
- **覆盖缺口**（审查员已用临时脚本补齐，脚本已删除）：
  1. 主客人黑名单在房号确认步被拦截（FR-10 前半句）官方未测 → 补充 x5 全中；
  2. cancelled 状态官方未测（仅 checkedOut）→ x3 确认；
  3. 维修房/空房官方未测（仅空/999/仅预订）→ x4 确认；
  4. "旧数据"官方用 seed() 间接覆盖（seed 订单本身无 companions 字段），未手工删除 `seq.companion` → x1/x2 直接构造旧数据确认；
  5. 续住留存在 AC-10 官方只测换房 → x9 确认；
  6. 跨端自增序号撞号风险 → x7 确认所有 C-id 全局唯一；登录门禁 → x8 确认；登记停留中订单被退房的状态守卫 → x6 确认。
- **测试能力边界（不影响裁定）**：jsdom 不渲染 CSS，视觉一致性须靠类名走查（已做，见 AC-11）；超时拉黑/远程核验未做时钟快进实测，按"逐行复用未改动的既有函数 + 来源参数透传"以代码检查裁定；storage 事件在单窗口 JSDOM 内不触发，跨端实时刷新未直接模拟，但 AC-1 措辞为"刷新/重新查询即可看到"，F2 的显式 `load()` 等价覆盖。

## 发现的问题

### 严重
无。

### 中
无。

### 低

- **L-1 前台同住人弹窗订单概要区使用了前台未定义的 CSS 类 `.detail-row/.k/.v`**
  - 文件/函数：[酒店前台管理系统-最新版.html `openCompanions`](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/酒店前台管理系统-最新版.html#L3144-L3148)（类名出现于 [#L3145-L3148](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/酒店前台管理系统-最新版.html#L3145-L3148)）
  - 理由：全文件 `<style>` 中无 `.detail-row`、`.detail-row .k`、`.detail-row .v` 规则（自助端 [自助入住系统-最新版.html#L73-L77](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/自助入住系统-最新版.html#L73-L77) 有完整定义：flex 两端对齐、虚线分隔、k 灰色/v 加粗）。因此概要四行渲染为无对齐、无分隔的普通流式文本。功能与可读性不受损（父容器 `#companionOrderInfo` 自带 13px muted 样式，房号有 `<b>`），且该类在既有的客人编辑弹窗 [#L1768-L1770](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/酒店前台管理系统-最新版.html#L1768-L1770) 已被同样"无样式"使用——属沿用既有写法，非本功能首创；自助端两屏使用同一组类则渲染正常。
  - 建议：在前台 `<style>` 补三条与自助端一致的 `.detail-row` 规则（最优，可同时修复客人编辑弹窗），或把概要区改为前台弹窗惯用的内联栅格。
- **L-2 `deleteCompanion` 未做登录/订单状态二次校验**
  - 文件/函数：[酒店前台管理系统-最新版.html `deleteCompanion`](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/酒店前台管理系统-最新版.html#L3211-L3223)
  - 理由：弹窗打开瞬间虽经 `openCompanions` 状态门禁（[#L3132-L3138](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/酒店前台管理系统-最新版.html#L3132-L3138)），但弹窗停留期间订单若被另一会话退房/取消，仍可删除同住人；`submitCompanionForm` 已有二次状态门禁（[#L3183-L3185](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/酒店前台管理系统-最新版.html#L3183-L3185)），删除路径不对称。现实触发窗口极小，且删除权按需求本就只在前台。
  - 建议：与提交保持一致，删除前补 `r.status` 判定（或接受现状，风险可忽略）。
- **L-3 换房成功屏大标题仍固定显示"入住办理成功"**
  - 文件/位置：[自助入住系统-最新版.html scr-success#L508](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/自助入住系统-最新版.html#L508)，`confirmSwapRoom` 仅改了 `#successSub` 副标题 [#L1493](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/自助入住系统-最新版.html#L1493)
  - 理由：本次顺带修复前换房即意图复用 scr-success，故大标题与换房场景不匹配是**既存文案问题、非本次引入**，副标题"换房成功：原 X → 新 Y · 订单 R…"已明确场景，不构成功能缺陷。
  - 建议：后续将大标题参数化（如 `showSuccess(r, source, title)`），不在本次必修范围。

### 信息项（既存机制特性，非本功能引入，记录备查）

- **I-1 `bumpVerifyCount` 总是补全"最后一条" selfServiceLog 且不校验 source**（[自助入住系统-最新版.html#L1620-L1637](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/自助入住系统-最新版.html#L1620-L1637)）。若客人在"同住人"房号确认后不添加而转办其他业务，"进行中/已办"状态存在小概率串记；这是既有五业务共用的设计，本功能照章接入，f_sslog 实测条数与来源正确。
- **I-2 房号校验通过即产生一条 `completed:false` 的「同住人」日志**（查询计数模式与入住/退房/续住/换房完全一致）；不添加直接返回首页时该记录留在监控"进行中"。属既有口径，FR-9 明确要求查询即计数，非缺陷。
- **I-3 前台 storage 事件整体替换 `state` 时未重跑 `load()` 兜底**（[酒店前台管理系统-最新版.html#L5405-L5423](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/酒店前台管理系统-最新版.html#L5405-L5423)）。因自助每次 `loadFresh()` 保存前已全量回填 companions，且前台 `companionsOfRes` 惰性兜底，实际无风险。

## 回归评估

- **换房修复（重点）**：修复正确。`confirmSwapRoom` 成功段 [#L1488-L1495](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/自助入住系统-最新版.html#L1488-L1495) 现写入 `succRoom/succMeta/succOut/successSub`，四个 ID 在 scr-success 中均真实存在（[#L509-L511](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/自助入住系统-最新版.html#L509-L511)），写法与 `showSuccess()` [#L1063-L1071](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/自助入住系统-最新版.html#L1063-L1071) 同模式（填字段→`showScreen("scr-success")`）。全文件再搜 `vNo/vType/vTime/successDetail` **零残留**；`vName` 仅为身份登记屏真实存在的输入框（[#L400](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/自助入住系统-最新版.html#L400)），与换房成功屏无关。真实换房链路 ac10_swap/ac10_query 通过。
- **既有入住**：`checkInRes` 原地改 `status` 与房态（[#L3074-L3086](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/酒店前台管理系统-最新版.html#L3074-L3086)），未触碰计费；reserved→checkedIn 后同住人自然保留且入口持续可用。
- **退房/取消**：均为原地改状态（[#L3116-L3126](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/酒店前台管理系统-最新版.html#L3116-L3126) 及退房流程），无计费逻辑改动；终结态自动失去同住人入口。
- **续住**：仅顺延 `outDate`、追加 extendLog/营收（[#L1354-L1383](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/自助入住系统-最新版.html#L1354-L1383)），x9 实测 companions 不变。
- **换房**：仅改 `r.roomNo` 与两间房房态、不调价（同房型），ac10 实测数据不丢。
- **早餐券/服务铃**：代码走查未见任何相关函数改动；storage 事件中 voucher/bell 的刷新分支原样保留（[自助入住系统-最新版.html#L2059](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/自助入住系统-最新版.html#L2059)）。
- **隔离性（NFR-3）**：本功能为纯增量——新增 1 个前台弹窗、2 个自助屏、4+4 个函数、2 处兜底、列表按钮/角标；既有业务函数本体零修改（唯一修改即换房成功屏失效引用修复，属纠偏）。测试全程运行时错误 0，h_swap 等回归用例通过。
- **Non-Goal 遵守**：`BIZ_NAMES` 未新增 companion 条目（[自助入住系统-最新版.html#L697](file:///c:/Users/admin/Desktop/酒店管理系统-最新版/自助入住系统-最新版.html#L697)），沿用系统总开关；自助端无删除入口；不写 `state.guests`、无任何计费/商品字段改动；无新外部依赖/新文件。

## AC-11 评分

**4 / 5（通过，阈值 ≥4）**

加分依据：
- 自助欢迎页按钮与既有 6 个大按钮结构完全一致（`.big-btn > .ico + .t/.d`），全宽堆叠第 7 个无排版破坏；
- 两个新屏全部使用既有类：`.screen/.panel/.big-title/.sub-title/.form-err/.form-row/.form-2col/.input/.btn-row/.btn-(primary|ghost|gold)/.notice/.detail-row`，与退房/续住/换房/早餐券屏逐类对齐；`data-primary-action`、Enter 提交、自动聚焦、错误区 `showErr/hideErr` 模式均一致；
- 前台弹窗严格复刻 `modalExtend/modalMove/modalProductOrder` 的 `.overlay/.modal/modal-head/modal-body/modal-foot` 骨架、宽度内联风格、`.form-err/.form-2col/.table-wrap/.pill/.btn-danger.btn-sm`、toast 与 Enter 提交；
- 核验/黑名单浮层 100% 复用既有 verifyOverlay，来源文本与其他业务无差异；角标复用 `.pill`。

扣分依据：
- 前台弹窗概要区 `.detail-row/.k/.v` 在前台样式表中无定义（L-1），缺少自助端/设计意图中的两端对齐与虚线分隔，属"基本可用但有明显样式缺口"的边缘情形；不影响控件操作与信息完整度，故未低至 3 分。

## 未覆盖/遗留风险

1. **超时拉黑与远程核验路径未做运行时实测**：依赖对未改动函数（`onVerifyTimeout/onRemoteInvestigate/onRemotePassed/onRemoteFailed/restoreActiveVerify`）的逐行走查与来源参数透传确认；建议人工浏览器走查一次"同住人命中核验→等待超时→黑名单浮层→state.blacklist 落库"闭环（AC-9 Evidence 本身也允许以逻辑复用确认为准）。
2. **jsdom 不验证真实视觉**：AC-11 基于类名/结构走查评分，建议真机浏览器快速过一遍两端新界面（重点：前台弹窗概要区观感，即 L-1）。
3. **跨标签实时性**：前台弹窗打开期间，自助端新增的同住人不会即时刷新已打开弹窗的列表（storage 监听只 `render()` 后台列表，不重绘 `#companionList`）；重开弹窗即正确。AC-1 要求的是"刷新/重新查询可见"，满足；若追求弹窗内实时，可在 storage 监听中对已打开的 modalCompanions 调一次 `renderCompanionList()`。
4. **并发自增序号**：两端共用 `seq.companion` 并各自读后写，极端情况下双标签同时提交存在撞 id 的理论可能；既有 res/guest 等序号同机制，系统整体为单前台+单终端形态，风险可接受。
5. **无重复登记校验**：同名同证件可重复添加，需求未要求去重，按"只增不改留痕"口径视为可接受。
6. 审查环境无 git（命令不存在），无法以 diff 精确枚举改动行；结论基于全量 Grep/Read 走查与测试，未发现 spec/tasks 之外的可疑改动点。

## 修复回执（2026-05-27，审查后闭环）

报告中的 3 条低级问题已全部修复，并将官方确定性测试扩充至 **30 项断言后复跑：ALL PASS，运行时错误 0**：

- **L-1 已修复**：前台 `<style>` 末尾新增 `.detail-row/.detail-row .k/.detail-row .v` 规则（flex 两端对齐、虚线分隔，字号 13px 适配前台弹窗），同住人弹窗与既有的客人编辑弹窗同时生效。
- **L-2 已修复**：`deleteCompanion` 开头补登录校验与订单状态门禁（终结态订单 toast 拒绝、关闭弹窗、render()）；新增断言 `l2_checkedout_no_delete` 实测通过。
- **L-3 已修复**：`confirmSwapRoom` 成功段将 scr-success 大标题置为「换房成功」；`showSuccess()`（入住路径）复位为「入住办理成功」，避免标题串场景；新增断言 `ac10_title` 实测通过。

修复均为小范围增量，未改变任何计费/状态流转；AC-11 原扣分点（L-1）消除，其余结论维持 **pass**。信息项 I-1~I-3 与遗留风险 1/3/4/5 为既存机制口径或理论风险，按本次范围不做改动。

