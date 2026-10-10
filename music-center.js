/* ================= 背景音乐中心 =================
   后台（酒店前台管理系统）上传/管理 MP3 并远程控制播放；
   自助机（自助入住系统）仅播放，无任何控制按钮，客人无法操作，只有酒店后台能控制。
   · 音频二进制存 IndexedDB（hms_music_db），支持整首 MP3，不占用 localStorage 配额；
   · 曲库/播放模式/控制指令 存 localStorage（hms_music_ctrl_v1::门店），后台写、自助机读；
   · 播放状态（当前曲目/进度）存 localStorage（hms_music_status_v1::门店），自助机写、后台读；
   · 播放音乐期间，自助机自动停止操作指引语音播报（见 speak() 的 __musicPlaying 判断）。
   本文件被两个页面共同引入，函数为全局函数，由各页面显式调用 musicInitDesk()/musicInitKiosk()。 */

var MUS_IDB_NAME = "hms_music_db";
var MUS_CTRL_PREFIX = "hms_music_ctrl_v1::";
var MUS_STATUS_PREFIX = "hms_music_status_v1::";
var MUS_MAX_SIZE = 30 * 1024 * 1024; // 单曲上限 30MB（存入 IndexedDB）
var MUS_AUDIO_RE = /^audio\//;

function musStoreCode() {
    try { return (typeof currentStoreCode === "function" ? currentStoreCode() : "z1001") || "z1001"; }
    catch (e) { return "z1001"; }
}
function musCtrlKey() { return MUS_CTRL_PREFIX + musStoreCode(); }
function musStatusKey() { return MUS_STATUS_PREFIX + musStoreCode(); }
function musFmtTime(s) { s = Math.max(0, Math.floor(s || 0)); var m = Math.floor(s / 60), ss = s % 60; return m + ":" + ("0" + ss).slice(-2); }
function musFmtSize(b) { if (!b) return "—"; if (b < 1024) return b + " B"; if (b < 1048576) return Math.round(b / 1024) + " KB"; return (b / 1048576).toFixed(1) + " MB"; }
function musNowStr() { var n = new Date(); function p(x) { return ("0" + x).slice(-2); } return n.getFullYear() + "-" + p(n.getMonth() + 1) + "-" + p(n.getDate()) + " " + p(n.getHours()) + ":" + p(n.getMinutes()); }
function musAddedBy() { try { if (typeof state !== "undefined" && state && state.login && state.login.user) return state.login.user; } catch (e) {} return ""; }

/* ---------------- IndexedDB 音频存储 ---------------- */
function musOpenDB() {
    return new Promise(function (resolve, reject) {
        var rq = indexedDB.open(MUS_IDB_NAME, 1);
        rq.onupgradeneeded = function () { var db = rq.result; if (!db.objectStoreNames.contains("tracks")) db.createObjectStore("tracks", { keyPath: "id" }); };
        rq.onsuccess = function () { resolve(rq.result); };
        rq.onerror = function () { reject(rq.error || new Error("idb open error")); };
    });
}
function musPutTrack(rec) {
    return musOpenDB().then(function (db) {
        return new Promise(function (resolve, reject) {
            var tx = db.transaction("tracks", "readwrite");
            tx.objectStore("tracks").put(rec);
            tx.oncomplete = function () { try { db.close(); } catch (e) {} resolve(true); };
            tx.onerror = function () { try { db.close(); } catch (e) {} reject(tx.error); };
        });
    });
}
function musGetTrack(id) {
    return musOpenDB().then(function (db) {
        return new Promise(function (resolve) {
            var tx = db.transaction("tracks", "readonly");
            var g = tx.objectStore("tracks").get(id);
            g.onsuccess = function () { try { db.close(); } catch (e) {} resolve(g.result || null); };
            g.onerror = function () { try { db.close(); } catch (e) {} resolve(null); };
        });
    });
}
function musDelTrack(id) {
    return musOpenDB().then(function (db) {
        return new Promise(function (resolve) {
            var tx = db.transaction("tracks", "readwrite");
            tx.objectStore("tracks").delete(id);
            tx.oncomplete = function () { try { db.close(); } catch (e) {} resolve(true); };
            tx.onerror = function () { try { db.close(); } catch (e) {} resolve(false); };
        });
    });
}

