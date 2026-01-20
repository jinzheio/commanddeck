import { useState } from 'react';
import { useProjects } from './hooks/useProjects';
import { useAgents } from './hooks/useAgents';
import { useWebSocket } from './hooks/useWebSocket';
import { ProjectZone } from './components/World/ProjectZone';
import { WorldMap } from './components/World/WorldMap';
import clsx from 'clsx';

// Shape presets for the "Colony" look
const PLOTS = [
  "col-span-1 md:col-span-2 row-span-2", // 0: Hub (Large)
  "col-span-1 row-span-1",                // 1: Small Room
  "col-span-1 md:col-span-2 row-span-1", // 2: Wide Hall
  "col-span-1 row-span-2",                // 3: Tall Tower
  "col-span-1 row-span-1",                // 4: Small Room
  "col-span-1 md:col-span-2 row-span-1", // 5: Wide Workshop
  "col-span-1 row-span-1",                // 6: Backup
];

function App() {
  const { projects, selectedProject, selectProject, createProject } = useProjects();
  const { agents, allAgents, startAgent, stopAgent, logs, sendMessage } = useAgents(selectedProject);
  
  // Connect to websocket for active project
  const { isConnected } = useWebSocket('ws://127.0.0.1:8787/stream', selectedProject);
  
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [commandInput, setCommandInput] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setIsCreating(true);
    await createProject(newProjectName);
    setNewProjectName('');
    setIsCreating(false);
  };

  const handleStartAgent = async () => {
    await startAgent('ws://127.0.0.1:8787/stream');
  };

  const handleSendCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetAgent = selectedAgentId ? agents.find(a => a.id === selectedAgentId) : agents[0];
    if (!commandInput.trim() || !targetAgent) return;
    console.log('[App] Sending command to agent:', targetAgent.id, commandInput);
    await sendMessage(targetAgent.id, commandInput);
    setCommandInput('');
  };

  // Auto-select first agent when available
  const activeAgent = selectedAgentId 
    ? agents.find(a => a.id === selectedAgentId) 
    : agents[0];
  
  // Get agents for each project
  const getProjectAgents = (projectName: string) => 
    allAgents.filter(a => a.project === projectName);

  return (
    <div className="h-screen w-screen flex flex-col bg-rim-bg text-rim-text select-none">
      {/* Header */}
      <header className="h-10 bg-rim-panel border-b border-rim-border flex items-center justify-between px-4 shrink-0 z-20 relative shadow-md">
        <div className="flex items-center gap-2">
          <span className="font-bold tracking-wider text-rim-accent">COMMANDDECK</span>
          <div className="h-4 w-[1px] bg-rim-border mx-2" />
          <span className="text-xs text-rim-muted">COLONY VIEW</span>
        </div>
        
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className={clsx(
              "w-2 h-2 rounded-full transition-colors duration-300", 
              isConnected ? "bg-rim-success animate-pulse" : "bg-rim-error"
            )} />
            <span>{isConnected ? "Online" : "Disconnected"}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main View (World) - Updated to use WorldMap and PLOTS */}
        <main className="flex-1 overflow-hidden relative">
          <WorldMap biome="forest">
            {projects.map((proj, idx) => (
              <div 
                key={proj.name} 
                className={clsx("transition-all duration-300", PLOTS[idx % PLOTS.length])}
              >
                <ProjectZone 
                  project={proj} 
                  isSelected={selectedProject === proj.name}
                  onSelect={() => selectProject(proj.name)}
                  agents={getProjectAgents(proj.name)}
                />
              </div>
            ))}

            {/* Create New Zone Card */}
            <div className={clsx("panel flex flex-col items-center justify-center p-6 border-dashed border-2 bg-rim-panel/40 hover:bg-rim-panel/60 transition-colors backdrop-blur-sm", PLOTS[projects.length % PLOTS.length])}>
              <form onSubmit={handleCreateProject} className="w-full max-w-xs text-center space-y-4">
                <input 
                  type="text" 
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  placeholder="New Protocol Name..."
                  className="w-full bg-rim-bg border border-rim-border px-3 py-2 text-sm focus:border-rim-accent outline-none text-center opacity-80 focus:opacity-100"
                />
                <button 
                  type="submit" 
                  disabled={isCreating || !newProjectName}
                  className="btn btn-primary w-full justify-center disabled:opacity-50"
                >
                  {isCreating ? "Constructing..." : "Designate Zone"}
                </button>
              </form>
            </div>
          </WorldMap>
        </main>

        {/* Sidebar (Control) */}
        <aside className="w-80 bg-rim-panel border-l border-rim-border flex flex-col shrink-0 z-10 shadow-xl">
          <div className="panel-header">
            <span>Control: {selectedProject || 'None'}</span>
          </div>
          <div className="p-4 flex-1 overflow-auto space-y-4">
            
            {/* Project Controls */}
            {selectedProject ? (
              <>
                <section className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-rim-muted uppercase">Agents</h3>
                    <button 
                      type="button"
                      onClick={handleStartAgent}
                      className="btn btn-primary text-xs py-1"
                    >
                      + Spawn Agent
                    </button>
                  </div>

                  {/* Agent List */}
                  <div className="space-y-2">
                    {agents.length === 0 ? (
                      <div className="p-4 bg-rim-bg border border-rim-border rounded text-center text-sm text-rim-muted">
                        No active agents
                      </div>
                    ) : (
                      agents.map(agent => (
                        <div 
                          key={agent.id} 
                          onClick={() => setSelectedAgentId(agent.id)}
                          className={clsx(
                            "bg-rim-bg border border-rim-border p-2 rounded flex justify-between items-center group cursor-pointer transition-colors",
                            selectedAgentId === agent.id ? "ring-1 ring-rim-accent bg-rim-accent/10" : "hover:bg-rim-panel"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {/* Sidebar Status Indicator */}
                            <div className={clsx(
                              "w-2 h-2 rounded-full transition-colors",
                              agent.status === 'working' ? "bg-rim-success animate-pulse" :
                              agent.status === 'error' ? "bg-rim-error" : 
                              "bg-rim-muted"
                            )} />
                            <span className="text-sm font-medium">{agent.name}</span>
                            <span className="text-xs text-rim-muted">#{agent.pid}</span>
                          </div>
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); stopAgent(agent.id); }}
                            className="btn btn-danger text-[10px] py-0.5 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Kill
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                {/* Command Input */}
                {agents.length > 0 && (
                  <section className="space-y-2">
                    <h3 className="text-xs font-bold text-rim-muted uppercase">
                      Send Command {activeAgent && <span className="text-rim-accent">to {activeAgent.name}</span>}
                    </h3>
                    <form onSubmit={handleSendCommand} className="flex gap-2">
                      <input
                        type="text"
                        value={commandInput}
                        onChange={e => setCommandInput(e.target.value)}
                        placeholder="Enter command..."
                        className="flex-1 bg-rim-bg border border-rim-border px-3 py-2 text-sm focus:border-rim-accent outline-none"
                      />
                      <button 
                        type="submit"
                        disabled={!commandInput.trim() || !activeAgent}
                        className="btn btn-primary disabled:opacity-50"
                      >
                        Send
                      </button>
                    </form>
                  </section>
                )}

                {/* Quick Logs Preview */}
                {agents.length > 0 && (
                  <section className="flex-1 flex flex-col min-h-0">
                    <h3 className="text-xs font-bold text-rim-muted mb-2 uppercase">
                      Comms Log {activeAgent && <span className="text-rim-accent">({activeAgent.name})</span>}
                    </h3>
                    <div className="flex-1 bg-black border border-rim-border p-2 font-mono text-[10px] overflow-auto text-rim-muted/80 max-h-60 shadow-inner">
                      {activeAgent && logs[activeAgent.id]?.slice(-50).map((line, i) => (
                        <div key={`${activeAgent.id}-${i}`} className="whitespace-pre-wrap mb-0.5">{line}</div>
                      ))}
                      {activeAgent && (!logs[activeAgent.id] || logs[activeAgent.id].length === 0) && (
                        <div className="text-rim-muted">Waiting for signal...</div>
                      )}
                    </div>
                  </section>
                )}
              </>
            ) : (
              <div className="text-center text-rim-muted text-sm mt-10">
                Select a project zone<br/>to access controls
              </div>
            )}

          </div>
        </aside>
      </div>

      {/* Footer / Change Queue */}
      <div className="h-48 bg-rim-panel border-t border-rim-border flex flex-col shrink-0 z-20 relative">
        <div className="panel-header flex justify-between">
          <span>Changes (0)</span>
          <button type="button" className="text-[10px] hover:text-white cursor-pointer transition-colors">Approve All</button>
        </div>
        <div className="flex-1 p-2 overflow-auto">
          <div className="flex items-center justify-center h-full text-sm text-rim-muted">
            No pending changes
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
