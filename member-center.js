/* ================= 会员中心：总部同步 / 等级 / 优惠券 / 免房券 =================
   全局注册表 hms_members_v1：所有连锁门店共用，等级/积分/余额/券 实时同步总部。
   等级规则与优惠券模板仅总部(admin)可配置，连锁店只读。 */
var MG_KEY = "hms_members_v1";
var MG_LEVEL_LEGACY = { "普通": "普通会员", "银卡": "白银会员", "金卡": "黄金会员", "钻石": "钻石会员" };

function mgDefaultTiers() {
    return [
        { id: "t1", name: "普通会员", upAmount: 0, upPoints: 0, upPaid: 0, benefits: { points: 0, coupons: 0, vouchers: 0, birthday: false, balance: 0 } },
        { id: "t2", name: "黄金会员", upAmount: 2000, upPoints: 0, upPaid: 0, benefits: { points: 2000, coupons: 0, vouchers: 0, birthday: false, balance: 0 } },
        { id: "t3", name: "白银会员", upAmount: 5000, upPoints: 0, upPaid: 0, benefits: { points: 5000, coupons: 1, vouchers: 0, birthday: false, balance: 0 } },
        { id: "t4", name: "钻石会员", upAmount: 20000, upPoints: 10000, upPaid: 1998, benefits: { points: 10000, coupons: 3, vouchers: 2, birthday: false, balance: 0 } },
        { id: "t5", name: "白金会员", upAmount: 50000, upPoints: 30000, upPaid: 4998, benefits: { points: 30000, coupons: 5, vouchers: 4, birthday: false, balance: 0 } },
        { id: "t6", name: "星球会员", upAmount: 100000, upPoints: 50000, upPaid: 9998, benefits: { points: 50000, coupons: 10, vouchers: 4, birthday: true, balance: 0 } },
        { id: "t7", name: "星海会员", upAmount: 300000, upPoints: 0, upPaid: 0, benefits: { points: 100000, coupons: 20, vouchers: 8, birthday: true, balance: 10000 } },
        { id: "t8", name: "黑金会员", upAmount: 500000, upPoints: 0, upPaid: 0, benefits: { points: 200000, coupons: 40, vouchers: 16, birthday: true, balance: 30000 } }
    ];
}
function mgDefaultTpl() {
    return [
        { id: "cp1", name: "50元代金券", type: "cash", value: 50, minSpend: 200, validDays: 30 },
        { id: "cp2", name: "200元代金券", type: "cash", value: 200, minSpend: 1000, validDays: 60 },
        { id: "cp3", name: "8.8折优惠券", type: "discount", value: 8.8, minSpend: 500, validDays: 60 },
        { id: "cp4", name: "生日专属100元券", type: "cash", value: 100, minSpend: 0, validDays: 7, isBirthday: true }
    ];
}
function mgDefaultConfig() {
    return {
        pointsRate: 10,            // 每消费 1 元得多少积分（0=关闭）
        couponStackable: true,     // 优惠券是否可叠加
        couponMaxStack: 3,         // 最多叠加张数
        recharge: {                // 充值金额管控：默认 + 每店覆盖
            "default": { mode: "preset_custom", presets: [50, 100, 200, 500] },
            stores: {}
        }
    };
}
function mgNormalizeConfig(g) {
    if (!g.config || typeof g.config !== "object") g.config = {};
    var c = g.config, d = mgDefaultConfig();
    if (typeof c.pointsRate !== "number") c.pointsRate = d.pointsRate;
    if (typeof c.couponStackable !== "boolean") c.couponStackable = d.couponStackable;
    if (typeof c.couponMaxStack !== "number" || c.couponMaxStack < 1) c.couponMaxStack = d.couponMaxStack;
    if (!c.recharge || typeof c.recharge !== "object") c.recharge = { "default": { mode: "preset_custom", presets: [50, 100, 200, 500] }, stores: {} };
    if (!c.recharge["default"]) c.recharge["default"] = { mode: "preset_custom", presets: [50, 100, 200, 500] };
    if (!c.recharge.stores || typeof c.recharge.stores !== "object") c.recharge.stores = {};
}
function mgLoad() {
    try {
        var g = JSON.parse(localStorage.getItem(MG_KEY) || "null");
        if (g && Array.isArray(g.members)) {
            if (!Array.isArray(g.tiers) || !g.tiers.length) g.tiers = mgDefaultTiers();
            if (!Array.isArray(g.couponTemplates) || !g.couponTemplates.length) g.couponTemplates = mgDefaultTpl();
            g.seq = g.seq || 1;
            mgNormalizeConfig(g);
            return g;
        }
    } catch (e) {}
    var ng = { members: [], tiers: mgDefaultTiers(), couponTemplates: mgDefaultTpl(), seq: 1, config: mgDefaultConfig() };
    mgNormalizeConfig(ng);
    return ng;
}
function mgConfig() { return mgLoad().config || mgDefaultConfig(); }
function mgPointsRate() { var r = mgConfig().pointsRate; return (typeof r === "number" && r >= 0) ? r : 10; }
function mgCouponStackable() { return !!mgConfig().couponStackable; }
function mgCouponMaxStack() { var n = mgConfig().couponMaxStack; return (typeof n === "number" && n >= 1) ? Math.floor(n) : 1; }
/* ---- 充值金额管控：返回某店生效的 { mode, presets } ---- */
function mgRechargeRule(storeCode) {
    var g = mgLoad(), rc = (g.config && g.config.recharge) || {};
    var def = rc["default"] || { mode: "preset_custom", presets: [50, 100, 200, 500] };
    var ov = (storeCode && rc.stores && rc.stores[storeCode]) ? rc.stores[storeCode] : null;
    var mode = (ov && ov.mode) ? ov.mode : def.mode;
    var raw = (ov && Array.isArray(ov.presets) && ov.presets.length) ? ov.presets : def.presets;
    var presets = (raw || []).map(function (x) { return Number(x); }).filter(function (x) { return x > 0; }).sort(function (a, b) { return a - b; });
    if (!presets.length) presets = [50, 100, 200, 500];
    return { mode: mode, presets: presets, allowCustom: mode !== "preset_only", allowPreset: mode !== "custom_only" };
}
/* ---- 会员充值（后台）：仅增余额 + 记录，不计消费、不发积分 ---- */
function mgRecharge(m, amount, by) {
    if (!m || !(amount > 0)) return false;
    amount = Math.round(amount * 100) / 100;
    mgEnsureFields(m);
    m.balance = (m.balance || 0) + amount;
    m.recharges.push({ amount: amount, at: todayStr(), by: by || "", ts: Date.now() });
    if (typeof mgLog === "function") mgLog(m, "会员充值 +" + money(amount));
    mgTouch(m);
    if (typeof mgPush === "function") mgPush();
    return true;
}
function mgSave(g) { try { localStorage.setItem(MG_KEY, JSON.stringify(g)); } catch (e) {} }
function mgTiers() { return mgLoad().tiers; }
function mgTplList() { return mgLoad().couponTemplates; }
function mgTouch(m) { m.updatedAt = Date.now(); }
/* ---- 会员来源 / 可见性（连锁隔离）----
   source: "hq" = 总部新增；"store:<code>" = 某分店新增。
   可见性：总部可见全部；分店仅可见「本店新增」或「已在本店办过入住」的会员。
   编辑/删除：仅总部可操作。 */
