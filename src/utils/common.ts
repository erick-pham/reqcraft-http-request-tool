import { NetworkRule, StorageData } from '../types';
// Check if the url is internal url
export const isRestrictedUrl = (url: string) => {
  if (!url) return true;
  return (
    url.startsWith('chrome://') ||
    url.startsWith('edge://') ||
    url.startsWith('coccoc://') ||
    url.startsWith('about:') ||
    url.startsWith('chrome-extension://')
  );
};

export const stringToBase64 = (str: string) => {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

export const wildcardToRegex = (pattern: string): RegExp => {
  const escaped = pattern
    .replace(/[-[\]{}()+?.,\\^$|#\s]/g, '\\$&')
    .replace(/\*/g, '(.*)');
  return new RegExp(escaped);
};

export const findActiveRuleByUrl = (
  activeRules: NetworkRule[],
  currentUrl: string
): NetworkRule | undefined => {
  return activeRules.find((rule) => {
    const pattern = (rule.urlMatch || '').trim();

    if (!pattern || !rule.enabled) return false;

    if (rule.matchType === 'exact' && currentUrl === pattern) {
      return true;
    } else if (rule.matchType === 'regex') {
      try {
        return new RegExp(pattern).test(currentUrl);
      } catch (err) {
        console.error(`[ReqCraft] Wildcard error in rule "${rule.name}":`, err);
      }
    } else {
      // Wildcard
      try {
        if (pattern.includes('*')) {
          return wildcardToRegex(pattern).test(currentUrl);
        } else {
          return currentUrl.includes(pattern);
        }
      } catch (err) {
        console.error(`[ReqCraft] Wildcard error in rule "${rule.name}":`, err);
      }
    }

    return false;
  });
};

export const findOneActiveDebuggerRuleByUrl = (
  data: StorageData | undefined,
  currentUrl: string
): NetworkRule | undefined => {
  if (!data || data.isGlobalEnabled === false) {
    return;
  }

  const activeProfile = data.profiles?.find(
    (p) => p.id === data.activeProfileId
  );

  if (!activeProfile || activeProfile.isActive === false) {
    return;
  }

  const activeRules = (activeProfile.rules || []).filter(
    (r) =>
      r.enabled && (r.type === 'mock_request' || r.type === 'mock_response')
  );

  return findActiveRuleByUrl(activeRules, currentUrl);
};
