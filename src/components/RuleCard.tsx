import React from 'react';
import { NetworkRule, RuleType } from '../types';
import {
  IconRedirect,
  IconRewrite,
  IconHeaders,
  IconMockResponse,
  IconMockRequest,
  IconEdit,
  IconCopy,
  IconTrash
} from './Icons';

interface RuleCardProps {
  rule: NetworkRule;
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (rule: NetworkRule) => void;
  onDuplicate: (rule: NetworkRule) => void;
  onDelete: (id: string) => void;
}

const TYPE_CONFIG: Record<
  RuleType,
  { label: string; icon: React.ReactNode; bgClass: string; textClass: string; badgeText: string }
> = {
  redirect: {
    label: 'Redirect',
    icon: <IconRedirect size={14} />,
    bgClass: 'badge-redirect',
    textClass: 'type-redirect',
    badgeText: 'REDIRECT'
  },
  rewrite: {
    label: 'Re-write',
    icon: <IconRewrite size={14} />,
    bgClass: 'badge-rewrite',
    textClass: 'type-rewrite',
    badgeText: 'REWRITE'
  },
  modify_headers: {
    label: 'Headers',
    icon: <IconHeaders size={14} />,
    bgClass: 'badge-headers',
    textClass: 'type-headers',
    badgeText: 'HEADERS'
  },
  mock_response: {
    label: 'Mock Response',
    icon: <IconMockResponse size={14} />,
    bgClass: 'badge-mock-res',
    textClass: 'type-mock-res',
    badgeText: 'MOCK RES'
  },
  mock_request: {
    label: 'Mock Request',
    icon: <IconMockRequest size={14} />,
    bgClass: 'badge-mock-req',
    textClass: 'type-mock-req',
    badgeText: 'MOCK REQ'
  }
};

export const RuleCard: React.FC<RuleCardProps> = ({
  rule,
  onToggle,
  onEdit,
  onDuplicate,
  onDelete
}) => {
  const config = TYPE_CONFIG[rule.type] || TYPE_CONFIG.redirect;

  // Render quick summary text based on rule type
  const renderDetailSummary = () => {
    switch (rule.type) {
      case 'redirect':
        return (
          <div className="rule-summary-line">
            <span className="summary-label">Target:</span>
            <span className="summary-value font-mono">{rule.redirectUrl || 'N/A'}</span>
          </div>
        );
      case 'rewrite':
        return (
          <div className="rule-summary-line">
            <span className="summary-label">Replace:</span>
            <span className="summary-value font-mono">{rule.rewriteSubstitution || 'N/A'}</span>
          </div>
        );
      case 'modify_headers': {
        const reqCount = rule.headers?.request?.length || 0;
        const resCount = rule.headers?.response?.length || 0;
        return (
          <div className="rule-summary-line">
            <span className="summary-label">Headers:</span>
            <span className="summary-value">
              {reqCount > 0 && <span className="header-count-pill">{reqCount} Request</span>}
              {resCount > 0 && <span className="header-count-pill">{resCount} Response</span>}
              {reqCount === 0 && resCount === 0 && 'No headers'}
            </span>
          </div>
        );
      }
      case 'mock_response':
        return (
          <div className="rule-summary-line">
            <span className="summary-label">Mock HTTP:</span>
            <span className={`status-code-tag status-${String(rule.mockResponse?.statusCode || 200)[0]}xx`}>
              {rule.mockResponse?.statusCode || 200}
            </span>
            <span className="summary-sub">
              {rule.mockResponse?.body ? `${rule.mockResponse.body.slice(0, 45)}...` : 'Empty body'}
            </span>
          </div>
        );
      case 'mock_request':
        return (
          <div className="rule-summary-line">
            <span className="summary-label">Method:</span>
            <span className="method-tag">{rule.mockRequest?.method || 'POST'}</span>
            <span className="summary-sub">
              {rule.mockRequest?.body ? `${rule.mockRequest.body.slice(0, 45)}...` : 'Body override'}
            </span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`rule-item-card ${rule.enabled ? 'is-enabled' : 'is-disabled'}`}>
      {/* Col 1: Switch Toggle */}
      <div className="rule-card-toggle">
        <label className="toggle-switch-sm" title={rule.enabled ? 'Disable rule' : 'Enable rule'}>
          <input
            type="checkbox"
            checked={rule.enabled}
            onChange={(e) => onToggle(rule.id, e.target.checked)}
          />
          <span className="slider" />
        </label>
      </div>

      {/* Col 2: Main Info */}
      <div className="rule-card-content" onClick={() => onEdit(rule)}>
        <div className="rule-card-row-top">
          {/* Badge type */}
          <span className={`type-badge ${config.bgClass}`}>
            {config.icon}
            <span>{config.badgeText}</span>
          </span>

          {/* Match type badge */}
          <span className="match-type-pill font-mono">{rule.matchType}</span>

          {/* Rule Name */}
          <h4 className="rule-name" title={rule.name}>
            {rule.name}
          </h4>
        </div>

        {/* Pattern & URL */}
        <div className="rule-pattern-line">
          <span className="pattern-arrow">↳</span>
          <span className="pattern-url font-mono" title={rule.urlMatch}>
            {rule.urlMatch}
          </span>
        </div>

        {/* Details snippet */}
        {renderDetailSummary()}
      </div>

      {/* Col 3: Action Buttons */}
      <div className="rule-card-actions">
        <button
          type="button"
          className="btn-action edit"
          onClick={() => onEdit(rule)}
          title="Edit Rule"
        >
          <IconEdit size={14} />
        </button>
        <button
          type="button"
          className="btn-action duplicate"
          onClick={() => onDuplicate(rule)}
          title="Duplicate Rule"
        >
          <IconCopy size={14} />
        </button>
        <button
          type="button"
          className="btn-action delete"
          onClick={() => onDelete(rule.id)}
          title="Delete Rule"
        >
          <IconTrash size={14} />
        </button>
      </div>
    </div>
  );
};
