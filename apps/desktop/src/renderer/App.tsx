import { useState, useEffect, useRef } from 'react';
import { useProjects } from './hooks/useProjects';
import { useAgents } from './hooks/useAgents';
import { useGitChanges } from './hooks/useGitChanges';
import { useAnalytics } from './hooks/useAnalytics';
import { useWebSocket } from './hooks/useWebSocket';
import { ProjectZone } from './components/World/ProjectZone';
import { WorldMap } from './components/World/WorldMap';
import { AgentOutputModal } from './components/AgentOutputModal';
import { ChangeQueue } from './components/ChangeQueue';
import { DiffViewerModal } from './components/DiffViewerModal';
import { TrafficPanel } from './components/TrafficPanel';
import { ProjectSettingsModal } from './components/ProjectSettingsModal';
import { COLONY_SLOTS } from './config/colony';
import clsx from 'clsx';
import type { Project } from './stores/projectStore';

function App() {
  const { projects, createProject, dissolveProject, updateProject } = useProjects();
  const { allAgents, startAgent, stopAgent, sendMessage, logs } = useAgents();
  
  // Connect to websocket
  const { isConnected } = useWebSocket('ws://127.0.0.1:8787/stream', null);
  
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [inhabitAnchor, setInhabitAnchor] = useState<{ x: number; y: number } | null>(null);
  const [modalAgentId, setModalAgentId] = useState<string | null>(null);
  const [selectedProjectForChanges, setSelectedProjectForChanges] = useState<string | null>(null);
  const [diffFilePath, setDiffFilePath] = useState<string | null>(null);
  const [diffFileStatus, setDiffFileStatus] = useState<'added' | 'modified' | 'deleted' | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Git changes for selected project
  const { changes, fetchChanges, approveChange, rejectChange, approveAll, rejectAll } = useGitChanges(selectedProjectForChanges);
  const selectedProject = selectedProjectForChanges
    ? projects.find((project) => project.name === selectedProjectForChanges) || null
    : null;
  const analytics = useAnalytics(selectedProject, 24);

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
    setInhabitAnchor(null);
    setIsCreating(false);
  };

  // Global shortcut listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedProjectForChanges(null);
        setSelectedAgentId(null);
        setSelectedSlotId(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSlotClick = (slotId: number, event?: React.MouseEvent) => {
    if (projects[slotId]) return;
    setSelectedSlotId(slotId);
    if (event && mainRef.current) {
      const rect = mainRef.current.getBoundingClientRect();
      setInhabitAnchor({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
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

  const handleSaveProjectSettings = async (updates: { name: string; domain: string | null }) => {
    if (!editingProject) return { ok: false, reason: 'no_project' };
    const result = await updateProject(editingProject.name, updates);
    if (result.ok) {
      const nextName = updates.name;
      if (selectedProjectForChanges === editingProject.name) {
        setSelectedProjectForChanges(nextName);
      }
      if (editingProject.name !== nextName && selectedAgentId) {
        setSelectedAgentId(null);
      }
    }
    return result;
  };

  const handleSendMessage = async (agentId: string, text: string) => {
    console.log('[App] Sending command to agent:', agentId, text);
    await sendMessage(agentId, text);
  };

  const handleBubbleClick = (agentId: string) => {
    setModalAgentId(agentId);
  };

  const handleViewLogs = (agentId: string) => {
    setModalAgentId(agentId);
  };
  
  // Get agents for each project
  const getProjectAgents = (projectName: string) => 
    allAgents.filter(a => a.project === projectName);

  const handleViewDiff = (filePath: string, status: 'added' | 'modified' | 'deleted') => {
    setDiffFilePath(filePath);
    setDiffFileStatus(status);
  };

  const handleApprove = async (filePath: string) => {
    await approveChange(filePath);
    setDiffFilePath(null);
    setDiffFileStatus(null);
  };

  const handleReject = async (filePath: string) => {
    await rejectChange(filePath);
    setDiffFilePath(null);
    setDiffFileStatus(null);
  };

  const mainRef = useRef<HTMLDivElement | null>(null);
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
      <main
        className="flex-1 overflow-hidden relative"
        ref={mainRef}
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest('.project-area') || target.closest('.inhabit-popover')) {
            return;
          }
          setSelectedSlotId(null);
          setInhabitAnchor(null);
        }}
      >
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
                  slot={slot}
                  onSelect={(event) => handleSlotClick(slot.id, event)}
                  onDeskClick={(deskIndex) => project && handleDeskClick(project.name, deskIndex)}
                  onAgentClick={handleAgentClick}
                  onAgentStop={(payload) => stopAgent(payload)}
                  onDissolve={() => project && handleDissolveProject(project.name)}
                  onProjectEdit={() => project && setEditingProject(project)}
                  onSendMessage={handleSendMessage}
                  onBubbleClick={handleBubbleClick}
                  onViewLogs={handleViewLogs}
                  onProjectClick={() => {
                    if (project) {
                      setSelectedSlotId(null);
                      setInhabitAnchor(null);
                      setSelectedProjectForChanges(prev => prev === project.name ? null : project.name);
                    }
                  }}
                  isSelectedForChanges={selectedProjectForChanges === project?.name}
                  agents={projectAgents}
                  desks={slot.desks}
                  selectedAgentId={selectedAgentId}
                />
              </div>
            );
          })}
        </WorldMap>

        {selectedSlotId !== null && !projects[selectedSlotId] && inhabitAnchor && (
          <div
            className="absolute z-30 inhabit-popover"
            style={{
              left: inhabitAnchor.x,
              top: inhabitAnchor.y,
              transform: 'translate(-10%, 10%)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bg-rim-panel border border-rim-border rounded shadow-xl p-3 w-[280px]">
              <div className="text-xs font-bold text-rim-accent mb-2">
                Inhabit Slot {selectedSlotId}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateProject();
                }}
                className="flex flex-col gap-2"
              >
                <input 
                  type="text" 
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  placeholder="Project name..."
                  className="bg-rim-bg border border-rim-border px-3 py-2 text-sm focus:border-rim-accent outline-none"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button 
                    type="button"
                    onClick={() => { setSelectedSlotId(null); setNewProjectName(''); setInhabitAnchor(null); }}
                    className="btn bg-rim-bg border border-rim-border hover:bg-rim-panel"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isCreating || !newProjectName}
                    className="btn btn-primary disabled:opacity-50"
                  >
                    {isCreating ? "Creating..." : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {selectedProjectForChanges && (
        <TrafficPanel
          project={selectedProject}
          rows={analytics.rows}
          loading={analytics.loading}
          error={analytics.error}
          onClose={() => setSelectedProjectForChanges(null)}
          onRefresh={analytics.refresh}
        />
      )}

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

      {/* Bottom Bar removed in favor of contextual popover */}

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
        onClose={() => { setDiffFilePath(null); setDiffFileStatus(null); }}
        onApprove={handleApprove}
        onReject={handleReject}
        fileStatus={diffFileStatus}
      />

      <ProjectSettingsModal
        project={editingProject}
        onClose={() => setEditingProject(null)}
        onSave={handleSaveProjectSettings}
      />
    </div>
  );
}

export default App;
