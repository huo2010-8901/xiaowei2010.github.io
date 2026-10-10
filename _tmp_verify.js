const fs = require("fs");
const vm = require("vm");
const path = require("path");

// ---- minimal stubs ----
function pad(n){ return n<10?"0"+n:""+n; }
function todayStr(){ const d=new Date(); return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()); }
function fmtDate(d){ return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()); }
function money(n){ return "¥"+Number(n).toFixed(2); }
function fmtDateTime(d){ return fmtDate(d)+" "+pad(d.getHours())+":"+pad(d.getMinutes()); }
function esc(s){ return String(s==null?"":s); }
const store = {};
const localStorage = {
  getItem(k){ return k in store ? store[k] : null; },
  setItem(k,v){ store[k]=String(v); },
  removeItem(k){ delete store[k]; }
};
const sandbox = {
  window: { addEventListener(){}, localStorage, localStorage },
  localStorage, todayStr, fmtDate, fmtDateTime, money, esc,
  console, Date, Math, JSON, parseInt, parseFloat, isNaN, Array, Object, Number, String, Boolean, RegExp
};
sandbox.window.self = sandbox.window;
vm.createContext(sandbox);
const code = fs.readFileSync(path.join(__dirname, "member-center.js"), "utf8");
vm.runInContext(code, sandbox);
const R = sandbox;
let pass = 0, fail = 0;
function eq(a,b,msg){ if(a===b){pass++;console.log("PASS",msg)}else{fail++;console.log("FAIL",msg,"=>",a,"!==",b)} }

// 1. config default + pointsRate
eq(R.mgPointsRate(), 10, "default pointsRate=10");
let g = R.mgLoad();
g.config.pointsRate = 7; R.mgSave(g);
eq(R.mgPointsRate(), 7, "pointsRate=7 after set");

// 2. mgAwardPoints via mgAddSpend
let m = { id:"M1", phone:"13800000000", name:"测试", points:0, totalSpend:0, balance:0, coupons:[], vouchers:[], logs:[], level:"普通会员" };
R.mgAddSpend(m, 100);
eq(m.points, 700, "spend 100 -> +700 points (rate 7)");
eq(m.totalSpend, 100, "totalSpend 100");

// 3. coupon validity: range + delayDays
g = R.mgLoad();
g.couponTemplates = [
  { id:"tplA", name:"范围券", type:"cash", value:20, minSpend:50, validMode:"range", rangeStart:todayStr(), rangeEnd:todayStr(), delayDays:0, isBirthday:false },
  { id:"tplB", name:"延迟券", type:"cash", value:5, minSpend:0, validMode:"days", validDays:30, delayDays:2, isBirthday:false }
];
R.mgSave(g);
let mb = { id:"M2", phone:"139", name:"x", coupons:[], vouchers:[], logs:[], balance:0, points:0, totalSpend:0, level:"普通会员" };
R.mgIssueCoupons(mb, 1, "tplA");
R.mgIssueCoupons(mb, 1, "tplB");
eq(mb.coupons.length, 2, "issued 2 coupons");
let u = R.mgUsableCoupons(mb, 100);
// 范围券今天在范围内 -> 可用；延迟券 effectiveFrom = 今天+2 -> 不可用
eq(u.length, 1, "only range coupon usable today (delayDays=2 excluded)");
eq(u[0].name, "范围券", "usable is range coupon");
eq(u[0].rangeEnd, todayStr(), "range coupon expireAt==rangeEnd");

// 4. stacking math
let mc = { id:"M3", coupons:[
  { id:"c1", type:"cash", value:10, minSpend:0, status:"unused" },
  { id:"c2", type:"cash", value:20, minSpend:0, status:"unused" },
  { id:"c3", type:"discount", value:9, minSpend:0, status:"unused" }
], balance:0, points:0, totalSpend:0, level:"普通会员" };
g = R.mgLoad(); g.config.couponStackable = true; g.config.couponMaxStack = 3; R.mgSave(g);
let r = R.mgCouponOffMulti(mc, ["c1","c2","c3"], 100);
eq(r.totalLeft, 63, "stack: 100 -10(cash) -20(cash) -> 70, then 9折 on 70 = 63");
eq(r.off, 37, "off=37");
eq(r.applied.length, 3, "3 applied");
// max stack cap
g = R.mgLoad(); g.config.couponMaxStack = 2; R.mgSave(g);
r = R.mgCouponOffMulti(mc, ["c1","c2","c3"], 100);
eq(r.applied.length, 2, "maxStack=2 caps applied");
// not stackable
g = R.mgLoad(); g.config.couponStackable = false; R.mgSave(g);
r = R.mgCouponOffMulti(mc, ["c1","c2"], 100);
eq(r.applied.length, 1, "non-stackable -> 1 applied");

// 5. recharge rule
g = R.mgLoad();
g.config.recharge = { "default":{ mode:"preset_custom", presets:[10,50,100] }, stores:{ "s99":{ mode:"preset_only", presets:[20,200] } } };
R.mgSave(g);
let rule = R.mgRechargeRule("zzz");
eq(rule.allowCustom && rule.allowPreset, true, "default rule preset_custom");
eq(rule.presets.join(","), "10,50,100", "default presets");
let rule2 = R.mgRechargeRule("s99");
eq(rule2.allowCustom, false, "s99 preset_only -> no custom");
eq(rule2.presets.join(","), "20,200", "s99 presets override");

// 6. recharge does not add points / totalSpend
let md = { id:"M4", balance:0, points:5, totalSpend:10, recharges:[], coupons:[], vouchers:[], logs:[], level:"普通会员" };
R.mgEnsureFields(md);
R.mgRecharge(md, 100, "tester");
eq(md.balance, 100, "recharge +100 balance");
eq(md.points, 5, "recharge adds no points");
eq(md.totalSpend, 10, "recharge adds no totalSpend");
eq(md.recharges.length, 1, "recharge recorded");

console.log("\n==== pass:"+pass+" fail:"+fail+" ====");
process.exit(fail?1:0);
