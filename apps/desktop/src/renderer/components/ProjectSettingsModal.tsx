import { useEffect, useState } from 'react';
import type { Project } from '../stores/projectStore';

interface ProjectSettingsModalProps {
  project: Project | null;
  onClose: () => void;
  onSave: (updates: { name: string; domain: string | null }) => Promise<{ ok: boolean; reason?: string }>;
}

export function ProjectSettingsModal({ project, onClose, onSave }: ProjectSettingsModalProps) {
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!project) return;
    setName(project.name || '');
    setDomain(project.domain || '');
    setError(null);
  }, [project]);

  if (!project) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextName = name.trim();
    if (!nextName) {
      setError('Project name cannot be empty.');
      return;
    }
    setSaving(true);
    setError(null);
    const result = await onSave({
      name: nextName,
      domain: domain.trim() ? domain.trim() : null,
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
