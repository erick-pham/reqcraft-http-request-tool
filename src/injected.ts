import { NetworkRule } from './types';

(function () {
  let activeRules: NetworkRule[] = [];

  // 1. Attempt to load cached rules from sessionStorage for instant startup
  try {
    const cached = sessionStorage.getItem('__MOD_REQ_RES_RULES__');
    if (cached) {
      activeRules = JSON.parse(cached);
    }
  } catch {
    // ignore
  }

  // 2. Listen for rule updates from Content Script via window.postMessage
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data?.source === 'MOD_REQ_RES_EXT' && event.data?.type === 'UPDATE_RULES') {
      activeRules = event.data.rules || [];
      try {
        sessionStorage.setItem('__MOD_REQ_RES_RULES__', JSON.stringify(activeRules));
      } catch {
        // ignore
      }
      console.log(
        `%c[ModReqRes]%c Synced ${activeRules.length} active rules into page context.`,
        'color: #10b981; font-weight: bold;',
        'color: inherit;'
      );
    }
  });

  // 3. Request rules from Content Script immediately on startup
  window.postMessage({ source: 'MOD_REQ_RES_PAGE', type: 'GET_RULES' }, '*');

  // 4. Helper to convert Wildcard pattern to RegExp
  function wildcardToRegex(pattern: string): RegExp {
    const escaped = pattern
      .replace(/[-[\]{}()+?.,\\^$|#\s]/g, '\\$&')
      .replace(/\*/g, '(.*)');
    return new RegExp(escaped);
  }

  // 5. Apply URL Rewrite based on active NetworkRules
  function applyRewriteUrl(url: string): string {
    if (!activeRules || activeRules.length === 0) return url;

    let currentUrl = url;

    for (const rule of activeRules) {
      // Only process rewrite (or redirect) rules
      if (rule.type !== 'rewrite' && rule.type !== 'redirect') continue;
      if (!rule.enabled) continue;

      const substitution =
        rule.type === 'rewrite'
          ? rule.rewriteSubstitution || ''
          : rule.redirectUrl || '';

      if (!substitution) continue;

      const pattern = (rule.urlMatch || '').trim();
      if (!pattern) continue;

      let isMatched = false;
      let newUrl = currentUrl;

      if (rule.matchType === 'exact') {
        if (currentUrl === pattern) {
          newUrl = substitution;
          isMatched = true;
        }
      } else if (rule.matchType === 'regex') {
        try {
          const regex = new RegExp(pattern);
          if (regex.test(currentUrl)) {
            newUrl = currentUrl.replace(regex, substitution);
            isMatched = true;
          }
        } catch (err) {
          console.error(`[ModReqRes] Regex error in rule "${rule.name}":`, pattern, err);
        }
      } else {
        // Wildcard
        try {
          if (pattern.includes('*')) {
            const regex = wildcardToRegex(pattern);
            if (regex.test(currentUrl)) {
              newUrl = currentUrl.replace(regex, substitution);
              isMatched = true;
            }
          } else {
            // Substring match
            if (currentUrl.includes(pattern)) {
              newUrl = currentUrl.replace(pattern, substitution);
              isMatched = true;
            }
          }
        } catch (err) {
          console.error(`[ModReqRes] Wildcard error in rule "${rule.name}":`, err);
        }
      }

      if (isMatched && newUrl !== currentUrl) {
        console.log(
          `%c[ModReqRes Rewrite]%c "${rule.name}"\n  👉 Original: ${currentUrl}\n  👉 Target:   ${newUrl}`,
          'color: #38bdf8; font-weight: bold;',
          'color: inherit;'
        );
        currentUrl = newUrl;
        break; // Stop at first matched rule
      }
    }

    return currentUrl;
  }

  // 6. Override window.fetch
  const originalFetch = window.fetch;
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    try {
      let urlString = '';
      if (typeof input === 'string') {
        urlString = input;
      } else if (input instanceof URL) {
        urlString = input.toString();
      } else if (input instanceof Request) {
        urlString = input.url;
      }

      const rewrittenUrl = applyRewriteUrl(urlString);

      if (rewrittenUrl !== urlString) {
        if (typeof input === 'string') {
          input = rewrittenUrl;
        } else if (input instanceof URL) {
          input = new URL(rewrittenUrl);
        } else if (input instanceof Request) {
          input = new Request(rewrittenUrl, input);
        }
      }
    } catch (e) {
      console.error('[ModReqRes] Error during fetch rewrite:', e);
    }

    return originalFetch.call(this, input, init);
  };

  // 7. Override XMLHttpRequest (Axios / jQuery / standard XHR)
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    async: boolean = true,
    username?: string | null,
    password?: string | null
  ) {
    try {
      const urlString = typeof url === 'string' ? url : url.toString();
      const rewrittenUrl = applyRewriteUrl(urlString);
      if (rewrittenUrl !== urlString) {
        url = rewrittenUrl;
      }
    } catch (e) {
      console.error('[ModReqRes] Error during XHR rewrite:', e);
    }

    return originalOpen.call(this, method, url, async, username, password);
  };

  console.log('[ModReqRes] Injected script initialized and successfully hooked window.fetch & XMLHttpRequest!');
})();
