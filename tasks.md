# 添加同住人功能 - 实施计划

## Task 1: 前台系统 — 数据模型兜底（companions 字段）
- **Status**: `completed`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 `酒店前台管理系统-最新版.html` 的 `seed()` 返回的 `seq` 中增加 `companion: 1`。
  - 在 `load()` 的历史数据兜底段：对每个 reservation 补 `r.companions = r.companions || []`；补 `state.seq.companion`。
  - 新增助手函数 `companionsOfRes(resId)` 与生成同住人 id/时间戳的小工具（供后续任务使用）。
- **Acceptance Criteria Addressed**: AC-1, AC-4, AC-10
- **Test Requirements**:
  - `rule` TR-1.1: 用旧数据（删除 reservations 中 companions 概念的现有 localStorage）打开前台页面无报错，控制台无异常；任意订单在控制台/UI 路径上 companions 均为数组。Evidence：浏览器打开 + 添加流程间接验证。
  - `rule` TR-1.2: seed 重置数据后 `state.seq.companion===1`，重复 load 不覆盖已有 companions。Evidence：代码检查 + resetData 后走查。

## Task 2: 前台系统 — 同住人管理弹窗
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 新增弹窗 `modalCompanions`（复用 `.overlay/.modal/.form-row/.form-err/.btn` 等现有类），含：订单概要区 `companionOrderInfo`、错误区 `companionErr`、新增表单（姓名 `cpName` 必填、手机号 `cpPhone`、证件号 `cpIdNo`）、「＋ 添加同住人」按钮、列表容器 `companionList`。
  - 实现 `openCompanions(resId)`：校验订单存在且状态属于 reserved/checkedIn，否则 toast 拒绝；渲染概要与列表后打开弹窗。
  - 实现 `renderCompanionList()`：展示姓名/手机（未填显示 —）/证件号/登记时间/渠道（前台/自助），每条提供「删除」按钮（confirm 二次确认 → splice → save → 刷新列表与角标）。
  - 实现 `submitCompanionForm()`：姓名必填；手机号选填但若填长度 ≥5；生成 `{id:"C"+seq.companion++, name, phone, idNo, addedAt, addedBy:"front"}` push 入 `r.companions`，save 后清空表单、重渲染、toast。
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-4
- **Test Requirements**:
  - `rule` TR-2.1: reserved 与 checkedIn 订单均可打开弹窗并添加；填写姓名保存后列表新增一行，字段与渠道「前台」正确；重开弹窗数据持久。Evidence：浏览器实测。
  - `rule` TR-2.2: 缺姓名被行内错误拦截；手机号短于 5 位被拦截；删除需 confirm 且删除后列表与 state 同步更新。Evidence：浏览器实测。
  - `rule` TR-2.3: 对 checkedOut/cancelled 订单调用 openCompanions 被拒绝且不写数据。Evidence：代码检查/控制台调用。

## Task 3: 前台系统 — 列表入口与同住人角标
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - `renderReservations()`：reserved 订单操作区在「办理入住」旁增加「同住人」按钮；checkedIn 订单操作区增加「同住人」按钮；客人名后追加同住人角标（`👥N`，N=0 不显示）。
  - `renderOccupied()`：每行操作区增加「同住人」按钮；客人名/房号处显示同样角标。
  - 弹窗内增删后调用 render()/对应 render 函数使角标即时更新。
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-4
- **Test Requirements**:
  - `rule` TR-3.1: 预订管理「待入住」tab 的 reserved 行与「在住」tab 的 checkedIn 行均出现「同住人」按钮且 onclick 携带正确订单 id；终结状态行无按钮。Evidence：浏览器实测/DOM 检查。
  - `rule` TR-3.2: 添加/删除同住人后两个列表的 👥 角标数量即时正确；无同住人时不显示角标。Evidence：浏览器实测。

## Task 4: 自助系统 — 数据兜底、独立菜单与屏幕骨架
- **Status**: `completed`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - `自助入住系统-最新版.html` 的 `loadFresh()` 兜底段：reservations 逐项补 `companions`；`state.seq` 存在时补 `state.seq.companion`。
  - 欢迎页 `scr-welcome` 新增大按钮「添加同住人」（👥，副标题：输入在住房号，为同行人办理入住登记），onclick=`goCompanion()`。
  - 新增两个屏幕：
    - `scr-companion-room`：标题「添加同住人」，房号输入框 `cpRoomInput`、错误区 `companionRoomErr`、按钮「返回首页 / 确认下一步」。
    - `scr-companion-add`：订单概要 `cpOrderInfo`、当前同住人列表 `cpList`、错误区 `cpAddErr`、表单（姓名 `cpSelfName`、手机号 `cpSelfPhone`、证件号 `cpSelfIdNo`）、按钮「添加同住人」「返回首页」。
  - 实现 `goCompanion()`：loadFresh + 清空首步输入/错误 + showScreen 首步（沿用全局系统锁；不新增单业务开关）。
  - 样式仅复用现有类（.panel/.big-title/.sub-title/.form-row/.input/.btn-row/.btn/.detail-row/.notice 等）。