/* ---------------- 控制/状态数据（localStorage，按门店隔离） ---------------- */
function musLoadCtrl() {
    try {
        var d = JSON.parse(localStorage.getItem(musCtrlKey()) || "null");
        if (d && Array.isArray(d.tracks)) { d.mode = d.mode || "order"; d.seq = d.seq || 1; return d; }
    } catch (e) {}
    return { tracks: [], mode: "order", cmd: null, seq: 1 };
}
function musSaveCtrl(d) { try { localStorage.setItem(musCtrlKey(), JSON.stringify(d)); } catch (e) {} }
function musLoadStatus() {
    try { var s = JSON.parse(localStorage.getItem(musStatusKey()) || "null"); if (s) return s; } catch (e) {}
    return { playing: false, trackId: "", trackName: "", position: 0, duration: 0, at: 0 };
}
function musSaveStatus(s) { try { localStorage.setItem(musStatusKey(), JSON.stringify(s)); } catch (e) {} }
function musSaveStatusFor(code, s) { try { localStorage.setItem(MUS_STATUS_PREFIX + code, JSON.stringify(s)); } catch (e) {} }
function musSend(action, payload) {
    var d = musLoadCtrl();
    var cmd = { id: (d.cmd && d.cmd.id ? d.cmd.id : 0) + 1, action: action, at: Date.now() };
    if (payload) for (var k in payload) if (Object.prototype.hasOwnProperty.call(payload, k)) cmd[k] = payload[k];
    d.cmd = cmd; musSaveCtrl(d);
    return cmd;
}

/* ================= 后台（前台管理系统）控制界面 ================= */
var __musDragging = false;

function renderMusic() {
    var sec = document.getElementById("view-music");
    if (!sec) return; // 非后台页面
    var d = musLoadCtrl(), st = musLoadStatus();
    var cnt = document.getElementById("musicCount"); if (cnt) cnt.textContent = d.tracks.length;
    var bOrder = document.getElementById("musModeOrder"), bShuf = document.getElementById("musModeShuffle");
    if (bOrder) { bOrder.className = "btn btn-sm " + (d.mode === "order" ? "btn-gold" : "btn-ghost"); }
    if (bShuf) { bShuf.className = "btn btn-sm " + (d.mode === "shuffle" ? "btn-gold" : "btn-ghost"); }
    musUpdateStatusBar();
    var tb = document.getElementById("musicTrackRows");
    if (tb) {
        if (!d.tracks.length) {
            tb.innerHTML = '<tr><td colspan="7"><div class="empty"><div class="big">🎵</div>暂无音乐，请点击右上角上传 MP3<br><span style="font-size:12px;color:#a4aec2;">上传后由后台统一控制播放，自助机仅播放、无任何控制按钮，客人无法操作</span></div></td></tr>';
        } else {
            tb.innerHTML = d.tracks.map(function (t, idx) {
                var isCur = (st.trackId === t.id);
                return '<tr' + (isCur ? ' style="background:#fff8e6;"' : '') + '>'
                    + '<td>' + (idx + 1) + '</td>'
                    + '<td>' + (isCur ? (st.playing ? '🔊 ' : '⏸ ') : '🎵 ') + esc(t.name) + '</td>'
                    + '<td>' + musFmtTime(t.dur) + '</td>'
                    + '<td>' + musFmtSize(t.size) + '</td>'
                    + '<td style="font-size:12px;color:var(--muted);">' + esc((t.addedAt || "").slice(0, 16)) + '</td>'
                    + '<td>'
                    + '<button class="btn btn-primary btn-sm" onclick="musPlayTrack(\'' + t.id + '\')">▶ 播放</button> '
                    + '<button class="btn btn-ghost btn-sm" onclick="musRename(\'' + t.id + '\')">✎ 改名</button> '
                    + '<button class="btn btn-danger btn-sm" onclick="musDelete(\'' + t.id + '\')">🗑 删除</button>'
                    + '</td>'
                    + '<td>'
                    + '<button class="btn btn-ghost btn-sm" onclick="musMove(\'' + t.id + '\',-1)"' + (idx === 0 ? ' disabled' : '') + '>↑</button> '
                    + '<button class="btn btn-ghost btn-sm" onclick="musMove(\'' + t.id + '\',1)"' + (idx === d.tracks.length - 1 ? ' disabled' : '') + '>↓</button>'
                    + '</td>'
                    + '</tr>';
            }).join("");
        }
    }
}

