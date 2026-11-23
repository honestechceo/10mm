// Live updates: the iPhone app checks for a newer version of the game's web files and switches to it
// the next time the game restarts. No App Store review needed for web-only changes (art, levels, fixes).
// Native changes (plugins, Swift code) still need an App Store update; see scripts/live-version.mjs.
(() => {
  const C = window.Capacitor;
  if (!(C && C.isNativePlatform && C.isNativePlatform() && C.registerPlugin)) return;
  const U = C.registerPlugin("CapacitorUpdater");
  // once the game has actually loaded, tell the updater this version works.
  // If it never says so (a broken update), the phone rolls back to the last good version by itself.
  window.addEventListener("load", () => setTimeout(() => {
    const ok = typeof start === "function" && typeof render === "function" && document.getElementById("home");
    if (ok) { try { U.notifyAppReady().catch(() => {}); } catch (e) {} }
  }, 1500));
  const MANIFEST = "https://github.com/honestechceo/10mm/releases/latest/download/live.json";
  const Http = C.registerPlugin("CapacitorHttp");
  let busy = false, lastCheck = 0;
  async function check() {
    if (busy || Date.now() - lastCheck < 10 * 60 * 1000) return;
    busy = true; lastCheck = Date.now();
    try {
      const local = await (await fetch("live-version.json", { cache: "no-store" })).json();
      const r = await Http.get({ url: MANIFEST, params: { t: String(Date.now()) }, responseType: "json" });
      const m = typeof r.data === "string" ? JSON.parse(r.data) : r.data;
      if (!m || !m.url || !m.version || m.fp !== local.fp || !(+m.n > +local.n)) return;
      let b = null;
      try { const l = await U.list(); b = ((l && l.bundles) || []).find((x) => x.version === m.version && x.status !== "error"); } catch (e) {}
      if (!b) b = await U.download({ url: m.url, version: m.version });
      if (b && b.id) await U.next({ id: b.id }); // switches over the next time the game restarts
    } catch (e) {
      // no signal, GitHub down, etc.: try again later
    } finally { busy = false; }
  }
  setTimeout(check, 5000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) setTimeout(check, 3000); });
})();
