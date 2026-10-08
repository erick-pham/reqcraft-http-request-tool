export type RuleType = 'redirect' | 'rewrite' | 'modify_headers' | 'mock_response' | 'mock_request';

export interface HeaderItem {
  id?: string;
  key: string;
  value: string;
  action: 'set' | 'add' | 'remove';
}

export interface NetworkRule {
  id: string;
  name: string;
  enabled: boolean;
  type: RuleType;
  urlMatch: string; // Wildcard or Regex or Exact
  matchType: 'wildcard' | 'regex' | 'exact';
  
  // Type-specific fields:
  redirectUrl?: string;
  rewriteSubstitution?: string;
  headers?: {
    request?: HeaderItem[];
    response?: HeaderItem[];
  };
  mockResponse?: {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
  };
  mockRequest?: {
    method: string;
    body: string;
  };
}

export interface Profile {
  id: string;
  name: string;
  isActive: boolean;
  rules: NetworkRule[];
}

export interface StorageData {
  profiles: Profile[];
  activeProfileId: string;
  isGlobalEnabled: boolean;
  theme: 'dark' | 'light';
}