function musUpdateStatusBar() {
    var st = musLoadStatus(), d = musLoadCtrl();
    var np = document.getElementById("musicNowPlaying");
    if (np) {
        var tn = st.trackName || "";
        if (!tn) { for (var i = 0; i < d.tracks.length; i++) if (d.tracks[i].id === st.trackId) { tn = d.tracks[i].name; break; } }
        np.textContent = st.playing ? ("🔊 正在播放：" + (tn || "—")) : (st.trackId ? ("⏸ 已暂停：" + (tn || "—")) : "⏹ 未播放");
        np.style.color = st.playing ? "var(--gold)" : "var(--navy)";
    }
    var pr = document.getElementById("musicProgress");
    if (pr && !__musDragging) { pr.max = Math.max(1, Math.floor(st.duration || 0)); pr.value = Math.min(pr.max, Math.floor(st.position || 0)); }
    var ct = document.getElementById("musicCurTime"); if (ct) ct.textContent = musFmtTime(st.position || 0);
    var dtEl = document.getElementById("musicDurTime"); if (dtEl) dtEl.textContent = musFmtTime(st.duration || 0);
}

function musProbeDuration(file) {
    return new Promise(function (resolve) {
        try {
            var url = URL.createObjectURL(file), a = document.createElement("audio"), done = false;
            var fin = function (v) { if (done) return; done = true; try { URL.revokeObjectURL(url); } catch (e) {} resolve(v || 0); };
            a.preload = "metadata";
            a.onloadedmetadata = function () { fin(a.duration && isFinite(a.duration) ? a.duration : 0); };
            a.onerror = function () { fin(0); };
            setTimeout(function () { fin(a.duration && isFinite(a.duration) ? a.duration : 0); }, 4000);
            a.src = url;
        } catch (e) { resolve(0); }
    });
}

function musUpload(input) {
    var files = Array.prototype.slice.call(input.files || []);
    if (!files.length) return;
    var pending = files.slice();
    (function next() {
        var f = pending.shift();
        if (!f) { input.value = ""; renderMusic(); return; }
        if (!MUS_AUDIO_RE.test(f.type) && !/\.mp3$/i.test(f.name)) { if (typeof toast === "function") toast("仅支持音频文件（MP3）：" + f.name, "err"); return next(); }
        if (f.size > MUS_MAX_SIZE) { if (typeof toast === "function") toast("文件过大（超过 30MB）：" + f.name, "err"); return next(); }
        var id = "S" + Date.now() + "_" + Math.floor(Math.random() * 100000);
        var name = String(f.name).replace(/\.[^.]+$/, "");
        musProbeDuration(f).then(function (dur) {
            return musPutTrack({ id: id, blob: f, name: name, mime: f.type || "audio/mpeg", size: f.size, dur: dur, addedAt: Date.now(), store: musStoreCode() }).then(function () {
                var d = musLoadCtrl();
                d.tracks.push({ id: id, name: name, size: f.size, dur: dur, addedAt: musNowStr(), addedBy: musAddedBy() });
                d.seq = (d.seq || 1) + 1;
                musSaveCtrl(d);
                if (typeof toast === "function") toast("已上传音乐：" + name);
                renderMusic();
                next();
            });
        }).catch(function () { if (typeof toast === "function") toast("保存失败：" + f.name, "err"); next(); });
    })();
}

