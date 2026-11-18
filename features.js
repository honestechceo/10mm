// Where's My 10MM?! — update 2 features:
// daily challenge + streak, daily gift, 3-star levels, upgrades, penetrating oil + torque rocket power-ups,
// double-coins ad, boss levels, endless mode, extra bonus games, share card.
// Hooks into game.js through the global FX object.
"use strict";
(() => {
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  const today = () => { const d = new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000); };
  const isNative = () => !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform());
  const addCoins = (n) => {
    totalCoins += n;
    localStorage.setItem("tenmm-coins", totalCoins);
    const el = $("coinsCount"); if (el) el.textContent = totalCoins;
  };
  const unlockSkin = (id) => {
    const own = ownedSkins();
    if (own.includes(id)) return false;
    own.push(id);
    localStorage.setItem("tenmm-skins", JSON.stringify(own));
    return true;
  };
  const skinName = (id) => (SKINS.find((s) => s.id === id) || {}).name || id;

  // ---------- run modes ----------
  let runMode = "adventure", savedLevel = 1, coinsInLevel = 0;
  window.runSeed = 0;
  const dailyLevel = () => 30 + ((today() * 37) % 360);
  function enterMode(m) {
    if (runMode === "adventure") savedLevel = level;
    runMode = m;
    storySeen = true; tutorialSeen = true;
  }
  function leaveMode() {
    if (runMode !== "adventure") { level = savedLevel; window.runSeed = 0; }
    runMode = "adventure";
  }

  // ---------- upgrades ----------
  const UPG = [
    { id: "headstart", name: "Head Start Shield", desc: "Start every level with a shield", max: 3, cost: [150, 350, 700], val: ["", "2 sec", "3.5 sec", "5 sec"] },
    { id: "power", name: "Longer Power-Ups", desc: "Power-ups last longer", max: 3, cost: [200, 450, 900], val: ["", "+20%", "+40%", "+60%"] },
    { id: "lucky", name: "Lucky Coins", desc: "Chance a coin counts double", max: 3, cost: [250, 500, 1000], val: ["", "10%", "20%", "30%"] },
    { id: "second", name: "Second Chance", desc: "One free continue each level (no ad)", max: 1, cost: [1200], val: ["", "ON"] },
  ];
  const upg = () => LS.get("tenmm-upgrades", {});
  const upLvl = (id) => Math.max(0, +(upg()[id] || 0));
  let secondUsed = false;

  // ---------- power-ups ----------
  let slick = 0, rocket = 0;
  const oilSprite = new Image(); oilSprite.src = "power-oil.webp";
  const rocketSprite = new Image(); rocketSprite.src = "power-rocket.webp";
  const ready = (im) => im.complete && im.naturalWidth;

  // ---------- boss ----------
  let boss = null;
  const BOSS_S = 150;
  const bossSprite = new Image(); bossSprite.src = "tool-evilsocket.webp";
  const hammerSprite = new Image(); hammerSprite.src = "tool-airhammer.webp";
  const bossTip = () => boss && boss.hammer ? "BOSS LEVEL: the AIR HAMMER is coming at you! Double-jump over it when it charges." : "BOSS LEVEL: the BIG 12 is coming! Double-jump over it when it charges.";

  // ---------- endless ----------
  let endlessNext = 0, endlessMeters = 0;
  function endlessChunk(from, to) {
    for (let x = from, i = Math.floor(from / 7); x < to; i++) {
      const prog = x / 1000;
      const spacing = Math.max(165, 290 - prog * 2.2) + rnd(i + 3) * 60;
      let kind = kinds[Math.floor(rnd(i + 2) * kinds.length)];
      const hz = THEME_HAZ[themeIndex(level)];
      if (hz && rnd(i + 91) < 0.35) kind = hz;
      const [w, h] = HAZ[kind] ? [HAZ[kind].w, HAZ[kind].h] : TOOL_SIZE[kind];
      obstacles.push({ x, w, h, kind, angle: HAZ[kind] ? 0 : (rnd(i + 44) - 0.5) * 0.12, ph: rnd(i + 7) * 6 });
      if (rnd(i + 13) < 0.55) coins.push({ x: x + spacing / 2, y: ground - 35 - (rnd(i + 5) < 0.2 ? 30 : 0), taken: false });
      if (i % 6 === 3) powerups.push({ x: x + spacing / 2, y: ground - 108, type: ["shield", "slow", "spring", "boost", "magnet", "wd40", "rocket"][Math.floor(rnd(i + 29) * 7)], taken: false });
      x += spacing;
    }
    endlessNext = to;
  }

  // ---------- mirror levels: the scene is flipped, so keep canvas text readable ----------
  window.mirrorOn = false;
  const isMirror = () => (runMode === "adventure" && level >= 7 && level % 10 === 7) || (runMode === "daily" && today() % 3 === 0);
  for (const fn of ["fillText", "strokeText"]) {
    const orig = ctx[fn];
    ctx[fn] = function (t, x, y, ...rest) {
      if (!window.mirrorOn) return orig.call(this, t, x, y, ...rest);
      this.save();
      this.translate(x, y);
      this.scale(-1, 1);
      const a = this.textAlign;
      this.textAlign = a === "left" || a === "start" ? "right" : a === "right" || a === "end" ? "left" : a;
      orig.call(this, t, 0, 0, ...rest);
      this.restore();
    };
  }

  // ---------- FX hooks used by game.js ----------
  const FX = (window.FX = {
    levelBuilt() {
      slick = 0; rocket = 0; boss = null; secondUsed = false;
      window.mirrorOn = isMirror();
      coinsInLevel = coins.length;
      if (runMode === "endless") {
        world = 9e9;
        obstacles = []; coins = []; powerups = [];
        endlessChunk(700, 9000);
        coinsInLevel = 0;
        goalMode = "under";
        $("level").textContent = "ENDLESS";
        $("tip").textContent = "ENDLESS: run as far as you can! Best " + LS.get("tenmm-endless-best", 0) + " m";
      } else {
        // sprinkle the new power-ups in from level 6
        if (level >= 6) {
          let k = 0;
          for (const p of powerups) if (p.type === "spring" || p.type === "slow") { if (k % 2 === 0) p.type = (k / 2) % 2 === 0 ? "wd40" : "rocket"; k++; }
        }
        if (runMode === "adventure" && level % 25 === 0) {
          chase = "none";
          boss = { x: -170, mode: "wait", t: 200, charges: 0, spin: 0, speed: 6.2 + Math.min(level, 260) * 0.012, hammer: level > 200 };
          if (boss.hammer) { boss.x = W + 200; boss.speed = 5.4 + Math.min(level - 200, 200) * 0.008; }
          $("tip").textContent = bossTip();
        }
        if (runMode === "daily") {
          $("level").textContent = "DAILY";
        }
      }
      const hs = upLvl("headstart");
      if (hs) shield = [0, 120, 210, 300][hs];
    },
    speedMul() {
      let m = rocket > 0 ? 1.8 : 1;
      if (runMode === "endless") m *= 1 + Math.min(0.75, scroll / 45000);
      return m;
    },
    tick(dt, speed) {
      if (slick > 0) slick -= dt;
      if (rocket > 0) {
        rocket -= dt;
        player.vy = 0;
        player.y += (175 - player.y) * Math.min(1, 0.12 * dt);
        player.jumps = 1;
        if (rocket <= 0) player.vy = 1;
      }
      if (runMode === "endless") {
        if (scroll > endlessNext - 5000) endlessChunk(endlessNext, endlessNext + 8000);
        if (obstacles.length > 120) { const cut = scroll - 600; obstacles = obstacles.filter((o) => o.x > cut); coins = coins.filter((c) => c.x > cut); powerups = powerups.filter((p) => p.x > cut); }
        endlessMeters = Math.floor(scroll / 10);
        $("distance").textContent = endlessMeters + " m";
      }
      if (boss) return bossTick(dt);
    },
    ghost() { return slick > 0 || rocket > 0; },
    rocketOn() { return rocket > 0; },
    coinBonus() { const l = upLvl("lucky"); return l && Math.random() < l * 0.1 ? 1 : 0; },
    powerMul() { return 1 + upLvl("power") * 0.2; },
    isNewPower(t) { return t === "wd40" || t === "rocket"; },
    powerSprite(t) { const im = t === "wd40" ? oilSprite : t === "rocket" ? rocketSprite : null; return im && ready(im) ? im : null; },
    pickup(t, pm) {
      if (t === "wd40") { slick = 240 * pm; return true; }
      if (t === "rocket") { rocket = 150 * pm; return true; }
      return false;
    },
    pickupText(t) {
      return t === "wd40" ? "PENETRATING OIL! Slide right through tools, and the glove can't grip you!" : t === "rocket" ? "TORQUE ROCKET! Blast over everything!" : "";
    },
    drawPowerIcon(t) {
      if (t === "wd40") {
        ctx.fillStyle = "#ffd23f"; ctx.fillRect(-6, -9, 12, 19);
        ctx.fillStyle = "#1d4fa8"; ctx.fillRect(-6, -2, 12, 7);
        ctx.fillStyle = "#e23b2e"; ctx.fillRect(-3, -13, 6, 4);
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(4, -12); ctx.lineTo(12, -15); ctx.moveTo(4, -12); ctx.lineTo(12, -10); ctx.stroke();
      } else {
        ctx.strokeStyle = "#20262c"; ctx.lineWidth = 5; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(-9, 8); ctx.lineTo(7, -8); ctx.stroke();
        ctx.fillStyle = "#20262c"; ctx.beginPath(); ctx.arc(8, -9, 5, 0, 7); ctx.fill();
        ctx.fillStyle = "#ffd23f"; ctx.beginPath(); ctx.moveTo(-9, 8); ctx.lineTo(-15, 15); ctx.lineTo(-5, 12); ctx.fill();
      }
    },
    drawWorld() {
      if (boss) drawBoss();
      if (rocket > 0 && ready(rocketSprite)) {
        // ride the torque rocket: art points up-right, so turn it to point forward
        ctx.save();
        ctx.translate(player.x - 30, player.y + 34 + Math.sin(frames * 0.5) * 1.5);
        ctx.rotate(0.84);
        const h = 175, w = h * rocketSprite.naturalWidth / rocketSprite.naturalHeight;
        ctx.drawImage(rocketSprite, -w / 2, -h / 2, w, h);
        ctx.restore();
      }
    },
    drawOver() {
      if (rocket > 0 && !ready(rocketSprite)) {
        ctx.save();
        for (let k = 0; k < 3; k++) {
          ctx.globalAlpha = 0.75 - k * 0.2;
          ctx.fillStyle = k === 0 ? "#fff3a0" : k === 1 ? "#ffb02e" : "#ff5a3c";
          ctx.beginPath();
          const len = 46 + k * 22 + Math.sin(frames * 0.8 + k) * 8;
          ctx.moveTo(player.x - 80, player.y - 9 + k * 2); ctx.lineTo(player.x - 80 - len, player.y); ctx.lineTo(player.x - 80, player.y + 9 - k * 2); ctx.fill();
        }
        ctx.restore();
      }
      if (slick > 0) {
        ctx.save(); ctx.globalAlpha = slick < 60 && Math.floor(frames / 5) % 2 ? 0.15 : 0.4;
        ctx.fillStyle = "#4aa3ff"; ctx.beginPath(); ctx.ellipse(player.x - 25, ground + 1, 70, 7, 0, 0, 7); ctx.fill(); ctx.restore();
      }
    },
    onWin() {
      if (runMode === "daily") { dailyWin(); return true; }
      return false;
    },
    afterWin() {
      const stars = starsFor();
      const got = LS.get("tenmm-stars", {});
      if ((got[level] || 0) < stars) { got[level] = stars; LS.set("tenmm-stars", got); }
      let extra = "";
      if (boss) {
        const done = LS.get("tenmm-boss", []);
        if (!done.includes(level)) { done.push(level); LS.set("tenmm-boss", done); addCoins(100); extra = " BOSS BEATEN: +100 coins!"; }
        else extra = " BOSS BEATEN!";
      }
      setArt("hero");
      $("details").innerHTML = '<span class="stars">' + "★".repeat(stars) + '<i>' + "★".repeat(3 - stars) + "</i></span>" + escapeText($("details").textContent + extra) + (stars < 3 ? '<br><small>' + starHint(stars) + "</small>" : "");
      offerDouble();
    },
    decorateLevelButton(b, n) {
      const st = LS.get("tenmm-stars", {})[n] || 0;
      if (n % 25 === 0) b.classList.add("boss");
      if (n >= 7 && n % 10 === 7) b.classList.add("mirror");
      if (st) { const i = document.createElement("i"); i.textContent = "★".repeat(st); b.append(i); }
    },
  });
  window.rewardMsg = () => { const r = window.Monetize ? Monetize.lastRewardResult : ""; return r === "closed" ? "The ad was closed early, so no reward. Watch to the end." : r === "loading" ? "The ad is still loading. Try again in a few seconds." : "Ad not available right now. Try again later."; };
  const escapeText = (t) => t.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  function starsFor() {
    const r = coinsInLevel ? runCoins / coinsInLevel : 1;
    return 1 + (r >= 0.5 ? 1 : 0) + (r >= 0.85 && !continued ? 1 : 0);
  }
  function starHint(s) { return s === 1 ? "Grab half the coins for 2 stars." : "Grab almost every coin without a continue for 3 stars."; }

  // ---------- double coins (rewarded ad) ----------
  function offerDouble() {
    if (!(window.Monetize && Monetize.canContinue) || runCoins < 3) return;
    const btn = $("menuExtra"), n = runCoins;
    btn.style.display = "";
    btn.textContent = "WATCH AD: DOUBLE COINS (+" + n + ")";
    btn.onclick = async () => {
      const ok = await Monetize.watchToContinue();
      if (ok) { btn.onclick = null; addCoins(n); toast("+" + n + " coins! Doubled.", true); btn.style.display = "none"; }
      else toast(window.rewardMsg ? rewardMsg() : "Ad not available right now.", false);
    };
  }

  // ---------- boss: the BIG 12 ----------
  function bossTick(dt) {
    const b = boss;
    if (b.hammer) return hammerTick(dt);
    b.spin += dt * (b.mode === "charge" ? 0.22 : 0.05);
    if (b.mode === "wait") {
      b.x += (22 + Math.sin(frames * 0.05) * 8 - b.x) * 0.05 * dt;
      b.t -= dt;
      if (b.t <= 0 && scroll < world - 700) { b.mode = "warn"; b.t = 70; sfx("grab"); buzz("medium"); $("tip").textContent = "BIG 12 IS CHARGING! DOUBLE-JUMP!"; }
    } else if (b.mode === "warn") {
      b.x += (-40 + Math.sin(frames * 1.3) * 5 - b.x) * 0.15 * dt;
      b.t -= dt;
      if (b.t <= 0) { b.mode = "charge"; b.charges++; }
    } else if (b.mode === "charge") {
      b.x += b.speed * dt;
      if (b.x > W + 160) { b.mode = "wait"; b.x = -200; b.t = Math.max(90, 190 - b.charges * 12 - level * 0.2); $("tip").textContent = "Dodged it! It's coming back…"; }
    }
    if (b.mode === "charge" && shield <= 0 && !(rocket > 0)) {
      const bx = b.x, by = ground - BOSS_S * 0.42, dx = bx - player.x, dy = by - player.y;
      if (dx * dx + dy * dy < (BOSS_S * 0.33 + player.r * 0.75) ** 2) {
        sfx("hit"); buzz("heavy"); stopMusic(); render();
        crash("FLATTENED!", "The BIG 12 rolled right over your 10mm. When it charges, double-jump high over it, or grab a shield.", "TRY AGAIN", null, "tool:evilsocket");
        return "stop";
      }
    }
  }
  // ---------- boss: the AIR HAMMER (levels 225+) — charges head-on from the front ----------
  function hammerTick(dt) {
    const b = boss;
    b.spin += dt;
    if (b.mode === "wait") {
      b.x += (W + 60 + Math.sin(frames * 0.05) * 10 - b.x) * 0.05 * dt;
      b.t -= dt;
      if (b.t <= 0 && scroll < world - 700) { b.mode = "warn"; b.t = 70; sfx("grab"); buzz("medium"); $("tip").textContent = "AIR HAMMER INCOMING! DOUBLE-JUMP!"; }
    } else if (b.mode === "warn") {
      b.x += (W - 10 + Math.sin(frames * 1.3) * 6 - b.x) * 0.15 * dt;
      b.t -= dt;
      if (b.t <= 0) { b.mode = "charge"; b.charges++; buzz("light"); }
    } else if (b.mode === "charge") {
      b.x -= (b.speed + 3) * dt;
      if (b.x < -200) { b.mode = "wait"; b.x = W + 220; b.t = Math.max(90, 190 - b.charges * 12 - (level - 200) * 0.2); $("tip").textContent = "Dodged it! It's coming back…"; }
    }
    if (b.mode === "charge" && shield <= 0 && !(rocket > 0)) {
      const bx = b.x - 8, by = ground - BOSS_S * 0.4, dx = bx - player.x, dy = by - player.y;
      if (dx * dx + dy * dy < (BOSS_S * 0.3 + player.r * 0.75) ** 2) {
        sfx("hit"); buzz("heavy"); stopMusic(); render();
        crash("HAMMERED!", "The AIR HAMMER chiseled your 10mm right off the floor. When it charges, double-jump high over it, or grab a shield.", "TRY AGAIN", null, "tool:airhammer");
        return "stop";
      }
    }
  }
  function drawHammer() {
    const b = boss, dw = BOSS_S * 1.5, dh = dw * 0.668;
    ctx.save();
    if (b.mode === "warn" && Math.floor(frames / 6) % 2) {
      ctx.fillStyle = "#ff3b30"; ctx.font = "900 44px system-ui,sans-serif"; ctx.textAlign = "center";
      ctx.fillText("!", Math.min(W - 30, b.x - 40), ground - BOSS_S - 20);
    }
    const shake = b.mode === "charge" ? Math.sin(b.spin * 2.6) * 4 : b.mode === "warn" ? Math.sin(frames * 1.7) * 2 : Math.sin(frames * 0.08) * 2;
    ctx.translate(b.x, ground + 6 + shake);
    if (b.mode === "charge") ctx.rotate(Math.sin(b.spin * 1.3) * 0.04);
    if (hammerSprite.complete && hammerSprite.naturalWidth) ctx.drawImage(hammerSprite, -dw * 0.5, -dh, dw, dh);
    ctx.restore();
    if (b.mode === "charge") {
      ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = "#c9b9a0";
      for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.ellipse(b.x + 40 + k * 30, ground - 4, 18, 5, 0, 0, 7); ctx.fill(); }
      ctx.restore();
    }
  }
  function drawBoss() {
    if (boss.hammer) return drawHammer();
    const b = boss, s = BOSS_S;
    ctx.save();
    if (b.mode === "warn" && Math.floor(frames / 6) % 2) {
      ctx.fillStyle = "#ff3b30"; ctx.font = "900 44px system-ui,sans-serif"; ctx.textAlign = "center";
      ctx.fillText("!", Math.max(30, b.x + 50), ground - s - 20);
    }
    ctx.translate(b.x, ground - s * 0.42);
    ctx.rotate(b.spin);
    if (bossSprite.complete && bossSprite.naturalWidth) ctx.drawImage(bossSprite, -s / 2, -s * 0.45, s, s * 0.9);
    ctx.restore();
    if (b.mode === "charge") {
      ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = "#ffb02e";
      for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.ellipse(b.x - k * 30, ground - 4, 16, 4, 0, 0, 7); ctx.fill(); }
      ctx.restore();
    }
  }

  // ---------- crash handling for special modes + second chance ----------
  const baseCrash = crash;
  crash = function (title, desc, button, _, art) {
    if (runMode === "endless") return endlessOver(title, desc, art);
    baseCrash(title, desc, button, _, art);
    if (runMode === "daily") {
      $("menuSettings").style.display = ""; $("menuSettings").textContent = "MAIN MENU"; $("menuSettings").onclick = showMenu;
    }
    if (upLvl("second") && !secondUsed && !continued) {
      $("menuExtra").style.display = "";
      $("menuExtra").textContent = "SECOND CHANCE: KEEP GOING (FREE)";
      $("menuExtra").onclick = () => { secondUsed = true; resumeAfterCrash("SECOND CHANCE! Shield on for 3 seconds."); };
    }
  };
  function resumeAfterCrash(msg) {
    continued = true; shield = 170; player.vy = Math.min(player.vy, 0);
    if (boss) { boss.mode = "wait"; boss.x = boss.hammer ? W + 260 : -260; boss.t = 200; }
    state = "running"; $("overlay").classList.add("hidden"); $("tip").textContent = msg;
    last = 0; startMusic(); rafId = requestAnimationFrame(tick);
  }

  // ---------- endless ----------
  function endlessOver(title, desc, art) {
    const m = endlessMeters, bestM = LS.get("tenmm-endless-best", 0), isBest = m > bestM;
    if (isBest) LS.set("tenmm-endless-best", m);
    addCoins(runCoins);
    let unlock = "";
    if (m >= 1000 && unlockSkin("afterburner")) unlock = " NEW FINISH UNLOCKED: Afterburner!";
    popup(isBest ? "NEW BEST: " + m + " m!" : title, (isBest ? "" : desc + " ") + "You ran " + m + " m (best " + Math.max(m, bestM) + " m) and kept " + runCoins + " coins." + unlock, "RUN AGAIN", () => { window.runSeed = Math.random() * 1000; start.retry = true; start(); }, art);
    $("eyebrow").textContent = "ENDLESS MODE";
    $("menuSettings").style.display = ""; $("menuSettings").textContent = "MAIN MENU"; $("menuSettings").onclick = showMenu;
    $("menuExtra").style.display = ""; $("menuExtra").textContent = "SHARE MY RUN"; $("menuExtra").onclick = () => share("endless", m);
    if (window.GC) GC.score("endless", m);
  }
  function startEndless() {
    if (best < 26) { toast("Beat level 25 to unlock Endless mode!", false); return; }
    enterMode("endless");
    level = 30 + 25 * Math.floor(Math.random() * (THEMES.length - 1));
    window.runSeed = Math.random() * 1000;
    start();
  }

  // ---------- daily challenge ----------
  function dailyState() { return LS.get("tenmm-daily", { last: -9, streak: 0 }); }
  function startDaily() {
    enterMode("daily");
    level = dailyLevel();
    window.runSeed = (today() % 9973) * 1.37;
    start();
  }
  function dailyWin() {
    const d = dailyState(), t = today();
    let desc, reward = 0, unlock = "";
    addCoins(runCoins);
    if (d.last === t) desc = "Already beaten today. Come back tomorrow for a new one!";
    else {
      d.streak = d.last === t - 1 ? d.streak + 1 : 1; d.last = t; LS.set("tenmm-daily", d);
      reward = 40 + Math.min(6, d.streak - 1) * 10;
      addCoins(reward);
      if (d.streak >= 7 && unlockSkin("champ")) unlock = " NEW FINISH UNLOCKED: Daily Champ!";
      desc = "Daily Challenge beaten! +" + reward + " coins. Streak: " + d.streak + " day" + (d.streak === 1 ? "" : "s") + "." + (d.streak < 7 ? " Reach a 7-day streak for the Daily Champ finish." : "") + unlock;
    }
    render();
    popup("DAILY DONE!", desc + " (+" + runCoins + " coins collected)", "MAIN MENU", showMenu, "win");
    $("eyebrow").textContent = "DAILY CHALLENGE";
    $("menuExtra").style.display = ""; $("menuExtra").textContent = "SHARE"; $("menuExtra").onclick = () => share("daily", d.streak);
    if (window.GC) GC.achieve("daily_first");
  }

  // ---------- daily gift ----------
  function giftCheck() {
    const g = LS.get("tenmm-gift", { last: -9, streak: 0 }), t = today();
    if (g.last === t || !$("gift")) return;
    const streak = g.last === t - 1 ? g.streak + 1 : 1;
    const amt = [10, 15, 20, 25, 30, 40, 60][Math.min(6, streak - 1)];
    $("giftAmt").textContent = "+" + amt + " COINS";
    $("giftDay").textContent = "DAY " + streak + (streak >= 7 ? " • MAX GIFT" : " • come back tomorrow for more");
    $("gift").classList.remove("hidden");
    $("giftClaim").onclick = () => {
      g.last = t; g.streak = streak; LS.set("tenmm-gift", g);
      addCoins(amt); sfx("win"); buzz("success");
      $("gift").classList.add("hidden");
      if (window.showHome && state === "menu") { const c = $("hCoins"); if (c) c.textContent = totalCoins; }
    };
  }

  // ---------- upgrades screen ----------
  function showUpgrades() {
    state = "shop";
    hidePanels();
    $("overlay").classList.remove("hidden");
    setArt("toolbox");
    $("eyebrow").textContent = "UPGRADES";
    $("message").textContent = "POWER UP YOUR 10MM";
    $("details").textContent = "You have " + totalCoins + " coins. Upgrades work in every mode.";
    ["menuExtra", "menuSettings", "menuLevels", "menuShop"].forEach((id) => ($(id).style.display = "none"));
    $("go").textContent = "BACK";
    $("go").onclick = showMenu;
    const box = $("shop");
    box.innerHTML = "";
    for (const u of UPG) {
      const lv = upLvl(u.id), card = document.createElement("div");
      card.className = "upg";
      card.innerHTML = "<b>" + u.name + "</b><span>" + u.desc + (lv ? " • now " + u.val[lv] : "") + "</span><em>" + "■".repeat(lv) + "<i>" + "■".repeat(u.max - lv) + "</i></em>";
      const b = document.createElement("button");
      if (lv >= u.max) { b.textContent = "MAXED"; b.disabled = true; b.className = "no"; }
      else {
        const c = u.cost[lv];
        b.textContent = (lv ? "UPGRADE • " : "BUY • ") + c;
        b.className = totalCoins >= c ? "buy" : "no";
        b.onclick = () => {
          if (totalCoins < c) { $("details").textContent = "You need " + (c - totalCoins) + " more coins. Play levels, the Daily Challenge or Endless mode to earn more."; return; }
          addCoins(-c);
          const all = upg(); all[u.id] = lv + 1; LS.set("tenmm-upgrades", all);
          sfx("power"); buzz("success");
          showUpgrades();
        };
      }
      card.append(b);
      box.append(card);
    }
    box.classList.add("on");
  }

  // ---------- share card ----------
  async function share(kind, value) {
    const c = document.createElement("canvas"); c.width = 1080; c.height = 1350;
    const g = c.getContext("2d");
    const load = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
    const [bg, hero, coin] = await Promise.all([load("bg-" + themeOf(Math.max(1, level)).key + ".jpg"), load(skinSrc()), load("coin.webp")]);
    g.fillStyle = "#0a1220"; g.fillRect(0, 0, 1080, 1350);
    if (bg) { const sc = Math.max(1080 / bg.width, 1350 / bg.height); g.globalAlpha = 0.45; g.drawImage(bg, (1080 - bg.width * sc) / 2, (1350 - bg.height * sc) / 2, bg.width * sc, bg.height * sc); g.globalAlpha = 1; }
    const grd = g.createLinearGradient(0, 0, 0, 1350); grd.addColorStop(0, "#0a1220cc"); grd.addColorStop(0.5, "#0a122000"); grd.addColorStop(1, "#0a1220ee"); g.fillStyle = grd; g.fillRect(0, 0, 1080, 1350);
    g.textAlign = "center";
    g.font = "italic 900 104px system-ui,-apple-system,sans-serif"; g.lineWidth = 10; g.strokeStyle = "#3a2205"; g.fillStyle = "#ffce49";
    g.strokeText("WHERE'S MY 10MM?!", 540, 170); g.fillText("WHERE'S MY 10MM?!", 540, 170);
    g.font = "800 38px system-ui,sans-serif"; g.fillStyle = "#cfe0ec"; g.fillText("THE GREAT SOCKET ESCAPE", 540, 235);
    if (hero) g.drawImage(hero, 140, 380, 800, 800 * hero.height / hero.width);
    const big = kind === "endless" ? value.toLocaleString() + " m" : kind === "daily" ? value + "-DAY STREAK" : "LEVEL " + value;
    const small = kind === "endless" ? "ENDLESS RUN" : kind === "daily" ? "DAILY CHALLENGE" : "I MADE IT TO";
    g.font = "800 46px system-ui,sans-serif"; g.fillStyle = "#fff"; g.fillText(small, 540, 950);
    g.font = "italic 900 150px system-ui,sans-serif"; g.lineWidth = 12; g.strokeStyle = "#0b1525"; g.fillStyle = "#ffce49"; g.strokeText(big, 540, 1100); g.fillText(big, 540, 1100);
    if (coin) g.drawImage(coin, 390, 1150, 60, 52);
    g.font = "800 44px system-ui,sans-serif"; g.fillStyle = "#fff"; g.textAlign = "left"; g.fillText(totalCoins.toLocaleString() + " coins", 465, 1192);
    g.textAlign = "center"; g.font = "700 36px system-ui,sans-serif"; g.fillStyle = "#9fb4c6"; g.fillText("Can you beat it? Free on the App Store", 540, 1290);
    const data = c.toDataURL("image/png");
    const text = kind === "endless" ? "I ran " + value + " m in Where's My 10MM?! Can you beat it?" : kind === "daily" ? "I'm on a " + value + "-day Daily Challenge streak in Where's My 10MM?!" : "I made it to level " + value + " in Where's My 10MM?! Can you find your 10mm?";
    try {
      if (isNative()) {
        const fs = Capacitor.registerPlugin("Filesystem"), sh = Capacitor.registerPlugin("Share");
        const w = await fs.writeFile({ path: "wheres-my-10mm.png", data: data.split(",")[1], directory: "CACHE" });
        await sh.share({ title: "Where's My 10MM?!", text, files: [w.uri] });
        return;
      }
      const blob = await (await fetch(data)).blob(), file = new File([blob], "wheres-my-10mm.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
      const a = document.createElement("a"); a.href = data; a.download = "wheres-my-10mm.png"; a.click();
    } catch (e) { /* share sheet closed */ }
  }

  // ---------- extra bonus games ----------
  const baseBonusIntro = bonusIntro;
  bonusIntro = function (done) {
    const n = level / 10, kind = ["find", "sort", "match", "hidden", "drain"][(n - 1) % 5];
    if (kind === "drain" && window.runDrainIntro) return runDrainIntro(done);
    if (kind === "find") return baseBonusIntro(done);
    if (kind === "hidden" && window.runHiddenIntro) return runHiddenIntro(done);
    const secs = kind === "sort" ? Math.max(8, 15 - Math.floor(n / 3)) : Math.max(20, 34 - n);
    popup("BONUS ROUND!", kind === "sort" ? "SOCKET SORT: tap the sockets from smallest to biggest (8mm up to 14mm) in " + secs + " seconds. Wrong taps cost time." : "TOOL MATCH: flip the cards and find all 6 pairs of tools in " + secs + " seconds.", "START", () => (kind === "sort" ? runSort : runMatch)(done, secs), "toolbox");
    $("eyebrow").textContent = "BONUS ROUND " + n + " OF " + MAX_LEVEL / 10;
  };
  function bonusShell(title, sub, secs, onTimeout) {
    hidePanels(); $("overlay").classList.add("hidden"); stopMusic(); state = "bonus"; startMusic("bonus");
    const box = $("bonus"), dr = $("drawer");
    box.classList.remove("hidden"); dr.innerHTML = ""; dr.className = "drawer";
    box.querySelector(".bhead>div").firstChild.textContent = title; $("bSub").textContent = sub;
    let left = secs * 1000, last = performance.now(), over = false, raf = 0;
    const upd = () => { $("bTime").textContent = (left / 1000).toFixed(1); $("bTime").className = left < 4000 ? "low" : ""; $("bBar").style.transform = "scaleX(" + Math.max(0, left / (secs * 1000)) + ")"; };
    const loop = (now) => { if (over) return; left -= Math.min(100, now - last); last = now; if (left <= 0) { left = 0; upd(); sfx("hit"); buzz("heavy"); api.finish(false); return; } upd(); raf = requestAnimationFrame(loop); };
    const api = {
      dr, penalty(ms, x, y) { left -= ms; sfx("miss"); buzz("medium"); api.pop(x, y, "-" + ms / 1000 + "s"); dr.classList.remove("shake"); void dr.offsetWidth; dr.classList.add("shake"); },
      pop(x, y, txt, good) { const p = document.createElement("div"); p.className = "bpop" + (good ? " good" : ""); p.textContent = txt; p.style.left = Math.max(4, Math.min(dr.clientWidth - 150, x - 20)) + "px"; p.style.top = y - 30 + "px"; dr.append(p); setTimeout(() => p.remove(), 800); },
      finish(won) { if (over) return; over = true; cancelAnimationFrame(raf); stopMusic(); setTimeout(() => { box.classList.add("hidden"); box.querySelector(".bhead>div").firstChild.textContent = "BONUS: FIND THE 10MM"; $("bSub").textContent = "Tap the 10mm socket. Wrong taps cost time!"; bonusResult(won, left / 1000, onTimeout); }, won ? 900 : 700); },
      get over() { return over; },
    };
    upd(); raf = requestAnimationFrame(loop);
    return api;
  }
  function runSort(done, secs) {
    const api = bonusShell("BONUS: SOCKET SORT", "NEXT: tap the 8mm", secs, done), dr = api.dr;
    const W2 = dr.clientWidth, H2 = dr.clientHeight, sizes = [8, 9, 10, 11, 12, 13, 14];
    const cols = 3, rows = 3, cw = W2 / cols, ch = H2 / rows, slots = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) slots.push([c, r]);
    slots.sort(() => Math.random() - 0.5);
    let next = 0;
    sizes.forEach((sz, i) => {
      const [c, r] = slots[i], w = Math.min(cw, ch / 1.2) * (0.55 + (sz - 8) * 0.04);
      const im = document.createElement("img");
      im.src = sz === 10 ? "socket-find-10.webp" : "socket-decoy-" + sz + ".webp";
      im.style.cssText = "pointer-events:auto;left:" + (c * cw + (cw - w) / 2 + (Math.random() - 0.5) * cw * 0.2) + "px;top:" + (r * ch + (ch - w * 1.2) / 2 + (Math.random() - 0.5) * ch * 0.15) + "px;width:" + w + "px;transform:rotate(" + (Math.random() * 50 - 25) + "deg)";
      im.onpointerdown = (e) => {
        e.preventDefault(); if (api.over) return;
        const rr = dr.getBoundingClientRect(), x = e.clientX - rr.left, y = e.clientY - rr.top;
        if (sz === sizes[next]) { next++; sfx("power"); buzz("light"); im.style.opacity = ".25"; im.style.pointerEvents = "none"; api.pop(x, y, sz + "mm ✓", true); if (next === sizes.length) { sfx("win"); buzz("success"); api.finish(true); } else $("bSub").textContent = "NEXT: tap the " + sizes[next] + "mm"; }
        else { api.penalty(2000, x, y); api.pop(x, y + 34, "Tap " + sizes[next] + "mm next!"); }
      };
      dr.append(im);
    });
    dr.onpointerdown = null;
  }
  function runMatch(done, secs) {
    const api = bonusShell("BONUS: TOOL MATCH", "Find all 6 pairs", secs, done), dr = api.dr;
    const tools = ["wrench", "ratchet", "phillips", "meter", "flashlight", "nut"].sort(() => Math.random() - 0.5);
    const deck = [...tools, ...tools].sort(() => Math.random() - 0.5);
    const grid = document.createElement("div"); grid.className = "mgrid";
    let open = [], pairs = 0, lock = false;
    deck.forEach((t) => {
      const card = document.createElement("div"); card.className = "mcard";
      card.innerHTML = '<div class="mback">10</div><div class="mface"><img src="tool-' + t + '.webp" alt=""></div>';
      card.onpointerdown = (e) => {
        e.preventDefault();
        if (api.over || lock || card.classList.contains("flip")) return;
        card.classList.add("flip"); sfx("flap"); buzz("light"); open.push([card, t]);
        if (open.length === 2) {
          const [[a, ta], [b, tb]] = open; open = [];
          if (ta === tb) { pairs++; sfx("power"); a.classList.add("done"); b.classList.add("done"); if (pairs === 6) { sfx("win"); buzz("success"); api.finish(true); } }
          else { lock = true; setTimeout(() => { a.classList.remove("flip"); b.classList.remove("flip"); lock = false; }, 650); }
        }
      };
      grid.append(card);
    });
    dr.append(grid);
    dr.onpointerdown = null;
  }

  // ---------- menus ----------
  const baseStart = start;
  start = function () {
    const tip = runMode === "adventure" ? null : $("tip").textContent;
    baseStart();
    if (runMode === "endless") $("tip").textContent = "ENDLESS: run as far as you can! Best " + LS.get("tenmm-endless-best", 0) + " m";
    else if (runMode === "daily") { createLevelTip(); }
    else if (boss) $("tip").textContent = bossTip();
    if (window.mirrorOn) $("tip").textContent = "MIRROR LEVEL! " + $("tip").textContent;
  };
  function createLevelTip() {
    const g = goalMode;
    $("tip").textContent = "GOAL: " + (g === "drawer" ? "jump into the open drawer" : g === "engine" ? "land in the engine bay" : g === "bench" ? "land on the workbench" : g === "shelf" ? "land on the tool cart" : "roll under the " + destinations[(level - 1) % 4].toLowerCase());
  }
  const baseShowMenu = showMenu;
  showMenu = function () { leaveMode(); window.mirrorOn = false; baseShowMenu(); };
  const baseShowReady = showReady;
  showReady = function () {
    baseShowReady();
    if (runMode === "endless") { $("rLevel").textContent = "ENDLESS"; $("rGoal").textContent = "Run as far as you can. Best: " + LS.get("tenmm-endless-best", 0) + " m"; }
    if (runMode === "daily") { $("rLevel").textContent = "DAILY"; $("rTheme").textContent = "DAILY CHALLENGE • " + themeOf(level).name; }
    if (boss) { $("rTheme").textContent = "BOSS LEVEL • " + themeOf(level).name; }
    if (window.mirrorOn) { $("rTheme").textContent = "MIRROR LEVEL • " + $("rTheme").textContent; $("rGoal").textContent = "Everything is flipped: you're running the other way! " + $("rGoal").textContent; }
  };
  window.Feature = { debug: () => ({ boss, rocket, slick, bossImg: bossSprite.naturalWidth }), mode: () => runMode, startDaily, startEndless, showUpgrades, share, giftCheck, dailyState, today, isDailyDone: () => dailyState().last === today(), endlessBest: () => LS.get("tenmm-endless-best", 0), starsTotal: () => Object.values(LS.get("tenmm-stars", {})).reduce((a, b) => a + b, 0) };
})();

