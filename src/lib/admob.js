import { Capacitor, registerPlugin } from '@capacitor/core';

// Switch back to real ID once confirmed working:
// const AD_UNIT_ID = 'ca-app-pub-7979856440890193/9179846434';

// Google's official test interstitial — always serves immediately
const AD_UNIT_ID = 'ca-app-pub-3940256099942544/1033173712';

// Use registerPlugin instead of a dynamic npm import so this works
// even when the app loads from a remote URL (curio.website via server.url).
// registerPlugin creates a bridge to the native Android plugin directly.
const AdMob = Capacitor.isNativePlatform()
  ? registerPlugin('AdMob')
  : null;

/** Call once when the app starts (native only — no-op on web). */
export async function initAdMob() {
  if (!AdMob) return;
  try {
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
  if (!AdMob) return false;
  try {
    await AdMob.prepareInterstitial({ adId: AD_UNIT_ID, isTesting: false });
    await AdMob.showInterstitial();
    return true;
  } catch (e) {
    console.warn('[AdMob] interstitial failed:', e);
    return false;
  }
}
