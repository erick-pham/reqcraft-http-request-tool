import {
  initFloatingIndicator,
  updateFloatingIndicator
} from './utils/floatingIndicator';

const STORAGE_KEY = 'mod_req_res_config';

/**
 * Synchronize rules to Injected Script (MAIN world) and update Floating Status Pill.
 */
async function syncRulesAndIndicator(): Promise<void> {
  try {
    const res = await chrome.storage.local.get(STORAGE_KEY);
    const data = res?.[STORAGE_KEY];

    const isGlobalEnabled = data?.isGlobalEnabled !== false;
    const showIndicator = data?.showIndicator !== false;
    const profiles = data?.profiles || [];
    const activeProfile =
      profiles.find((p: any) => p.id === data?.activeProfileId) || profiles[0];

    const isProfileActive = activeProfile?.isActive !== false;
    const allProfileRules = activeProfile?.rules || [];
    const enabledRules = allProfileRules.filter((r: any) => r.enabled);

    // Active rules sent to page hook (injected.ts) only when globally enabled & profile is active
    const activeRulesForHook = isGlobalEnabled && isProfileActive ? enabledRules : [];

    // Send updated rules to MAIN world injected script via postMessage
    window.postMessage(
      {
        source: 'REQCRAFT_EXT',
        type: 'UPDATE_RULES',
        rules: activeRulesForHook
      },
      '*'
    );

    // Update Floating Status Pill on web page
    updateFloatingIndicator({
      isGlobalEnabled,
      profileName: activeProfile?.name || 'Default',
      isProfileActive,
      activeRulesCount: enabledRules.length,
      showIndicator
    });
  } catch (err) {
    console.error('[ReqCraft Content] Sync error:', err);
  }
}

// 1. Listen for rule requests from Injected Script when page initializes
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (
    (event.data?.source === 'REQCRAFT_PAGE' || event.data?.source === 'MOD_REQ_RES_PAGE') &&
    event.data?.type === 'GET_RULES'
  ) {
    syncRulesAndIndicator();
  }
});

// 2. Listen for real-time storage updates from Popup or other tabs
if (chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes: any, areaName: string) => {
    if (areaName === 'local' && changes[STORAGE_KEY]) {
      syncRulesAndIndicator();
    }
  });
}

// 3. Mount Floating Status Pill into web page DOM
initFloatingIndicator();

// 4. Initial synchronization
syncRulesAndIndicator();
