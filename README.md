# ReqCraft — HTTP Request & Mock Tool (Manifest V3)

[![Manifest V3](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-4285F4?style=flat&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![React 18](https://img.shields.io/badge/React-18.x-61DAFB?style=flat&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Bundler-Vite-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**ReqCraft** is a high-performance, developer-first Chrome Extension designed to intercept, rewrite, redirect, and mock network requests and responses on the fly. Whether you are debugging microservices, pointing production web apps to your local development server, injecting authentication headers, or simulating API failure scenarios (404, 500), **ReqCraft** gives you complete control without changing a single line of backend code.

---

## 🚀 Key Features

### 1. 🔄 Re-write REST API Endpoints

- Dynamically substitute URL paths, domains, and route parameters.
- Point remote staging or production API calls directly to your local dev server (`http://localhost:3000`).
- Seamless capture group substitution (`$1`, `$2`, `$3`...) preserving nested endpoints and query strings.

### 2. 🔀 Redirect URLs

- Instantly redirect web assets, API calls, or scripts to alternate targets.
- Powered natively by **Chrome Declarative Net Request (DNR)** at the browser engine level for zero latency.

### 3. 🎭 Mock Responses

- Simulate API responses without server-side deployment or backend availability.
- Custom HTTP status codes: `200 OK`, `201 Created`, `400 Bad Request`, `404 Not Found`, `500 Internal Server Error`, etc.
- Custom response headers and formatted JSON / Plain text response bodies with built-in **JSON Prettifier**.

### 4. 📤 Mock Request Payloads (Modify Request Body)

- Intercept outgoing `fetch` and `XMLHttpRequest` calls and override the request body with custom JSON data.
- Filter and target specific HTTP methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`.

### 5. 🛡️ Modify Request & Response Headers

- **Set (Override)**: Overwrite existing headers with new values or inject custom headers.
- **Add (Append)**: Append multiple header values for standard multi-value headers.
- **Remove (Delete)**: Strip sensitive headers (e.g. `Cache-Control`, `Cookie`) from incoming or outgoing traffic.
- Built-in CORS bypass capabilities by modifying response headers.

### 6. 📁 Multi-Profile Management

- Create isolated rule collections for different environments (e.g., `Dev Local`, `Staging Mock`, `Prod Debug`).
- **One-click Global Switch & Profile Toggle**: Quickly pause or activate rules without deleting them.
- **Export & Import JSON**: Share rule profiles across your engineering team effortlessly.

---

## 🎯 Match Types Guide: Wildcard, Regex & Exact

**ReqCraft** provides 3 distinct matching strategies to target requests with surgical precision:

| Match Type     | Best Used For                                           | Pattern Syntax                         | Parameter Capture                               |
| :------------- | :------------------------------------------------------ | :------------------------------------- | :---------------------------------------------- |
| **`wildcard`** | Simple path/domain replacement & prefix matching        | Uses `*` to match any sequence         | Auto contact value following `*` to rewrite URL |
| **`regex`**    | Complex transformations, capture groups & validations   | Standard JavaScript Regular Expression | Supported (`$1`, `$2`, `$3`...)                 |
| **`exact`**    | Targeted single endpoint overrides without side effects | Exact character-by-character URL match | No substitution variables                       |

---

### A. Wildcard Pattern (`wildcard`)

Wildcards use the asterisk symbol `*` to represent any sequence of characters (including subdirectories and query parameters).

#### Example 1: Route entire remote API to Localhost

- **Scenario**: You want all requests to `https://api.production.com/v1/...` to redirect to your local backend running on port `3001`.
- **Match Type**: `wildcard`
- **URL Match Pattern**:
  ```text
  https://api.production.com/v1/*
  ```
- **Replacement / Destination**:
  ```text
  http://localhost:3001/
  ```
- **Result**:
  - Request to `https://api.production.com/v1/v1/auth/login`
  - ➔ Rewritten to `http://localhost:3001/v1/auth/login`

#### Example 2: Redirect all images to local CDN mock

- **Match Type**: `wildcard`
- **URL Match Pattern**:
  ```text
  https://production.assets.com/images/*
  ```
- **Replacement / Destination**:
  ```text
  https://staging.assets.com/images/
  ```

---

### B. Regular Expression Pattern (`regex`)

Regex patterns offer maximum flexibility with capture groups, character classes, and conditionals.

#### Example 1: Re-writing API Base URL with dynamic versioning

- **Scenario**: Capture both the API version (`v1`, `v2`) and the trailing endpoint path to proxy to localhost.
- **Match Type**: `regex`
- **URL Match Pattern**:
  ```text
  https://api.production.com/v1/(v\d+)/(.*)$
  ```
- **Replacement / Destination**:
  ```text
  http://localhost:3001/$1/$2
  ```
- **Result**:
  - `https://api.production.com/v1/v2/users/me?tab=billing`
  - ➔ `http://localhost:3001/v2/users/me?tab=billing`

#### Example 2: Re-routing specific media extensions to staging

- **Match Type**: `regex`
- **URL Match Pattern**:
  ```text
  ^https://static\.example\.com/assets/(.*)\.(png|jpg|webp)$
  ```
- **Replacement / Destination**:
  ```text
  https://cdn-staging.example.io/optimized/$1.$2
  ```

---

### C. Exact Match Pattern (`exact`)

Exact matching targets the literal URL character-by-character. It prevents accidental interception of sibling or parent routes.

#### Example 1: Mocking a single Authentication endpoint

- **Scenario**: Mock only the current user profile response without interfering with other `/users/...` endpoints.
- **Match Type**: `exact`
- **URL Match Pattern**:
  ```text
  https://api.production.com/v1/users/me
  ```
- **Mock Response**:
  - **Status**: `200 OK`
  - **Body**:
    ```json
    {
      "id": "usr_test_99",
      "name": "Alex Developer",
      "role": "SuperAdmin",
      "permissions": ["all"]
    }
    ```
- **Result**: Only exact calls to `https://api.production.com/v1/users/me` receive the mock. Requests like `https://api.production.com/v1/users/me/settings` will pass through normally.

---

## 🏗️ Architecture (Under the Hood)

ReqCraft leverages a dual-engine architecture to guarantee full compatibility with modern web applications:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CHROME BROWSER ENGINE                         │
│                                                                        │
│   ┌─────────────────────────────┐      ┌───────────────────────────┐   │
│   │     DeclarativeNetRequest   │      │        Page Window        │   │
│   │     (Browser-level DNR)     │      │       (MAIN World)        │   │
│   │                             │      │                           │   │
│   │  • High-performance URL     │      │  • window.fetch hook      │   │
│   │    redirection              │      │  • XMLHttpRequest hook    │   │
│   │  • Network header overrides │      │  • Request body mock      │   │
│   │  • Zero latency             │      │  • Response body mock     │   │
│   └──────────────▲──────────────┘      └─────────────▲─────────────┘   │
│                  │                                   │                 │
│                  │ updateDynamicRules()              │ postMessage     │
│   ┌──────────────┴──────────────┐      ┌─────────────┴─────────────┐   │
│   │      Background Worker      │      │       Content Script      │   │
│   │      (Service Worker)       │      │      (ISOLATED World)     │   │
│   └──────────────▲──────────────┘      └─────────────▲─────────────┘   │
│                  │                                   │                 │
│                  └───────────────┬───────────────────┘                 │
│                                  │                                     │
│                    ┌─────────────┴─────────────┐                       │
│                    │    chrome.storage.local   │                       │
│                    │    (Rule Configurations)  │                       │
│                    └─────────────▲─────────────┘                       │
│                                  │                                     │
│                    ┌─────────────┴─────────────┐                       │
│                    │         Popup UI          │                       │
│                    │  (React 18 + TypeScript)  │                       │
│                    └───────────────────────────┘                       │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Background Service Worker (`declarativeNetRequest`)**:
   - Executes dynamic network rules at the browser level before requests leave the machine.
   - Ideal for cross-origin URL redirections and HTTP header injections.

2. **MAIN World Injected Script (`injected.ts`)**:
   - Executes in the page's execution context at `document_start`.
   - Intercepts and transforms `window.fetch` and `XMLHttpRequest` in-memory.
   - Enables payload modification and client-side response mocking that DNR alone cannot handle.

3. **ISOLATED World Content Script (`content.ts`)**:
   - Bridges `chrome.storage.local` with the page context via secure `window.postMessage`.
   - Automatically synchronizes rule changes in real-time without requiring tab reloads.

---

## 🛠️ Installation & Local Development

### Prerequisites

- Node.js (v18.0.0 or higher)
- Yarn or npm

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/reqcraft.git
   cd reqcraft
   ```

2. Install dependencies:

   ```bash
   yarn install
   # or
   npm install
   ```

3. Start development server with live watch:

   ```bash
   yarn dev
   # or
   npm run dev
   ```

4. Build production bundle:

   ```bash
   yarn build
   # or
   npm run build
   ```

5. Load into Google Chrome:
   - Open Chrome and navigate to `chrome://extensions/`.
   - Enable **Developer mode** in the top right corner.
   - Click **Load unpacked** and select the `dist/` directory generated in your project root.

---

## 📦 Chrome Web Store Listing Information

> **Note for Extension Store Submission**: Use the copy below for the Chrome Web Store Developer Dashboard.

### Store Summary (Max 132 chars)

> Intercept, redirect, rewrite REST API endpoints, mock request/response bodies, and modify HTTP headers with ease.

### Store Detailed Description

```markdown
ReqCraft is an all-in-one network debugging and API simulation extension built for modern frontend developers, QA engineers, and backend teams.

KEY CAPABILITIES:
✓ Rewrite REST API URLs: Proxy staging and production requests to your local development environment (e.g. localhost:3000) with dynamic path parameters.
✓ Redirect Requests: Forward URLs using Wildcard and Regular Expressions.
✓ Mock Responses: Instantly return custom status codes (200, 404, 500) and mock JSON payloads without waiting for backend implementations.
✓ Override Request Payloads: Modify outgoing POST, PUT, and PATCH bodies on the fly.
✓ Header Customization: Set, append, or strip Request and Response headers to easily inject auth tokens or bypass CORS limits.
✓ Environment Profiles: Group and toggle rules across development, testing, and production workflows.
✓ JSON Export & Import: Back up and share rule sets across your entire team.

WHY DEVELOPERS CHOOSE REQCRAFT:
• Full Manifest V3 Compliance for superior security and lightning-fast performance.
• Dual-layer engine: Combines native DeclarativeNetRequest with page-level fetch/XHR hooks.
• Zero Page Reloads: Rule updates sync instantly to active browser tabs.
• Sleek UI with Dark Mode and Light Mode support.
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
