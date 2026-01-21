import { useState, useEffect } from 'react';
import ReactDiffViewer from 'react-diff-viewer-continued';

interface DiffViewerModalProps {
  projectName: string | null;
  filePath: string | null;
  onClose: () => void;
  onApprove: (filePath: string) => void;
  onReject: (filePath: string) => void;
}

export function DiffViewerModal({
  projectName,
  filePath,
  onClose,
  onApprove,
  onReject,
}: DiffViewerModalProps) {
  const [oldContent, setOldContent] = useState('');
  const [newContent, setNewContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectName || !filePath) {
      setLoading(false);
      return;
    }

    setLoading(true);
    window.commanddeck
      .getGitDiff(projectName, filePath)
      .then((result) => {
        if (result.ok) {
          setOldContent(result.oldContent || '');
          setNewContent(result.newContent || '');
        }
      })
      .catch((err) => {
        console.error('[DiffViewerModal] Failed to load diff:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [projectName, filePath]);

  if (!filePath) return null;

  const handleApprove = () => {
    onApprove(filePath);
    onClose();
  };

  const handleReject = () => {
    if (window.confirm(`Discard changes to ${filePath}? This cannot be undone.`)) {
      onReject(filePath);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-rim-panel border-2 border-rim-accent rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-rim-border">
          <div>
            <h2 className="font-bold text-lg">Code Review</h2>
            <p className="text-xs text-rim-muted font-mono">{filePath}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-rim-bg flex items-center justify-center text-rim-muted hover:text-white transition-colors"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Diff Viewer */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full text-rim-muted">
              Loading diff...
            </div>
          ) : (
            <ReactDiffViewer
              oldValue={oldContent}
              newValue={newContent}
              splitView={true}
              showDiffOnly={false}
              useDarkTheme={true}
              leftTitle="HEAD"
              rightTitle="Working Directory"
              styles={{
                variables: {
                  dark: {
                    diffViewerBackground: '#1a1a1a',
                    diffViewerColor: '#e0e0e0',
                    addedBackground: '#1a3a1a',
                    addedColor: '#7dff7d',
                    removedBackground: '#3a1a1a',
                    removedColor: '#ff7d7d',
                    wordAddedBackground: '#2a4a2a',
                    wordRemovedBackground: '#4a2a2a',
                    addedGutterBackground: '#1a3a1a',
                    removedGutterBackground: '#3a1a1a',
                    gutterBackground: '#242424',
                    gutterBackgroundDark: '#1a1a1a',
                    highlightBackground: '#333',
                    highlightGutterBackground: '#2a2a2a',
                  },
                },
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-rim-border flex justify-between">
          <button
            type="button"
            onClick={handleReject}
            className="btn bg-rim-error/20 text-rim-error hover:bg-rim-error hover:text-white border border-rim-error"
          >
            ✕ Reject Changes
          </button>

          <button
            type="button"
            onClick={handleApprove}
            className="btn bg-rim-success/20 text-rim-success hover:bg-rim-success hover:text-white border border-rim-success"
          >
            ✓ Approve & Stage
          </button>
        </div>
      </div>
    </div>
  );
}