- **Acceptance Criteria Addressed**: AC-1, AC-5, AC-11
- **Test Requirements**:
  - `rule` TR-4.1: 欢迎页出现新菜单，点击后仅显示房号输入屏；旧数据加载无报错。Evidence：浏览器实测。
  - `rubric` TR-4.2: 视觉/交互一致性；scale 1-5；anchors 1=风格突兀 3=基本可用但有样式缺口 5=与换房/续住房务体验无差异；threshold >=4；evidence 逐屏走查。

## Task 5: 自助系统 — 房号校验与同住人登记逻辑
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 4
- **Description**:
  - 实现 `confirmCompanionRoom()`：loadFresh；空值提示「请输入房号」；房号不存在提示「未找到该房间，请核对房号」；无 checkedIn 订单提示「该房间当前没有在住订单，无法添加同住人」；通过则记录全局 `companionResId`，渲染概要（订单/房号/主客人/入住~离店）与现有同住人列表，进入第二屏。
  - 实现 `renderCpSelfList()`：列出该订单 companions（姓名/手机/证件号/登记时间/渠道显示 前台/自助），自助端不提供删除。
  - 实现 `submitCompanionSelf()`：姓名必填；手机若填 ≥5 位；黑名单守卫（见 Task 6）；写入 `{id:"C"+seq.companion++, name, phone, idNo, addedAt, addedBy:"self"}`，save→清空表单→重渲染列表→toast「同住人登记成功」→`bumpVerifyCount("同住人", res)`；可连续添加。
  - 提供返回首页；保证数据与前台共享同一订单（AC-1/AC-7）。
- **Acceptance Criteria Addressed**: AC-6, AC-7, AC-10
- **Test Requirements**:
  - `rule` TR-5.1: 空值/999/非在住房号/在住房号（如 505）四种输入分别得到预期拦截或进入第二步。Evidence：浏览器实测四组用例。
  - `rule` TR-5.2: 添加两位同住人后列表顺序展示、addedBy=self、表单清空可继续添加；前台系统打开同一订单可见这两条记录。Evidence：两端浏览器联调。
  - `rule` TR-5.3: 对该订单执行自助换房/续住后，同住人仍保留在同一订单并可在同住人界面查到。Evidence：走查一次换房或续住。

## Task 6: 自助系统 — 接入随机人工核验与黑名单
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 5
- **Description**:
  - `confirmCompanionRoom()` 房号校验通过时：先对主客人 `guardBlacklist(g.phone,g.name)`；再 `var _trig = recordQueryCount("同住人", roomNo, g.name, g.phone)`；切到第二屏后 `firePendingVerify(_trig)`（浮层覆盖在登记屏上，与 walkin 选房页同样模式）。
  - `submitCompanionSelf()` 保存前对同住人 `guardBlacklist(phone,name)`；保存成功后调用 `bumpVerifyCount("同住人", res)` 补全 selfServiceLogs。
  - 不新增 BIZ_NAMES 业务开关条目；但来源文本「同住人」会被前台监控/核验表格按现有逻辑直接显示；确认 `restoreActiveVerify()`、storage 事件刷新在新屏幕下无副作用。
- **Acceptance Criteria Addressed**: AC-8, AC-9, AC-11
- **Test Requirements**:
  - `rule` TR-6.1: 命中触发位置时点「确认下一步」即弹核验浮层，浮层来源显示「同住人」与主客人；前台生成有效 10 位码输入后通过并可继续添加；未命中位置不弹。Evidence：浏览器实测（可连续操作或检视 verifyCounter.triggerPositions）。
  - `rule` TR-6.2: 前台「实时监控」出现来源「同住人」记录，前台「人工核验」记录与「远程核验」来源列显示「同住人」，且前台手动触发核验可在自助端正常弹出。Evidence：两端联调。
  - `rule` TR-6.3: 主客人在黑名单时查询被拦截；同住人姓名/手机命中黑名单时保存被拦截，均显示既有黑名单浮层，不能写入 companions。Evidence：浏览器实测（前台加入黑名单后复测）。

