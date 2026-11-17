// Where's My 10MM?! — free web demo.
// In a browser (not the iPhone app) only levels 1-10 are playable; everything else points to the App Store.
"use strict";
(() => {
  const C = window.Capacitor;
  if (C && C.isNativePlatform && C.isNativePlatform()) return;
  const URL = "https://apps.apple.com/app/wheres-my-10mm/id6834943980", MAX = 10;
  const open = () => { try { window.open(URL, "_blank") || (location.href = URL); } catch (e) { location.href = URL; } };
  window.DEMO = { MAX, URL };

  function upsell(reason) {
    stopMusic && stopMusic();
    if (window.hideHome) hideHome();
    popup(
      reason === "end" ? "YOU BEAT THE DEMO!" : "IN THE FULL GAME",
      (reason === "end" ? "Nice driving! That's the end of the free demo. " : "That's part of the full game. ") +
        "Get Where's My 10MM?! FREE on the App Store for all 400 levels, boss fights, the Daily Challenge, Endless mode, Service Bay oil changes and brake jobs, 5 bonus games and Game Center.",
      "GET IT ON THE APP STORE", open, "hero");
    $("eyebrow").textContent = "FREE ON THE APP STORE";
    const m = $("menuSettings"); m.style.display = ""; m.textContent = "MAIN MENU"; m.onclick = () => showMenu();
  }
  window.DEMO.upsell = upsell;

  // levels past the demo
  const baseStart = start;
  window.__fullStart = baseStart;
  start = function () {
    const mode = window.Feature ? Feature.mode() : "adventure";
    if (mode !== "adventure" || level > MAX) { if (mode === "adventure") { level = MAX; } return upsell(level >= MAX && mode === "adventure" ? "end" : "mode"); }
    return baseStart.apply(this, arguments);
  };
  // level select: lock 11+
  const baseLevels = showLevels;
  showLevels = function () {
    baseLevels.apply(this, arguments);
    document.querySelectorAll(".levels button").forEach((b) => {
      const n = parseInt(b.textContent, 10);
      if (n > MAX) { b.disabled = false; b.classList.add("applock"); b.onclick = () => upsell("mode"); }
    });
  };
  // full-game-only modes on the home screen
  const baseHome = showHome;
  showHome = function (intro) {
    baseHome.apply(this, arguments);
    for (const id of ["hDaily", "hEndless", "hUpg", "hService"]) {
      const b = $(id); if (!b) continue;
      b.classList.add("applock"); b.onclick = () => upsell("mode");
    }
    const sub = (id, t) => { const e = $(id); if (e) e.textContent = t; };
    sub("hDailySub", "In the App Store version"); sub("hEndlessSub", "In the App Store version"); sub("hServiceSub", "In the App Store version");
    if (best > MAX) $("hPlay").textContent = "PLAY THE DEMO";
    if (!$("hAppStore")) {
      const a = document.createElement("button");
      a.id = "hAppStore"; a.className = "happstore";
      a.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="#fff" d="M16.4 12.6c0-2.4 2-3.6 2.1-3.6-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.1-1.2 2.9-2.4.9-1.3 1.3-2.7 1.3-2.7s-2.4-1-2.4-4.1zM14 5.5c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1 .1 2.1-.6 2.8-1.4z"/></svg><span><small>FREE DEMO • Get the full game on the</small><b>App Store</b></span>';
      a.onclick = open;
      const home = document.querySelector("#home .hhome");
      if (home) home.prepend(a);
    }
  };
  // the shop's coin packs and the service bay need the app
  if (window.Service) { const g = Service.showGarage; Service.showGarage = () => upsell("mode"); }
})();
