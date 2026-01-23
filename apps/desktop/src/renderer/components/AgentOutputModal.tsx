import clsx from 'clsx';
import type { Agent } from '../stores/agentStore';

interface AgentOutputModalProps {
  agent: Agent | null;
  logs: string[];
  onClose: () => void;
}

export function AgentOutputModal({ agent, logs, onClose }: AgentOutputModalProps) {
  if (!agent) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-rim-panel border-2 border-rim-accent rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-rim-border">
          <div className="flex items-center gap-3">
            {/* Agent Avatar */}
            <div className={clsx(
              "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold border-2",
              agent.status === 'working' ? 'bg-rim-accent border-rim-success' :
              agent.status === 'error' ? 'bg-rim-error border-rim-error' :
              'bg-rim-panel border-rim-muted'
            )}>
              {agent.name.charAt(0)}
            </div>
            
            <div>
              <h2 className="font-bold text-lg">{agent.name} Output</h2>
              <p className="text-xs text-rim-muted">Project: {agent.project}</p>
            </div>
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

        {/* Metadata */}
        <div className="px-4 py-2 bg-rim-bg/50 border-b border-rim-border text-xs flex gap-4">
          <div>
            <span className="text-rim-muted">Started:</span>{' '}
            <span>{new Date(agent.startedAt).toLocaleTimeString()}</span>
          </div>
          <div>
            <span className="text-rim-muted">Desk:</span>{' '}
            <span>#{agent.deskIndex + 1}</span>
          </div>
          <div>
            <span className="text-rim-muted">PID:</span>{' '}
            <span>{agent.pid}</span>
          </div>
        </div>

        {/* Output Logs */}
        <div className="flex-1 overflow-auto p-4 bg-black/30 font-mono text-xs">
          {logs.length > 0 ? (
            <div className="space-y-1">
              {logs.map((line, idx) => (
                <div key={idx} className="text-rim-text/80">
                  {line}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-rim-muted py-8">
              No output logs available
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-rim-border flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn bg-rim-bg border border-rim-border hover:bg-rim-panel"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
