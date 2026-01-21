import { useState, useEffect } from 'react';
import { useProjects } from './hooks/useProjects';
import { useAgents } from './hooks/useAgents';
import { useGitChanges } from './hooks/useGitChanges';
import { useWebSocket } from './hooks/useWebSocket';
import { ProjectZone } from './components/World/ProjectZone';
import { WorldMap } from './components/World/WorldMap';
import { AgentOutputModal } from './components/AgentOutputModal';
import { ChangeQueue } from './components/ChangeQueue';
import { DiffViewerModal } from './components/DiffViewerModal';
import { COLONY_SLOTS } from './config/colony';
import clsx from 'clsx';

function App() {
  const { projects, createProject, dissolveProject } = useProjects();
  const { allAgents, startAgent, stopAgent, sendMessage, logs } = useAgents();
  
  // Connect to websocket
  const { isConnected } = useWebSocket('ws://127.0.0.1:8787/stream', null);
  
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [modalAgentId, setModalAgentId] = useState<string | null>(null);
  const [selectedProjectForChanges, setSelectedProjectForChanges] = useState<string | null>(null);
  const [diffFilePath, setDiffFilePath] = useState<string | null>(null);

  // Git changes for selected project
  const { changes, fetchChanges, approveChange, rejectChange, approveAll, rejectAll } = useGitChanges(selectedProjectForChanges);

  // Auto-fetch changes when selecting a project
  useEffect(() => {
    if (selectedProjectForChanges) {
      fetchChanges();
      // Refresh every 5 seconds
      const interval = setInterval(fetchChanges, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedProjectForChanges, fetchChanges]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    setIsCreating(true);
    await createProject(newProjectName);
    setNewProjectName('');
    setSelectedSlotId(null);
    setIsCreating(false);
  };

  const handleSlotClick = (slotId: number, project?: any) => {
    if (!project) {
      setSelectedSlotId(slotId);
    }
  };

  const handleAgentClick = (agentId: string) => {
    setSelectedAgentId(prev => prev === agentId ? null : agentId);
  };

  const handleDeskClick = async (projectName: string, deskIndex: number) => {
    console.log(`[App] Spawning agent at desk ${deskIndex} for project: ${projectName}`);
    await startAgent('ws://127.0.0.1:8787/stream', projectName, deskIndex);
  };

  const handleDissolveProject = async (projectName: string) => {
    const confirmDissolve = window.confirm(
      `Dissolve project "${projectName}"? All agents will be terminated.`
    );
    if (confirmDissolve) {
      await dissolveProject(projectName);
    }
  };

  const handleSendMessage = async (agentId: string, text: string) => {
    console.log('[App] Sending command to agent:', agentId, text);
    await sendMessage(agentId, text);
  };

  const handleBubbleClick = (agentId: string) => {
    setModalAgentId(agentId);
  };
  
  // Get agents for each project
  const getProjectAgents = (projectName: string) => 
    allAgents.filter(a => a.project === projectName);

  const handleViewDiff = (filePath: string) => {
    setDiffFilePath(filePath);
  };

  const handleApprove = async (filePath: string) => {
    await approveChange(filePath);
    setDiffFilePath(null);
  };

  const handleReject = async (filePath: string) => {
    await rejectChange(filePath);
    setDiffFilePath(null);
  };

  const modalAgent = modalAgentId ? allAgents.find(a => a.id === modalAgentId) : null;
  const modalLogs = modalAgentId ? (logs[modalAgentId] || []) : [];

  return (
    <div className="h-screen w-screen flex flex-col bg-rim-bg text-rim-text select-none">
      {/* Header */}
      <header className="h-10 bg-rim-panel border-b border-rim-border flex items-center justify-between px-4 shrink-0 z-20 relative shadow-md">
        <div className="flex items-center gap-2">
          <span className="font-bold tracking-wider text-rim-accent">COMMANDDECK</span>
          <div className="h-4 w-[1px] bg-rim-border mx-2" />
          <span className="text-xs text-rim-muted">COLONY VIEW</span>
          {selectedProjectForChanges && changes.length > 0 && (
            <span className="text-xs bg-rim-accent/20 text-rim-accent px-2 py-0.5 rounded">
              {changes.length} changes
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className={clsx(
              "w-2 h-2 rounded-full transition-colors duration-300", 
              isConnected ? "bg-rim-success animate-pulse" : "bg-rim-error"
            )} />
            <span>{isConnected ? "Online" : "Disconnected"}</span>
          </div>
          <div className="text-rim-muted">
            Occupied: {projects.length}/10
          </div>
        </div>
      </header>

      {/* Main Content - Full Width World Map */}
      <main className="flex-1 overflow-hidden relative">
        <WorldMap biome="forest">
          {COLONY_SLOTS.map((slot) => {
            const project = projects[slot.id];
            const projectAgents = project ? getProjectAgents(project.name) : [];
            
            return (
              <div 
                key={`slot-${slot.id}`} 
                className={clsx("transition-all duration-300", slot.gridClass)}
              >
                <ProjectZone 
                  project={project}
                  isEmpty={!project}
                  slotId={slot.id}
                  onSelect={() => handleSlotClick(slot.id, project)}
                  onDeskClick={(deskIndex) => project && handleDeskClick(project.name, deskIndex)}
                  onAgentClick={handleAgentClick}
                  onAgentStop={(payload) => stopAgent(payload)}
                  onDissolve={() => project && handleDissolveProject(project.name)}
                  onSendMessage={handleSendMessage}
                  onBubbleClick={handleBubbleClick}
                  onProjectClick={() => project && setSelectedProjectForChanges(project.name)}
                  isSelectedForChanges={selectedProjectForChanges === project?.name}
                  agents={projectAgents}
                  desks={slot.desks}
                  selectedAgentId={selectedAgentId}
                />
              </div>
            );
          })}
        </WorldMap>
      </main>

      {/* Change Queue - Shows when project selected and has changes */}
      {selectedProjectForChanges && changes.length > 0 && (
        <ChangeQueue
          projectName={selectedProjectForChanges}
          changes={changes}
          onViewDiff={handleViewDiff}
          onApproveAll={approveAll}
          onRejectAll={rejectAll}
          onClose={() => setSelectedProjectForChanges(null)}
        />
      )}

      {/* Bottom Bar - Only for Create Project */}
      {selectedSlotId !== null && !projects[selectedSlotId] && (
        <div className="h-auto bg-rim-panel border-t border-rim-border z-20 shadow-xl">
          <div className="p-3 bg-rim-accent/10 border-b border-rim-accent">
            <div className="max-w-2xl mx-auto">
              <form onSubmit={(e) => { e.preventDefault(); handleCreateProject(); }} className="flex gap-2 items-center">
                <span className="text-xs font-bold text-rim-accent">Inhabit Slot {selectedSlotId}:</span>
                <input 
                  type="text" 
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  placeholder="Project name..."
                  className="flex-1 bg-rim-bg border border-rim-border px-3 py-2 text-sm focus:border-rim-accent outline-none"
                  autoFocus
                />
                <button 
                  type="submit" 
                  disabled={isCreating || !newProjectName}
                  className="btn btn-primary disabled:opacity-50"
                >
                  {isCreating ? "Creating..." : "Create"}
                </button>
                <button 
                  type="button"
                  onClick={() => { setSelectedSlotId(null); setNewProjectName(''); }}
                  className="btn bg-rim-bg border border-rim-border hover:bg-rim-panel"
                >
                  Cancel
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Agent Output Modal */}
      <AgentOutputModal 
        agent={modalAgent || null}
        logs={modalLogs}
        onClose={() => setModalAgentId(null)}
      />

      {/* Diff Viewer Modal */}
      <DiffViewerModal
        projectName={selectedProjectForChanges}
        filePath={diffFilePath}
        onClose={() => setDiffFilePath(null)}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}

export default App;