function mgIsHq() {
    try { return typeof isHeadquarters === "function" && isHeadquarters() && typeof isAdmin === "function" && isAdmin(); } catch (e) { return false; }
}
function mgMemberSource(m) {
    if (m.source) return m.source;
    return (m.registerStore && m.registerStore === HQ_STORE_CODE) ? "hq" : ("store:" + (m.registerStore || HQ_STORE_CODE));
}
function mgHasStayHere(m) {
    if (!m || !m.phone || !state || !Array.isArray(state.reservations)) return false;
    return state.reservations.some(function (r) {
        var g = (typeof guestOf === "function") ? guestOf(r.guestId) : null;
        return g && g.phone === m.phone;
    });
}
function mgVisibleHere(m) {
    if (mgIsHq()) return true;
    var src = mgMemberSource(m);
    if (src === "hq") return mgHasStayHere(m);
    var owner = src.indexOf("store:") === 0 ? src.slice(6) : (m.registerStore || "");
    var cur = (typeof currentStoreCode === "function") ? currentStoreCode() : HQ_STORE_CODE;
    if (owner && owner === cur) return true;
    return mgHasStayHere(m);
}
function mgSourceLabel(m) {
    var src = mgMemberSource(m);
    if (src === "hq") return '<span class="pill" style="background:#eef0ff;color:#5b3df5;border:1px solid #c9c2ff;">🏛️ 总部会员</span>';
    var owner = src.indexOf("store:") === 0 ? src.slice(6) : (m.registerStore || "");
    return '<span class="pill" style="background:#fff4e6;color:#b8770b;border:1px solid #f0d9a8;">🏪 分店会员' + (owner ? ('（' + owner + '）') : "") + '</span>';
}
function mgLog(m, text) {
    m.logs = m.logs || [];
    m.logs.push({ at: fmtDateTime(new Date()), text: text });
    if (m.logs.length > 60) m.logs.shift();
}
function mgEnsureFields(m) {
    m.coupons = m.coupons || [];
    m.vouchers = m.vouchers || [];
    m.logs = m.logs || [];
    m.totalSpend = m.totalSpend || 0;
    m.birthday = m.birthday || "";
    m.points = m.points || 0;
    m.balance = m.balance || 0;
    m.recharges = m.recharges || [];
    if (MG_LEVEL_LEGACY[m.level]) m.level = MG_LEVEL_LEGACY[m.level];
    if (!m.level) m.level = "普通会员";
    var tiers = mgTiers(), t = null;
    for (var i = 0; i < tiers.length; i++) if (tiers[i].name === m.level) { t = tiers[i]; break; }
    if (!t) { t = tiers[0]; m.level = t.name; }
    m.tierId = t.id;
}
/* ---- 会员ID：全局唯一生成 + 存量去重 ----
   老版本按各门店 seq 生成 id（m1/m2…），分店 seq 都从 1 开始，跨店同步到总部后必然撞 ID，
   编辑/删除按 id 取第一个匹配就会串档。新 id 与卡号一致采用时间戳+随机数；
   mgPull 合并注册表后去重一次，存量撞 ID 的会员保留首个，其余换新 id 并抬高 updatedAt 同步回注册表。 */
