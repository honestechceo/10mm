// Ads (AdMob) + one-time "Remove Ads" purchase for the iPhone app.
// On the website (no Capacitor) everything here is a no-op: no ads, no store.
(function () {
  'use strict';
  const C = window.Capacitor;
  const NATIVE = !!(C && typeof C.isNativePlatform === 'function' && C.isNativePlatform() && typeof C.registerPlugin === 'function');
  const AdMob = NATIVE ? C.registerPlugin('AdMob') : null;
  const Store = NATIVE ? C.registerPlugin('NativePurchases') : null;
  let cfg = null, coinPrices = {}, ready = false, rewardedReady = false, interReady = false, crashes = 0, lastInter = 0, price = '$1.99', busy = false, paying = false, payDoneAt = 0;
  const NOADS_KEY = 'tenmm-noads';
  const noAds = () => { try { return localStorage.getItem(NOADS_KEY) === 'yes'; } catch (e) { return false; } };
  const setNoAds = (v) => { try { localStorage.setItem(NOADS_KEY, v ? 'yes' : 'no'); } catch (e) {} };
  const opt = (id) => ({ adId: id, isTesting: !!cfg.testMode });
  const silence = () => { try { window.stopMusic && window.stopMusic(); } catch (e) {} };

  async function loadInter() { if (!ready || noAds()) return; try { interReady = false; await AdMob.prepareInterstitial(opt(cfg.interstitialId)); interReady = true; } catch (e) { interReady = false; } }
  let rewardLoading = null, lastRewardResult = '';
  function loadRewarded() {
    if (!ready) return Promise.resolve(false);
    if (rewardLoading) return rewardLoading;
    rewardedReady = false;
    rewardLoading = AdMob.prepareRewardVideoAd(opt(cfg.rewardedId)).then(() => { rewardedReady = true; return true; })
      .catch(() => { rewardedReady = false; setTimeout(loadRewarded, 15000); return false; })
      .finally(() => { rewardLoading = null; });
    return rewardLoading;
  }
  // reward events tell us whether the player watched to the end, closed early, or the ad failed to show
  let rewardEarned = false;
  function listenRewards() {
    try {
      AdMob.addListener('onRewardedVideoAdReward', () => { rewardEarned = true; });
      AdMob.addListener('onRewardedVideoAdFailedToShow', () => { lastRewardResult = 'failed'; });
    } catch (e) {}
  }

  async function initAds() {
    try {
      await AdMob.initialize({ initializeForTesting: !!cfg.testMode });
      // EU/UK consent form (Google UMP), then Apple's tracking prompt
      try {
        const info = await AdMob.requestConsentInfo();
        if (info && info.isConsentFormAvailable && String(info.status).toUpperCase() === 'REQUIRED') await AdMob.showConsentForm();
      } catch (e) {}
      try {
        const t = await AdMob.trackingAuthorizationStatus();
        if (t && t.status === 'notDetermined') await AdMob.requestTrackingAuthorization();
      } catch (e) {}
      ready = true;
      listenRewards(); loadRewarded(); loadInter();
    } catch (e) { ready = false; }
  }

  async function initStore() {
    try {
      const { isBillingSupported } = await Store.isBillingSupported();
      if (!isBillingSupported) return;
      try {
        const { products } = await Store.getProducts({ productIdentifiers: [cfg.removeAdsProductId], productType: 'inapp' });
        if (products && products[0] && products[0].priceString) price = products[0].priceString;
      } catch (e) {}
      try {
        const ids = (cfg.coinPacks || []).map(p => p.id);
        if (ids.length) {
          const { products } = await Store.getProducts({ productIdentifiers: ids, productType: 'inapp' });
          for (const pr of products || []) coinPrices[pr.identifier || pr.productIdentifier] = pr.priceString;
        }
      } catch (e) {}
      try {
        const { purchases } = await Store.getPurchases({ productType: 'inapp' });
        if ((purchases || []).some(p => (p.productIdentifier || p.productId) === cfg.removeAdsProductId)) setNoAds(true);
      } catch (e) {}
    } catch (e) {}
  }

  window.Monetize = {
    native: NATIVE,
    get price() { return price; },
    get adsRemoved() { return noAds(); },
    get canContinue() { return NATIVE && ready && (rewardedReady || !!rewardLoading); },
    // after a crash: called when the player taps TRY AGAIN; shows a full-screen ad now and then
    async beforeRetry(level) {
      crashes++;
      if (!NATIVE || !ready || noAds() || !interReady || busy) return;
      if (level < cfg.noAdsBeforeLevel) return;
      if (crashes % cfg.interstitialEveryCrashes !== 0) return;
      if (Date.now() - lastInter < cfg.interstitialMinSeconds * 1000) return;
      busy = true; silence();
      try { await AdMob.showInterstitial(); lastInter = Date.now(); } catch (e) {}
      interReady = false; busy = false; loadInter();
    },
    // optional rewarded ad: resolves true if the player earned the reward
    get lastRewardResult() { return lastRewardResult; },
    async watchToContinue() {
      if (!NATIVE || !ready || busy) { lastRewardResult = 'failed'; return false; }
      // not loaded yet (e.g. right after the last one): give it a few seconds
      if (!rewardedReady) await Promise.race([loadRewarded(), new Promise(r => setTimeout(r, 4000))]);
      if (!rewardedReady) { lastRewardResult = 'loading'; return false; }
      busy = true; silence(); rewardEarned = false; lastRewardResult = '';
      let r = null;
      try { r = await AdMob.showRewardVideoAd(); } catch (e) { lastRewardResult = 'failed'; }
      busy = false; rewardedReady = false; loadRewarded();
      const ok = rewardEarned || !!(r && (r.amount !== undefined || r.type));
      if (!ok && !lastRewardResult) lastRewardResult = 'closed';
      return ok;
    },
    get paying() { return paying; },
    async buyRemoveAds() {
      if (!NATIVE) return { ok: false, msg: 'Purchases work in the iPhone app.' };
      // only one purchase sheet at a time, and ignore stray taps right after it closes
      if (paying || Date.now() - payDoneAt < 1500) return { ok: false, msg: '', skip: true };
      paying = true;
      try {
        const t = await Store.purchaseProduct({ productIdentifier: cfg.removeAdsProductId, productType: 'inapp', quantity: 1 });
        if (t && (t.transactionId || t.productIdentifier)) { setNoAds(true); return { ok: true, msg: 'Ads removed. Thank you!' }; }
        return { ok: false, msg: 'Purchase not completed.' };
      } catch (e) { return { ok: false, msg: 'Purchase cancelled. No charge was made.' }; }
      finally { paying = false; payDoneAt = Date.now(); }
    },
    async restore() {
      if (!NATIVE) return { ok: false, msg: 'Restore works in the iPhone app.' };
      if (paying) return { ok: false, msg: '', skip: true };
      paying = true;
      try {
        // Apple's sync can fail (or be cancelled) even when the purchase is already on this iPhone,
        // so always check what this Apple ID owns afterwards
        let syncErr = null;
        try { await Store.restorePurchases(); } catch (e) { syncErr = e; }
        let has = false;
        try {
          const { purchases } = await Store.getPurchases({ productType: 'inapp' });
          has = (purchases || []).some(p => (p.productIdentifier || p.productId) === cfg.removeAdsProductId);
        } catch (e) { if (!syncErr) syncErr = e; }
        if (has) { setNoAds(true); return { ok: true, msg: 'Purchase restored. Ads removed.' }; }
        if (syncErr) return { ok: false, msg: 'Could not reach the App Store. Try again.' };
        return { ok: false, msg: 'No previous purchase found for this Apple ID.' };
      } catch (e) { return { ok: false, msg: 'Could not reach the App Store. Try again.' }; }
      finally { paying = false; payDoneAt = Date.now(); }
    },
    // consumable coin packs: [{id, coins, price}] only once the App Store knows them
    get coinPacks() { return (cfg && cfg.coinPacks || []).filter(p => coinPrices[p.id]).map(p => ({ ...p, price: coinPrices[p.id] })); },
    async buyCoins(id) {
      if (!NATIVE) return { ok: false, msg: 'Coin packs are in the iPhone app.' };
      if (paying || Date.now() - payDoneAt < 1500) return { ok: false, msg: '', skip: true };
      const pack = (cfg.coinPacks || []).find(p => p.id === id);
      if (!pack) return { ok: false, msg: 'Not available.' };
      paying = true;
      try {
        const t = await Store.purchaseProduct({ productIdentifier: id, productType: 'inapp', quantity: 1 });
        if (t && (t.transactionId || t.productIdentifier)) {
          const seen = JSON.parse(localStorage.getItem('tenmm-coin-tx') || '[]');
          if (t.transactionId && seen.includes(t.transactionId)) return { ok: false, msg: 'Already added.' };
          if (t.transactionId) { seen.push(t.transactionId); localStorage.setItem('tenmm-coin-tx', JSON.stringify(seen.slice(-50))); }
          return { ok: true, coins: pack.coins, msg: '+' + pack.coins + ' coins added. Thank you!' };
        }
        return { ok: false, msg: 'Purchase not completed.' };
      } catch (e) { return { ok: false, msg: 'Purchase cancelled. No charge was made.' }; }
      finally { paying = false; payDoneAt = Date.now(); }
    },
    privacy() { if (NATIVE && ready) AdMob.showPrivacyOptionsForm().catch(() => {}); }
  };

  if (!NATIVE) return;
  fetch('ads-config.json').then(r => r.json()).then(c => { cfg = c; initStore(); initAds(); }).catch(() => {});
})();
