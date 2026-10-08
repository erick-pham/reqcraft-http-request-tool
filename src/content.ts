const STORAGE_KEY = 'mod_req_res_config';

// 1. Retrieve active rules from chrome.storage.local
async function getActiveRules() {
  try {
    const res = await chrome.storage.local.get(STORAGE_KEY);
    const data = res?.[STORAGE_KEY];
    if (!data || data.isGlobalEnabled === false) {
      return [];
    }

    const activeProfile = data.profiles?.find((p: any) => p.id === data.activeProfileId);
    if (!activeProfile || activeProfile.isActive === false) {
      return [];
    }

    // Only return rules that are enabled
    return (activeProfile.rules || []).filter((r: any) => r.enabled);
  } catch (err) {
    console.error('[ModReqRes Content] Error reading storage:', err);
    return [];
  }
}

// 2. Synchronize rules to Injected Script (running in MAIN world) via postMessage
async function syncRulesToPage() {
  const rules = await getActiveRules();
  window.postMessage(
    {
      source: 'MOD_REQ_RES_EXT',
      type: 'UPDATE_RULES',
      rules
    },
    '*'
  );
}

// 3. Listen for rule requests from Injected Script when page initializes
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data?.source === 'MOD_REQ_RES_PAGE' && event.data?.type === 'GET_RULES') {
    syncRulesToPage();
  }
});

// 4. Listen for real-time storage updates from Popup
if (chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes: any, areaName: string) => {
    if (areaName === 'local' && changes[STORAGE_KEY]) {
      syncRulesToPage();
    }
  });
}

// 5. Initial sync when Content Script loads
syncRulesToPage();
