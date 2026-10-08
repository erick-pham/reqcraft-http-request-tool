import { StorageData } from "./types";

const STORAGE_KEY = "mod_req_res_config";

// Standard HTTP request headers that Chrome declarativeNetRequest allows to be appended.
// Chrome throws an error if 'append' is used on any request header outside this list.
const APPENDABLE_REQUEST_HEADERS = new Set([
  "accept",
  "accept-encoding",
  "accept-language",
  "access-control-request-headers",
  "cookie",
  "forwarded",
  "range",
  "te",
  "via",
  "x-forwarded-for",
]);

function getDnrHeaderOperation(
  action: "set" | "add" | "remove",
  headerName: string,
  isRequest: boolean,
): string {
  if (action === "remove") {
    return chrome.declarativeNetRequest.HeaderOperation?.REMOVE || "remove";
  }

  if (action === "add") {
    if (isRequest) {
      // If the request header is in the appendable list, use append; otherwise fallback safely to set
      return APPENDABLE_REQUEST_HEADERS.has(headerName.toLowerCase().trim())
        ? chrome.declarativeNetRequest.HeaderOperation?.APPEND || "append"
        : chrome.declarativeNetRequest.HeaderOperation?.SET || "set";
    }
    return chrome.declarativeNetRequest.HeaderOperation?.APPEND || "append";
  }

  return chrome.declarativeNetRequest.HeaderOperation?.SET || "set";
}

/**
 * Update dynamic declarativeNetRequest rules based on the active profile's enabled rules.
 */
async function updateDeclarativeNetRules(): Promise<void> {
  if (!chrome.declarativeNetRequest) {
    console.warn("[Background] chrome.declarativeNetRequest is not available.");
    return;
  }

  try {
    const res = await chrome.storage.local.get(STORAGE_KEY);
    const data: StorageData | undefined = res?.[STORAGE_KEY];

    // Clear dynamic rules if extension is globally disabled or no data
    if (!data || data.isGlobalEnabled === false) {
      await clearAllDynamicRules();
      return;
    }

    const activeProfile = data.profiles?.find(
      (p) => p.id === data.activeProfileId,
    );
    if (!activeProfile || activeProfile.isActive === false) {
      await clearAllDynamicRules();
      return;
    }

    const activeRules = (activeProfile.rules || []).filter((r) => r.enabled);
    const dnrRules: any[] = [];
    let ruleIndex = 1;

    for (const rule of activeRules) {
      const id = ruleIndex++;

      // 1. Handle Redirect Rules
      if (rule.type === "redirect" && rule.redirectUrl) {
        // const isRegex = rule.matchType === "regex";
        const isRegex = true;
        console.log(rule.redirectUrl, rule.urlMatch);
        dnrRules.push({
          id,
          priority: 1,
          action: {
            type:
              chrome.declarativeNetRequest.RuleActionType?.REDIRECT ||
              "redirect",
            redirect: isRegex
              ? { regexSubstitution: rule.redirectUrl.replaceAll("$", "\\") }
              : { url: rule.redirectUrl },
          },
          condition: {
            ...(isRegex
              ? { regexFilter: rule.urlMatch }
              : { urlFilter: rule.urlMatch }),
            resourceTypes: [
              chrome.declarativeNetRequest.ResourceType?.MAIN_FRAME ||
                "main_frame",
              chrome.declarativeNetRequest.ResourceType?.SUB_FRAME ||
                "sub_frame",
              chrome.declarativeNetRequest.ResourceType?.XMLHTTPREQUEST ||
                "xmlhttprequest",
            ],
          },
        });
      }

      // 2. Handle Modify Headers Rules
      else if (rule.type === "modify_headers" && rule.headers) {
        const requestHeaders: any[] = [];
        const responseHeaders: any[] = [];

        (rule.headers.request || []).forEach((h) => {
          if (!h.key) return;
          const operation = getDnrHeaderOperation(h.action, h.key, true);

          requestHeaders.push({
            header: h.key,
            operation,
            value: h.action === "remove" ? undefined : h.value,
          });
        });

        (rule.headers.response || []).forEach((h) => {
          if (!h.key) return;
          const operation = getDnrHeaderOperation(h.action, h.key, false);

          responseHeaders.push({
            header: h.key,
            operation,
            value: h.action === "remove" ? undefined : h.value,
          });
        });

        if (requestHeaders.length > 0 || responseHeaders.length > 0) {
          const isRegex = rule.matchType === "regex";

          dnrRules.push({
            id,
            priority: 1,
            action: {
              type:
                chrome.declarativeNetRequest.RuleActionType?.MODIFY_HEADERS ||
                "modifyHeaders",
              requestHeaders:
                requestHeaders.length > 0 ? requestHeaders : undefined,
              responseHeaders:
                responseHeaders.length > 0 ? responseHeaders : undefined,
            },
            condition: {
              ...(isRegex
                ? { regexFilter: rule.urlMatch }
                : { urlFilter: rule.urlMatch }),
              resourceTypes: [
                chrome.declarativeNetRequest.ResourceType?.MAIN_FRAME ||
                  "main_frame",
                chrome.declarativeNetRequest.ResourceType?.SUB_FRAME ||
                  "sub_frame",
                chrome.declarativeNetRequest.ResourceType?.XMLHTTPREQUEST ||
                  "xmlhttprequest",
              ],
            },
          });
        }
      }
    }
    console.log("dnrRules", dnrRules);
    // Retrieve and remove existing dynamic rules
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules.map((r: any) => r.id);

    // Update dynamic DNR rules
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules: dnrRules,
    });

    console.log(
      `[ReqCraft DNR] Successfully updated dynamic rules: ${dnrRules.length} rules active.`,
      dnrRules,
    );
  } catch (error) {
    console.error("[ReqCraft DNR] Failed to update dynamic rules:", error);
  }
}

/**
 * Remove all existing dynamic declarativeNetRequest rules.
 */
async function clearAllDynamicRules(): Promise<void> {
  try {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules.map((r: any) => r.id);
    if (removeRuleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds,
        addRules: [],
      });
    }
    console.log("[ReqCraft DNR] Cleared all dynamic rules.");
  } catch (error) {
    console.error("[ReqCraft DNR] Error clearing dynamic rules:", error);
  }
}

// 1. Initial rule sync on installation or update
chrome.runtime.onInstalled.addListener((details: any) => {
  console.log("[ReqCraft] Extension installed/updated:", details);
  updateDeclarativeNetRules();
});

// 2. Initial rule sync when browser starts up
chrome.runtime.onStartup?.addListener(() => {
  console.log("[ReqCraft] Extension startup detected.");
  updateDeclarativeNetRules();
});

// 3. Listen for changes in storage (real-time sync when user toggles or edits rules in Popup)
if (chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes: any, areaName: string) => {
    if (areaName === "local" && changes[STORAGE_KEY]) {
      console.log(
        "[ReqCraft DNR] Storage change detected, updating DNR rules...",
      );
      updateDeclarativeNetRules();
    }
  });
}

// 4. Initial execution on service worker activation
updateDeclarativeNetRules();