function musPlayTrack(id) { musSend("playTrack", { trackId: id }); if (typeof toast === "function") toast("已下发播放指令，本店自助机将播放该曲目"); }
function musMasterPlay() {
    var st = musLoadStatus();
    if (st.trackId) { musSend("resume"); }
    else { var d = musLoadCtrl(); if (!d.tracks.length) { if (typeof toast === "function") toast("曲库为空，请先上传 MP3", "err"); return; } musSend("playTrack", { trackId: d.tracks[0].id }); }
}
function musMasterPause() { musSend("pause"); }
function musMasterStop() { musSend("stop"); }
function musNext() { musSend("next"); }
function musPrev() { musSend("prev"); }
function musSetMode(m) {
    var d = musLoadCtrl(); d.mode = m; musSaveCtrl(d); musSend("setMode", { mode: m }); renderMusic();
    if (typeof toast === "function") toast(m === "shuffle" ? "已切换为随机播放" : "已切换为顺序播放");
}
function musRename(id) {
    var d = musLoadCtrl(), t = null;
    d.tracks.forEach(function (x) { if (x.id === id) t = x; });
    if (!t) return;
    var nn = prompt("修改歌曲名称：", t.name);
    if (nn === null) return;
    nn = String(nn).trim();
    if (!nn) { if (typeof toast === "function") toast("名称不能为空", "err"); return; }
    t.name = nn; musSaveCtrl(d); musSend("metaChanged", {}); renderMusic();
    if (typeof toast === "function") toast("已重命名为：" + nn);
}
function musDelete(id) {
    var d = musLoadCtrl(), t = null;
    d.tracks.forEach(function (x) { if (x.id === id) t = x; });
    if (!t) return;
    if (!confirm("确定删除歌曲「" + t.name + "」？该操作不可恢复。")) return;
    d.tracks = d.tracks.filter(function (x) { return x.id !== id; });
    musSaveCtrl(d);
    try { musDelTrack(id); } catch (e) {}
    var st = musLoadStatus();
    if (st.trackId === id) musSend("stop");
    renderMusic();
    if (typeof toast === "function") toast("已删除：" + t.name);
}
function musMove(id, dir) {
    var d = musLoadCtrl(), i = -1;
    for (var k = 0; k < d.tracks.length; k++) if (d.tracks[k].id === id) i = k;
    if (i < 0) return;
    var j = i + dir; if (j < 0 || j >= d.tracks.length) return;
    var tmp = d.tracks[i]; d.tracks[i] = d.tracks[j]; d.tracks[j] = tmp;
    musSaveCtrl(d); renderMusic();
}
function musProgressInput(el) { __musDragging = true; var ct = document.getElementById("musicCurTime"); if (ct) ct.textContent = musFmtTime(el.value); }
function musProgressChange(el) { __musDragging = false; var pos = parseFloat(el.value) || 0; musSend("seek", { position: pos }); }
function musProgressUp() { __musDragging = false; }

function musicInitDesk() {
    if (window.__musDeskInited) return;
    window.__musDeskInited = true;
    window.addEventListener("storage", function (e) {
        var sec = document.getElementById("view-music");
        var active = sec && sec.classList.contains("active");
        if (e.key === musStatusKey()) { if (active) musUpdateStatusBar(); }
        else if (e.key === musCtrlKey()) { if (active) renderMusic(); }
    });
    // 进度条平滑走动：仅当音乐页处于激活状态时读取播放状态（跨标签页 storage 事件之外的兜底）
    setInterval(function () {
        var sec = document.getElementById("view-music");
        if (sec && sec.classList.contains("active")) musUpdateStatusBar();
    }, 1000);
}

