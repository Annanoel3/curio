import { Capacitor, registerPlugin } from '@capacitor/core';

// Switch back to real ID once confirmed working:
// const AD_UNIT_ID = 'ca-app-pub-7979856440890193/9179846434';

// Google's official test interstitial — always serves immediately
const AD_UNIT_ID = 'ca-app-pub-3940256099942544/1033173712';

let AdMob = null;

export async function initAdMob() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    AdMob = registerPlugin('AdMob');
    await AdMob.initialize({ initializeForTesting: true });
    console.log('[AdMob] initialized');
  } catch (e) {
    console.warn('[AdMob] init failed:', e);
    AdMob = null;
  }
}

export async function showInterstitialAd() {
  if (!AdMob) return false;
  try {
    await AdMob.prepareInterstitial({ adId: AD_UNIT_ID, isTesting: true });
    await AdMob.showInterstitial();
    return true;
  } catch (e) {
    console.warn('[AdMob] interstitial failed:', e);
    return false;
  }
}