import React, { useState, useEffect } from 'react';
import { IconX, IconCheck } from './Icons';

interface ProfileModalProps {
  isOpen: boolean;
  mode: 'create' | 'rename';
  currentName?: string;
  onClose: () => void;
  onConfirm: (name: string) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  mode,
  currentName = '',
  onClose,
  onConfirm
}) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setName(currentName);
    setError('');
  }, [currentName, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a profile name!');
      return;
    }
    onConfirm(name.trim());
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-container modal-container-sm">
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-badge-mode">PROFILE</span>
            <h3>{mode === 'create' ? 'Create New Profile' : 'Rename Profile'}</h3>
          </div>
          <button type="button" className="btn-icon-close" onClick={onClose}>
            <IconX size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form-content">
          {error && <div className="alert-error"><span>{error}</span></div>}
          <div className="form-group">
            <label className="field-label">Profile Name</label>
            <input
              type="text"
              className="input-text"
              placeholder="e.g. Staging Mock, Local Dev, Production Bugfix..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <span className="field-hint">
              Each Profile maintains an isolated rule set suited for specific testing environments.
            </span>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-save">
              <IconCheck size={16} /> {mode === 'create' ? 'Create Profile' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