/* ================= 自助机播放器（仅播放，无任何控制按钮） ================= */
var __musAudio = null, __musKioskInited = false, __musLastCmdId = 0, __musCurUrl = null, __musLastReport = 0, __musStopped = false;
var __musBoundStore = "";     // 播放器绑定的门店编号：换店后须停掉上一家店的音乐
var __musPendingId = null;    // 被浏览器自动播放策略拦下的曲目，等首次触屏后自动续播
var __musSwitching = false;   // 换店处理中：抑制 pause 等事件回写状态，避免污染新门店

function __musEnsureIndicator() {
    var el = document.getElementById("musPlayingIndicator");
    if (el) return el;
    el = document.createElement("div");
    el.id = "musPlayingIndicator";
    el.style.cssText = "position:fixed;left:14px;bottom:14px;z-index:99998;display:none;max-width:70vw;background:rgba(0,0,0,.62);color:#fff;font-size:13px;padding:7px 14px;border-radius:18px;pointer-events:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
    if (document.body) document.body.appendChild(el);
    return el;
}
function __musIndicator(on) {
    var el = __musEnsureIndicator();
    if (!el) return;
    if (on) { var nm = (__musAudio && __musAudio.__trackName) || ""; el.textContent = "🎵 背景音乐播放中" + (nm ? ("：" + nm) : ""); el.style.display = "block"; }
    else { el.style.display = "none"; }
}
// 仅提示，不含任何可点击控件：等待客人首次触屏以取得浏览器自动播放许可
function __musIndicatorWait() {
    var el = __musEnsureIndicator();
    if (!el) return;
    el.textContent = "🎵 背景音乐已就绪，触摸屏幕后自动播放";
    el.style.display = "block";
}
/* 自动播放策略兜底：play() 被拒时记下曲目，客人首次触屏（自助机必然发生）后自动续播。
   不新增任何控制按钮，客人无感知，仍只有酒店后台能控制播放。 */
