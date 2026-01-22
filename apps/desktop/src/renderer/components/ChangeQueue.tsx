import clsx from 'clsx';
import type { GitChange } from '../hooks/useGitChanges';

interface ChangeQueueProps {
  projectName: string;
  changes: GitChange[];
  onViewDiff: (filePath: string, status: GitChange['status']) => void;
  onApproveAll: () => void;
  onRejectAll: () => void;
  onClose: () => void;
}

export function ChangeQueue({
  projectName,
  changes,
  onViewDiff,
  onApproveAll,
  onRejectAll,
  onClose,
}: ChangeQueueProps) {
  if (changes.length === 0) return null;

  return (
    <div className="border-t border-rim-border bg-rim-panel">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-rim-accent/10 border-b border-rim-accent">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm">CHANGES</span>
          <span className="text-xs text-rim-muted">({changes.length} pending in {projectName})</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onApproveAll}
            className="btn btn-sm bg-rim-success/20 text-rim-success hover:bg-rim-success hover:text-white text-xs px-2 py-1"
          >
            Approve All
          </button>
          <button
            type="button"
            onClick={onRejectAll}
            className="btn btn-sm bg-rim-error/20 text-rim-error hover:bg-rim-error hover:text-white text-xs px-2 py-1"
          >
            Reject All
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded hover:bg-rim-bg flex items-center justify-center text-rim-muted hover:text-white transition-colors"
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Change List */}
      <div className="max-h-48 overflow-y-auto">
        {changes.map((change) => (
          <div
            key={change.file}
            onClick={() => onViewDiff(change.file, change.status)}
            className="flex items-center justify-between px-4 py-2 hover:bg-rim-bg cursor-pointer border-b border-rim-border/50 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1">
              {/* File Icon */}
              <span className="text-lg">
                {change.status === 'added' ? '📄' : change.status === 'deleted' ? '🗑️' : '📝'}
              </span>
              
              {/* File Path */}
              <span className="text-sm font-mono flex-1">{change.file}</span>
              
              {/* Stats */}
              <div className="flex items-center gap-2 text-xs">
                {change.additions > 0 && (
                  <span className="text-rim-success">+{change.additions}</span>
                )}
                {change.deletions > 0 && (
                  <span className="text-rim-error">-{change.deletions}</span>
                )}
              </div>
              
              {/* Status Badge */}
              <span className={clsx(
                "text-xs px-2 py-0.5 rounded uppercase font-bold",
                change.status === 'added' && "bg-rim-success/20 text-rim-success",
                change.status === 'modified' && "bg-rim-accent/20 text-rim-accent",
                change.status === 'deleted' && "bg-rim-error/20 text-rim-error"
              )}>
                {change.status[0]}
              </span>
            </div>
            
            <button
              type="button"
              className="ml-4 btn btn-sm text-xs px-2 py-1"
            >
              View
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
