import { AdMob } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

const AD_UNIT_ID = 'ca-app-pub-7979856440890193/9179846434';
const SHOW_EVERY_N_OPENS = 3;  // Show ad every 3rd app open
const AD_DELAY_MS = 30000;     // Wait 15 seconds before showing

let adMobInitialized = false;

export async function initAdMob() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await AdMob.initialize({ initializeForTesting: false });
    adMobInitialized = true;
    console.log('[AdMob] initialized');
  } catch (e) {
    console.warn('[AdMob] init failed:', e);
    adMobInitialized = false;
  }
}

export async function showInterstitialAd() {
  if (!adMobInitialized) return false;
  try {
    await AdMob.prepareInterstitial({ adId: AD_UNIT_ID, isTesting: false });
    await AdMob.showInterstitial();
    return true;
  } catch (e) {
    console.warn('[AdMob] interstitial failed:', e);
    return false;
  }
}

export function getAppOpenCount() {
  const count = parseInt(localStorage.getItem('appOpenCount') || '0') + 1;
  localStorage.setItem('appOpenCount', String(count));
  return count;
}

export function isFirstLaunch() {
  return getAppOpenCount() === 1;
}

function isInputFocused() {
  const active = document.activeElement;
  return active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
}

export async function maybeShowAdOnOpen() {
  const count = parseInt(localStorage.getItem('appOpenCount') || '0');

  if (count % SHOW_EVERY_N_OPENS === 0) {
    await new Promise(resolve => setTimeout(resolve, AD_DELAY_MS));
    
    // Wait for input to be unfocused before showing ad
    while (isInputFocused()) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    await showInterstitialAd();
  }
}