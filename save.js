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
  // Until the saved game has been loaded, nothing the game writes counts as "newer" than the
  // saved copy. (Before 1.3, claiming the daily gift in the first seconds after an update could
  // make a near-empty save look newest and overwrite the real one.)
  let ready = false, dirty = false;
  const bootT = parseInt(ls.getItem('tenmm-savetime'), 10) || 0;

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
    d['tenmm-looks-owned'] = JSON.stringify([...new Set([...list(d['tenmm-looks-owned']), ...list(od['tenmm-looks-owned'])])]);
    // a "newer" save that has gone backwards in level progress is a wiped/fresh copy: keep the real coins
    if (num(newer.data && newer.data['tenmm-escape-best']) < num(od['tenmm-escape-best']) && num(od['tenmm-coins']) > num(d['tenmm-coins'])) d['tenmm-coins'] = od['tenmm-coins'];
    try {
      const lo = JSON.parse(od['tenmm-lt'] || '{}'), ln = JSON.parse(d['tenmm-lt'] || '{}');
      if (lo.done || ln.done) d['tenmm-lt'] = JSON.stringify(Object.assign({}, lo, ln, { done: [...new Set([...(lo.done || []), ...(ln.done || [])])], golden: !!(lo.golden || ln.golden) }));
    } catch (e) {}
    if (od['tenmm-noads'] === 'yes') d['tenmm-noads'] = 'yes';
    return { t: newer.t || 0, data: d };
  }
  const parse = (v) => { try { const o = JSON.parse(v || 'null'); return o && o.data ? o : null; } catch (e) { return null; } };

  let timer = 0;
  // keeps a few older copies on the phone so a bad save can be rolled back (Settings > Restore older save)
  function keepHistory(save) {
    Prefs.get({ key: KEY + '-hist' }).then((r) => {
      let h = []; try { h = JSON.parse(r.value || '[]'); } catch (e) {}
      const last = h[h.length - 1];
      if (last && save.t - last.t < 3600000) return;
      h.push(save); h = h.slice(-8);
      Prefs.set({ key: KEY + '-hist', value: JSON.stringify(h) }).catch(() => {});
    }).catch(() => {});
  }
  function persist() {
    if (!ready) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      const obj = { t: Date.now(), data: snapshot() }, save = JSON.stringify(obj);
      Prefs.set({ key: KEY, value: save }).catch(() => {});
      if (window.SaveSync.cloud) Cloud.set({ key: KEY, value: save }).catch(() => {});
      keepHistory(obj);
    }, 800);
  }
  const touched = () => { if (!ready) { dirty = true; return; } setItem('tenmm-savetime', String(Date.now())); persist(); };
  ls.setItem = function (k, v) { setItem(k, v); if (String(k).startsWith('tenmm-') && k !== 'tenmm-savetime') touched(); };
  ls.removeItem = function (k) { removeItem(k); if (String(k).startsWith('tenmm-')) touched(); };
  document.addEventListener('visibilitychange', () => { if (document.hidden && ready) { clearTimeout(timer); timer = 0; persist(); } });
  window.SaveSync.history = () => Prefs.get({ key: KEY + '-hist' }).then((r) => { try { return JSON.parse(r.value || '[]'); } catch (e) { return []; } }).catch(() => []);
  window.SaveSync.restoreFrom = (save) => {
    for (const [k, v] of Object.entries(save.data)) setItem(k, v);
    setItem('tenmm-savetime', String(Date.now())); ready = true; persist();
    setTimeout(() => location.reload(), 900);
  };

  (async function restore() {
    try {
    // the phone's own copy first (fast), then iCloud (can take a few seconds)
    const local = { t: bootT, data: snapshot() };
    let best = local;
    try { const p = parse((await Prefs.get({ key: KEY })).value); if (p) best = merge(best, p); } catch (e) {}
    let cloudOn = false;
    try { const a = await Cloud.available(); cloudOn = !!a.available; window.SaveSync.why = 'entitled ' + a.entitled + ', token ' + a.token + ', sync ' + a.sync; } catch (e) { window.SaveSync.why = 'plugin: ' + ((e && (e.code || e.message)) || e); }
    window.SaveSync.cloud = cloudOn;
    window.SaveSync.status = cloudOn ? 'iCloud' : 'This iPhone';
    if (cloudOn) { try { const c = parse((await Cloud.get({ key: KEY })).value); if (c) best = merge(best, c); } catch (e) {} }
    const changed = Object.keys(best.data).some(k => ls.getItem(k) !== best.data[k]);
    if (changed && !sessionStorage.getItem('tenmm-restored')) {
      for (const [k, v] of Object.entries(best.data)) setItem(k, v);
      setItem('tenmm-savetime', String(best.t || Date.now()));
      sessionStorage.setItem('tenmm-restored', '1');
      ready = true; persist();
      location.reload();
      return;
    }
    } finally {
      if (!ready) { ready = true; if (dirty) setItem('tenmm-savetime', String(Date.now())); persist(); }
    }
  })();
})();