function mgUniqueMemberId() {
    return "m" + String(Date.now()) + String(Math.floor(Math.random() * 10000)).padStart(4, "0");
}
function mgDedupeMemberIds() {
    if (!state || !Array.isArray(state.members)) return false;
    var seen = {}, changed = false;
    for (var i = 0; i < state.members.length; i++) {
        var m = state.members[i];
        if (!m || !m.id) continue;
        if (!seen[m.id]) { seen[m.id] = true; continue; }
        var nid = mgUniqueMemberId();
        while (seen[nid]) nid = mgUniqueMemberId();
        m.id = nid;
        m.updatedAt = Date.now();
        seen[nid] = true;
        changed = true;
    }
    return changed;
}
/* ---- 总部会员注册表同步：pull=注册表→本地，push=本地→注册表（按 updatedAt 新者胜） ---- */
function mgPull() {
    if (!state || !Array.isArray(state.members)) return;
    var g = mgLoad(), changed = false;
    g.members.forEach(function (gm) {
        var li = -1;
        for (var i = 0; i < state.members.length; i++) if (state.members[i].phone === gm.phone) { li = i; break; }
        if (gm.deleted) { if (li >= 0) { state.members.splice(li, 1); changed = true; } return; }
        mgEnsureFields(gm);
        if (li < 0) { state.members.push(JSON.parse(JSON.stringify(gm))); changed = true; }
        else if ((gm.updatedAt || 0) > (state.members[li].updatedAt || 0)) { state.members[li] = JSON.parse(JSON.stringify(gm)); changed = true; }
    });
    if (mgDedupeMemberIds()) changed = true;
    mgPush();
    if (changed && typeof render === "function") { try { render(); } catch (e) {} }
}
function mgPush() {
    if (!state || !Array.isArray(state.members)) return;
    var g = mgLoad(), changed = false;
    state.members.forEach(function (m) {
        mgEnsureFields(m);
        var gi = -1, tomb = null;
        for (var i = 0; i < g.members.length; i++) if (g.members[i].phone === m.phone) { gi = i; if (g.members[i].deleted) tomb = g.members[i]; break; }
        if (tomb) return; // 已被删除的会员不复活
        if (gi < 0) { g.members.push(JSON.parse(JSON.stringify(m))); changed = true; }
        else if ((m.updatedAt || 0) >= (g.members[gi].updatedAt || 0)) { g.members[gi] = JSON.parse(JSON.stringify(m)); changed = true; }
    });
    if (changed) mgSave(g);
}
window.addEventListener("storage", function (e) {
    if (e.key !== MG_KEY) return;
    mgPull();
    var sec = document.getElementById("view-members");
    if (sec && sec.classList.contains("active") && typeof renderMembers === "function") renderMembers();
});
/* ---- 等级引擎 ---- */
function mgTierIndex(m) { var ts = mgTiers(); for (var i = 0; i < ts.length; i++) if (ts[i].id === m.tierId) return i; return 0; }
function mgTierOf(m) { return mgTiers()[mgTierIndex(m)]; }
function mgNextTier(m) { var ts = mgTiers(), i = mgTierIndex(m); return i + 1 < ts.length ? ts[i + 1] : null; }
function mgQualifies(m, t) {
    return (t.upAmount > 0 && (m.totalSpend || 0) >= t.upAmount) || (t.upPoints > 0 && (m.points || 0) >= t.upPoints);
}
function mgIssueCoupons(m, n, tplId, tag) {
    var g = mgLoad(), tpls = g.couponTemplates;
    var tpl = null;
    if (tplId) { for (var k = 0; k < tpls.length; k++) if (tpls[k].id === tplId) tpl = tpls[k]; }
    if (!tpl) { for (var j = 0; j < tpls.length; j++) if (tpls[j].isBirthday) { tpl = tpls[j]; break; } }
    if (!tpl) tpl = tpls[0];
    if (!tpl) return;
    var issued = todayStr();
    var effD = new Date(issued); effD.setDate(effD.getDate() + (tpl.delayDays || 0));
    var effectiveFrom = fmtDate(effD);
    var isRange = tpl.validMode === "range" && tpl.rangeStart && tpl.rangeEnd;
    var expireAt;
    if (isRange) { expireAt = tpl.rangeEnd; }
    else { var exp = new Date(issued); exp.setDate(exp.getDate() + (tpl.validDays || 30)); expireAt = fmtDate(exp); }
    for (var i = 0; i < n; i++) {
        m.coupons.push({
            id: "C" + Date.now() + "_" + (g.seq++), tplId: tpl.id, name: tpl.name, type: tpl.type,
            value: tpl.value, minSpend: tpl.minSpend || 0, status: "unused",
            validMode: isRange ? "range" : "days", rangeStart: isRange ? tpl.rangeStart : "", rangeEnd: isRange ? tpl.rangeEnd : "",
            delayDays: tpl.delayDays || 0, effectiveFrom: effectiveFrom,
            issuedAt: issued, expireAt: expireAt, tag: tag || ""
        });
    }
    mgSave(g); mgTouch(m);
}
function mgIssueVouchers(m, n, tag) {
    for (var i = 0; i < n; i++) {
        m.vouchers.push({ id: "V" + Date.now() + "_" + i + Math.floor(Math.random() * 1000), name: "免房券", status: "unused", issuedAt: todayStr(), tag: tag || "" });
    }
    mgTouch(m);
}
function mgPromote(m, t, how) {
    m.tierId = t.id; m.level = t.name;
    var b = t.benefits || {}, notes = [];
    if (b.points) { m.points += b.points; notes.push("赠" + b.points + "积分"); }
    if (b.balance) { m.balance += b.balance; notes.push("赠" + b.balance + "元余额"); }
    if (b.coupons) { mgIssueCoupons(m, b.coupons, null, "升级赠送"); notes.push("赠" + b.coupons + "张优惠券"); }
    if (b.vouchers) { mgIssueVouchers(m, b.vouchers, "升级赠送"); notes.push("赠" + b.vouchers + "张免房券"); }
    if (b.birthday) notes.push("生日券权益");
    mgLog(m, (how === "paid" ? "付费升级" : "消费/积分自动升级") + "至「" + t.name + "」" + (notes.length ? "，发放：" + notes.join("、") : ""));
    mgTouch(m);
}
function mgCheckUpgrade(m) {
    var promoted = [], t = mgNextTier(m);
    while (t && mgQualifies(m, t)) { mgPromote(m, t, "auto"); promoted.push(t); t = mgNextTier(m); }
    return promoted;
}
/* ---- 积分发放：按总部配置 pointsRate（每元积分），房费/商品消费调用；充值不调用 ---- */
function mgAwardPoints(m, amt) {
    if (!m || !amt || amt <= 0) return;
    var rate = mgPointsRate();
    if (!rate) return;
    var add = Math.round(amt * rate);
    if (add > 0) m.points = (m.points || 0) + add;
}
function mgAddSpend(m, amt) {
    if (!m || !amt || amt <= 0) return;
    m.totalSpend = (m.totalSpend || 0) + amt;
    mgAwardPoints(m, amt); // 消费按比例得积分（充值/付费升级不进此函数）
    var ps = mgCheckUpgrade(m);
    mgTouch(m);
    if (ps.length && typeof toast === "function") toast("会员 " + m.name + " 已升级为 " + m.level, "ok");
}
function mgSpendByPhone(phone, amt) { if (!phone) return; var m = memberByPhone(phone); if (m) mgAddSpend(m, amt); }
function mgSpendByRes(resId, amt) {
    var r = resOf(resId); if (!r) return;
    var g = guestOf(r.guestId); if (g) mgSpendByPhone(g.phone, amt);
}
function mgPaidUpgrade(mid) {
    var m = memberOf(mid);
    if (!m) { toast("会员不存在", "err"); return; }
    var t = mgNextTier(m);
    if (!t) { toast("已是最高等级", "err"); return; }
    if (!t.upPaid || t.upPaid <= 0) { toast("下一等级「" + t.name + "」未开放付费升级", "err"); return; }
    if ((m.balance || 0) < t.upPaid) { toast("余额不足：付费升级需 " + money(t.upPaid) + "，当前余额 " + money(m.balance), "err"); return; }
    m.balance -= t.upPaid;
    mgLog(m, "付费升级支出 " + money(t.upPaid));
    mgPromote(m, t, "paid");
    save(); render(); renderMemberDetail();
    toast("付费升级成功，已成为 " + t.name, "ok");
}
/* ---- 生日权益：当日生日且等级含生日权益 → 自动发生日券（每年一次） ---- */
function mgBirthdayCheck() {
    if (!state || !Array.isArray(state.members)) return;
    var now = new Date(), md = pad2(now.getMonth() + 1) + "-" + pad2(now.getDate()), year = now.getFullYear();
    var birthdayTpl = null, tpls = mgTplList();
    for (var k = 0; k < tpls.length; k++) if (tpls[k].isBirthday) { birthdayTpl = tpls[k]; break; }
    var changed = false;
    state.members.forEach(function (m) {
        if (!m.birthday || m.birthday.length < 10) return;
        if (m.birthday.slice(5) !== md) return;
        var t = mgTierOf(m);
        if (!t || !(t.benefits || {}).birthday) return;
        if (m.birthdayGiftYear === year) return;
        m.birthdayGiftYear = year;
        mgIssueCoupons(m, 1, birthdayTpl ? birthdayTpl.id : null, "生日赠送");
        mgLog(m, "生日权益：赠送生日优惠券 1 张");
        mgTouch(m); changed = true;
    });
    if (changed) { save(); if (typeof toast === "function") toast("已为今日生日会员发放生日券", "ok"); }
}
/* ---- 优惠券 / 免房券 使用 ---- */
function mgCouponOff(c, amount) {
    if (c.type === "cash") return Math.min(c.value || 0, amount);
    if (c.type === "discount") return Math.round(amount * (1 - (c.value || 10) / 10) * 100) / 100;
    return 0;
}
function mgUsableCoupons(m, amount) {
    if (!m) return [];
    var t = todayStr();
    return (m.coupons || []).filter(function (c) {
        if (c.status !== "unused") return false;
        if (c.effectiveFrom && c.effectiveFrom > t) return false; // 未到生效日：暂不可用（不置过期）
        if (c.expireAt && c.expireAt < t) { c.status = "expired"; return false; }
        if (c.validMode === "range") {
            if (c.rangeStart && c.rangeStart > t) return false;
            if (c.rangeEnd && c.rangeEnd < t) { c.status = "expired"; return false; }
        }
        return (c.minSpend || 0) <= amount;
    });
}
/* ---- 多券叠加抵扣：逐张基于剩余应付计算，受 couponStackable/couponMaxStack 约束 ---- */
function mgCouponOffMulti(m, ids, baseAmount) {
    var stackable = mgCouponStackable();
    var maxN = stackable ? mgCouponMaxStack() : 1;
    var left = Math.max(0, baseAmount || 0), off = 0, applied = [];
    (ids || []).forEach(function (id) {
        if (applied.length >= maxN || left <= 0) return;
        var c = null;
        (m.coupons || []).forEach(function (x) { if (x.id === id) c = x; });
        if (!c || c.status !== "unused") return;
        if ((c.minSpend || 0) > left) return; // 门槛按当前剩余应付
        var o = mgCouponOff(c, left);
        if (o <= 0) return;
        o = Math.min(o, left);
        off += o;
        left = Math.max(0, Math.round((left - o) * 100) / 100);
        applied.push(c.id);
    });
    return { off: Math.round(off * 100) / 100, totalLeft: left, applied: applied };
}
function mgUseCoupons(m, ids, orderNo) {
    if (!m) return 0;
    var n = 0;
    (ids || []).forEach(function (id) { if (mgUseCoupon(m, id, orderNo)) n++; });
    return n;
}
function mgUseCoupon(m, couponId, orderNo) {
    var c = null;
    (m.coupons || []).forEach(function (x) { if (x.id === couponId) c = x; });
    if (!c || c.status !== "unused") return false;
    c.status = "used"; c.usedAt = todayStr(); c.orderNo = orderNo || "";
    mgLog(m, "核销优惠券「" + c.name + "」" + (orderNo ? "（订单 " + orderNo + "）" : ""));
    mgTouch(m);
    return true;
}
function mgUseVoucher(m, vid, orderNo) {
    var v = null;
    (m.vouchers || []).forEach(function (x) { if (x.id === vid) v = x; });
    if (!v || v.status !== "unused") return false;
    v.status = "used"; v.usedAt = todayStr(); v.orderNo = orderNo || "";
    mgLog(m, "核销免房券" + (orderNo ? "（订单 " + orderNo + "）" : ""));
    mgTouch(m);
    return true;
}
/* ---- 总部配置面板（仅总部 admin） ---- */
function renderMemberHq() {
    var panel = document.getElementById("memberHqPanel");
    if (!panel) return;
    var show = (typeof isHeadquarters === "function" && isHeadquarters() && typeof isAdmin === "function" && isAdmin());
    panel.style.display = show ? "" : "none";
    if (!show) return;
    var g = mgLoad();
    var cfg = g.config || {};
    var pr = document.getElementById("mgPointsRate"); if (pr) pr.value = (typeof cfg.pointsRate === "number") ? cfg.pointsRate : 10;
    var st = document.getElementById("mgStackable"); if (st) st.checked = cfg.couponStackable !== false;
    var ms = document.getElementById("mgMaxStack"); if (ms) ms.value = (typeof cfg.couponMaxStack === "number") ? cfg.couponMaxStack : 3;
    var tierRows = document.getElementById("mgTierRows");
    if (tierRows) {
        tierRows.innerHTML = g.tiers.map(function (t) {
            var b = t.benefits || {};
            return '<tr data-tid="' + t.id + '">'
                + '<td><input class="input" style="width:100px;padding:4px 8px;" value="' + esc(t.name) + '" data-f="name"></td>'
                + '<td><input class="input" style="width:86px;padding:4px 8px;" type="number" min="0" value="' + (t.upAmount || 0) + '" data-f="upAmount"></td>'
                + '<td><input class="input" style="width:86px;padding:4px 8px;" type="number" min="0" value="' + (t.upPoints || 0) + '" data-f="upPoints"></td>'
                + '<td><input class="input" style="width:86px;padding:4px 8px;" type="number" min="0" value="' + (t.upPaid || 0) + '" data-f="upPaid"></td>'
                + '<td><input class="input" style="width:80px;padding:4px 8px;" type="number" min="0" value="' + (b.points || 0) + '" data-f="b.points"></td>'
                + '<td><input class="input" style="width:56px;padding:4px 8px;" type="number" min="0" value="' + (b.coupons || 0) + '" data-f="b.coupons"></td>'
                + '<td><input class="input" style="width:56px;padding:4px 8px;" type="number" min="0" value="' + (b.vouchers || 0) + '" data-f="b.vouchers"></td>'
                + '<td style="text-align:center;"><input type="checkbox" data-f="b.birthday" ' + (b.birthday ? "checked" : "") + '></td>'
                + '<td><input class="input" style="width:80px;padding:4px 8px;" type="number" min="0" value="' + (b.balance || 0) + '" data-f="b.balance"></td>'
                + '</tr>';
        }).join("");
    }
    var tplRows = document.getElementById("mgTplRows");
    if (tplRows) {
        tplRows.innerHTML = g.couponTemplates.map(function (t) {
            return '<tr data-tplid="' + t.id + '">'
                + '<td><input class="input" style="width:130px;padding:4px 8px;" value="' + esc(t.name) + '" data-f="name"></td>'
                + '<td><select class="select" style="width:80px;padding:4px 8px;" data-f="type"><option value="cash" ' + (t.type === "cash" ? "selected" : "") + '>代金</option><option value="discount" ' + (t.type === "discount" ? "selected" : "") + '>折扣</option></select></td>'
                + '<td><input class="input" style="width:70px;padding:4px 8px;" type="number" min="0" step="0.1" value="' + (t.value || 0) + '" data-f="value"></td>'
                + '<td><input class="input" style="width:80px;padding:4px 8px;" type="number" min="0" value="' + (t.minSpend || 0) + '" data-f="minSpend"></td>'
                + '<td><input class="input" style="width:70px;padding:4px 8px;" type="number" min="1" value="' + (t.validDays || 30) + '" data-f="validDays"></td>'
                + '<td><select class="select" style="width:80px;padding:4px 8px;" data-f="validMode"><option value="days" ' + (t.validMode !== "range" ? "selected" : "") + '>按天数</option><option value="range" ' + (t.validMode === "range" ? "selected" : "") + '>固定范围</option></select></td>'
                + '<td><input class="input" style="width:130px;padding:4px 8px;" type="date" value="' + (t.rangeStart || "") + '" data-f="rangeStart"></td>'
                + '<td><input class="input" style="width:130px;padding:4px 8px;" type="date" value="' + (t.rangeEnd || "") + '" data-f="rangeEnd"></td>'
                + '<td><input class="input" style="width:60px;padding:4px 8px;" type="number" min="0" value="' + (t.delayDays || 0) + '" data-f="delayDays"></td>'
                + '<td style="text-align:center;"><input type="checkbox" data-f="isBirthday" ' + (t.isBirthday ? "checked" : "") + '></td>'
                + '<td><button class="btn btn-danger btn-sm" onclick="mgDelTpl(\'' + t.id + '\')">删除</button></td>'
                + '</tr>';
        }).join("");
    }
    if (typeof _renderRechargeCfg === "function") _renderRechargeCfg(g);
}
function _renderRechargeCfg(g) {
    var box = document.getElementById("mgRechargeCfg");
    if (!box) return;
    var rc = g.config.recharge || { "default": { mode: "preset_custom", presets: [50, 100, 200, 500] }, stores: {} };
    var def = rc["default"] || { mode: "preset_custom", presets: [50, 100, 200, 500] };
    var sel = function (v) { return v ? "selected" : ""; };
    var modeOpts = '<option value="preset_only" ' + sel(def.mode === "preset_only") + '>仅预设金额</option>'
        + '<option value="preset_custom" ' + sel(def.mode !== "preset_only" && def.mode !== "custom_only") + '>预设+自定义</option>'
        + '<option value="custom_only" ' + sel(def.mode === "custom_only") + '>仅自定义</option>';
    var h = '<div style="border:1px solid var(--line);border-radius:8px;padding:10px 12px;">'
        + '<div style="font-size:13px;font-weight:700;margin-bottom:8px;">💰 充值金额管控（后台给会员充值）</div>'
        + '<div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center;font-size:12px;margin-bottom:8px;">'
        + '<label>默认模式：<select id="mgRechMode" class="select" style="padding:4px 8px;">' + modeOpts + '</select></label>'
        + '<label>默认预设金额（逗号分隔，元）：<input id="mgRechPresets" class="input" style="width:200px;padding:4px 8px;" value="' + (def.presets || []).join(",") + '"></label>'
        + '</div>';
    var stores = (typeof reg !== "undefined" && reg && Array.isArray(reg.stores)) ? reg.stores : [];
    h += '<table style="width:100%;font-size:12px;"><thead><tr><th style="text-align:left;">门店覆盖（留空=沿用默认）</th><th>覆盖模式</th><th>覆盖预设金额</th></tr></thead><tbody>';
    stores.forEach(function (s) {
        var ov = (rc.stores && rc.stores[s.code]) ? rc.stores[s.code] : null;
        var sm = ov ? ov.mode : "inherit";
        var sp = ov ? (ov.presets || []).join(",") : "";
        var opts = '<option value="inherit" ' + sel(sm === "inherit") + '>沿用默认</option>'
            + '<option value="preset_only" ' + sel(sm === "preset_only") + '>仅预设</option>'
            + '<option value="preset_custom" ' + sel(sm === "preset_custom") + '>预设+自定义</option>'
            + '<option value="custom_only" ' + sel(sm === "custom_only") + '>仅自定义</option>';
        h += '<tr data-rechstore="' + s.code + '"><td>' + esc(s.name || s.code) + '（' + s.code + '）</td>'
            + '<td style="text-align:center;"><select class="select" data-f="mode" style="padding:3px 6px;">' + opts + '</select></td>'
            + '<td style="text-align:center;"><input class="input" data-f="presets" style="width:180px;padding:3px 6px;" value="' + sp + '" placeholder="留空=沿用默认"></td></tr>';
    });
    h += '</tbody></table></div>';
    box.innerHTML = h;
}
function _readRechargeCfg(g) {
    if (!g.config.recharge) g.config.recharge = { "default": { mode: "preset_custom", presets: [50, 100, 200, 500] }, stores: {} };
    var modeEl = document.getElementById("mgRechMode");
    if (modeEl) g.config.recharge["default"].mode = modeEl.value || "preset_custom";
    var preEl = document.getElementById("mgRechPresets");
    if (preEl) g.config.recharge["default"].presets = (preEl.value || "").split(/[,，\s]+/).map(function (x) { return parseFloat(x); }).filter(function (x) { return x > 0; });
    g.config.recharge.stores = {};
    document.querySelectorAll("#mgRechargeCfg tr[data-rechstore]").forEach(function (tr) {
        var code = tr.getAttribute("data-rechstore");
        var mode = tr.querySelector('[data-f="mode"]');
        var presets = tr.querySelector('[data-f="presets"]');
        var mv = mode ? mode.value : "inherit";
        if (mv === "inherit") return;
        var arr = (presets ? presets.value : "").split(/[,，\s]+/).map(function (x) { return parseFloat(x); }).filter(function (x) { return x > 0; });
        g.config.recharge.stores[code] = { mode: mv, presets: arr };
    });
}
function _mgReadRows(sel, isTpl) {
    var out = [];
    var rows = document.querySelectorAll(sel + " tr");
    Array.prototype.forEach.call(rows, function (tr) {
        var rec = { id: isTpl ? tr.getAttribute("data-tplid") : tr.getAttribute("data-tid"), benefits: {} };
        var inputs = tr.querySelectorAll("[data-f]");
        Array.prototype.forEach.call(inputs, function (inp) {
            var f = inp.getAttribute("data-f"), v;
            if (inp.type === "checkbox") v = inp.checked;
            else if (inp.type === "number") v = parseFloat(inp.value) || 0;
            else v = inp.value;
            if (f.indexOf("b.") === 0) rec.benefits[f.slice(2)] = v; else rec[f] = v;
        });
        out.push(rec);
    });
    return out;
}
function mgSaveHq() {
    if (!(typeof isHeadquarters === "function" && isHeadquarters() && typeof isAdmin === "function" && isAdmin())) { toast("仅总部管理员可修改会员体系配置", "err"); return; }
    var g = mgLoad();
    // 积分比例 / 叠加配置
    var prEl = document.getElementById("mgPointsRate"); if (prEl) g.config.pointsRate = Math.max(0, parseFloat(prEl.value) || 0);
    var stEl = document.getElementById("mgStackable"); if (stEl) g.config.couponStackable = !!stEl.checked;
    var msEl = document.getElementById("mgMaxStack"); if (msEl) g.config.couponMaxStack = Math.max(1, parseInt(msEl.value) || 1);
    var tiers = _mgReadRows("#mgTierRows", false);
    tiers.forEach(function (rec) {
        var t = null; g.tiers.forEach(function (x) { if (x.id === rec.id) t = x; });
        if (!t) return;
        t.name = rec.name || t.name;
        t.upAmount = rec.upAmount || 0; t.upPoints = rec.upPoints || 0; t.upPaid = rec.upPaid || 0;
        t.benefits = t.benefits || {};
        ["points", "coupons", "vouchers", "balance"].forEach(function (k) { t.benefits[k] = rec.benefits[k] || 0; });
        t.benefits.birthday = !!rec.benefits.birthday;
    });
    var tpls = _mgReadRows("#mgTplRows", true);
    tpls.forEach(function (rec) {
        var t = null; g.couponTemplates.forEach(function (x) { if (x.id === rec.id) t = x; });
        if (!t) return;
        t.name = rec.name || t.name; t.type = rec.type; t.value = rec.value || 0;
        t.minSpend = rec.minSpend || 0; t.validDays = rec.validDays || 30; t.isBirthday = !!rec.isBirthday;
        t.validMode = rec.validMode === "range" ? "range" : "days";
        t.rangeStart = rec.rangeStart || ""; t.rangeEnd = rec.rangeEnd || "";
        t.delayDays = Math.max(0, parseInt(rec.delayDays) || 0);
    });
    // 会员等级名跟随配置同步
    (state.members || []).forEach(function (m) {
        var t = null; g.tiers.forEach(function (x) { if (x.id === m.tierId) t = x; });
        if (t) m.level = t.name;
    });
    _readRechargeCfg(g);
    mgSave(g);
    save(); render();
    toast("会员体系配置已保存，并实时同步至所有门店", "ok");
}
function mgAddTpl() {
    var g = mgLoad();
    g.couponTemplates.push({ id: "cp" + Date.now(), name: "新优惠券", type: "cash", value: 10, minSpend: 0, validDays: 30, validMode: "days", rangeStart: "", rangeEnd: "", delayDays: 0, isBirthday: false });
    mgSave(g); renderMemberHq();
}
function mgDelTpl(id) {
    if (!confirm("确定删除该优惠券模板？已发放的券不受影响。")) return;
    var g = mgLoad();
    g.couponTemplates = g.couponTemplates.filter(function (t) { return t.id !== id; });
    mgSave(g); renderMemberHq();
}
/* ---- 会员详情弹窗 ---- */
var mgDetailId = null;
function openMemberDetail(id) { mgDetailId = id; renderMemberDetail(); openModal("modalMemberDetail"); }
function renderMemberDetail() {
    var body = document.getElementById("memberDetailBody");
    if (!body) return;
    var m = memberOf(mgDetailId);
    if (!m) { body.innerHTML = '<div style="color:var(--muted);padding:20px;text-align:center;">会员不存在</div>'; return; }
    mgEnsureFields(m);
    var t = mgTierOf(m), next = mgNextTier(m);
    var tpls = mgTplList();
    var html = '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px;">'
        + '<div style="background:#f8f9fb;border-radius:8px;padding:10px 12px;"><div style="font-size:11px;color:var(--muted);">当前等级</div><b style="color:var(--gold);">' + esc(m.level) + '</b></div>'
        + '<div style="background:#f8f9fb;border-radius:8px;padding:10px 12px;"><div style="font-size:11px;color:var(--muted);">积分</div><b>' + m.points + '</b></div>'
        + '<div style="background:#f8f9fb;border-radius:8px;padding:10px 12px;"><div style="font-size:11px;color:var(--muted);">余额</div><b>' + money(m.balance) + '</b></div>'
        + '<div style="background:#f8f9fb;border-radius:8px;padding:10px 12px;"><div style="font-size:11px;color:var(--muted);">累计消费</div><b>' + money(m.totalSpend) + '</b></div>'
        + '</div>';
    if (next) {
        var rules = [];
        if (next.upAmount > 0) rules.push("消费满 " + money(next.upAmount));
        if (next.upPoints > 0) rules.push("积分满 " + next.upPoints);
        if (next.upPaid > 0) rules.push("付费 " + money(next.upPaid));
        html += '<div style="background:#fff8e6;border:1px solid #f3e3b3;border-radius:8px;padding:10px 12px;font-size:12px;margin-bottom:14px;">下一等级：<b>' + esc(next.name) + '</b> · 升级条件：' + (rules.length ? rules.join(" 或 ") : "由总部配置") + (next.upPaid > 0 ? ' <button class="btn btn-gold btn-sm" style="margin-left:10px;" onclick="mgPaidUpgrade(\'' + m.id + '\')">💰 付费升级</button>' : '') + '</div>';
    } else {
        html += '<div style="background:#f0fff4;border:1px solid #c9ecd4;border-radius:8px;padding:10px 12px;font-size:12px;margin-bottom:14px;">已是最高等级 </div>';
    }
    // 发放操作（总部或管理权限）
    html += '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px;font-size:13px;">'
        + '<select class="select" style="width:auto;" id="mgIssueTpl">' + tpls.map(function (x) { return '<option value="' + x.id + '">' + esc(x.name) + '</option>'; }).join("") + '</select>'
        + '<button class="btn btn-primary btn-sm" onclick="mgIssueToMember(\'coupon\')">发放优惠券</button>'
        + '<input class="input" style="width:70px;" type="number" min="1" value="1" id="mgIssueVouchN">'
        + '<button class="btn btn-primary btn-sm" onclick="mgIssueToMember(\'voucher\')">发放免房券</button>'
        + '</div>';
    // 充值区（后台专属，金额受总部充值管控规则约束）
    var sc = (typeof currentStoreCode === "function") ? currentStoreCode() : "";
    var rule = mgRechargeRule(sc);
    var rech = '<div style="background:#f4f8ff;border:1px solid #d6e4ff;border-radius:8px;padding:10px 12px;margin-bottom:14px;">'
        + '<div style="font-size:13px;font-weight:700;margin-bottom:8px;">💰 会员充值（仅后台操作，充值不计积分）</div>'
        + '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;font-size:12px;">';
    if (rule.allowPreset) rule.presets.forEach(function (p) { rech += '<button class="btn btn-ghost btn-sm" onclick="mgDoRecharge(' + p + ')">充 ' + money(p) + '</button>'; });
    if (rule.allowCustom) rech += '<input class="input" id="mgRechAmt" type="number" min="0.01" step="0.01" style="width:90px;padding:4px 8px;" placeholder="自定义金额"><button class="btn btn-gold btn-sm" onclick="mgDoRechargeCustom()">充值</button>';
    rech += '<span style="color:var(--muted);margin-left:6px;">当前余额 ' + money(m.balance) + '</span></div></div>';
    html += rech;
    // 优惠券列表
    html += '<div class="card-head" style="margin-bottom:6px;"><h3>🎫 优惠券（' + (m.coupons || []).length + '）</h3></div>';
    if (!(m.coupons || []).length) html += '<div style="color:var(--muted);font-size:12px;padding:6px 0 12px;">暂无优惠券</div>';
    else html += '<div class="table-wrap" style="margin-bottom:12px;"><table><thead><tr><th>名称</th><th>类型</th><th>门槛</th><th>状态</th><th>有效期</th><th>来源</th></tr></thead><tbody>'
        + m.coupons.slice().reverse().map(function (c) {
            var stMap = { unused: ["未使用", "#27ae60"], used: ["已核销", "#95a5a6"], expired: ["已过期", "#e74c3c"] };
            var st = stMap[c.status] || [c.status, "#999"];
            return '<tr><td>' + esc(c.name) + '</td><td>' + (c.type === "cash" ? "代金 " + money(c.value) : "折扣 " + c.value + "折") + '</td><td>' + (c.minSpend > 0 ? "满" + money(c.minSpend) : "无门槛") + '</td><td style="color:' + st[1] + ';">' + st[0] + '</td><td style="font-size:12px;">至 ' + (c.expireAt || "—") + '</td><td style="font-size:12px;color:var(--muted);">' + esc(c.tag || "") + '</td></tr>';
        }).join("") + '</tbody></table></div>';
    // 免房券列表
    html += '<div class="card-head" style="margin-bottom:6px;"><h3>🛏️ 免房券（' + (m.vouchers || []).length + '）</h3></div>';
    if (!(m.vouchers || []).length) html += '<div style="color:var(--muted);font-size:12px;padding:6px 0 12px;">暂无免房券</div>';
    else html += '<div class="table-wrap" style="margin-bottom:12px;"><table><thead><tr><th>名称</th><th>状态</th><th>发放日期</th><th>核销日期</th><th>来源</th></tr></thead><tbody>'
        + m.vouchers.slice().reverse().map(function (v) {
            return '<tr><td>' + esc(v.name) + '（抵一晚房费）</td><td style="color:' + (v.status === "unused" ? "#27ae60" : "#95a5a6") + ';">' + (v.status === "unused" ? "未使用" : "已核销") + '</td><td>' + (v.issuedAt || "") + '</td><td>' + (v.usedAt || "—") + '</td><td style="font-size:12px;color:var(--muted);">' + esc(v.tag || "") + '</td></tr>';
        }).join("") + '</tbody></table></div>';
    // 动态日志
    html += '<div class="card-head" style="margin-bottom:6px;"><h3>📜 会员动态</h3></div>';
    if (!(m.logs || []).length) html += '<div style="color:var(--muted);font-size:12px;">暂无动态</div>';
    else html += '<div style="max-height:150px;overflow:auto;font-size:12px;color:#555;">' + m.logs.slice().reverse().map(function (l) { return '<div style="padding:3px 0;border-bottom:1px dashed var(--line);">' + esc(l.at) + ' · ' + esc(l.text) + '</div>'; }).join("") + '</div>';
    body.innerHTML = html;
}
function mgDoRecharge(amount) {
    var m = memberOf(mgDetailId);
    if (!m) { toast("会员不存在", "err"); return; }
    if (!(amount > 0)) { toast("请输入有效充值金额", "err"); return; }
    var sc = (typeof currentStoreCode === "function") ? currentStoreCode() : "";
    var rule = mgRechargeRule(sc);
    // 校验金额是否符合当前门店充值管控规则
    if (rule.allowPreset && rule.presets.indexOf(amount) >= 0) { /* 预设金额，允许 */ }
    else if (rule.allowCustom) { /* 自定义允许 */ }
    else { toast("该门店仅支持预设充值金额：" + rule.presets.join("、") + " 元", "err"); return; }
    if (!confirm("确认给会员 " + m.name + " 充值 " + money(amount) + " ？")) return;
    var by = (state && state.login && state.login.user) ? state.login.user : "后台";
    if (mgRecharge(m, amount, by)) {
        if (typeof save === "function") save();
        renderMemberDetail();
        if (typeof render === "function") { try { render(); } catch (e) {} }
        toast("充值成功：" + money(amount), "ok");
    } else { toast("充值失败", "err"); }
}
function mgDoRechargeCustom() {
    var el = document.getElementById("mgRechAmt");
    var amt = parseFloat(el ? el.value : 0);
    mgDoRecharge(amt);
}
function mgIssueToMember(kind) {
    var m = memberOf(mgDetailId);
    if (!m) { toast("会员不存在", "err"); return; }
    if (kind === "coupon") {
        var tplId = document.getElementById("mgIssueTpl").value;
        mgIssueCoupons(m, 1, tplId, "手动发放");
        mgLog(m, "手动发放优惠券 1 张");
    } else {
        var n = parseInt(document.getElementById("mgIssueVouchN").value) || 1;
        mgIssueVouchers(m, n, "手动发放");
        mgLog(m, "手动发放免房券 " + n + " 张");
    }
    mgTouch(m);
    save(); render(); renderMemberDetail();
    toast("已发放", "ok");
}
