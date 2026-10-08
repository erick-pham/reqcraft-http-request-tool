export interface IndicatorState {
  isGlobalEnabled: boolean;
  profileName: string;
  isProfileActive: boolean;
  activeRulesCount: number;
  showIndicator?: boolean;
}

const STORAGE_KEY = 'mod_req_res_config';
const DISMISSED_SESSION_KEY = '__reqcraft_indicator_dismissed__';
const MINIMIZED_SESSION_KEY = '__reqcraft_indicator_minimized__';
const WAS_ACTIVE_SESSION_KEY = '__reqcraft_indicator_was_active__';
const POSITION_SESSION_KEY = '__reqcraft_indicator_pos__';

let shadowRoot: ShadowRoot | null = null;
let hostElement: HTMLElement | null = null;
let currentState: IndicatorState = {
  isGlobalEnabled: true,
  profileName: 'Default',
  isProfileActive: true,
  activeRulesCount: 0,
  showIndicator: true
};

/**
 * Isolated styles inside Shadow DOM to guarantee zero interference with host website CSS.
 */
const INDICATOR_STYLES = `
  :host {
    all: initial;
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    user-select: none;
    -webkit-font-smoothing: antialiased;
    pointer-events: auto;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  .pill-container {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(15, 23, 42, 0.94);
    border: 1px solid rgba(56, 189, 248, 0.3);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    padding: 6px 12px 6px 10px;
    border-radius: 9999px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.65), 0 0 14px rgba(56, 189, 248, 0.18);
    color: #f8fafc;
    font-size: 11px;
    line-height: 1;
    cursor: grab;
    transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
    animation: rcSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .pill-container:active {
    cursor: grabbing;
  }

  .pill-container:hover {
    border-color: rgba(56, 189, 248, 0.6);
    box-shadow: 0 12px 30px -4px rgba(0, 0, 0, 0.75), 0 0 18px rgba(56, 189, 248, 0.28);
  }

  @keyframes rcSlideUp {
    from {
      opacity: 0;
      transform: translateY(12px) scale(0.96);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* Status Glowing Dot */
  .status-dot-wrap {
    position: relative;
    width: 9px;
    height: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }

  .status-dot.active {
    background: #10b981;
    box-shadow: 0 0 8px #10b981;
  }

  .status-dot.paused {
    background: #f59e0b;
    box-shadow: 0 0 8px #f59e0b;
  }

  .status-dot.disabled {
    background: #ef4444;
    box-shadow: 0 0 8px #ef4444;
  }

  .status-dot.active::after {
    content: '';
    position: absolute;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: rgba(16, 185, 129, 0.45);
    animation: rcPulse 2s infinite ease-out;
  }

  @keyframes rcPulse {
    0% { transform: scale(0.5); opacity: 1; }
    100% { transform: scale(1.6); opacity: 0; }
  }

  .brand-tag {
    font-weight: 700;
    color: #38bdf8;
    letter-spacing: 0.3px;
    cursor: default;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .pill-divider {
    width: 1px;
    height: 12px;
    background: rgba(255, 255, 255, 0.16);
  }

  .profile-label {
    max-width: 130px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #e2e8f0;
    font-weight: 600;
    font-size: 11px;
    cursor: default;
  }

  .rule-count-badge {
    background: rgba(56, 189, 248, 0.14);
    color: #38bdf8;
    border: 1px solid rgba(56, 189, 248, 0.32);
    padding: 2px 7px;
    border-radius: 9999px;
    font-size: 10px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-weight: 700;
    white-space: nowrap;
    letter-spacing: 0.2px;
  }

  .btn-quick-toggle {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.14);
    color: #cbd5e1;
    padding: 3px 8px;
    border-radius: 5px;
    font-size: 10px;
    font-weight: 600;
    cursor: pointer;
    line-height: 1.2;
    transition: all 0.15s ease;
  }

  .btn-quick-toggle:hover {
    background: rgba(255, 255, 255, 0.2);
    color: #ffffff;
    border-color: rgba(255, 255, 255, 0.25);
  }

  .btn-quick-toggle.resume {
    background: rgba(16, 185, 129, 0.18);
    color: #34d399;
    border-color: rgba(16, 185, 129, 0.4);
    box-shadow: 0 0 6px rgba(16, 185, 129, 0.2);
  }

  .btn-quick-toggle.resume:hover {
    background: rgba(16, 185, 129, 0.3);
    color: #6ee7b7;
  }

  .btn-action-icon {
    background: transparent;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    line-height: 1;
    transition: all 0.15s ease;
  }

  .btn-action-icon:hover {
    background: rgba(255, 255, 255, 0.14);
    color: #f8fafc;
  }

  /* Minimized Circular Badge Trigger */
  .minimized-trigger {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: rgba(15, 23, 42, 0.95);
    border: 1px solid rgba(56, 189, 248, 0.4);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.65), 0 0 12px rgba(56, 189, 248, 0.25);
    color: #38bdf8;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 800;
    cursor: pointer;
    position: relative;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    animation: rcSlideUp 0.25s ease-out;
  }

  .minimized-trigger:hover {
    transform: scale(1.1);
    border-color: #38bdf8;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.75), 0 0 16px rgba(56, 189, 248, 0.4);
  }

  .minimized-dot {
    position: absolute;
    top: 0px;
    right: 0px;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    border: 2px solid #0f172a;
  }

  .minimized-dot.active { background: #10b981; }
  .minimized-dot.paused { background: #f59e0b; }
  .minimized-dot.disabled { background: #ef4444; }
`;

