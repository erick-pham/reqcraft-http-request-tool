import React, { useState, useEffect } from 'react';
import { NetworkRule, RuleType, HeaderItem } from '../types';
import {
  IconX,
  IconRedirect,
  IconRewrite,
  IconHeaders,
  IconMockResponse,
  IconMockRequest,
  IconPlus,
  IconTrash,
  IconCheck,
  IconSparkles,
  IconInfo
} from './Icons';

interface RuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rule: NetworkRule) => void;
  initialRule?: NetworkRule | null;
}

const RULE_TYPES: { type: RuleType; label: string; icon: React.ReactNode; color: string; desc: string }[] = [
  {
    type: 'redirect',
    label: 'Redirect URL',
    icon: <IconRedirect size={15} />,
    color: '#0284c7',
    desc: 'Redirect network requests from one URL pattern to another destination'
  },
  {
    type: 'rewrite',
    label: 'Re-write URL',
    icon: <IconRewrite size={15} />,
    color: '#9333ea',
    desc: 'Rewrite URL structure using Regex capture groups ($1, $2)'
  },
  {
    type: 'modify_headers',
    label: 'Modify Headers',
    icon: <IconHeaders size={15} />,
    color: '#ea580c',
    desc: 'Add, modify, or remove Request & Response Headers'
  },
  {
    type: 'mock_response',
    label: 'Mock Response',
    icon: <IconMockResponse size={15} />,
    color: '#16a34a',
    desc: 'Mock HTTP status code, headers, and response payload'
  },
  {
    type: 'mock_request',
    label: 'Mock Request',
    icon: <IconMockRequest size={15} />,
    color: '#db2777',
    desc: 'Intercept and override outgoing request payload (body)'
  }
];

const COMMON_STATUS_CODES = [200, 201, 204, 400, 401, 403, 404, 500, 502];
const COMMON_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