// ---------- Game Center (iPhone app only) ----------
(() => {
  const C = window.Capacitor;
  const native = !!(C && C.isNativePlatform && C.isNativePlatform() && C.registerPlugin);
  const P = native ? C.registerPlugin("GameCenter") : null;
  let on = false;
  const BOARD = { level: "wm10_best_level", endless: "wm10_endless_distance", stars: "wm10_total_stars" };
  const sent = (() => { try { return JSON.parse(localStorage.getItem("tenmm-gc-ach") || "[]"); } catch (e) { return []; } })();
  window.GC = {
    get on() { return on; },
    async signIn() { if (!P) return; try { const r = await P.signIn(); on = !!r.signedIn; if (on) GC.sync(); } catch (e) {} },
    score(kind, v) { if (on && BOARD[kind]) P.submitScore({ leaderboard: BOARD[kind], score: Math.floor(v) }).catch(() => {}); },
    achieve(id) {
      if (!on || sent.includes(id)) return;
      P.reportAchievement({ id: "wm10_" + id, percent: 100 }).then((r) => { if (r && r.ok) { sent.push(id); localStorage.setItem("tenmm-gc-ach", JSON.stringify(sent)); } }).catch(() => {});
    },
    show(view) { if (P) P.show({ view: view || "leaderboards" }).catch(() => {}); },
    // re-send everything the player has already earned (first sign-in, new phone)
    sync() {
      const stars = window.Feature ? Feature.starsTotal() : 0, lv = best - 1;
      GC.score("level", best); GC.score("stars", stars);
      const eb = window.Feature ? Feature.endlessBest() : 0; if (eb) GC.score("endless", eb);
      if (lv >= 1) GC.achieve("first_escape"); if (lv >= 25) GC.achieve("level_25"); if (lv >= 100) GC.achieve("level_100"); if (best >= 200) GC.achieve("level_200");
      if (stars >= 100) GC.achieve("stars_100");
      if (eb >= 1000) GC.achieve("endless_1000");
      let bw = 0; try { bw = JSON.parse(localStorage.getItem("tenmm-bonus-done") || "[]").length; } catch (e) {}
      if (bw >= 5) GC.achieve("bonus_5");
      let bossN = 0; try { bossN = JSON.parse(localStorage.getItem("tenmm-boss") || "[]").length; } catch (e) {}
      if (bossN) GC.achieve("boss_1");
      try { const d = JSON.parse(localStorage.getItem("tenmm-daily") || "{}"); if (d.streak) GC.achieve("daily_first"); if (d.streak >= 7) GC.achieve("daily_streak_7"); } catch (e) {}
    },
  };
  if (native) setTimeout(() => GC.signIn(), 2500);
  // report progress whenever a level or bonus round ends
  const baseAfterWin = FX.afterWin;
  FX.afterWin = function () { baseAfterWin(); GC.sync(); };
  // ask for a rating after a few happy moments (a win, never after a crash or an ad)
  const R = native ? C.registerPlugin("Review") : null;
  const RATE_AT = [5, 20, 50, 120];
  const baseAfterWin2 = FX.afterWin;
  FX.afterWin = function () {
    baseAfterWin2();
    if (!R || Feature.mode() !== "adventure" || !RATE_AT.includes(level)) return;
    let asked = [];
    try { asked = JSON.parse(localStorage.getItem("tenmm-rate") || "[]"); } catch (e) {}
    if (asked.includes(level) || (asked.length && Date.now() - (+localStorage.getItem("tenmm-rate-at") || 0) < 30 * 86400000)) return;
    asked.push(level);
    localStorage.setItem("tenmm-rate", JSON.stringify(asked));
    localStorage.setItem("tenmm-rate-at", Date.now());
    setTimeout(() => { if (state !== "running") R.request().catch(() => {}); }, 1400);
  };
  const baseBonusResult = bonusResult;
  bonusResult = function (won, t, done) { baseBonusResult(won, t, done); GC.sync(); };
})();

