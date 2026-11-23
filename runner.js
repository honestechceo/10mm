// Runner: the upright 10mm from the Lost Toolbox as a playable character in the main game.
// Unlocks for 2,500 coins, or free for clearing Lost Toolbox drawer 50. Collisions are unchanged
// (same circle as the rolling socket), only the drawing is different. Finishes stay on the Roller;
// auras and face looks work on both.
(() => {
  const PRICE = 2500;
  const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const earned = () => { const s = read("tenmm-lt", {}); return !!(s && Array.isArray(s.done) && s.done.includes(49)); };
  const owned = () => read("tenmm-runner", false) === true || earned();
  const active = () => owned() && localStorage.getItem("tenmm-char") === "runner";

  const RUN = ["u-run_01", "u-run_02", "u-run_03", "u-run_04", "u-run_03", "u-run_02"];
  let rp = 0, lastScroll = 0, wasG = true, landT = 0, djT = 0, lastJumps = 0, lastT = 0;

  function frameName(dt) {
    const g = player.y >= ground - player.r - 3;
    const j = player.jumps || 0;
    if (!g && j > lastJumps && lastJumps >= 1) djT = 0.4;
    if (g && !wasG) landT = 0.12;
    lastJumps = j; wasG = g;
    djT = Math.max(0, djT - dt); landT = Math.max(0, landT - dt);
    const moved = Math.max(0, scroll - lastScroll); lastScroll = scroll;
    if (state === "stopped") return "u-victory";
    if (!g) return djT > 0 ? "u-double_jump" : player.vy < -2 ? "u-jump" : "u-fall";
    if (landT > 0) return "u-land";
    if (state !== "running") return "u-idle_01";
    rp += moved / 26;
    return RUN[Math.floor(rp) % RUN.length];
  }
  // on ROLL UNDER drawers he slides on his back under the car
  function sliding() {
    if (goalMode !== "under") return false;
    const dx = world - scroll - 210;
    return player.x > dx - 95 && player.x < dx + 320 && player.y >= ground - player.r - 3;
  }
  function draw(c) {
    const now = performance.now(), dt = lastT ? Math.min(0.1, (now - lastT) / 1000) : 0.016; lastT = now;
    const name = frameName(dt);
    if (!window.LostBox || !LostBox.drawUpright) return false;
    c.save();
    if (sliding()) {
      c.translate(player.x - 6, player.y + player.r + 2);
      c.rotate(-1.35);
      const ok = LostBox.drawUpright(c, "u-fall", 84) || LostBox.drawUpright(c, "u-idle_01", 84);
      c.restore();
      return ok || shown;
    }
    c.translate(player.x - 8, player.y + player.r + 7);
    // a frame that hasn't loaded yet falls back to idle, never to the rolling socket
    if (LostBox.drawUpright(c, name, 112) || LostBox.drawUpright(c, "u-idle_01", 112)) shown = true;
    c.restore();
    return shown;
  }
  // load every frame up front so the first run cycle doesn't blink
  let shown = false;
  const ALL = ["u-idle_01", "u-idle_02", ...new Set(RUN), "u-jump", "u-double_jump", "u-fall", "u-land", "u-hurt", "u-victory"];
  function preload() { if (!window.LostBox || !LostBox.drawUpright) return; const c = document.createElement("canvas").getContext("2d"); for (const n of ALL) LostBox.drawUpright(c, n, 8); }
  window.addEventListener("load", preload);

  // ---------- shop: CHARACTER row at the top of the Socket Shop ----------
  function shopRow(box) {
    const hd = document.createElement("div"); hd.className = "lvhead"; hd.textContent = "CHARACTER"; box.append(hd);
    const row = document.createElement("div"); row.className = "charrow";
    const card = (id, name, src, sub, btn) => {
      const d = document.createElement("div"); d.className = "skin char" + ((id === "runner") === active() ? " eq" : "");
      d.innerHTML = '<img alt="" src="' + src + '"><div>' + name + '</div><small>' + sub + "</small>";
      d.append(btn); row.append(d);
    };
    const mk = (text, cls, fn) => { const b = document.createElement("button"); b.textContent = text; b.className = cls; if (fn) b.onclick = fn; else b.disabled = true; return b; };
    const pick = (id) => () => { localStorage.setItem("tenmm-char", id); applySkin(); setArt("hero"); buzz("light"); renderShop(); };
    card("roller", "Roller", typeof skinFile === "function" ? skinFile(equippedSkin()) : "socket-chrome.webp", "Wears your finishes",
      active() ? mk("EQUIP", "own", pick("roller")) : mk("EQUIPPED", "own"));
    let b;
    if (active()) b = mk("EQUIPPED", "own");
    else if (owned()) b = mk("EQUIP", "own", pick("runner"));
    else if (totalCoins >= PRICE) b = mk("BUY • " + PRICE, "buy", () => {
      totalCoins -= PRICE; localStorage.setItem("tenmm-coins", totalCoins);
      localStorage.setItem("tenmm-runner", "true"); localStorage.setItem("tenmm-char", "runner");
      $("coinsCount").textContent = totalCoins;
      $("details").textContent = "Unlocked the Runner! You have " + totalCoins + " coins left.";
      applySkin(); setArt("hero"); sfx("win"); buzz("success"); renderShop();
    });
    else b = mk(PRICE + " COINS", "no");
    card("runner", "Runner", "lt/u-idle_01.webp", owned() ? "The upright 10mm" : "Or clear Lost Toolbox drawer 50", b);
    box.append(row);
    if (active()) { const n = document.createElement("p"); n.className = "charnote"; n.textContent = "Finishes go on the Roller. Auras and face looks work on both."; box.append(n); }
  }

  window.Runner = { active, owned, draw, shopRow, PRICE };
})();
