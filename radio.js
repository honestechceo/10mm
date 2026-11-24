// Where's My 10MM?! — "My Radio": choose game music, your own music app, or no music.
// With MY MUSIC the game's music turns off and its sound effects mix on top of
// Spotify, Apple Music, YouTube Music or any other app that's playing.
"use strict";
(() => {
  const C = window.Capacitor;
  const native = !!(C && C.isNativePlatform && C.isNativePlatform() && C.registerPlugin);
  const P = native ? C.registerPlugin("Radio") : null;
  const APPS = [
    { id: "spotify", name: "Spotify", app: "spotify:", web: "https://open.spotify.com", color: "#1db954", icon: "♫" },
    { id: "apple", name: "Apple Music", app: "music://", web: "https://music.apple.com", color: "#fa2d48", icon: "♪" },
    { id: "youtube", name: "YouTube Music", app: "youtubemusic://", web: "https://music.youtube.com", color: "#ff0033", icon: "▶" },
    { id: "other", name: "Other App", color: "#8b5cf6", icon: "▦" },
  ];
  const MODES = { off: "OFF", game: "GAME MUSIC", mine: "MY MUSIC" };

  function mode() { return settings.radio || (settings.music ? "game" : "off"); }

  // tell the phone whether the game should share the speaker with other apps
  // "playback" so effects and music are heard even with the ring/silent switch on silent.
  // Only MY MUSIC mixes with the player's own music app (WebKit can only mix as "ambient").
  function applyAudioSession() {
    const mix = mode() === "mine";
    try { if (navigator.audioSession) navigator.audioSession.type = mix ? "ambient" : "playback"; } catch (e) {}
    if (P) P.setMix({ mix }).catch(() => {});
  }
  window.applyAudioSession = applyAudioSession;

  function setMode(m) {
    if (!MODES[m]) return;
    settings.radio = m;
    settings.music = m === "game";
    saveSettings();
    applyAudioSession();
    if (!settings.music) stopMusic();
    else {
      audioReady();
      if (state === "running") startMusic();
      else if (state === "menu" && $("home") && $("home").className === "home") startMusic("title");
    }
    render();
    updateHome();
  }

  async function openApp(a) {
    if (mode() !== "mine") setMode("mine");
    if (a.id === "other") { hint("Open your music app, press play, then come back to the game. Your music keeps playing under the sound effects."); return; }
    hint("Opening " + a.name + "… press play, then come back to the game.");
    if (P) { try { await P.openApp({ app: a.app, web: a.web }); return; } catch (e) {} }
    try { window.open(a.web, "_blank"); } catch (e) {}
  }

  function hint(t) { const h = $("radioHint"); if (h) { h.textContent = t; h.classList.remove("flash"); void h.offsetWidth; h.classList.add("flash"); } }

  let el = null;
  function build() {
    el = document.createElement("div");
    el.id = "radio";
    el.className = "hidden";
    el.innerHTML =
      '<div class="rdo"><div class="rdo-top"><span class="rdo-eq"></span><b>MY RADIO</b><span class="rdo-eq"></span></div>' +
      '<div class="rdo-modes">' + Object.entries(MODES).map(([k, v]) => '<button data-m="' + k + '"><i>' + (window.GICON ? (k === "off" ? GICON.off(22) : k === "game" ? GICON.music(22) : GICON.phones(22)) : "") + "</i>" + v + "</button>").join("") + "</div>" +
      '<div class="rdo-apps">' + APPS.map((a) => '<button data-a="' + a.id + '"><i style="background:' + a.color + '">' + a.icon + "</i>" + a.name + "</button>").join("") + "</div>" +
      '<div class="rdo-hint" id="radioHint">Pick MY MUSIC, open your music app, press play, then come back to the game.</div>' +
      '<button class="rdo-sfx" id="radioSfx"></button>' +
      '<button class="rdo-done" id="radioDone">DONE</button></div>';
    document.body.append(el);
    el.querySelectorAll("[data-m]").forEach((b) => (b.onclick = () => { setMode(b.dataset.m); sfx("power"); buzz("light"); paint(); hint(b.dataset.m === "mine" ? "Now open your music app and press play. The game's sound effects play on top." : b.dataset.m === "game" ? "Playing the game's own soundtrack." : "No music. Sound effects only."); }));
    el.querySelectorAll("[data-a]").forEach((b) => (b.onclick = () => { openApp(APPS.find((a) => a.id === b.dataset.a)); paint(); }));
    $("radioSfx").onclick = () => { settings.sfx = !settings.sfx; soundOn = settings.sfx; saveSettings(); if (soundOn) sfx("coin"); paint(); };
    $("radioDone").onclick = close;
    el.onclick = (e) => { if (e.target === el) close(); };
  }
  function paint() {
    const m = mode();
    el.querySelectorAll("[data-m]").forEach((b) => b.classList.toggle("on", b.dataset.m === m));
    el.querySelector(".rdo-apps").classList.toggle("dim", m !== "mine");
    $("radioSfx").innerHTML = "SOUND EFFECTS <em class='" + (settings.sfx ? "on" : "") + "'>" + (settings.sfx ? "ON" : "OFF") + "</em>";
    el.classList.toggle("playing", m !== "off");
  }
  function open() { if (!el) build(); paint(); el.className = ""; }
  function close() { if (el) el.className = "hidden"; updateHome(); if (state === "menu" && typeof renderOptions === "function" && $("opts") && $("opts").offsetParent) renderOptions(); }

  function updateHome() {
    const b = $("hRadio");
    if (!b) return;
    b.querySelector("b").textContent = "RADIO: " + MODES[mode()];
    b.classList.toggle("mine", mode() === "mine");
  }
  const baseHome = showHome;
  showHome = function (intro) {
    baseHome.apply(this, arguments);
    const b = $("hRadio");
    if (b) b.onclick = (e) => { e.stopPropagation(); audioReady(); open(); };
    updateHome();
  };

  window.RadioUI = { open, setMode, mode };
  applyAudioSession();
  // the phone resets sound sharing after ads and app switches: put it back
  document.addEventListener("visibilitychange", () => { if (!document.hidden) applyAudioSession(); });
})();