function __musArmAutoplay(id) {
    var need = (__musPendingId === null);   // 已有排队时只更新曲目，不重复挂监听
    __musPendingId = id;
    __musIndicatorWait();
    if (!need) return;
    var h = function () {
        document.removeEventListener("pointerdown", h, true);
        document.removeEventListener("touchstart", h, true);
        document.removeEventListener("keydown", h, true);
        var pid = __musPendingId; __musPendingId = null;
        if (pid && !__musStopped) __musPlayId(pid);
    };
    document.addEventListener("pointerdown", h, true);
    document.addEventListener("touchstart", h, true);
    document.addEventListener("keydown", h, true);
}
/* 换店检测：自助机切换到别的门店后，停止上一家店的音乐并改读新店曲库 */
function __musStoreChanged() {
    var cur = musStoreCode();
    if (!__musBoundStore) { __musBoundStore = cur; return false; }
    if (cur === __musBoundStore) return false;
    var prev = __musBoundStore;         // 先记下旧门店：停播状态要写回旧门店，不能污染新店
    __musBoundStore = cur;
    __musStopped = true;
    __musPendingId = null;
    __musSwitching = true;              // 抑制 pause 事件回写（否则会把旧店状态写进新店键）
    if (__musAudio) {
        try { __musAudio.pause(); } catch (e) {}
        try { __musAudio.currentTime = 0; } catch (e) {}
        try { __musAudio.removeAttribute("src"); __musAudio.load(); } catch (e) {}
        __musAudio.__trackId = ""; __musAudio.__trackName = "";
    }
    if (__musCurUrl) { try { URL.revokeObjectURL(__musCurUrl); } catch (e) {} __musCurUrl = null; }
    window.__musicPlaying = false;
    // 写回旧门店：后台看旧店时显示"未播放"（符合实际），新店真实状态保持不变
    musSaveStatusFor(prev, { playing: false, trackId: "", trackName: "", position: 0, duration: 0, at: Date.now() });
    __musSwitching = false;
    __musIndicator(false);
    return true;
}
function musicInitKiosk() {
    if (__musKioskInited) {
        if (__musStoreChanged()) __musResync();  // 换店：先停掉上一家店的音乐并对齐指令游标
        __musRestoreAfterReload();               // 恢复本店应在播的曲目
        return;
    }
    __musKioskInited = true;
    __musBoundStore = musStoreCode();
    __musAudio = new Audio();
    __musAudio.preload = "auto";
    __musAudio.__trackId = ""; __musAudio.__trackName = "";
    __musAudio.addEventListener("play", function () { window.__musicPlaying = true; try { if (typeof stopVoice === "function") stopVoice(); } catch (e) {} __musReport(true); __musIndicator(true); });
    __musAudio.addEventListener("pause", function () { window.__musicPlaying = false; __musReport(false); if (!__musPendingId) __musIndicator(false); });
    __musAudio.addEventListener("ended", function () { window.__musicPlaying = false; __musReport(false); __musAutoNext(); });
    __musAudio.addEventListener("timeupdate", function () { var now = Date.now(); if (now - __musLastReport > 400) { __musLastReport = now; if (!__musAudio.paused) __musReport(true); } });
    __musAudio.addEventListener("error", function () { window.__musicPlaying = false; __musReport(false); __musIndicator(false); });
    window.addEventListener("storage", function (e) { if (e.key === musCtrlKey()) __musCheckCmd(); });
    setInterval(__musCheckCmd, 1200); // 兜底轮询
    __musEnsureIndicator();
    __musResync();
    __musRestoreAfterReload();
}
function __musResync() { var d = musLoadCtrl(); __musLastCmdId = (d.cmd && d.cmd.id) ? d.cmd.id : 0; }
/* 刷新/重启恢复：初始化时指令游标会与最后一条指令对齐（避免重复执行历史 pause/stop），
   但这会连带丢弃"刷新前正在播放"这一事实，造成自助机停摆而后台仍显示正在播放。
   故按自助机自己上报的状态续播，保证后台显示与实际出声一致。
   仅在本机近期（10 分钟内）确实在播放时恢复：长时间关机后开机不自动开播，仍由后台下发。 */