## Task 7: 端到端验证与回归
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 3, Task 6
- **Description**:
  - 用浏览器打开两个 HTML，重置/沿用数据走查：前台预订/在住两入口增删同住人、角标；自助菜单→房号校验→（含核验命中与未命中两轮）→连续添加→前台核对；黑名单拦截；换房/续住后数据保留。
  - 回归：原有入住/开房/退房/续住/换房/早餐券/服务铃流程不受影响；控制台无 JS 错误。
- **Acceptance Criteria Addressed**: AC-1 ~ AC-11
- **Test Requirements**:
  - `rule` TR-7.1: 上述全部 rule 型 AC 在浏览器中得到通过证据（DOM/界面结果）。Evidence：验证记录。
  - `rubric` TR-7.2: 两端新增界面交互质量与系统一致性 >=4 分；既有流程零回归。Evidence：完整走查记录。

---

## Completion Evidence（2026-05-27）

**验证方式**：Node + jsdom 双页（两个 HTML 同源共享 localStorage）确定性 E2E 脚本 `.trae/verify-tmp/test.mjs`（**30 项断言，0 运行时错误**；独立审查员另拟 16 项补充断言亦全部通过），另经多轮真实浏览器（http://localhost:8765）UI 走查（菜单、房号校验、核验浮层来源文本「来源：同住人 · 客人：张伟」、跨端可见性、控制台无红色错误）。审查后对 L-1/L-2/L-3 修复再跑 30 项断言，仍为 ALL PASS。

| 用例 | 结果 | 覆盖 |
|---|---|---|
| c1_added / c1_badge / c1_persist | PASS | AC-2：reserved 订单添加、👥1 角标、重开持久 |
| c4_noname_blocked / c4_phone_blocked | PASS | AC-2/FR-4：缺姓名、手机短于 5 位拦截 |
| c2_occupied | PASS | AC-3：checkedIn 订单（R1001/505）添加+角标 |
| c3_checkedout_rejected | PASS | AC-4：checkedOut 订单 openCompanions 拒绝且不写数据 |
| c5_deleted / c5_readd | PASS | AC-2：confirm 删除、角标消失、可重新添加 |
| c6_menu / c6_room_screen | PASS | AC-5：欢迎页大按钮、首步仅房号输入 |
| c7_empty / c7_999 / c7_702 / c7_505 / c7_info / c7_no_overlay | PASS | AC-6/AC-8：空/不存在/仅预订/在住四种房号，未命中触发位不弹浮层 |
| c8_noname / c8_counts(total3,self2,front1) / c8_list | PASS | AC-7：校验、连续添加、渠道标记、列表展示 |
| e1_overlay / e1_source / e2_passed / e2_status / e2_closed | PASS | AC-8：命中弹倒计时浮层、来源「同住人」+主客人、10 位码通过、日志 persisted、关闭后停留登记屏 |
| g_blocked / g_notAdded | PASS | AC-9：黑名单同住人提交被「无法办理业务」拦截且不写入 |
| ac10_swap / ac10_query | PASS | AC-10：真实 confirmSwapRoom 换房后 companions 不丢，新房号同住人界面可见 |
| c9_cross / c9_channels | PASS | AC-1：前台 load() 后见自助登记两人；列表含「自助」「前台」渠道 |
| f_monitor / f_manual / f_passed_log / f_sslog | PASS | AC-8/FR-11：monTbody/mvTbody 含「同住人」，passed 核验日志与 3 条自助操作记录 |
| h_swap | PASS | 回归：换房菜单入口正常 |

**顺带修复的既有缺陷（非本功能引入）**：`自助入住系统-最新版.html` 的 `confirmSwapRoom()` 成功屏渲染引用了 HTML 中不存在的 `#vNo/#vType/#vName/#vTime/#successDetail`，真实浏览器中换房数据虽已提交但随后抛 TypeError、成功屏不显示（用户停在确认页）。已改用成功屏既有 ID（succRoom/succMeta/succOut/successSub）渲染，与 `showSuccess()` 模式一致。修复后 ac10_swap/ac10_query 实测通过。

**代码位置**：
- 前台：`companionsOfRes/companionBadge/nowMinuteStr`（助手区 ~2161 行）；`modalCompanions` 弹窗（~1497 行）；`openCompanions/renderCompanionList/submitCompanionForm/deleteCompanion`（~3124 行起）；renderReservations/renderOccupied 入口与角标；seed seq + load 兜底。
- 自助：欢迎页 goCompanion 按钮；scr-companion-room / scr-companion-add 两屏（~559-587 行）；`goCompanion/confirmCompanionRoom/renderCpSelf/submitCompanionSelf`（2068-2150 行）；复用 recordQueryCount/firePendingVerify/bumpVerifyCount/guardBlacklist，未新增 BIZ_NAMES 开关。

