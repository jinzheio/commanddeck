import { useEffect, useState } from 'react';
import type { Project } from '../stores/projectStore';

interface ProjectSettingsModalProps {
  project: Project | null;
  onClose: () => void;
  onSave: (updates: {
    name: string;
    domain: string | null;
    icon?: { type: 'emoji'; value: string } | { type: 'image'; value: string } | null;
  }) => Promise<{ ok: boolean; reason?: string }>;
}

export function ProjectSettingsModal({ project, onClose, onSave }: ProjectSettingsModalProps) {
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [iconType, setIconType] = useState<'none' | 'emoji' | 'image'>('none');
  const [iconEmoji, setIconEmoji] = useState('');
  const [iconImage, setIconImage] = useState('');
  const [iconImageName, setIconImageName] = useState('');
  const [iconError, setIconError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!project) return;
    setName(project.name || '');
    setDomain(project.domain || '');
    if (project.icon?.type === 'emoji') {
      setIconType('emoji');
      setIconEmoji(project.icon.value || '');
      setIconImage('');
      setIconImageName('');
    } else if (project.icon?.type === 'image') {
      setIconType('image');
      setIconEmoji('');
      setIconImage(project.icon.value || '');
      setIconImageName('custom image');
    } else {
      setIconType('none');
      setIconEmoji('');
      setIconImage('');
      setIconImageName('');
    }
    setError(null);
    setIconError(null);
  }, [project]);

  if (!project) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextName = name.trim();
    if (!nextName) {
      setError('Project name cannot be empty.');
      return;
    }
    let nextIcon: { type: 'emoji'; value: string } | { type: 'image'; value: string } | null = null;
    if (iconType === 'emoji' && iconEmoji.trim()) {
      nextIcon = { type: 'emoji', value: iconEmoji.trim() };
    } else if (iconType === 'image' && iconImage) {
      nextIcon = { type: 'image', value: iconImage };
    }
    setSaving(true);
    setError(null);
    const result = await onSave({
      name: nextName,
      domain: domain.trim() ? domain.trim() : null,
      icon: nextIcon,
    });
    setSaving(false);
    if (result.ok) {
      onClose();
      return;
    }
    if (result.reason === 'duplicate') {
      setError('Project name already exists.');
      return;
    }
    setError(result.reason || 'Failed to update project.');
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setIconError('Please choose an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setIconImage(String(reader.result || ''));
      setIconImageName(file.name);
      setIconType('image');
      setIconError(null);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-rim-panel border-2 border-rim-accent rounded-lg shadow-2xl w-full max-w-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-rim-border">
          <h2 className="font-bold text-lg">Project Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-rim-bg flex items-center justify-center text-rim-muted hover:text-white transition-colors"
            title="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <label className="block text-xs uppercase tracking-wider text-rim-muted">
            Name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full bg-rim-bg border border-rim-border px-3 py-2 text-sm focus:border-rim-accent outline-none"
              autoFocus
            />
          </label>

          <label className="block text-xs uppercase tracking-wider text-rim-muted">
            Domain
            <input
              type="text"
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              placeholder="example.com"
              className="mt-2 w-full bg-rim-bg border border-rim-border px-3 py-2 text-sm focus:border-rim-accent outline-none"
            />
          </label>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs uppercase tracking-wider text-rim-muted">
              <span>Icon</span>
              <button
                type="button"
                onClick={() => {
                  setIconType('none');
                  setIconEmoji('');
                  setIconImage('');
                  setIconImageName('');
                  setIconError(null);
                }}
                className="text-[10px] text-rim-muted hover:text-white transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIconType('emoji');
                  setIconError(null);
                }}
                className={`px-2 py-1 text-[11px] border rounded ${iconType === 'emoji' ? 'border-rim-accent text-rim-accent' : 'border-rim-border text-rim-muted'}`}
              >
                Letters
              </button>
              <button
                type="button"
                onClick={() => {
                  setIconType('image');
                  setIconError(null);
                }}
                className={`px-2 py-1 text-[11px] border rounded ${iconType === 'image' ? 'border-rim-accent text-rim-accent' : 'border-rim-border text-rim-muted'}`}
              >
                Image
              </button>
              {iconType === 'emoji' && (
                <input
                  type="text"
                  value={iconEmoji}
                  onChange={(event) => setIconEmoji(event.target.value)}
                  placeholder="ABC or ✨"
                  className="flex-1 bg-rim-bg border border-rim-border px-3 py-2 text-sm focus:border-rim-accent outline-none"
                />
              )}
              {iconType === 'image' && (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="text-[11px] text-rim-muted"
                  />
                  {iconImage && (
                    <div className="w-8 h-8 rounded overflow-hidden border border-rim-border bg-rim-bg">
                      <img src={iconImage} alt="Icon preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              )}
            </div>
            {iconType === 'image' && iconImageName && (
              <div className="text-[10px] text-rim-muted">Selected: {iconImageName}</div>
            )}
            {iconError && (
              <div className="text-xs text-rim-error">{iconError}</div>
            )}
          </div>

          <label className="block text-xs uppercase tracking-wider text-rim-muted">
            Path
            <input
              type="text"
              value={project.path || ''}
              readOnly
              className="mt-2 w-full bg-rim-bg border border-rim-border px-3 py-2 text-sm text-rim-muted"
            />
          </label>

          {error && (
            <div className="text-xs text-rim-error">{error}</div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn bg-rim-bg border border-rim-border hover:bg-rim-panel"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary disabled:opacity-50"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
