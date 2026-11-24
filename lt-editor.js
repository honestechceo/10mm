// Lost Toolbox LEVEL MAKER: players paint their own drawer square by square (ground, pits, blocks, traps,
// every bad guy, the boss), shown live with the game's real art. A level has to be beaten by its maker
// before it can be shared. Share codes hold the whole layout. Coins in custom levels never reach the wallet.
(() => {
  const ROWS = 13, KEY = "tenmm-lt-custom", MAX = 30, MINW = 30, MAXW = 400;
  const B = () => window.LTBuild, LB = () => window.LostBox, E = () => window.LostBox._edit, U = () => window.LostBox._ui;
  const SOLID = "#=CU?RSD<>i", SEMI = "-q";
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const src = (k) => (k.includes(".") ? k : "lt/" + k + ".webp");
  const BOSS_KINDS = ["walker", "charger", "flyer", "roller", "magnet", "gunner", "stomper", "serpent", "vac", "kraken", "king", "captain"];
  const BOSS_HP = { walker: 3, charger: 3, flyer: 3, roller: 3, magnet: 4, gunner: 4, stomper: 5, serpent: 5, vac: 5, kraken: 5, king: 6, captain: 6 };
  const PUS = ["shield", "heart", "wrench", "pound", "air", "lucky", "magnet", "speed", "spring"];
  const PU_NAMES = { shield: "Shield", heart: "Extra heart", wrench: "Wrench toss", pound: "Ground pound", air: "Air compressor", lucky: "Lucky socket", magnet: "Magnet", speed: "Speed", spring: "Spring" };
  const SPEEDS = [[1, "NORMAL"], [1.25, "FAST"], [1.5, "FASTER"]];

  // ---------- the tool palette ----------
  // [tab, char, label, icon, kind]   kind: one = only one allowed (moves when placed again)
  const TABS = [["ground", "GROUND"], ["items", "ITEMS"], ["traps", "TRAPS"], ["bad", "BAD GUYS"], ["boss", "BOSS"], ["start", "START / EXIT"]];
  const TOOLS = [
    ["ground", "#", "Ground", "t-square"], ["ground", "=", "Toolbox", "t-redbox"], ["ground", "-", "Bench", "t-bench"], ["ground", "q", "Crumbly ledge", "ob-ledge"],
    ["ground", "i", "Slick floor", "t-square", "slick"], ["ground", "<", "Belt ◀", "ob-conveyor"], ["ground", ">", "Belt ▶", "ob-conveyor"], ["ground", "C", "Crate", "t-crate"], ["ground", "D", "Drum", "drum"],
    ["items", "o", "Coin", "coin"], ["items", "?", "Coin block", "qblock"], ["items", "U", "Power-up block", "pu-shield"], ["items", "Z", "Spring", "spring"], ["items", "!", "Checkpoint", "ob-flag-red"],
    ["traps", "n", "Crusher", "bl-crusher"], ["traps", "e", "Zapper", "ob-zap-on"], ["traps", "p", "Piston", "tool-piston.webp"], ["traps", "g", "Gear", "gear"], ["traps", "c", "Swinging chain", "hoist"],
    ["traps", "f", "Falling part", "nut"], ["traps", "P", "Oil pan", "pan"], ["traps", "M", "Moving platform", "ob-scissor"], ["traps", "L", "Lift", "lift-l"],
    ["bad", "r", "Stripped Bolt", "en-sbolt0"], ["bad", "m", "Rusty Wrench", "en-rwrench0"], ["bad", "j", "Lug Nut Ninja", "en-ninja0"], ["bad", "G", "Impact Gun", "en-igun0"], ["bad", "T", "Rolling Tire", "tire"], ["bad", "J", "Floor Jack", "jack"],
    ["bad", "K", "Creeper", "creeper"], ["bad", "k", "Tool Cart", "toolcart"], ["bad", "b", "Flying Nut", "fly-nut"], ["bad", "h", "Drone", "fly-drone"], ["bad", "v", "Diving Screw", "fly-screw"],
    ...BOSS_KINDS.map((k) => ["boss", "B:" + k, null, null]),
    ["start", "@", "Start", "u-idle_01"], ["start", "X", "Exit drawer", "drawer3"],
  ];
  const ONE = "@XB";
  const CHARS = ".#=-qi<>CD?UoZ!nepgcfPMLrmjGTJKkbhv@XB"; // every char a level can hold (share code alphabet)

  // ---------- saved levels ----------
  const blank = (w) => {
    const rows = Array.from({ length: ROWS }, (_, y) => Array(w).fill(y >= 11 ? "#" : "."));
    rows[10][2] = "@"; rows[10][w - 5] = "X";
    return rows;
  };
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  function fromGen(g, st) { // a generated level (lt-builder) -> maker format
    const ext = {}; for (const [x, y, kw] of g.ext) ext[x + "," + y] = kw;
    return { name: "", bg: g.bg, hp: (st && st.hp) || 3, espd: 1, rows: g.rows.map((r) => r.split("")), ext, ok: false, src: "mine" };
  }
  function mine() {
    let a = [];
    try { a = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) {}
    if (!Array.isArray(a)) a = [];
    return a.map((v) => {
      if (!v) return null;
      if (v.st && typeof v.seed === "number" && !v.rows) { try { const g = B().build(v.st, v.seed); return Object.assign(fromGen(g, v.st), { id: v.id, name: v.name || "" }); } catch (e) { return null; } }
      if (!Array.isArray(v.rows) || v.rows.length !== ROWS) return null;
      return { id: v.id, name: v.name || "", bg: v.bg || "garage", hp: v.hp || 3, espd: v.espd || 1, rows: v.rows.map((r) => String(r).split("")), ext: Object.fromEntries((v.ext || []).map(([x, y, kw]) => [x + "," + y, kw])), ok: !!v.ok, src: v.src || "mine" };
    }).filter(Boolean);
  }
  const pack1 = (v) => ({ id: v.id, name: v.name, bg: v.bg, hp: v.hp, espd: v.espd, rows: v.rows.map((r) => r.join("")), ext: Object.entries(v.ext).map(([k, kw]) => { const [x, y] = k.split(",").map(Number); return [x, y, kw]; }), ok: !!v.ok, src: v.src });
  function keep(list) { try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX).map(pack1))); return true; } catch (e) { return false; } }
  function saveLv(v) {
    if (!v.id) v.id = newId();
    const a = mine(), i = a.findIndex((x) => x.id === v.id);
    if (i >= 0) a[i] = v; else a.unshift(v);
    return keep(a);
  }
  const nameOf = (v) => v.name || "MY LEVEL";
  const W = (v) => v.rows[0].length;
  function findAll(v, ch) { const out = []; v.rows.forEach((r, y) => r.forEach((c, x) => { if (c === ch) out.push([x, y]); })); return out; }

  // the level as the game engine reads it, in the custom slot
  function toSlot(v) {
    const i = B().slot();
    window.LT_LEVELS[i] = { name: nameOf(v), bg: v.bg, music: B().MUSIC[v.bg] || "garage", rows: v.rows.map((r) => r.join("")), ext: Object.entries(v.ext).map(([k, kw]) => { const [x, y] = k.split(",").map(Number); return [x, y, kw]; }), room: null, custom: true, hp: v.hp || 3, espd: v.espd || 1 };
    return i;
  }

  // ---------- share codes: the whole layout, run-length packed ----------
  function hash16(bytes) { let h = 0x811c9dc5; for (const b of bytes) { h ^= b; h = Math.imul(h, 16777619) >>> 0; } return [(h ^ (h >>> 16)) & 255, ((h >>> 8) ^ (h >>> 24)) & 255]; }
  function encode(v) {
    const o = [1, Math.max(0, B().BGS.indexOf(v.bg)), v.hp || 3, Math.max(0, SPEEDS.findIndex((s) => s[0] === (v.espd || 1)))];
    const w = W(v); o.push(w & 255, w >> 8);
    const nm = cleanName(v.name); o.push(nm.length); for (const ch of nm) o.push(ch.charCodeAt(0));
    for (const row of v.rows) { let x = 0; while (x < w) { const ch = row[x]; let n = 1; while (x + n < w && row[x + n] === ch && n < 255) n++; o.push(Math.max(0, CHARS.indexOf(ch)), n); x += n; } }
    const ex = Object.entries(v.ext).filter(([k]) => { const [x, y] = k.split(",").map(Number); return "UcMLB".includes((v.rows[y] || [])[x]); });
    o.push(ex.length & 255, ex.length >> 8);
    for (const [k, kw] of ex) {
      const [x, y] = k.split(",").map(Number), ch = v.rows[y][x], ph = Math.round((kw.phase || 0) * 100);
      o.push(x & 255, x >> 8, y);
      if (ch === "U") o.push(Math.max(0, PUS.indexOf(kw.pu)));
      if (ch === "c") o.push(kw.len || 4, ph);
      if (ch === "M") o.push(kw.dx || 3, Math.min(255, Math.round(kw.speed || 70)), ph);
      if (ch === "L") o.push(kw.dy || 3, Math.min(255, Math.round(kw.speed || 70)), ph);
      if (ch === "B") o.push(Math.max(0, BOSS_KINDS.indexOf(kw.boss)), kw.hp || 3, Math.round((kw.spd || 1) * 20));
    }
    o.push(...hash16(o));
    let s = ""; for (const b of o) s += String.fromCharCode(b);
    return "LT1-" + btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function decode(code) {
    try {
      let t = String(code || "").replace(/\s+/g, "");
      const at = t.indexOf("LT1-"); if (at < 0) return null;
      t = t.slice(at + 4).replace(/[^A-Za-z0-9_-]/g, "").replace(/-/g, "+").replace(/_/g, "/");
      while (t.length % 4) t += "=";
      const raw = atob(t), b = Array.from(raw, (c) => c.charCodeAt(0));
      if (b.length < 12) return null;
      const body = b.slice(0, -2), h = hash16(body);
      if (h[0] !== b[b.length - 2] || h[1] !== b[b.length - 1]) return null;
      let p = 0; const rd = () => { if (p >= body.length) throw 0; return body[p++]; };
      if (rd() !== 1) return null;
      const bg = B().BGS[rd()] || "garage", hp = Math.min(3, Math.max(1, rd())), espd = (SPEEDS[rd()] || SPEEDS[0])[0];
      const w = rd() | (rd() << 8); if (w < MINW || w > MAXW) return null;
      let name = ""; for (let n = rd(); n > 0; n--) name += String.fromCharCode(rd());
      const rows = [];
      for (let y = 0; y < ROWS; y++) { const r = []; while (r.length < w) { const ch = CHARS[rd()], n = rd(); if (!ch || !n) return null; for (let k = 0; k < n; k++) r.push(ch); } if (r.length !== w) return null; rows.push(r); }
      const ext = {};
      for (let n = rd() | (rd() << 8); n > 0; n--) {
        const x = rd() | (rd() << 8), y = rd(), ch = (rows[y] || [])[x];
        if (ch === "U") ext[x + "," + y] = { pu: PUS[rd()] || "shield" };
        else if (ch === "c") ext[x + "," + y] = { len: rd(), phase: rd() / 100 };
        else if (ch === "M") ext[x + "," + y] = { dx: rd(), speed: rd(), phase: rd() / 100 };
        else if (ch === "L") ext[x + "," + y] = { dy: rd(), speed: rd(), phase: rd() / 100 };
        else if (ch === "B") { const k = BOSS_KINDS[rd()] || "walker"; ext[x + "," + y] = { boss: k, hp: Math.min(12, rd()), spd: Math.min(2, rd() / 20), name: B().BOSS_NAMES[k] }; }
        else return null;
      }
      const v = { name: cleanName(name), bg, hp, espd, rows, ext, ok: true, src: "friend" };
      if (findAll(v, "@").length !== 1 || findAll(v, "X").length !== 1 || findAll(v, "B").length > 1) return null;
      return v;
    } catch (e) { return null; }
  }
  const cleanName = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9 '!?.&-]/g, "").slice(0, 18).trim();

  // ---------- the editor ----------
  let draw = false, lv = null, tab = "ground", tool = "#", opts = { pu: "shield", len: 4, dx: 3, dy: 3, spd: 75, bossHard: 0 }, undo = [], zoomI = 0, camX = 0, testing = false, dom = null, dirty = false, lastPlayed = null;
  const ZOOMS = [1, 0.75];

  function buildDom() {
    if (dom) return dom;
    const root = E().root();
    const top = document.createElement("div"); top.id = "lteTop"; top.className = "hidden";
    const I = window.GICON;
    top.innerHTML = '<button id="lteDone" aria-label="Done">' + I.close(20) + '</button><b id="lteName"></b><button id="lteUndo" aria-label="Undo">' + I.undo(22) + '</button><button id="lteZoom" aria-label="Zoom">' + I.zoom(22) + '</button><button id="lteSet" aria-label="Level settings">' + I.gear(22) + '</button><button id="lteTest" class="go">' + I.play(18) + "TEST</button>";
    const panel = document.createElement("div"); panel.id = "ltePanel"; panel.className = "hidden";
    panel.innerHTML = '<input type="range" id="lteScroll" min="0" max="100" value="0" aria-label="Scroll the level"><div class="ltestat" id="lteStat"></div><div class="ltetabs" id="lteTabs"></div><div class="lteopts" id="lteOpts"></div><div class="ltetools" id="lteTools"></div>';
    root.append(top, panel);
    dom = { root, top, panel, cv: root.querySelector("#ltc") };
    top.querySelector("#lteDone").onclick = () => { saveLv(lv); exitEditor(); list(); };
    top.querySelector("#lteUndo").onclick = () => { const s = undo.pop(); if (s) { const o = JSON.parse(s); lv.rows = o.rows.map((r) => r.split("")); lv.ext = o.ext; lv.ok = false; refresh(); } };
    top.querySelector("#lteZoom").onclick = () => { zoomI = (zoomI + 1) % ZOOMS.length; refresh(); };
    top.querySelector("#lteSet").onclick = settings; top.querySelector("#lteName").onclick = settings;
    top.querySelector("#lteTest").onclick = test;
    panel.querySelector("#lteScroll").oninput = (e) => { camX = E().setCam(+e.target.value); };
    // tap = place one thing, drag = scroll. With DRAW on, dragging paints ground, coins or erases.
    const pts = new Map(); let pan = null, stroke = null, down = null;
    const cvx = dom.cv;
    const dragPaints = () => draw && (tool === "erase" || tab === "ground" || tool === "o");
    cvx.addEventListener("pointerdown", (e) => {
      if (!editing()) return;
      e.preventDefault(); cvx.setPointerCapture && cvx.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, e.clientX);
      if (pts.size > 1) { pan = { x: avgX(pts), cam: E().cam() }; down = null; stroke = null; return; }
      down = { x: e.clientX, y: e.clientY, moved: false };
      if (dragPaints()) { stroke = { last: null }; snap(); paintAt(e.clientX, e.clientY); down = null; }
    });
    cvx.addEventListener("pointermove", (e) => {
      if (!editing() || !pts.has(e.pointerId)) return;
      pts.set(e.pointerId, e.clientX);
      if (stroke) { paintAt(e.clientX, e.clientY); return; }
      if (down && !down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 10) { down.moved = true; pan = { x: avgX(pts), cam: E().cam() }; }
      if (pan) { camX = E().setCam(pan.cam - (avgX(pts) - pan.x) * E().px()); syncScroll(); }
    });
    const up = (e) => {
      if (!pts.has(e.pointerId)) return;
      if (down && !down.moved && pts.size === 1 && e.type === "pointerup") { snap(); stroke = { last: null }; paintAt(down.x, down.y); }
      pts.delete(e.pointerId);
      if (!pts.size) { pan = null; stroke = null; down = null; } else if (pan) pan = { x: avgX(pts), cam: E().cam() };
    };
    cvx.addEventListener("pointerup", up); cvx.addEventListener("pointercancel", up);
    function avgX(m) { let s = 0; for (const v of m.values()) s += v; return s / m.size; }
    function paintAt(cx, cy) {
      const c = E().cell(cx, cy);
      const last = stroke && stroke.last;
      if (last && last.x === c.x && last.y === c.y) return;
      // fill the gap when a fast drag skips cells
      if (last && Math.abs(c.x - last.x) + Math.abs(c.y - last.y) > 1) {
        const n = Math.max(Math.abs(c.x - last.x), Math.abs(c.y - last.y));
        for (let k = 1; k < n; k++) paint(Math.round(last.x + ((c.x - last.x) * k) / n), Math.round(last.y + ((c.y - last.y) * k) / n));
      }
      paint(c.x, c.y);
      if (stroke) stroke.last = c;
    }
    return dom;
  }
  const editing = () => dom && dom.root.classList.contains("editing");
  function snap() { undo.push(JSON.stringify({ rows: lv.rows.map((r) => r.join("")), ext: lv.ext })); if (undo.length > 40) undo.shift(); }
  function flash(t) { const s = dom.panel.querySelector("#lteStat"); s.textContent = t; s.classList.add("warn"); clearTimeout(flash.t); flash.t = setTimeout(() => { s.classList.remove("warn"); status(); }, 2600); }
  function status() { if (!dom) return; const s = dom.panel.querySelector("#lteStat"); if (s.classList.contains("warn")) return; s.innerHTML = (lv.ok ? "✓ Beaten. You can share it. · " : "<b>Beat it to share it.</b> · ") + (draw ? "Drag paints. Two fingers scroll." : "Tap to place. Drag to scroll."); }

  function kwFor(t) {
    const [ch, kind] = t.split(":");
    if (ch === "U") return { pu: opts.pu };
    if (ch === "c") return { len: opts.len };
    if (ch === "M") return { dx: opts.dx, speed: opts.spd };
    if (ch === "L") return { dy: opts.dy, speed: opts.spd };
    if (ch === "B") { const hb = opts.bossHard; return { boss: kind, hp: BOSS_HP[kind] + hb * 2 + (hb > 1 ? 1 : 0), spd: Math.round((1 + hb * 0.25) * 100) / 100, name: B().BOSS_NAMES[kind] }; }
    return null;
  }
  function paint(x, y) {
    if (x < 0 || y < 0 || x >= W(lv) || y >= ROWS) return;
    const cur = lv.rows[y][x], k = x + "," + y;
    if (tool === "erase") {
      if (cur === "@" || cur === "X") { flash("The start and the exit drawer can't be erased. Pick them in START / EXIT to move them."); return; }
      if (cur === ".") return;
      lv.rows[y][x] = "."; delete lv.ext[k];
    } else {
      const ch = tool.split(":")[0], kw = kwFor(tool);
      if ((cur === "@" || cur === "X") && ch !== cur) { flash("That square has the " + (cur === "@" ? "start" : "exit drawer") + ". Move it first."); return; }
      if (cur === ch && JSON.stringify(lv.ext[k] || null) === JSON.stringify(kw)) return;
      if (ONE.includes(ch)) for (const [ox, oy] of findAll(lv, ch)) { lv.rows[oy][ox] = "."; delete lv.ext[ox + "," + oy]; }
      lv.rows[y][x] = ch;
      if (kw) lv.ext[k] = kw; else delete lv.ext[k];
    }
    lv.ok = false;
    U().haptic("light");
    if (!dirty) { dirty = true; requestAnimationFrame(() => { dirty = false; refresh(); }); }
  }
  function refresh() {
    const i = toSlot(lv), r = E().show(i, camX, ZOOMS[zoomI]);
    camX = r.cam; syncScroll(); status();
    dom.top.querySelector("#lteName").textContent = nameOf(lv);
  }
  function syncScroll() { const s = dom.panel.querySelector("#lteScroll"); s.max = Math.max(0, Math.round(W(lv) * 48 - E().vw())); s.value = Math.round(E().cam()); }

  function renderTabs() {
    const tb = dom.panel.querySelector("#lteTabs");
    tb.innerHTML = TABS.map(([k, l]) => '<button data-t="' + k + '" class="' + (k === tab ? "on" : "") + '">' + l + "</button>").join("");
    tb.querySelectorAll("button").forEach((b) => (b.onclick = () => { tab = b.dataset.t; const first = TOOLS.find((t) => t[0] === tab); tool = first[1]; renderTabs(); }));
    const tl = dom.panel.querySelector("#lteTools");
    let h = '<button data-k="draw" class="drawbtn' + (draw ? " on" : "") + '"><span class="ic">' + window.GICON.pencil(30) + '</span>DRAW ' + (draw ? "ON" : "OFF") + '</button><button data-k="erase" class="' + (tool === "erase" ? "on" : "") + '"><span class="ic">' + window.GICON.erase(30) + '</span>ERASE</button>';
    for (const t of TOOLS) if (t[0] === tab) {
      const isBoss = t[1].startsWith("B:"), kind = isBoss && t[1].slice(2);
      const icon = isBoss ? B().BOSS_ART[kind] : t[3], label = isBoss ? B().BOSS_NAMES[kind].replace(/^THE /, "") : t[2];
      h += '<button data-k="' + t[1] + '" class="' + (tool === t[1] ? "on" : "") + (t[4] ? " " + t[4] : "") + '"><img src="' + src(icon) + '" alt="">' + esc(label) + "</button>";
    }
    tl.innerHTML = h;
    tl.querySelectorAll("button").forEach((b) => (b.onclick = () => { if (b.dataset.k === "draw") { draw = !draw; flash(draw ? "DRAW is on: drag to paint ground, coins or erase. Scroll with two fingers or the bar." : "DRAW is off: tap to place, drag to scroll."); } else tool = b.dataset.k; U().haptic("light"); renderTabs(); }));
    const sel = tl.querySelector("button.on:not(.drawbtn)"); if (sel && sel.scrollIntoView) sel.scrollIntoView({ inline: "nearest", block: "nearest" });
    renderOpts();
  }
  function renderOpts() {
    const o = dom.panel.querySelector("#lteOpts"), ch = tool.split(":")[0];
    const row = (key, label, list) => '<span>' + label + "</span>" + list.map(([v, l, ic]) => '<button data-o="' + key + '" data-v="' + v + '" class="' + (String(opts[key]) === String(v) ? "on" : "") + '">' + (ic ? '<img src="' + src(ic) + '" alt="">' : "") + l + "</button>").join("");
    let h = "";
    if (ch === "U") h = row("pu", "POWER", PUS.map((p) => [p, PU_NAMES[p], "pu-" + p]));
    else if (ch === "c") h = row("len", "LENGTH", [2, 3, 4, 5, 6].map((n) => [n, n]));
    else if (ch === "M") h = row("dx", "MOVES", [1, 2, 3, 4, 5, 6, 8].map((n) => [n, n])) + row("spd", "SPEED", [[50, "SLOW"], [75, "MED"], [110, "FAST"]]);
    else if (ch === "L") h = row("dy", "RISES", [1, 2, 3, 4, 5, 6].map((n) => [n, n])) + row("spd", "SPEED", [[50, "SLOW"], [75, "MED"], [110, "FAST"]]);
    else if (ch === "B") h = row("bossHard", "STRENGTH", [[0, "NORMAL"], [1, "TOUGH"], [2, "BRUTAL"]]);
    o.innerHTML = h; o.classList.toggle("hidden", !h);
    o.querySelectorAll("button").forEach((b) => (b.onclick = () => { const k = b.dataset.o; opts[k] = /^[\d.]+$/.test(b.dataset.v) ? +b.dataset.v : b.dataset.v; renderOpts(); }));
    E().fit();
  }

  function openEditor(v) {
    if (v !== lv) undo = []; lv = v; buildDom(); testing = false;
    U().hideCard();
    dom.root.classList.add("editing"); dom.top.classList.remove("hidden"); dom.panel.classList.remove("hidden");
    renderTabs(); E().fit(); refresh();
  }
  function exitEditor() {
    if (!dom) return;
    dom.root.classList.remove("editing"); dom.top.classList.add("hidden"); dom.panel.classList.add("hidden");
    E().fit();
  }

  function problems(v) {
    const s = findAll(v, "@")[0], x = findAll(v, "X")[0], b = findAll(v, "B")[0];
    if (!s) return "Your level needs a start. Place it from START / EXIT.";
    if (!x) return "Your level needs an exit drawer. Place it from START / EXIT.";
    let floor = false; for (let y = s[1] + 1; y < ROWS; y++) if (SOLID.includes(v.rows[y][s[0]]) || SEMI.includes(v.rows[y][s[0]])) floor = true;
    if (!floor) return "The start has nothing under it. Put some ground below the start.";
    if (b && x[0] <= b[0] + 7) return "Put the exit drawer past the boss arena: at least 8 squares to the right of the boss.";
    if (b && b[0] - 8 < s[0]) return "Leave more room between the start and the boss (at least 8 squares).";
    let n = 0; for (const r of v.rows) for (const c of r) if ("rmjGTJKkbhvnepgcfP".includes(c)) n++;
    if (n > 300) return "That's too many bad guys and traps (" + n + "). The most is 300.";
    return "";
  }
  function test() {
    const p = problems(lv);
    if (p) { flash(p); U().haptic("error"); return; }
    saveLv(lv); exitEditor(); testing = true; playLv(lv);
  }
  function playLv(v) { lastPlayed = v; const i = toSlot(v); U().say("grab"); U().play(i); }

  function settings() {
    const ui = U(), BGS = B().BGS, names = B().BG_NAMES;
    let h = '<div class="ltlogo">LEVEL SETTINGS</div>';
    h += '<label class="lbl">NAME</label><input class="lbname" id="lsName" maxlength="18" placeholder="MY LEVEL" value="' + esc(lv.name || "") + '" autocomplete="off" autocapitalize="characters">';
    h += '<label class="lbl">PLACE</label><div class="lbprev" id="lsPrev" style="background-image:url(bg-' + lv.bg + '.jpg)"><span>' + names[BGS.indexOf(lv.bg)] + "</span></div>" + B().chips("bg", BGS.map((b, i) => [i, names[i]]), BGS.indexOf(lv.bg));
    h += '<label class="lbl">HEARTS</label>' + B().chips("hp", [[3, "3 HEARTS"], [2, "2 HEARTS"], [1, "1 HIT = OUT"]], lv.hp || 3);
    h += '<label class="lbl">BAD GUY SPEED</label>' + B().chips("espd", SPEEDS.map(([v, l], i) => [i, l]), Math.max(0, SPEEDS.findIndex((s) => s[0] === (lv.espd || 1))));
    h += '<label class="lbl">LENGTH</label><div class="lslen"><button id="lsLess">− 20</button><b id="lsW">' + W(lv) + " squares</b><button id=\"lsMore\">+ 20</button></div>";
    h += '<button class="ltbtn" id="lsDone">DONE</button><button class="ltbtn sub" id="lsClear">CLEAR EVERYTHING</button>';
    ui.show(h);
    const c = ui.card(), st = { bg: BGS.indexOf(lv.bg), hp: lv.hp || 3, espd: Math.max(0, SPEEDS.findIndex((s) => s[0] === (lv.espd || 1))) };
    B().wire(c, st, (k, val) => { if (k === "bg") { const p = c.querySelector("#lsPrev"); p.style.backgroundImage = "url(bg-" + BGS[val] + ".jpg)"; p.firstChild.textContent = names[val]; } });
    const resize = (d) => {
      const w = W(lv), nw = Math.max(MINW, Math.min(MAXW, w + d)); if (nw === w) return;
      snap();
      if (nw > w) lv.rows.forEach((r, y) => { for (let x = w; x < nw; x++) r.push(y >= 11 ? "#" : "."); });
      else {
        const lost = (ch) => findAll(lv, ch).some(([x]) => x >= nw);
        const moveX = lost("X"), moveS = lost("@");
        lv.rows.forEach((r) => r.splice(nw)); for (const k of Object.keys(lv.ext)) if (+k.split(",")[0] >= nw) delete lv.ext[k];
        if (moveX) { lv.rows[10][nw - 4] = "X"; lv.rows[11][nw - 4] = "#"; }
        if (moveS) { lv.rows[10][2] = "@"; lv.rows[11][2] = "#"; }
      }
      lv.ok = false; c.querySelector("#lsW").textContent = W(lv) + " squares";
    };
    c.querySelector("#lsLess").onclick = () => resize(-20);
    c.querySelector("#lsMore").onclick = () => resize(20);
    c.querySelector("#lsClear").onclick = (e) => {
      if (!e.target.dataset.sure) { e.target.dataset.sure = 1; e.target.textContent = "TAP AGAIN TO CLEAR EVERYTHING"; return; }
      snap(); lv.rows = blank(W(lv)); lv.ext = {}; lv.ok = false; e.target.textContent = "CLEARED";
    };
    c.querySelector("#lsDone").onclick = () => {
      const nb = BGS[st.bg], nh = st.hp, ne = SPEEDS[st.espd][0], nn = cleanName(c.querySelector("#lsName").value);
      if (nb !== lv.bg || nh !== lv.hp || ne !== lv.espd) lv.ok = false;
      lv.bg = nb; lv.hp = nh; lv.espd = ne; lv.name = nn;
      saveLv(lv); ui.hideCard(); refresh();
    };
  }

  // ---------- screens ----------
  function list(note) {
    exitEditor(); testing = false;
    const ui = U(); ui.idle();
    const a = mine();
    let h = '<div class="ltlogo">MY LEVELS</div><p>Make your own drawer, square by square. Beat it yourself, then share the code with friends. Coins in custom levels are just for fun and don\'t go to your wallet.</p>';
    if (note) h += '<p class="ltbnote">' + esc(note) + "</p>";
    h += '<button class="ltbtn" id="lbNew">+ NEW LEVEL</button>';
    if (a.length) {
      h += '<div class="lblist">';
      a.forEach((v, i) => {
        const b = findAll(v, "B")[0], kind = b && v.ext[b[0] + "," + b[1]] && v.ext[b[0] + "," + b[1]].boss;
        const tag = v.src === "friend" ? '<em class="fr">FROM A FRIEND</em>' : v.ok ? '<em class="ok">✓ BEATEN</em>' : '<em class="no">NOT BEATEN YET</em>';
        h += '<div class="lbrow"><img src="lt/' + (kind ? B().BOSS_ART[kind] : "drawer3") + '.webp" alt=""><div class="lbinfo"><b>' + esc(nameOf(v)) + "</b><span>" + B().BG_NAMES[Math.max(0, B().BGS.indexOf(v.bg))] + " · " + W(v) + " long" + (kind ? " · boss" : "") + "</span>" + tag + '</div><div class="lbacts"><button class="lbplay" data-p="' + i + '">PLAY</button><button data-e="' + i + '">EDIT</button><button data-s="' + i + '">SHARE</button><button class="lbdel" data-d="' + i + '">✕</button></div></div>';
      });
      h += "</div>";
    } else h += '<p class="ltbnote">No levels yet. Tap NEW LEVEL to make your first one.</p>';
    h += '<button class="ltbtn sub" id="lbCode">PLAY A FRIEND\'S CODE</button><button class="ltbtn sub" id="lbBack">ALL DRAWERS</button>';
    ui.show(h);
    const c = ui.card();
    c.querySelector("#lbNew").onclick = () => { if (mine().length >= MAX) return list("You have " + MAX + " levels, the most you can keep. Delete one to make room."); ui.say("grab"); newLevel(); };
    c.querySelector("#lbBack").onclick = () => ui.menu();
    c.querySelector("#lbCode").onclick = () => enterCode();
    c.querySelectorAll("[data-p]").forEach((b) => (b.onclick = () => { testing = false; playLv(mine()[+b.dataset.p]); }));
    c.querySelectorAll("[data-e]").forEach((b) => (b.onclick = () => { ui.say("grab"); const v = mine()[+b.dataset.e]; if (v.src === "friend") { v.src = "mine"; } camX = 0; openEditor(v); }));
    c.querySelectorAll("[data-s]").forEach((b) => (b.onclick = () => share(mine()[+b.dataset.s])));
    c.querySelectorAll("[data-d]").forEach((b) => (b.onclick = () => {
      const v = mine()[+b.dataset.d]; if (!v) return;
      if (b.dataset.sure) { keep(mine().filter((x) => x.id !== v.id)); list(); return; }
      b.dataset.sure = 1; b.textContent = "DELETE?"; b.classList.add("sure");
    }));
    c.scrollTop = 0;
  }
  function newLevel() {
    const ui = U();
    ui.show('<div class="ltlogo">NEW LEVEL</div><p>Start with an empty drawer, or let us lay out a starting level from your picks. Either way you can change every square.</p><button class="ltbtn" id="nlBlank">START EMPTY</button><button class="ltbtn sub" id="nlAuto">AUTO-BUILD A START</button><button class="ltbtn sub" id="nlBack">BACK</button>');
    const c = ui.card();
    c.querySelector("#nlBack").onclick = () => list();
    c.querySelector("#nlBlank").onclick = () => { camX = 0; openEditor({ id: newId(), name: "", bg: "garage", hp: 3, espd: 1, rows: blank(100), ext: {}, ok: false, src: "mine" }); saveLv(lv); };
    c.querySelector("#nlAuto").onclick = () => B().auto((g, st) => { camX = 0; const v = Object.assign(fromGen(g, st), { id: newId() }); openEditor(v); saveLv(lv); }, newLevel);
  }
  function cleared(c) {
    const v = lastPlayed, ui = U(), wasTest = testing;
    const fresh = v && v.src === "mine" && !v.ok;
    if (v && v.src === "mine") { v.ok = true; saveLv(v); }
    let h = '<div class="ltlogo">' + (fresh ? "YOU BEAT IT!" : "LEVEL CLEAR!") + '</div><img class="ltclr" src="lt/drawer3.webp" alt=""><p><b>' + esc(nameOf(v || {})) + "</b> · " + Math.floor(c.time / 60) + ":" + String(Math.floor(c.time % 60)).padStart(2, "0") + "</p>";
    if (fresh) h += '<p class="ltbnote">Sharing is unlocked for this level. Send the code to your friends!</p>';
    h += "<p>" + c.coins + (c.coins === 1 ? " coin" : " coins") + ' grabbed. <span class="ltbnote">Custom level coins are just for fun and don\'t go to your wallet.</span></p>';
    if (v && v.id) h += '<button class="ltbtn" id="lcShare">SHARE CODE</button>';
    h += (wasTest || (v && v.src === "mine") ? '<button class="ltbtn sub" id="lcEdit">BACK TO EDITOR</button>' : "") + '<button class="ltbtn sub" id="lcAgain">PLAY AGAIN</button><button class="ltbtn sub" id="lcList">MY LEVELS</button>';
    ui.show(h);
    const q = (s) => ui.card().querySelector(s);
    if (q("#lcShare")) q("#lcShare").onclick = () => share(v);
    if (q("#lcEdit")) q("#lcEdit").onclick = () => openEditor(v);
    q("#lcAgain").onclick = () => playLv(v);
    q("#lcList").onclick = () => list();
  }
  function share(v) {
    if (!v) return list();
    const ui = U();
    if (!v.ok) {
      ui.show('<div class="ltlogo">BEAT IT FIRST</div><p>You have to beat <b>' + esc(nameOf(v)) + "</b> yourself before you can share it. That way every shared level is one that can be beaten.</p>" + '<button class="ltbtn" id="shPlay">PLAY IT NOW</button><button class="ltbtn sub" id="shBk">BACK</button>');
      ui.card().querySelector("#shPlay").onclick = () => { const p = problems(v); if (p) return list(p); testing = false; playLv(v); };
      ui.card().querySelector("#shBk").onclick = () => list();
      return;
    }
    const code = encode(v);
    ui.show('<div class="ltlogo">SHARE CODE</div><p>Send this code to a friend. They tap <b>PLAY A FRIEND\'S CODE</b> in My Levels and paste it to play <b>' + esc(nameOf(v)) + '</b>.</p><textarea class="lbcode" id="shCode" readonly rows="4">' + code + '</textarea><button class="ltbtn" id="shCopy">SHARE / COPY</button><button class="ltbtn sub" id="shBk">BACK</button>');
    const c = ui.card();
    c.querySelector("#shCode").onclick = (e) => e.target.select();
    c.querySelector("#shCopy").onclick = async (e) => {
      const txt = "Can you beat my Lost Toolbox level \"" + nameOf(v) + "\" in Where's My 10MM?! Copy this code, then in the game go to Lost Toolbox > Level Maker > Play a friend's code:\n" + code;
      let done = false;
      try { if (navigator.share) { await navigator.share({ text: txt }); done = true; } } catch (x) { if (x && x.name === "AbortError") return; }
      if (!done) try { await navigator.clipboard.writeText(code); done = true; } catch (x) {}
      e.target.textContent = done ? "DONE!" : "COPY THE CODE ABOVE";
    };
    c.querySelector("#shBk").onclick = () => list();
  }
  function enterCode(note) {
    const ui = U();
    ui.show('<div class="ltlogo">FRIEND\'S CODE</div><p>Paste the level code your friend sent you. It starts with <b>LT1-</b>.</p>' + (note ? '<p class="ltbnote bad">' + esc(note) + "</p>" : "") + '<textarea class="lbname lbcodein" id="ecIn" rows="4" placeholder="LT1-..." autocomplete="off" autocapitalize="off" spellcheck="false"></textarea><button class="ltbtn sub" id="ecPaste">PASTE</button><button class="ltbtn" id="ecPlay">PLAY IT</button><button class="ltbtn sub" id="ecBk">BACK</button>');
    const c = ui.card();
    c.querySelector("#ecBk").onclick = () => list();
    c.querySelector("#ecPaste").onclick = async () => { try { c.querySelector("#ecIn").value = await navigator.clipboard.readText(); } catch (e) {} };
    c.querySelector("#ecPlay").onclick = () => {
      const v = decode(c.querySelector("#ecIn").value);
      if (!v) return enterCode("That code doesn't look right. Make sure you copied all of it.");
      v.id = newId();
      if (mine().length < MAX) saveLv(v);
      testing = false; playLv(v);
    };
  }

  // ---------- overlay drawn over the frozen level while editing ----------
  function overlay(ctx, cam, vw, oy, T) {
    if (!lv || !editing()) return;
    const w = W(lv), c0 = Math.max(0, Math.floor(cam / T)), c1 = Math.min(w, Math.ceil((cam + vw) / T) + 1);
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,.13)"; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = c0; x <= c1; x++) { ctx.moveTo(x * T + 0.5, 0); ctx.lineTo(x * T + 0.5, ROWS * T); }
    for (let y = 0; y <= ROWS; y++) { ctx.moveTo(c0 * T, y * T + 0.5); ctx.lineTo(c1 * T, y * T + 0.5); }
    ctx.stroke();
    if (cam + vw > w * T) { ctx.fillStyle = "rgba(0,0,0,.7)"; ctx.fillRect(w * T, -oy, cam + vw - w * T + 2, ROWS * T + oy); }
    const im = (k) => { const i = E().img(k); return E().ready(i) ? i : null; };
    const icon = (k, cx, cy, s, a) => { const i = im(k); if (!i) return; ctx.globalAlpha = a; const h = (s * i.naturalHeight) / i.naturalWidth; ctx.drawImage(i, cx - s / 2, cy - h / 2, s, h); ctx.globalAlpha = 1; };
    for (let y = 0; y < ROWS; y++) for (let x = c0; x < c1; x++) {
      const ch = lv.rows[y][x], kw = lv.ext[x + "," + y] || {};
      if (ch === "U") icon("pu-" + (kw.pu || "shield"), x * T + T / 2, y * T - 14, 26, 0.95);
      else if (ch === "f") { icon("nut", x * T + T / 2, y * T + T / 2, 30, 0.6); ctx.fillStyle = "rgba(255,90,70,.8)"; ctx.font = "900 18px system-ui"; ctx.textAlign = "center"; ctx.fillText("↓", x * T + T / 2, y * T + T + 6); }
      else if (ch === "M") { ctx.strokeStyle = "rgba(255,210,63,.8)"; ctx.setLineDash([6, 5]); ctx.lineWidth = 3; ctx.strokeRect(x * T + 2, y * T + T - 14, (2 + (kw.dx || 3)) * T - 4, 14); ctx.setLineDash([]); }
      else if (ch === "L") { ctx.strokeStyle = "rgba(255,210,63,.8)"; ctx.setLineDash([6, 5]); ctx.lineWidth = 3; ctx.strokeRect(x * T + 2, (y + 1 - (kw.dy || 3)) * T - 12, 2 * T - 4, (kw.dy || 3) * T); ctx.setLineDash([]); }
      else if (ch === "B") { ctx.strokeStyle = "rgba(255,80,60,.85)"; ctx.setLineDash([10, 6]); ctx.lineWidth = 3; const l = x * T + T / 2 - 6.5 * T; ctx.strokeRect(l, 0, 13 * T, ROWS * T); ctx.setLineDash([]); ctx.fillStyle = "rgba(255,80,60,.95)"; ctx.font = "900 16px system-ui"; ctx.textAlign = "left"; ctx.fillText("BOSS ARENA", l + 8, 20); }
      else if (ch === "e" || ch === "Z" || ch === "P" || ch === "p" || ch === "g") { ctx.strokeStyle = "rgba(255,140,60,.5)"; ctx.lineWidth = 2; ctx.strokeRect(x * T + 3, y * T + 3, T - 6, T - 6); }
    }
    const s = findAll(lv, "@")[0], x = findAll(lv, "X")[0];
    ctx.font = "900 15px system-ui"; ctx.textAlign = "center";
    const tag = (p, t, col) => { if (!p) return; const cx = p[0] * T + T / 2, cy = p[1] * T - 70; ctx.fillStyle = "rgba(0,0,0,.7)"; ctx.fillRect(cx - 34, cy - 15, 68, 21); ctx.fillStyle = col; ctx.fillText(t, cx, cy + 1); };
    tag(s, "START", "#8fe39b"); tag(x, "EXIT", "#ffd23f");
    ctx.restore();
  }

  window.LTEdit = {
    list, cleared, overlay, encode, decode, open: openEditor,
    fromPause: () => (testing && lastPlayed ? openEditor(lastPlayed) : list()),
    pauseLabel: () => (testing ? "BACK TO EDITOR" : "MY LEVELS"),
    _lv: () => lv, _tool: (t) => { tool = t; if (dom) renderTabs(); }, _paint: (x, y) => { snap(); paint(x, y); }, _problems: () => problems(lv),
  };
})();