export const RuleModal: React.FC<RuleModalProps> = ({ isOpen, onClose, onSave, initialRule }) => {
  const [name, setName] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [type, setType] = useState<RuleType>('redirect');
  const [matchType, setMatchType] = useState<'wildcard' | 'regex' | 'exact'>('wildcard');
  const [urlMatch, setUrlMatch] = useState('');

  // Type specific states
  const [redirectUrl, setRedirectUrl] = useState('');
  const [rewriteSubstitution, setRewriteSubstitution] = useState('');

  // Headers
  const [headerTarget, setHeaderTarget] = useState<'request' | 'response'>('request');
  const [requestHeaders, setRequestHeaders] = useState<HeaderItem[]>([
    { key: '', value: '', action: 'set' }
  ]);
  const [responseHeaders, setResponseHeaders] = useState<HeaderItem[]>([
    { key: '', value: '', action: 'set' }
  ]);

  // Mock response
  const [statusCode, setStatusCode] = useState<number>(200);
  const [responseHeadersObj, setResponseHeadersObj] = useState<string>('{\n  "Content-Type": "application/json"\n}');
  const [responseBody, setResponseBody] = useState<string>('{\n  "status": "success",\n  "message": "Mocked response"\n}');

  // Mock request
  const [requestMethod, setRequestMethod] = useState('POST');
  const [requestBody, setRequestBody] = useState('{\n  "exampleKey": "customValue"\n}');

  // Form error & validation
  const [errorMessage, setErrorMessage] = useState('');
  const [jsonFormatStatus, setJsonFormatStatus] = useState<string | null>(null);

  // Initialize or reset form
  useEffect(() => {
    if (initialRule) {
      setName(initialRule.name);
      setEnabled(initialRule.enabled);
      setType(initialRule.type);
      setMatchType(initialRule.matchType || 'wildcard');
      setUrlMatch(initialRule.urlMatch || '');
      setRedirectUrl(initialRule.redirectUrl || '');
      setRewriteSubstitution(initialRule.rewriteSubstitution || '');

      setRequestHeaders(
        initialRule.headers?.request && initialRule.headers.request.length > 0
          ? initialRule.headers.request
          : [{ key: '', value: '', action: 'set' }]
      );
      setResponseHeaders(
        initialRule.headers?.response && initialRule.headers.response.length > 0
          ? initialRule.headers.response
          : [{ key: '', value: '', action: 'set' }]
      );

      if (initialRule.mockResponse) {
        setStatusCode(initialRule.mockResponse.statusCode || 200);
        setResponseHeadersObj(
          JSON.stringify(initialRule.mockResponse.headers || { 'Content-Type': 'application/json' }, null, 2)
        );
        setResponseBody(initialRule.mockResponse.body || '');
      } else {
        setStatusCode(200);
        setResponseHeadersObj('{\n  "Content-Type": "application/json"\n}');
        setResponseBody('{\n  "status": "success"\n}');
      }

      if (initialRule.mockRequest) {
        setRequestMethod(initialRule.mockRequest.method || 'POST');
        setRequestBody(initialRule.mockRequest.body || '');
      } else {
        setRequestMethod('POST');
        setRequestBody('{\n  "key": "value"\n}');
      }
    } else {
      // Default new rule
      setName('');
      setEnabled(true);
      setType('redirect');
      setMatchType('wildcard');
      setUrlMatch('');
      setRedirectUrl('');
      setRewriteSubstitution('');
      setRequestHeaders([{ key: '', value: '', action: 'set' }]);
      setResponseHeaders([{ key: '', value: '', action: 'set' }]);
      setStatusCode(200);
      setResponseHeadersObj('{\n  "Content-Type": "application/json"\n}');
      setResponseBody('{\n  "success": true,\n  "data": {}\n}');
      setRequestMethod('POST');
      setRequestBody('{\n  "key": "value"\n}');
    }
    setErrorMessage('');
    setJsonFormatStatus(null);
  }, [initialRule, isOpen]);

  if (!isOpen) return null;

  const handleAddHeaderItem = () => {
    if (headerTarget === 'request') {
      setRequestHeaders([...requestHeaders, { key: '', value: '', action: 'set' }]);
    } else {
      setResponseHeaders([...responseHeaders, { key: '', value: '', action: 'set' }]);
    }
  };

  const handleRemoveHeaderItem = (index: number) => {
    if (headerTarget === 'request') {
      setRequestHeaders(requestHeaders.filter((_, i) => i !== index));
    } else {
      setResponseHeaders(responseHeaders.filter((_, i) => i !== index));
    }
  };

  const handleUpdateHeaderItem = (
    index: number,
    field: keyof HeaderItem,
    val: string
  ) => {
    if (headerTarget === 'request') {
      const copy = [...requestHeaders];
      copy[index] = { ...copy[index], [field]: val };
      setRequestHeaders(copy);
    } else {
      const copy = [...responseHeaders];
      copy[index] = { ...copy[index], [field]: val };
      setResponseHeaders(copy);
    }
  };

  const handleFormatJson = (target: 'response' | 'request') => {
    try {
      if (target === 'response') {
        const parsed = JSON.parse(responseBody);
        setResponseBody(JSON.stringify(parsed, null, 2));
        setJsonFormatStatus('JSON formatted successfully!');
      } else {
        const parsed = JSON.parse(requestBody);
        setRequestBody(JSON.stringify(parsed, null, 2));
        setJsonFormatStatus('JSON formatted successfully!');
      }
      setTimeout(() => setJsonFormatStatus(null), 2000);
    } catch {
      setErrorMessage('Invalid JSON syntax: cannot format.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Please enter a Rule Name!');
      return;
    }
    if (!urlMatch.trim()) {
      setErrorMessage('Please enter a Target URL Pattern!');
      return;
    }

    if (type === 'redirect' && !redirectUrl.trim()) {
      setErrorMessage('Please enter the Destination URL to redirect to!');
      return;
    }

    if (type === 'rewrite' && !rewriteSubstitution.trim()) {
      setErrorMessage('Please enter the Substitution URL pattern!');
      return;
    }

    let parsedHeadersObj: Record<string, string> = {};
    if (type === 'mock_response') {
      try {
        if (responseHeadersObj.trim()) {
          parsedHeadersObj = JSON.parse(responseHeadersObj);
        }
      } catch {
        setErrorMessage('Response Headers must be valid JSON format!');
        return;
      }
    }

    const cleanedRequestHeaders = requestHeaders.filter((h) => h.key.trim() !== '');
    const cleanedResponseHeaders = responseHeaders.filter((h) => h.key.trim() !== '');

    const savedRule: NetworkRule = {
      id: initialRule ? initialRule.id : `rule_${Date.now()}`,
      name: name.trim(),
      enabled,
      type,
      urlMatch: urlMatch.trim(),
      matchType,
      redirectUrl: type === 'redirect' ? redirectUrl.trim() : undefined,
      rewriteSubstitution: type === 'rewrite' ? rewriteSubstitution.trim() : undefined,
      headers:
        type === 'modify_headers'
          ? {
              request: cleanedRequestHeaders,
              response: cleanedResponseHeaders
            }
          : undefined,
      mockResponse:
        type === 'mock_response'
          ? {
              statusCode: Number(statusCode) || 200,
              headers: parsedHeadersObj,
              body: responseBody
            }
          : undefined,
      mockRequest:
        type === 'mock_request'
          ? {
              method: requestMethod,
              body: requestBody
            }
          : undefined
    };

    onSave(savedRule);
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-container">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-badge-mode">
              {initialRule ? 'EDIT RULE' : 'CREATE RULE'}
            </span>
            <h3>{initialRule ? `Edit: ${initialRule.name}` : 'Create New Network Rule'}</h3>
          </div>
          <button type="button" className="btn-icon-close" onClick={onClose} title="Close">
            <IconX size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="modal-form-content">
          {errorMessage && (
            <div className="alert-error">
              <IconInfo size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {jsonFormatStatus && (
            <div className="alert-success">
              <IconCheck size={16} />
              <span>{jsonFormatStatus}</span>
            </div>
          )}

          {/* Section 1: Rule Type Selectors */}
          <div className="form-group-type-tabs">
            <label className="field-label">Select Rule Type:</label>
            <div className="rule-type-grid">
              {RULE_TYPES.map((t) => (
                <button
                  key={t.type}
                  type="button"
                  className={`type-card ${type === t.type ? 'active' : ''}`}
                  onClick={() => setType(t.type)}
                  style={
                    type === t.type
                      ? { borderColor: t.color, backgroundColor: `${t.color}15` }
                      : {}
                  }
                >
                  <div className="type-card-icon" style={{ color: t.color }}>
                    {t.icon}
                  </div>
                  <div className="type-card-info">
                    <span className="type-card-title">{t.label}</span>
                    <span className="type-card-desc">{t.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: General Info */}
          <div className="form-row-two-cols">
            <div className="form-col flex-2">
              <label className="field-label">
                Rule Name <span className="req">*</span>
              </label>
              <input
                type="text"
                className="input-text"
                placeholder="e.g. Redirect Staging API to Localhost..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="form-col flex-1">
              <label className="field-label">Status</label>
              <div className="status-toggle-wrapper">
                <button
                  type="button"
                  className={`toggle-switch-pill ${enabled ? 'on' : 'off'}`}
                  onClick={() => setEnabled(!enabled)}
                >
                  <span className="toggle-thumb" />
                  <span className="toggle-label-text">{enabled ? 'ENABLED' : 'DISABLED'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: URL Match Configuration */}
          <div className="form-group url-match-box">
            <div className="url-match-header">
              <label className="field-label">
                Target URL Pattern <span className="req">*</span>
              </label>
              <div className="match-type-segmented">
                {(['wildcard', 'regex', 'exact'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`btn-segment ${matchType === m ? 'active' : ''}`}
                    onClick={() => setMatchType(m)}
                  >
                    {m.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="text"
              className="input-text font-mono"
              placeholder={
                matchType === 'wildcard'
                  ? 'https://api.domain.com/v1/*'
                  : matchType === 'regex'
                  ? '^https://api\\.domain\\.com/v1/(.*)$'
                  : 'https://api.domain.com/v1/users/profile'
              }
              value={urlMatch}
              onChange={(e) => setUrlMatch(e.target.value)}
            />
            <span className="field-hint">
              {matchType === 'wildcard' && 'Wildcard (*) matches any character sequence. Fast glob matching.'}
              {matchType === 'regex' && 'Standard Regular Expression with capture groups ($1, $2).'}
              {matchType === 'exact' && 'Exact match against every character of the target request URL.'}
            </span>
          </div>

          {/* Section 4: Type-specific Form Controls */}
          <div className="rule-specific-container">
            {/* TYPE 1: REDIRECT URL */}
            {type === 'redirect' && (
              <div className="form-group">
                <label className="field-label">
                  Destination URL <span className="req">*</span>
                </label>
                <input
                  type="text"
                  className="input-text font-mono"
                  placeholder="http://localhost:8080/v1/$1"
                  value={redirectUrl}
                  onChange={(e) => setRedirectUrl(e.target.value)}
                />
                <span className="field-hint">
                  Supports $1, $2 variables corresponding to wildcards or regex capture groups.
                </span>
              </div>
            )}

            {/* TYPE 2: REWRITE URL */}
            {type === 'rewrite' && (
              <div className="form-group">
                <label className="field-label">
                  Replacement / Substitution Pattern <span className="req">*</span>
                </label>
                <input
                  type="text"
                  className="input-text font-mono"
                  placeholder="https://cdn-staging.service.io/$1/$2"
                  value={rewriteSubstitution}
                  onChange={(e) => setRewriteSubstitution(e.target.value)}
                />
                <span className="field-hint">
                  Substitute regex capture groups from URL pattern using $1, $2, $3... syntax.
                </span>
              </div>
            )}

            {/* TYPE 3: MODIFY HEADERS */}
            {type === 'modify_headers' && (
              <div className="headers-editor-box">
                <div className="headers-subtabs">
                  <button
                    type="button"
                    className={`subtab-btn ${headerTarget === 'request' ? 'active' : ''}`}
                    onClick={() => setHeaderTarget('request')}
                  >
                    Request Headers ({requestHeaders.filter((h) => h.key).length})
                  </button>
                  <button
                    type="button"
                    className={`subtab-btn ${headerTarget === 'response' ? 'active' : ''}`}
                    onClick={() => setHeaderTarget('response')}
                  >
                    Response Headers ({responseHeaders.filter((h) => h.key).length})
                  </button>
                </div>

                <div className="headers-table">
                  <div className="headers-header-row">
                    <span className="col-act">ACTION</span>
                    <span className="col-key">HEADER NAME</span>
                    <span className="col-val">HEADER VALUE</span>
                    <span className="col-del"></span>
                  </div>

                  {(headerTarget === 'request' ? requestHeaders : responseHeaders).map(
                    (item, idx) => (
                      <div key={idx} className="header-item-row">
                        <select
                          className="select-action"
                          value={item.action}
                          onChange={(e) =>
                            handleUpdateHeaderItem(idx, 'action', e.target.value)
                          }
                        >
                          <option value="set">Set (Override)</option>
                          <option value="add">Add (Append)</option>
                          <option value="remove">Remove (Delete)</option>
                        </select>
                        <input
                          type="text"
                          className="input-header font-mono"
                          placeholder="Header-Name (e.g. Authorization)"
                          value={item.key}
                          onChange={(e) =>
                            handleUpdateHeaderItem(idx, 'key', e.target.value)
                          }
                        />
                        <input
                          type="text"
                          className="input-header font-mono"
                          placeholder={
                            item.action === 'remove'
                              ? '(Ignored on remove)'
                              : 'Header Value (e.g. Bearer token...)'
                          }
                          disabled={item.action === 'remove'}
                          value={item.value}
                          onChange={(e) =>
                            handleUpdateHeaderItem(idx, 'value', e.target.value)
                          }
                        />
                        <button
                          type="button"
                          className="btn-trash-row"
                          onClick={() => handleRemoveHeaderItem(idx)}
                          title="Remove header"
                        >
                          <IconTrash size={14} />
                        </button>
                      </div>
                    )
                  )}
                </div>

                <button
                  type="button"
                  className="btn-add-header"
                  onClick={handleAddHeaderItem}
                >
                  <IconPlus size={14} /> Add Header Key-Value Pair
                </button>
              </div>
            )}

            {/* TYPE 4: MOCK RESPONSE */}
            {type === 'mock_response' && (
              <div className="mock-response-box">
                <div className="form-group">
                  <label className="field-label">HTTP Status Code</label>
                  <div className="status-code-selector">
                    <input
                      type="number"
                      className="input-status font-mono"
                      value={statusCode}
                      onChange={(e) => setStatusCode(parseInt(e.target.value) || 200)}
                    />
                    <div className="popular-status-pills">
                      {COMMON_STATUS_CODES.map((code) => (
                        <button
                          key={code}
                          type="button"
                          className={`pill-status ${statusCode === code ? 'active' : ''} status-${String(code)[0]}xx`}
                          onClick={() => setStatusCode(code)}
                        >
                          {code}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="field-label">Response Headers (JSON Object)</label>
                  <textarea
                    rows={3}
                    className="textarea-code font-mono"
                    value={responseHeadersObj}
                    onChange={(e) => setResponseHeadersObj(e.target.value)}
                    placeholder='{"Content-Type": "application/json"}'
                  />
                </div>

                <div className="form-group">
                  <div className="code-editor-header">
                    <label className="field-label">Response Body (JSON / Plain text)</label>
                    <button
                      type="button"
                      className="btn-format-json"
                      onClick={() => handleFormatJson('response')}
                    >
                      <IconSparkles size={13} /> Prettify JSON
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    className="textarea-code font-mono"
                    value={responseBody}
                    onChange={(e) => setResponseBody(e.target.value)}
                    placeholder="Enter JSON or plain text body..."
                  />
                </div>
              </div>
            )}

            {/* TYPE 5: MOCK REQUEST (MODIFY REQUEST BODY) */}
            {type === 'mock_request' && (
              <div className="mock-request-box">
                <div className="form-group">
                  <label className="field-label">HTTP Method Filter</label>
                  <div className="methods-segmented">
                    {COMMON_METHODS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={`method-segment-btn ${requestMethod === m ? 'active' : ''}`}
                        onClick={() => setRequestMethod(m)}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <div className="code-editor-header">
                    <label className="field-label">Override Request Body (JSON Data)</label>
                    <button
                      type="button"
                      className="btn-format-json"
                      onClick={() => handleFormatJson('request')}
                    >
                      <IconSparkles size={13} /> Prettify JSON
                    </button>
                  </div>
                  <textarea
                    rows={7}
                    className="textarea-code font-mono"
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    placeholder="Enter JSON request payload to inject..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-save">
              <IconCheck size={16} /> Save Rule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