/**
 * Toggle Active/Pause state of current profile directly from web page.
 */
async function toggleCurrentProfileActive(): Promise<void> {
  try {
    const res = await chrome.storage.local.get(STORAGE_KEY);
    const data = res?.[STORAGE_KEY];
    if (!data) return;

    let updatedGlobal = data.isGlobalEnabled;
    // If extension is globally off, turn it on
    if (data.isGlobalEnabled === false) {
      updatedGlobal = true;
    }

    const updatedProfiles = (data.profiles || []).map((p: any) => {
      if (p.id === data.activeProfileId) {
        return { ...p, isActive: !p.isActive };
      }
      return p;
    });

    await chrome.storage.local.set({
      [STORAGE_KEY]: {
        ...data,
        isGlobalEnabled: updatedGlobal,
        profiles: updatedProfiles
      }
    });
  } catch (err) {
    console.error('[ReqCraft] Failed to toggle profile from indicator:', err);
  }
}

/**
 * Handle smooth dragging for both pill and minimized trigger.
 */
function setupDrag(element: HTMLElement): void {
  let isDragging = false;
  let hasMoved = false;
  let startX = 0;
  let startY = 0;
  let initialLeft = 0;
  let initialTop = 0;

  const onMouseDown = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    // Do not initiate drag if clicking on interactive action buttons
    if (
      target.tagName === 'BUTTON' ||
      target.closest('button') ||
      target.classList.contains('btn-action-icon') ||
      target.classList.contains('btn-quick-toggle')
    ) {
      return;
    }

    isDragging = true;
    hasMoved = false;
    startX = e.clientX;
    startY = e.clientY;

    if (!hostElement) return;
    const rect = hostElement.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;

    e.preventDefault();
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging || !hostElement) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      hasMoved = true;
    }

    if (!hasMoved) return;

    const width = hostElement.offsetWidth || 150;
    const height = hostElement.offsetHeight || 36;
    const maxLeft = Math.max(8, window.innerWidth - width - 8);
    const maxTop = Math.max(8, window.innerHeight - height - 8);

    const newLeft = Math.max(8, Math.min(maxLeft, initialLeft + dx));
    const newTop = Math.max(8, Math.min(maxTop, initialTop + dy));

    hostElement.style.right = 'auto';
    hostElement.style.bottom = 'auto';
    hostElement.style.left = `${newLeft}px`;
    hostElement.style.top = `${newTop}px`;
  };

  const onMouseUp = () => {
    if (!isDragging) return;
    isDragging = false;

    if (hasMoved && hostElement) {
      const rect = hostElement.getBoundingClientRect();
      sessionStorage.setItem(
        POSITION_SESSION_KEY,
        JSON.stringify({ left: rect.left, top: rect.top })
      );
    }
  };

  element.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
}

/**
 * Apply saved position from sessionStorage if present.
 */
function applySavedPosition(): void {
  if (!hostElement) return;
  try {
    const saved = sessionStorage.getItem(POSITION_SESSION_KEY);
    if (saved) {
      const pos = JSON.parse(saved);
      if (typeof pos.left === 'number' && typeof pos.top === 'number') {
        const maxLeft = Math.max(8, window.innerWidth - 100);
        const maxTop = Math.max(8, window.innerHeight - 40);
        const left = Math.max(8, Math.min(maxLeft, pos.left));
        const top = Math.max(8, Math.min(maxTop, pos.top));

        hostElement.style.right = 'auto';
        hostElement.style.bottom = 'auto';
        hostElement.style.left = `${left}px`;
        hostElement.style.top = `${top}px`;
      }
    }
  } catch (e) {
    // ignore parse error
  }
}

/**
 * Render the Floating Indicator inside Shadow DOM.
 */