var MUS_RESTORE_WINDOW = 10 * 60 * 1000;
function __musRestoreAfterReload() {
    if (!__musAudio) return;
    var st = musLoadStatus();
    if (!st || !st.playing || !st.trackId) return;
    if (__musAudio.src) return;                       // 已在播，无需恢复
    if (st.at && (Date.now() - st.at) > MUS_RESTORE_WINDOW) return;  // 状态过期
    __musStopped = false;
    __musPlayId(st.trackId);
}
function __musCheckCmd() {
    if (__musStoreChanged()) { __musResync(); }  // 换店后指令游标须按新店重新对齐
    var d = musLoadCtrl(), cmd = d.cmd;
    if (!cmd || !cmd.id) return;
    if (cmd.id === __musLastCmdId) return;
    __musLastCmdId = cmd.id;
    __musHandleCmd(cmd, d);
}
// 尝试续播当前曲目；被自动播放策略拒绝时转入触屏解锁队列
function __musTryPlay() {
    __musStopped = false;
    if (!__musAudio || !__musAudio.src) return false;
    var id = __musAudio.__trackId || "";
    __musAudio.play().then(function () { __musPendingId = null; }).catch(function () { if (id) __musArmAutoplay(id); });
    return true;
}
function __musHandleCmd(cmd, d) {
    switch (cmd.action) {
        case "playTrack": __musPlayId(cmd.trackId); break;
        case "resume": if (!__musTryPlay()) { __musPlayFirst(d); } break;
        case "play": if (!(__musAudio.src && __musAudio.paused && __musTryPlay())) { __musPlayFirst(d); } break;
        case "pause": __musPendingId = null; __musAudio.pause(); break;
        case "stop": __musPendingId = null; __musStopped = true; __musAudio.pause(); try { __musAudio.currentTime = 0; } catch (e) {} window.__musicPlaying = false; __musReport(false); __musIndicator(false); break;
        case "next": __musStep(d, 1); break;
        case "prev": __musStep(d, -1); break;
        case "seek": try { __musAudio.currentTime = Math.max(0, cmd.position || 0); } catch (e) {} __musReport(!__musAudio.paused); break;
        case "metaChanged": __musReport(!__musAudio.paused); break;
        case "setMode": break;
    }
}
function __musPlayFirst(d) { if (d.tracks && d.tracks.length) __musPlayId(d.tracks[0].id); }
function __musStep(d, dir) {
    var list = d.tracks || []; if (!list.length) return;
    var curId = __musAudio.__trackId || (musLoadStatus().trackId);
    if ((d.mode || "order") === "shuffle") {
        var pool = list.filter(function (t) { return t.id !== curId; });
        var pick = pool.length ? pool[Math.floor(Math.random() * pool.length)] : list[0];
        __musPlayId(pick.id); return;
    }
    var idx = 0; for (var i = 0; i < list.length; i++) if (list[i].id === curId) idx = i;
    var ni = (idx + dir + list.length) % list.length;
    __musPlayId(list[ni].id);
}
function __musAutoNext() {
    var d = musLoadCtrl(), list = d.tracks || [];
    if (__musStopped) { __musStopped = false; __musIndicator(false); return; } // 手动停止后不自动续播
    if (!list.length) { __musIndicator(false); return; }
    if ((d.mode || "order") === "shuffle") { __musStep(d, 1); return; }
    var curId = __musAudio.__trackId, idx = 0;
    for (var i = 0; i < list.length; i++) if (list[i].id === curId) idx = i;
    __musPlayId(list[(idx + 1) % list.length].id);
}
function __musPlayId(id) {
    if (!id) return;
    __musStopped = false;
    musGetTrack(id).then(function (rec) {
        if (!rec || !rec.blob) return;
        var d = musLoadCtrl(), meta = null;
        (d.tracks || []).forEach(function (t) { if (t.id === id) meta = t; });
        if (__musCurUrl) { try { URL.revokeObjectURL(__musCurUrl); } catch (e) {} }
        __musCurUrl = URL.createObjectURL(rec.blob);
        __musAudio.src = __musCurUrl;
        __musAudio.__trackId = id;
        __musAudio.__trackName = meta ? meta.name : (rec.name || "");
        __musAudio.play().then(function () {
            __musPendingId = null;
            window.__musicPlaying = true;
            try { if (typeof stopVoice === "function") stopVoice(); } catch (e) {}
            __musReport(true); __musIndicator(true);
        }).catch(function () {
            // 被自动播放策略拦下（页面尚无任何用户手势）：排队等首次触屏后自动续播
            __musStopped = false;
            window.__musicPlaying = false;
            __musReport(false);
            __musArmAutoplay(id);
        });
    }).catch(function () {});
}
function __musReport(playing) {
    if (!__musAudio) return;
    if (__musSwitching) return;   // 换店处理中：由 __musStoreChanged 显式写回旧门店，此处不回写
    var s = {
        playing: !!playing && !__musAudio.paused,
        trackId: __musAudio.__trackId || "",
        trackName: __musAudio.__trackName || "",
        position: __musAudio.currentTime || 0,
        duration: (__musAudio.duration && isFinite(__musAudio.duration)) ? __musAudio.duration : 0,
        at: Date.now()
    };
    musSaveStatus(s);
}
