import { Capacitor } from '@capacitor/core';

const APP_ID     = 'ca-app-pub-7979856440890193~8062655593';
const AD_UNIT_ID = 'ca-app-pub-7979856440890193/9179846434';

// During testing, swap AD_UNIT_ID for this Google test ID so you don't
// accidentally click real ads on your own device:
// const AD_UNIT_ID = 'ca-app-pub-3940256099942544/1033173712';

let AdMob = null;

/** Call once when the app starts (native only — no-op on web). */
export async function initAdMob() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const mod = await import('@capacitor-community/admob');
    AdMob = mod.AdMob;
    await AdMob.initialize({ initializeForTesting: false });
    console.log('[AdMob] initialized');
  } catch (e) {
    console.warn('[AdMob] init failed:', e);
  }
}

/**
 * Load and show a full-screen interstitial ad.
 * Returns true if the ad was shown, false if unavailable (e.g. web build).
 */
export async function showInterstitialAd() {
  if (!Capacitor.isNativePlatform() || !AdMob) return false;
  try {
    await AdMob.prepareInterstitial({ adId: AD_UNIT_ID, isTesting: false });
    await AdMob.showInterstitial();
    return true;
  } catch (e) {
    console.warn('[AdMob] interstitial failed:', e);
    return false;
  }
}
