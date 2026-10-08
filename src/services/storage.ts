import { StorageData, Profile, NetworkRule } from "../types";

const STORAGE_KEY = "mod_req_res_config";

export const INITIAL_PROFILES: Profile[] = [
  {
    id: "prof_dev_local",
    name: "Dev Local",
    isActive: true,
    rules: [
      {
        id: "rule_1",
        name: "Redirect API to Localhost",
        enabled: true,
        type: "redirect",
        matchType: "wildcard",
        urlMatch: "https://api.production.com/v1/*",
        redirectUrl: "http://localhost:8080/v1/",
      },
      {
        id: "rule_2",
        name: "Rewrite Base URL to Localhost",
        enabled: true,
        type: "rewrite",
        matchType: "regex",
        urlMatch: "https://api.production.com/v1/(.*)",
        rewriteSubstitution: "http://localhost:3001/$1",
      },
      {
        id: "rule_3",
        name: "Inject Headers",
        enabled: true,
        type: "modify_headers",
        matchType: "wildcard",
        urlMatch: "https://api.production.com/v1/*",
        headers: {
          request: [{ key: "X-Debug-Mode", value: "true", action: "set" }],
          response: [
            {
              key: "Access-Control-Allow-Methods",
              value: "GET,POST,PUT,DELETE,OPTIONS",
              action: "set",
            },
          ],
        },
      },
      {
        id: "rule_4",
        name: "Mock User Profile (200 OK)",
        enabled: true,
        type: "mock_response",
        matchType: "wildcard",
        urlMatch: "https://api.production.com/v1/users/me",
        mockResponse: {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Mock-Agent": "ReqCraft-MV3",
          },
          body: JSON.stringify(
            {
              id: "usr_882910",
              username: "erick.dev",
              role: "Staff Architect",
              email: "erick@engineering.internal",
              features: {
                betaAccess: true,
                fastSync: true,
                unlimitedQuotas: true,
              },
            },
            null,
            2,
          ),
        },
      },
      {
        id: "rule_5",
        name: "Override POST /checkout Payload",
        enabled: false,
        type: "mock_request",
        matchType: "wildcard",
        urlMatch: "https://api.production.com/v1/checkout/process",
        mockRequest: {
          method: "POST",
          body: JSON.stringify(
            {
              cartId: "test_cart_99182",
              couponCode: "DEV_VIP_100",
              dryRun: true,
            },
            null,
            2,
          ),
        },
      },
    ],
  },
  {
    id: "prof_staging_mock",
    name: "Staging Mock",
    isActive: false,
    rules: [
      {
        id: "rule_s1",
        name: "Simulate 500 Payment Gateway Timeout",
        enabled: true,
        type: "mock_response",
        matchType: "wildcard",
        urlMatch: "https://staging.api.com/v1/payments/charge",
        mockResponse: {
          statusCode: 500,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            { error: "Gateway Timeout", code: "BANK_TIMEOUT_504" },
            null,
            2,
          ),
        },
      },
    ],
  },
  {
    id: "prof_prod_debug",
    name: "Prod Debug",
    isActive: false,
    rules: [
      {
        id: "rule_p1",
        name: "Inject Datadog Tracing Headers",
        enabled: true,
        type: "modify_headers",
        matchType: "wildcard",
        urlMatch: "https://prod.service.io/*",
        headers: {
          request: [
            {
              key: "x-datadog-trace-id",
              value: "984029102830192",
              action: "set",
            },
            {
              key: "x-datadog-parent-id",
              value: "4729103940192",
              action: "set",
            },
          ],
        },
      },
    ],
  },
];

export const INITIAL_STORAGE: StorageData = {
  profiles: INITIAL_PROFILES,
  activeProfileId: "prof_dev_local",
  isGlobalEnabled: true,
  theme: "dark",
  showIndicator: true,
};

const isChromeStorageAvailable = (): boolean => {
  return typeof chrome !== "undefined" && !!chrome?.storage?.local;
};

export async function loadStorageData(): Promise<StorageData> {
  if (isChromeStorageAvailable()) {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      if (result && result[STORAGE_KEY]) {
        return result[STORAGE_KEY] as StorageData;
      }
    } catch (e) {
      console.warn(
        "Failed reading chrome.storage.local, falling back to localStorage",
        e,
      );
    }
  }

  // Fallback to localStorage for standard web browser dev
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as StorageData;
    }
  } catch (e) {
    console.error("Error reading localStorage", e);
  }

  // Save initial if empty
  await saveStorageData(INITIAL_STORAGE);
  return INITIAL_STORAGE;
}

export async function saveStorageData(data: StorageData): Promise<void> {
  if (isChromeStorageAvailable()) {
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: data });
    } catch (e) {
      console.warn("Failed saving to chrome.storage.local", e);
    }
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Error saving to localStorage", e);
  }
}

export function exportProfileToJson(profile: Profile): void {
  const exportData = {
    version: "1.0.0",
    exportedAt: new Date().toISOString(),
    profile: {
      name: profile.name,
      rules: profile.rules,
    },
  };

  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeName = profile.name.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  a.download = `reqcraft_${safeName}_rules.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseImportProfile(
  jsonContent: string,
): { name: string; rules: NetworkRule[] } | null {
  try {
    const parsed = JSON.parse(jsonContent);
    // Support direct Profile or wrapper format
    const candidate = parsed.profile || parsed;
    if (!candidate || !Array.isArray(candidate.rules)) {
      throw new Error("Invalid JSON format: missing rules array");
    }

    const rules: NetworkRule[] = candidate.rules.map((r: any, idx: number) => ({
      id: `rule_imp_${Date.now()}_${idx}`,
      name: r.name || `Imported Rule ${idx + 1}`,
      enabled: typeof r.enabled === "boolean" ? r.enabled : true,
      type: r.type || "redirect",
      urlMatch: r.urlMatch || "*",
      matchType: r.matchType || "wildcard",
      redirectUrl: r.redirectUrl,
      rewriteSubstitution: r.rewriteSubstitution,
      headers: r.headers,
      mockResponse: r.mockResponse,
      mockRequest: r.mockRequest,
    }));

    return {
      name: candidate.name || "Imported Profile",
      rules,
    };
  } catch (e) {
    console.error("Failed to parse imported JSON", e);
    return null;
  }
}