function renderIndicator(): void {
  if (!shadowRoot) return;

  // 1. If user disabled in popup settings
  if (currentState.showIndicator === false) {
    if (hostElement) hostElement.style.display = 'none';
    return;
  }

  // 2. If user dismissed for this tab session
  if (sessionStorage.getItem(DISMISSED_SESSION_KEY) === 'true') {
    if (hostElement) hostElement.style.display = 'none';
    return;
  }

  // 3. Check if active or was active
  const isCurrentlyActive =
    currentState.isGlobalEnabled && currentState.isProfileActive && currentState.activeRulesCount > 0;

  if (isCurrentlyActive) {
    sessionStorage.setItem(WAS_ACTIVE_SESSION_KEY, 'true');
  }

  const wasActiveInSession = sessionStorage.getItem(WAS_ACTIVE_SESSION_KEY) === 'true';

  // If never active in this session and currently inactive, stay hidden to avoid cluttering normal pages
  if (!isCurrentlyActive && !wasActiveInSession) {
    if (hostElement) hostElement.style.display = 'none';
    return;
  }

  if (hostElement) hostElement.style.display = 'block';
  applySavedPosition();

  const isMinimized = sessionStorage.getItem(MINIMIZED_SESSION_KEY) === 'true';

  let statusClass = 'active';
  let statusText = 'ReqCraft Active';

  if (!currentState.isGlobalEnabled) {
    statusClass = 'disabled';
    statusText = 'ReqCraft OFF';
  } else if (!currentState.isProfileActive) {
    statusClass = 'paused';
    statusText = 'Profile Paused';
  }

  // Minimized Circular Trigger View
  if (isMinimized) {
    shadowRoot.innerHTML = `
      <style>${INDICATOR_STYLES}</style>
      <div class="minimized-trigger" id="rc-expand-btn" title="ReqCraft: ${currentState.profileName} (${currentState.activeRulesCount} active) - Click to expand">
        RC
        <span class="minimized-dot ${statusClass}"></span>
      </div>
    `;

    const minElem = shadowRoot.getElementById('rc-expand-btn');
    if (minElem) {
      setupDrag(minElem);
      minElem.addEventListener('click', (e) => {
        // Only expand if not dragging
        sessionStorage.setItem(MINIMIZED_SESSION_KEY, 'false');
        renderIndicator();
      });
    }
    return;
  }

  // Full Floating Pill View
  const rulesCountText = `${currentState.activeRulesCount} ${currentState.activeRulesCount === 1 ? 'rule' : 'rules'}`;

  shadowRoot.innerHTML = `
    <style>${INDICATOR_STYLES}</style>
    <div class="pill-container" id="rc-pill-container" title="Drag to reposition anywhere">
      <div class="status-dot-wrap" title="${statusText}">
        <div class="status-dot ${statusClass}"></div>
      </div>
      <span class="brand-tag">ReqCraft</span>
      <span class="pill-divider"></span>
      <span class="profile-label" title="Active Profile: ${currentState.profileName}">
        ${currentState.profileName}
      </span>
      <span class="rule-count-badge" title="${rulesCountText} active">
        ${rulesCountText}
      </span>
      <button class="btn-quick-toggle ${currentState.isProfileActive && currentState.isGlobalEnabled ? '' : 'resume'}" id="rc-toggle-btn" title="${currentState.isProfileActive ? 'Pause active profile' : 'Resume profile'}">
        ${currentState.isProfileActive && currentState.isGlobalEnabled ? 'Pause' : 'Resume'}
      </button>
      <button class="btn-action-icon" id="rc-minimize-btn" title="Minimize to badge icon">
        _
      </button>
      <button class="btn-action-icon" id="rc-close-btn" title="Hide for this tab session">
        ✕
      </button>
    </div>
  `;

  const pillContainer = shadowRoot.getElementById('rc-pill-container');
  if (pillContainer) {
    setupDrag(pillContainer);
  }

  // Event Listeners
  shadowRoot.getElementById('rc-toggle-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleCurrentProfileActive();
  });

  shadowRoot.getElementById('rc-minimize-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    sessionStorage.setItem(MINIMIZED_SESSION_KEY, 'true');
    renderIndicator();
  });

  shadowRoot.getElementById('rc-close-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    sessionStorage.setItem(DISMISSED_SESSION_KEY, 'true');
    if (hostElement) hostElement.style.display = 'none';
  });
}

/**
 * Initialize Floating Status Pill and attach to document.
 */
export function initFloatingIndicator(): void {
  if (hostElement) return;

  hostElement = document.createElement('div');
  hostElement.id = 'reqcraft-floating-indicator-host';
  shadowRoot = hostElement.attachShadow({ mode: 'open' });

  const mount = () => {
    if (document.body && !document.body.contains(hostElement!)) {
      document.body.appendChild(hostElement!);
      renderIndicator();
    }
  };

  if (document.body) {
    mount();
  } else {
    // If running at document_start, attach as soon as body exists
    document.addEventListener('DOMContentLoaded', mount);
    const observer = new MutationObserver(() => {
      if (document.body) {
        observer.disconnect();
        mount();
      }
    });
    if (document.documentElement) {
      observer.observe(document.documentElement, { childList: true });
    }
  }
}

/**
 * Update the state of Floating Status Pill reactively.
 */
export function updateFloatingIndicator(state: Partial<IndicatorState>): void {
  currentState = { ...currentState, ...state };
  renderIndicator();
}
