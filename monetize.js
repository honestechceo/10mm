// Ads (AdMob) + one-time "Remove Ads" purchase for the iPhone app.
// On the website (no Capacitor) everything here is a no-op: no ads, no store.
(function () {
  'use strict';
  const C = window.Capacitor;
  const NATIVE = !!(C && typeof C.isNativePlatform === 'function' && C.isNativePlatform() && typeof C.registerPlugin === 'function');
  const AdMob = NATIVE ? C.registerPlugin('AdMob') : null;
  const Store = NATIVE ? C.registerPlugin('NativePurchases') : null;
  let cfg = null, ready = false, rewardedReady = false, interReady = false, crashes = 0, lastInter = 0, price = '$1.99', busy = false, paying = false, payDoneAt = 0;
  const NOADS_KEY = 'tenmm-noads';
  const noAds = () => { try { return localStorage.getItem(NOADS_KEY) === 'yes'; } catch (e) { return false; } };
  const setNoAds = (v) => { try { localStorage.setItem(NOADS_KEY, v ? 'yes' : 'no'); } catch (e) {} };
  const opt = (id) => ({ adId: id, isTesting: !!cfg.testMode });
  const silence = () => { try { window.stopMusic && window.stopMusic(); } catch (e) {} };

  async function loadInter() { if (!ready || noAds()) return; try { interReady = false; await AdMob.prepareInterstitial(opt(cfg.interstitialId)); interReady = true; } catch (e) { interReady = false; } }
  async function loadRewarded() { if (!ready) return; try { rewardedReady = false; await AdMob.prepareRewardVideoAd(opt(cfg.rewardedId)); rewardedReady = true; } catch (e) { rewardedReady = false; } }

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
      loadRewarded(); loadInter();
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
        const { purchases } = await Store.getPurchases({ productType: 'inapp' });
        if ((purchases || []).some(p => (p.productIdentifier || p.productId) === cfg.removeAdsProductId)) setNoAds(true);
      } catch (e) {}
    } catch (e) {}
  }

  window.Monetize = {
    native: NATIVE,
    get price() { return price; },
    get adsRemoved() { return noAds(); },
    get canContinue() { return NATIVE && ready && rewardedReady; },
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
    async watchToContinue() {
      if (!this.canContinue || busy) return false;
      busy = true; silence();
      try { const r = await AdMob.showRewardVideoAd(); busy = false; rewardedReady = false; loadRewarded(); return !!r; }
      catch (e) { busy = false; rewardedReady = false; loadRewarded(); return false; }
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
        await Store.restorePurchases();
        const { purchases } = await Store.getPurchases({ productType: 'inapp' });
        const has = (purchases || []).some(p => (p.productIdentifier || p.productId) === cfg.removeAdsProductId);
        if (has) setNoAds(true);
        return { ok: has, msg: has ? 'Purchase restored. Ads removed.' : 'No previous purchase found for this Apple ID.' };
      } catch (e) { return { ok: false, msg: 'Could not reach the App Store. Try again.' }; }
      finally { paying = false; payDoneAt = Date.now(); }
    },
    privacy() { if (NATIVE && ready) AdMob.showPrivacyOptionsForm().catch(() => {}); }
  };

  if (!NATIVE) return;
  fetch('ads-config.json').then(r => r.json()).then(c => { cfg = c; initStore(); initAds(); }).catch(() => {});
})();
