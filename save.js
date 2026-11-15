// Saves for the iPhone app.
// The game keeps using localStorage while it plays. Every change to a "tenmm-" key is copied to
// (1) the iPhone's own app storage (Capacitor Preferences), which iOS never clears, and
// (2) iCloud, so progress follows the player's Apple ID to a new phone.
// On launch the best save is picked and loaded. On the website this file does nothing.
(function () {
  'use strict';
  const C = window.Capacitor;
  const NATIVE = !!(C && typeof C.isNativePlatform === 'function' && C.isNativePlatform() && typeof C.registerPlugin === 'function');
  window.SaveSync = { native: NATIVE, cloud: false, status: NATIVE ? 'This iPhone' : 'This browser' };
  if (!NATIVE) return;
  const Prefs = C.registerPlugin('Preferences');
  const Cloud = C.registerPlugin('CloudSave');
  const KEY = 'tenmm-save';
  const ls = window.localStorage;
  const setItem = ls.setItem.bind(ls), removeItem = ls.removeItem.bind(ls);

  function snapshot() {
    const data = {};
    for (let i = 0; i < ls.length; i++) { const k = ls.key(i); if (k && k.startsWith('tenmm-') && k !== 'tenmm-savetime') data[k] = ls.getItem(k); }
    return data;
  }
  const num = (v) => { const n = parseInt(v, 10); return isNaN(n) ? 0 : n; };
  const list = (v) => { try { const a = JSON.parse(v || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  // newest save wins, but progress and purchases are never lost
  function merge(a, b) {
    const [newer, older] = (a.t || 0) >= (b.t || 0) ? [a, b] : [b, a];
    const d = Object.assign({}, older.data || {}, newer.data || {});
    const od = older.data || {};
    d['tenmm-escape-best'] = String(Math.max(num(d['tenmm-escape-best']), num(od['tenmm-escape-best'])));
    d['tenmm-score'] = String(Math.max(num(d['tenmm-score']), num(od['tenmm-score'])));
    d['tenmm-skins'] = JSON.stringify([...new Set([...list(d['tenmm-skins']), ...list(od['tenmm-skins']), 'chrome'])]);
    if (od['tenmm-noads'] === 'yes') d['tenmm-noads'] = 'yes';
    return { t: newer.t || 0, data: d };
  }
  const parse = (v) => { try { const o = JSON.parse(v || 'null'); return o && o.data ? o : null; } catch (e) { return null; } };

  let timer = 0;
  function persist() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const save = JSON.stringify({ t: Date.now(), data: snapshot() });
      Prefs.set({ key: KEY, value: save }).catch(() => {});
      if (window.SaveSync.cloud) Cloud.set({ key: KEY, value: save }).catch(() => {});
    }, 800);
  }
  ls.setItem = function (k, v) { setItem(k, v); if (String(k).startsWith('tenmm-')) { setItem('tenmm-savetime', String(Date.now())); persist(); } };
  ls.removeItem = function (k) { removeItem(k); if (String(k).startsWith('tenmm-')) { setItem('tenmm-savetime', String(Date.now())); persist(); } };
  document.addEventListener('visibilitychange', () => { if (document.hidden) { clearTimeout(timer); timer = 0; persist(); } });

  (async function restore() {
    let cloudOn = false;
    try { cloudOn = !!(await Cloud.available()).available; } catch (e) {}
    window.SaveSync.cloud = cloudOn;
    window.SaveSync.status = cloudOn ? 'iCloud' : 'This iPhone';
    const local = { t: num(ls.getItem('tenmm-savetime')), data: snapshot() };
    let best = local;
    try { const p = parse((await Prefs.get({ key: KEY })).value); if (p) best = merge(best, p); } catch (e) {}
    if (cloudOn) { try { const c = parse((await Cloud.get({ key: KEY })).value); if (c) best = merge(best, c); } catch (e) {} }
    const changed = Object.keys(best.data).some(k => ls.getItem(k) !== best.data[k]);
    if (changed && !sessionStorage.getItem('tenmm-restored')) {
      for (const [k, v] of Object.entries(best.data)) setItem(k, v);
      setItem('tenmm-savetime', String(best.t || Date.now()));
      sessionStorage.setItem('tenmm-restored', '1');
      persist();
      location.reload();
      return;
    }
    persist();
  })();
})();