// ---------- coin packs in the shop (iPhone app only) ----------
(() => {
  const baseRenderShop = renderShop;
  renderShop = function () {
    baseRenderShop();
    const packs = window.Monetize && Monetize.native ? Monetize.coinPacks : [];
    if (!packs.length) return;
    const box = $("shop"), head = document.createElement("div");
    head.className = "packs";
    head.innerHTML = '<div class="ph">GET MORE COINS</div>';
    packs.forEach((p, i) => {
      const b = document.createElement("button");
      const art = ["small", "medium", "large"][i] || "small";
      b.className = "pk-" + art;
      b.innerHTML = '<img src="pack-' + art + '.webp" alt=""><b>' + p.coins.toLocaleString() + " COINS</b><small>" + (i === 2 ? "BEST VALUE" : i === 1 ? "POPULAR" : "") + "</small><em>" + p.price + "</em>";
      b.onclick = async () => {
        const r = await Monetize.buyCoins(p.id);
        if (r.skip) return;
        if (r.ok) { totalCoins += r.coins; localStorage.setItem("tenmm-coins", totalCoins); $("coinsCount").textContent = totalCoins; sfx("win"); buzz("success"); }
        toast(r.msg, r.ok);
        $("details").textContent = "You have " + totalCoins + " coins.";
        renderShop();
      };
      head.append(b);
    });
    box.prepend(head);
  };
})();
