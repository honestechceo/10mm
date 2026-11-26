// Where's My 10MM?! - hidden diagnostics for stutter and sound problems on real phones.
// Tap the small "THE GREAT SOCKET ESCAPE • V24.2" line at the top of the game screen 5 times to open
// a log of freezes and audio events with timestamps; COPY puts it on the clipboard to send.
"use strict";
(() => {
  const log = [], t0 = performance.now();
  const stamp = () => ((performance.now() - t0) / 1000).toFixed(2);
  function note(m) { log.push(stamp() + "  " + m); if (log.length > 150) log.shift(); }
  window.DIAG = note;
  note("start " + navigator.userAgent.replace(/^.*?\((.*?)\).*$/, "$1") + (window.devicePixelRatio ? " dpr " + devicePixelRatio : ""));
  try { fetch("live-version.json").then((r) => r.json()).then((v) => note("bundle " + v.n + " " + v.sha)).catch(() => note("bundle built-in")); } catch (e) {}
  note("audioSession " + (navigator.audioSession ? "yes type=" + navigator.audioSession.type : "no"));

  // frames that took too long
  let last = 0;
  function frame(t) {
    if (last && t - last > 150 && !document.hidden) note("FREEZE " + Math.round(t - last) + "ms (state " + (typeof state !== "undefined" ? state : "?") + ", level " + (typeof level !== "undefined" ? level : "?") + ")");
    last = t;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // audio engine: state changes and a clock that stops moving
  let ctxSeen = null, lastState = "", lastT = -1, stuck = 0;
  setInterval(() => {
    const c = typeof audioCtx !== "undefined" ? audioCtx : null;
    if (!c) return;
    if (c !== ctxSeen) { note("audio engine created (" + c.sampleRate + " Hz)"); ctxSeen = c; lastState = ""; }
    if (c.state !== lastState) { note("audio " + c.state + (navigator.audioSession ? " session=" + navigator.audioSession.type + "/" + (navigator.audioSession.state || "") : "")); lastState = c.state; }
    if (c.state === "running" && c.currentTime === lastT) { if (++stuck === 2) note("audio clock stuck while running"); } else stuck = 0;
    lastT = c.currentTime;
  }, 250);
  document.addEventListener("visibilitychange", () => note(document.hidden ? "app hidden" : "app shown"));
  try { if (navigator.audioSession) navigator.audioSession.onstatechange = () => note("audioSession " + navigator.audioSession.state); } catch (e) {}

  // the panel
  let taps = 0, tapT = 0;
  document.addEventListener("click", (e) => {
    const h = e.target && e.target.closest && e.target.closest("header small");
    if (!h) return;
    const now = performance.now();
    taps = now - tapT < 800 ? taps + 1 : 1; tapT = now;
    if (taps >= 5) { taps = 0; show(); }
  });
  function show() {
    let el = document.getElementById("diag");
    if (!el) {
      el = document.createElement("div"); el.id = "diag";
      el.style.cssText = "position:fixed;inset:0;z-index:99999;background:#000e;color:#cfe;padding:calc(env(safe-area-inset-top,0px) + 10px) 10px 10px;display:flex;flex-direction:column;gap:8px;font:12px/1.35 ui-monospace,Menlo,monospace";
      el.innerHTML = '<div style="display:flex;gap:8px"><button id="dgCopy" style="flex:1;padding:12px;font:900 14px system-ui;border-radius:10px;border:0;background:#ffd23f">COPY</button><button id="dgClose" style="flex:1;padding:12px;font:900 14px system-ui;border-radius:10px;border:0;background:#445;color:#fff">CLOSE</button></div><pre id="dgLog" style="flex:1;overflow:auto;margin:0;white-space:pre-wrap;-webkit-user-select:text;user-select:text"></pre>';
      document.body.append(el);
      el.querySelector("#dgClose").onclick = () => (el.style.display = "none");
      el.querySelector("#dgCopy").onclick = async (ev) => { try { await navigator.clipboard.writeText(log.join("\n")); ev.target.textContent = "COPIED"; } catch (x) { ev.target.textContent = "SELECT THE TEXT"; } };
    }
    el.style.display = "flex";
    el.querySelector("#dgLog").textContent = log.join("\n");
  }
})();
