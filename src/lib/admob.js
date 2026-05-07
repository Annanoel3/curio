import { Capacitor, registerPlugin } from '@capacitor/core';

const AD_UNIT_ID = 'ca-app-pub-7979856440890193/9179846434';

const AdMob = Capacitor.isNativePlatform()
  ? registerPlugin('AdMob')
  : null;

export async function initAdMob() {
  if (!AdMob) return;
  try {
    await AdMob.initialize({ initializeForTesting: false });
    console.log('[AdMob] initialized');
  } catch (e) {
    console.warn('[AdMob] init failed:', e);
  }
}

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