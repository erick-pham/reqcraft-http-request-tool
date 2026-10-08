import React, { useState, useEffect, useRef, useMemo } from 'react';
import './Popup.css';
import { NetworkRule, Profile, RuleType, StorageData } from '../types';
import {
  loadStorageData,
  saveStorageData,
  exportProfileToJson,
  parseImportProfile,
  INITIAL_STORAGE
} from '../services/storage';
import { RuleCard } from '../components/RuleCard';
import { RuleModal } from '../components/RuleModal';
import { ProfileModal } from '../components/ProfileModal';
import {
  IconBrand,
  IconPower,
  IconSun,
  IconMoon,
  IconPlus,
  IconDownload,
  IconUpload,
  IconEdit,
  IconTrash,
  IconSearch,
  IconCheck,
  IconChevronDown,
  IconRedirect,
  IconRewrite,
  IconHeaders,
  IconMockResponse,
  IconMockRequest
} from '../components/Icons';

export default function Popup() {
  const [data, setData] = useState<StorageData>(INITIAL_STORAGE);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isGlobalEnabled, setIsGlobalEnabled] = useState<boolean>(true);
  const [activeProfileId, setActiveProfileId] = useState<string>('prof_dev_local');

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<RuleType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');

  // Modal states
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<NetworkRule | null>(null);

  const [profileModalMode, setProfileModalMode] = useState<'create' | 'rename' | null>(null);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Hidden file input for Import
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Load state on mount
  useEffect(() => {
    loadStorageData().then((loaded) => {
      setData(loaded);
      setTheme(loaded.theme || 'dark');
      setIsGlobalEnabled(loaded.isGlobalEnabled ?? true);
      setActiveProfileId(loaded.activeProfileId || (loaded.profiles[0]?.id ?? ''));
    });
  }, []);

  // Update theme on document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Handle click outside profile dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Show toast utility
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Synchronize state and persist
  const updateAndSaveData = (updater: (prev: StorageData) => StorageData) => {
    setData((prev) => {
      const next = updater(prev);
      saveStorageData(next);
      return next;
    });
  };

  // Toggle Dark/Light Theme
  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    updateAndSaveData((prev) => ({ ...prev, theme: nextTheme }));
  };

  // Toggle Global Enable/Disable
  const handleToggleGlobal = () => {
    const nextVal = !isGlobalEnabled;
    setIsGlobalEnabled(nextVal);
    updateAndSaveData((prev) => ({ ...prev, isGlobalEnabled: nextVal }));
    showToast(nextVal ? 'Extension is ACTIVE' : 'Extension is PAUSED');
  };

  // Active Profile getter
  const activeProfile = useMemo(() => {
    return (
      data.profiles.find((p) => p.id === activeProfileId) ||
      data.profiles[0] || {
        id: 'default',
        name: 'Default Profile',
        isActive: true,
        rules: []
      }
    );
  }, [data.profiles, activeProfileId]);

  // Toggle Active Profile status
  const handleToggleProfileActive = () => {
    updateAndSaveData((prev) => {
      const updatedProfiles = prev.profiles.map((p) => {
        if (p.id === activeProfileId) {
          const nextActive = !p.isActive;
          showToast(nextActive ? `Profile "${p.name}" ENABLED` : `Profile "${p.name}" DISABLED`);
          return { ...p, isActive: nextActive };
        }
        return p;
      });
      return { ...prev, profiles: updatedProfiles };
    });
  };

  // Change Profile
  const handleSelectProfile = (id: string) => {
    setActiveProfileId(id);
    setIsProfileDropdownOpen(false);
    updateAndSaveData((prev) => ({ ...prev, activeProfileId: id }));
  };

  // Create Profile
  const handleCreateProfile = (name: string) => {
    const newProfile: Profile = {
      id: `prof_${Date.now()}`,
      name,
      isActive: true,
      rules: []
    };
    updateAndSaveData((prev) => ({
      ...prev,
      profiles: [...prev.profiles, newProfile],
      activeProfileId: newProfile.id
    }));
    setActiveProfileId(newProfile.id);
    showToast(`Profile "${name}" created`);
  };

  // Rename Profile
  const handleRenameProfile = (newName: string) => {
    updateAndSaveData((prev) => ({
      ...prev,
      profiles: prev.profiles.map((p) =>
        p.id === activeProfileId ? { ...p, name: newName } : p
      )
    }));
    showToast(`Profile renamed to "${newName}"`);
  };

  // Delete Profile
  const handleDeleteProfile = () => {
    if (data.profiles.length <= 1) {
      alert('Cannot delete the only remaining profile!');
      return;
    }
    const confirmed = window.confirm(
      `Are you sure you want to delete profile "${activeProfile.name}" and all of its rules?`
    );
    if (!confirmed) return;

    const remaining = data.profiles.filter((p) => p.id !== activeProfileId);
    const nextActive = remaining[0].id;
    updateAndSaveData((prev) => ({
      ...prev,
      profiles: remaining,
      activeProfileId: nextActive
    }));
    setActiveProfileId(nextActive);
    showToast(`Profile "${activeProfile.name}" deleted`);
  };

  // Export Profile
  const handleExportProfile = () => {
    exportProfileToJson(activeProfile);
    showToast(`Exported ${activeProfile.rules.length} rules to JSON file`);
  };

  // Trigger Import Profile
  const handleTriggerImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // File change handler for Import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const imported = parseImportProfile(content);
      if (!imported) {
        alert('Invalid JSON file format!');
        return;
      }

      // Merge imported rules into current profile
      updateAndSaveData((prev) => {
        const updated = prev.profiles.map((p) => {
          if (p.id === activeProfileId) {
            return {
              ...p,
              rules: [...p.rules, ...imported.rules]
            };
          }
          return p;
        });
        return { ...prev, profiles: updated };
      });

      showToast(`Successfully imported ${imported.rules.length} rules into current profile!`);
    };
    reader.readAsText(file);
  };

  // Rules CRUD: Toggle Rule
  const handleToggleRule = (ruleId: string, enabled: boolean) => {
    updateAndSaveData((prev) => ({
      ...prev,
      profiles: prev.profiles.map((p) => {
        if (p.id === activeProfileId) {
          return {
            ...p,
            rules: p.rules.map((r) => (r.id === ruleId ? { ...r, enabled } : r))
          };
        }
        return p;
      })
    }));
  };

  // Rules CRUD: Open Add Rule
  const handleOpenAddRule = () => {
    setEditingRule(null);
    setIsRuleModalOpen(true);
  };

  // Rules CRUD: Open Edit Rule
  const handleOpenEditRule = (rule: NetworkRule) => {
    setEditingRule(rule);
    setIsRuleModalOpen(true);
  };

  // Rules CRUD: Save (Create or Update) Rule
  const handleSaveRule = (savedRule: NetworkRule) => {
    updateAndSaveData((prev) => {
      const updatedProfiles = prev.profiles.map((p) => {
        if (p.id === activeProfileId) {
          const exists = p.rules.some((r) => r.id === savedRule.id);
          const newRules = exists
            ? p.rules.map((r) => (r.id === savedRule.id ? savedRule : r))
            : [savedRule, ...p.rules];
          return { ...p, rules: newRules };
        }
        return p;
      });
      return { ...prev, profiles: updatedProfiles };
    });
    showToast(editingRule ? 'Rule updated successfully!' : 'New rule created!');
  };

  // Rules CRUD: Duplicate Rule
  const handleDuplicateRule = (rule: NetworkRule) => {
    const duplicated: NetworkRule = {
      ...rule,
      id: `rule_${Date.now()}`,
      name: `${rule.name} (Copy)`,
      enabled: false // initially disabled for safety
    };

    updateAndSaveData((prev) => ({
      ...prev,
      profiles: prev.profiles.map((p) => {
        if (p.id === activeProfileId) {
          return {
            ...p,
            rules: [duplicated, ...p.rules]
          };
        }
        return p;
      })
    }));
    showToast(`Duplicated "${rule.name}"`);
  };

  // Rules CRUD: Delete Rule
  const handleDeleteRule = (ruleId: string) => {
    const targetRule = activeProfile.rules.find((r) => r.id === ruleId);
    const confirmed = window.confirm(
      `Are you sure you want to delete rule "${targetRule?.name || ruleId}"?`
    );
    if (!confirmed) return;

    updateAndSaveData((prev) => ({
      ...prev,
      profiles: prev.profiles.map((p) => {
        if (p.id === activeProfileId) {
          return {
            ...p,
            rules: p.rules.filter((r) => r.id !== ruleId)
          };
        }
        return p;
      })
    }));
    showToast('Rule deleted');
  };

  // Filtered Rules
  const filteredRules = useMemo(() => {
    return activeProfile.rules.filter((r) => {
      // Type filter
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;

      // Status filter
      if (statusFilter === 'enabled' && !r.enabled) return false;
      if (statusFilter === 'disabled' && r.enabled) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = r.name.toLowerCase().includes(query);
        const matchesPattern = r.urlMatch.toLowerCase().includes(query);
        const matchesType = r.type.toLowerCase().includes(query);
        return matchesName || matchesPattern || matchesType;
      }
      return true;
    });
  }, [activeProfile.rules, typeFilter, statusFilter, searchQuery]);

  const enabledRulesCount = useMemo(() => {
    return activeProfile.rules.filter((r) => r.enabled).length;
  }, [activeProfile.rules]);

  return (
    <div className={`popup-app-wrapper ${theme}`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="global-toast">
          <IconCheck size={14} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hidden File Input for Import */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".json"
        onChange={handleFileChange}
      />

      {/* Top Header */}
      <header className="popup-header">
        <div className="header-brand">
          <IconBrand size={22} className="brand-icon" />
          <div className="brand-text-block">
            <span className="brand-title">ModReq & Res</span>
            <span className="brand-badge-mv3">MV3</span>
          </div>
        </div>

        <div className="header-actions">
          {/* Global Extension Toggle */}
          <button
            type="button"
            className={`btn-global-power ${isGlobalEnabled ? 'power-on' : 'power-off'}`}
            onClick={handleToggleGlobal}
            title={isGlobalEnabled ? 'Extension is active (Click to pause)' : 'Extension is paused'}
          >
            <IconPower size={14} />
            <span className="power-text">{isGlobalEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            className="btn-theme-toggle"
            onClick={handleToggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <IconSun size={15} /> : <IconMoon size={15} />}
          </button>
        </div>
      </header>

      {/* Profile Bar */}
      <section className="profile-bar-section">
        <div className="profile-selector-group" ref={dropdownRef}>
          <span className="profile-label">Profile:</span>

          <div className="profile-dropdown-container">
            <button
              type="button"
              className="btn-profile-dropdown"
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            >
              <span className={`profile-status-dot ${activeProfile.isActive ? 'active' : 'inactive'}`} />
              <span className="profile-active-name">{activeProfile.name}</span>
              <span className="profile-rules-count font-mono">{activeProfile.rules.length} rules</span>
              <IconChevronDown size={14} className="dropdown-caret" />
            </button>

            {isProfileDropdownOpen && (
              <div className="dropdown-menu-profiles">
                <div className="dropdown-menu-header">PROFILES LIST</div>
                {data.profiles.map((p) => (
                  <div
                    key={p.id}
                    className={`dropdown-menu-item ${p.id === activeProfileId ? 'selected' : ''}`}
                    onClick={() => handleSelectProfile(p.id)}
                  >
                    <div className="item-profile-info">
                      <span className={`profile-status-dot ${p.isActive ? 'active' : 'inactive'}`} />
                      <span className="item-name">{p.name}</span>
                    </div>
                    <span className="item-count font-mono">{p.rules.length} rules</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Toggle Active Switch for Current Profile */}
          <button
            type="button"
            className={`btn-profile-toggle-active ${activeProfile.isActive ? 'is-active' : 'is-inactive'}`}
            onClick={handleToggleProfileActive}
            title="Toggle active status for this Profile"
          >
            <span className="toggle-indicator-dot" />
            <span>{activeProfile.isActive ? 'ACTIVE' : 'PAUSED'}</span>
          </button>
        </div>

        {/* Profile Action Buttons */}
        <div className="profile-buttons-group">
          <button
            type="button"
            className="btn-prof-action"
            onClick={() => setProfileModalMode('create')}
            title="Add new Profile"
          >
            <IconPlus size={13} />
            <span className="btn-text">Add</span>
          </button>

          <button
            type="button"
            className="btn-prof-action"
            onClick={() => setProfileModalMode('rename')}
            title="Rename current Profile"
          >
            <IconEdit size={13} />
            <span className="btn-text">Rename</span>
          </button>

          <button
            type="button"
            className="btn-prof-action"
            onClick={handleExportProfile}
            title="Export Profile to JSON file"
          >
            <IconDownload size={13} />
            <span className="btn-text">Export</span>
          </button>

          <button
            type="button"
            className="btn-prof-action"
            onClick={handleTriggerImport}
            title="Import Profile from JSON file"
          >
            <IconUpload size={13} />
            <span className="btn-text">Import</span>
          </button>

          <button
            type="button"
            className="btn-prof-action text-danger"
            onClick={handleDeleteProfile}
            title="Delete current Profile"
            disabled={data.profiles.length <= 1}
          >
            <IconTrash size={13} />
          </button>
        </div>
      </section>

      {/* Rules Controls & Filter Bar */}
      <section className="controls-bar-section">
        {/* Search Input */}
        <div className="search-input-box">
          <IconSearch size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Search by rule name, URL match pattern..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="btn-clear-search"
              onClick={() => setSearchQuery('')}
            >
              ×
            </button>
          )}
        </div>

        {/* Create Rule Primary Button */}
        <button
          type="button"
          className="btn-create-rule"
          onClick={handleOpenAddRule}
        >
          <IconPlus size={15} />
          <span>Create Rule</span>
        </button>
      </section>

      {/* Filter Chips Bar */}
      <section className="filter-chips-section">
        <div className="filter-chips-list">
          <button
            type="button"
            className={`chip-btn ${typeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setTypeFilter('all')}
          >
            All ({activeProfile.rules.length})
          </button>
          <button
            type="button"
            className={`chip-btn chip-redirect ${typeFilter === 'redirect' ? 'active' : ''}`}
            onClick={() => setTypeFilter('redirect')}
          >
            <IconRedirect size={12} /> Redirect
          </button>
          <button
            type="button"
            className={`chip-btn chip-rewrite ${typeFilter === 'rewrite' ? 'active' : ''}`}
            onClick={() => setTypeFilter('rewrite')}
          >
            <IconRewrite size={12} /> Rewrite
          </button>
          <button
            type="button"
            className={`chip-btn chip-headers ${typeFilter === 'modify_headers' ? 'active' : ''}`}
            onClick={() => setTypeFilter('modify_headers')}
          >
            <IconHeaders size={12} /> Headers
          </button>
          <button
            type="button"
            className={`chip-btn chip-mock-res ${typeFilter === 'mock_response' ? 'active' : ''}`}
            onClick={() => setTypeFilter('mock_response')}
          >
            <IconMockResponse size={12} /> Mock Res
          </button>
          <button
            type="button"
            className={`chip-btn chip-mock-req ${typeFilter === 'mock_request' ? 'active' : ''}`}
            onClick={() => setTypeFilter('mock_request')}
          >
            <IconMockRequest size={12} /> Mock Req
          </button>
        </div>

        {/* Quick Summary Pill */}
        <div className="rules-stat-badge font-mono">
          <span className="stat-active">{enabledRulesCount}</span>
          <span className="stat-divider">/</span>
          <span className="stat-total">{activeProfile.rules.length} active</span>
        </div>
      </section>

      {/* Main Rules Content View */}
      <main className="rules-scroll-area">
        {!isGlobalEnabled && (
          <div className="warning-banner-disabled">
            <span className="dot-warning" />
            <span>Extension is currently OFF. Network Rules will not be applied.</span>
          </div>
        )}

        {!activeProfile.isActive && isGlobalEnabled && (
          <div className="warning-banner-profile-disabled">
            <span className="dot-warning" />
            <span>Profile "{activeProfile.name}" is paused. Click ACTIVE to enable.</span>
          </div>
        )}

        {filteredRules.length > 0 ? (
          <div className="rules-cards-list">
            {filteredRules.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onToggle={handleToggleRule}
                onEdit={handleOpenEditRule}
                onDuplicate={handleDuplicateRule}
                onDelete={handleDeleteRule}
              />
            ))}
          </div>
        ) : (
          <div className="empty-rules-state">
            <div className="empty-icon-wrap">
              <IconBrand size={36} />
            </div>
            <h4>
              {searchQuery || typeFilter !== 'all'
                ? 'No matching rules found'
                : 'No network rules in this profile yet'}
            </h4>
            <p>
              {searchQuery || typeFilter !== 'all'
                ? 'Try a different search query or clear filter chips.'
                : 'Start redirecting URLs, rewriting paths, modifying headers, or mocking responses by creating your first rule.'}
            </p>
            <button
              type="button"
              className="btn-create-rule-empty"
              onClick={handleOpenAddRule}
            >
              <IconPlus size={15} /> Add First Rule
            </button>
          </div>
        )}
      </main>

      {/* Footer Info Bar */}
      <footer className="popup-footer">
        <span className="footer-tip">
          Tip: Supports Wildcard (*) and Regex capture groups ($1, $2).
        </span>
        <span className="footer-version font-mono">v1.0.0 • MV3 Engine</span>
      </footer>

      {/* Rule Form Modal */}
      <RuleModal
        isOpen={isRuleModalOpen}
        initialRule={editingRule}
        onClose={() => setIsRuleModalOpen(false)}
        onSave={handleSaveRule}
      />

      {/* Profile Name Modal */}
      <ProfileModal
        isOpen={profileModalMode !== null}
        mode={profileModalMode || 'create'}
        currentName={profileModalMode === 'rename' ? activeProfile.name : ''}
        onClose={() => setProfileModalMode(null)}
        onConfirm={(name) => {
          if (profileModalMode === 'create') {
            handleCreateProfile(name);
          } else {
            handleRenameProfile(name);
          }
        }}
      />
    </div>
  );
}
