import clsx from 'clsx';
import type { Project } from '../../stores/projectStore';
import type { Agent } from '../../stores/agentStore';
import type { DeskPosition, ColonySlot } from '../../config/colony';
import { useState, useEffect, useRef } from 'react';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useLastActiveTime } from '../../hooks/useLastActiveTime';
import { useDeployStatus } from '../../hooks/useDeployStatus';

interface ProjectZoneProps {
  project?: Project;
  onSelect: (event: React.MouseEvent) => void;
  agents: Agent[];
  desks: DeskPosition[];
  slot: ColonySlot; // Changed from slotId to full slot object
  isEmpty?: boolean;
  onDeskClick?: (deskIndex: number) => void;
  onAgentClick?: (agentId: string) => void;
  onAgentStop?: (payload: { agentId: string }) => void;
  onDissolve?: () => void;
  onSendMessage?: (agentId: string, text: string) => void;
  onBubbleClick?: (agentId: string) => void;
  onViewLogs?: (agentId: string) => void;
  onProjectClick?: () => void;
  onProjectEdit?: () => void;
  onProjectIconClick?: (project: Project) => void;
  isSelectedForChanges?: boolean;
  selectedAgentId?: string | null;
}

function formatLastActive(timestamp: number | null | undefined) {
  if (!timestamp) return '--';
  const diffMs = Date.now() - timestamp;
  if (diffMs < 0) return '0 min';
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hrs`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} days`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} months`;
  const years = Math.floor(days / 365);
  return `${years} years`;
}

export function ProjectZone({ 
  project, 
  onSelect,  
  agents, 
  desks, 
  slot, 
  isEmpty,
  onDeskClick,
  onAgentClick,
  onAgentStop,
  onDissolve,
  onSendMessage,
  onBubbleClick,
  onViewLogs,
  onProjectClick,
  onProjectEdit,
  onProjectIconClick,
  isSelectedForChanges,
  selectedAgentId
}: ProjectZoneProps) {
  const isVacant = !project || isEmpty;
  const [hoveredAgentId, setHoveredAgentId] = useState<string | null>(null);
  const [commandInput, setCommandInput] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [completedAgents, setCompletedAgents] = useState<Set<string>>(new Set());
  const previousStatusRef = useRef<Map<string, string>>(new Map());
  const commandInputRef = useRef<HTMLTextAreaElement | null>(null);
  const tiles = slot.tiles;
  const rows = tiles.length || 1;
  const cols = tiles[0]?.length || 1;
  const analytics = useAnalytics(project ?? null, 24);
  const latestMetrics = analytics.rows[analytics.rows.length - 1];
  const { timestamp: lastActiveTimestamp } = useLastActiveTime(project);
  const { status: deployStatus } = useDeployStatus(project?.name ?? null);
  const projectIcon = project?.icon ?? null;
  const hasProjectIcon = Boolean(projectIcon?.value);
  const canOpenProjectSite = Boolean(project?.domain && onProjectIconClick);
  const cacheHit =
    latestMetrics?.cache_hit_ratio !== null && latestMetrics?.cache_hit_ratio !== undefined
      ? Math.round(latestMetrics.cache_hit_ratio * 100)
      : null;
  const lastActiveLabel = formatLastActive(lastActiveTimestamp);
  const deployState = deployStatus?.state ?? 'unknown';
  const deployDotClass = clsx(
    'w-2 h-2 rounded-full',
    deployState === 'success' && 'bg-rim-success',
    (deployState === 'failure' || deployState === 'error') && 'bg-rim-error',
    deployState === 'pending' && 'bg-rim-warning animate-pulse',
    deployState === 'unknown' && 'bg-rim-muted'
  );
  
  // Check if any agent is actively working
  const hasWorkingAgents = agents.some(agent => agent.status === 'working');
  
  // Track status changes to detect task completion
  useEffect(() => {
    agents.forEach(agent => {
      const previousStatus = previousStatusRef.current.get(agent.id);
      
      // Detect transition from 'working' to 'idle' = task completed!
      if (previousStatus === 'working' && agent.status === 'idle') {
        setCompletedAgents(prev => new Set(prev).add(agent.id));
      }
      
      previousStatusRef.current.set(agent.id, agent.status);
    });
  }, [agents]);

  useEffect(() => {
    if (!commandInputRef.current) return;
    const el = commandInputRef.current;
    el.style.height = '0px';
    const nextHeight = Math.min(el.scrollHeight, 96);
    el.style.height = `${nextHeight}px`;
  }, [commandInput, selectedAgentId]);
  
  const handleDeskClick = (e: React.MouseEvent, deskIndex: number) => {
    e.stopPropagation();
    // Check if desk is occupied
    const deskOccupied = agents.some(agent => agent.deskIndex === deskIndex);
    if (onDeskClick && !deskOccupied) {
      onDeskClick(deskIndex);
    }
  };

  const handleAgentClick = (e: React.MouseEvent, agentId: string) => {
    e.stopPropagation();
    if (onAgentClick) {
      onAgentClick(agentId);
    }
  };

  const handleAgentStop = (e: React.MouseEvent, agentId: string) => {
    e.stopPropagation();
    if (onAgentStop) {
      onAgentStop({ agentId });
    }
  };

  const handleBubbleClick = (e: React.MouseEvent, agentId: string) => {
    e.stopPropagation();
    if (onBubbleClick) {
      onBubbleClick(agentId);
      // Remove from completed set after viewing
      setCompletedAgents(prev => {
        const next = new Set(prev);
        next.delete(agentId);
        return next;
      });
    }
  };

  const handleViewLogs = (e: React.MouseEvent, agentId: string) => {
    e.stopPropagation();
    if (onViewLogs) {
      onViewLogs(agentId);
    }
  };

  const handleSendCommand = (e: React.FormEvent, agentId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (onSendMessage && commandInput.trim()) {
      onSendMessage(agentId, commandInput);
      setCommandInput('');
    }
  };

  const handleProjectClick = (e: React.MouseEvent) => {
    // Only trigger if clicking the main area, not on buttons/agents
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.project-area')) {
      if (isVacant) {
        onSelect(e);
        return;
      }
      if (onProjectClick) {
        onProjectClick();
      }
    }
  };
  
  // Find selected agent and its desk for command popup positioning
  const selectedAgent = selectedAgentId ? agents.find(a => a.id === selectedAgentId) : null;
  const selectedAgentDesk = selectedAgent ? desks[selectedAgent.deskIndex] : null;
  const selectedDeskPosition = selectedAgentDesk
    ? {
        left: ((selectedAgentDesk.col + 0.5) / cols) * 100,
        top: ((selectedAgentDesk.row + 0.5) / rows) * 100,
      }
    : null;
  
  return (
      <div 
        className="relative h-64" 
        style={{ 
          // Boost z-index when this project is selected or has an active command popup
          // to prevent overlapping by subsequent grid items
          zIndex: (isSelectedForChanges || selectedAgent) ? 50 : 1 
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
      {/* Top-right icon controls - outside clip-path, positioned on original rectangle */}
      <div className="absolute top-2 right-2 z-30 flex items-center gap-1.5 pointer-events-auto">
        {!isVacant && agents.length > 0 && (
          <div className="bg-rim-panel/90 backdrop-blur-sm border border-rim-border rounded px-1.5 py-0.5 text-[10px] text-rim-success flex items-center gap-1">
            <span>👤</span>
            <span>{agents.length}/{desks.length}</span>
          </div>
        )}
        {!isVacant && isHovered && (
          <>
            {onProjectEdit && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onProjectEdit(); }}
                className="text-white rounded px-1.5 py-0.5 text-[20px] hover:bg-rim-bg transition-colors"
                title="Project Settings"
              >
                ⚙
              </button>
            )}
            {onDissolve && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDissolve(); }}
                className="text-red-500 rounded px-1.5 py-0.5 text-[20px] hover:bg-red-500/10 transition-colors"
                title="Dissolve Project"
              >
                ✕
              </button>
            )}
          </>
        )}
      </div>

      {/* Command Input Popup - positioned in outer container to avoid clipping */}
      {selectedAgent && selectedDeskPosition && onSendMessage && (
        <div 
          className="absolute z-50 w-64"
          style={{
            left: `${selectedDeskPosition.left}%`,
            top: `${selectedDeskPosition.top}%`,
            transform: 'translate(-50%, -120%)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-rim-panel border-2 border-rim-accent rounded shadow-2xl p-2 backdrop-blur-sm">
            <form onSubmit={(e) => handleSendCommand(e, selectedAgent.id)} className="flex gap-1">
              <textarea
                ref={commandInputRef}
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                placeholder={`Command ${selectedAgent.name}... (Shift+Enter for newline)`}
                className="flex-1 bg-rim-bg border border-rim-border px-2 py-1 text-xs focus:border-rim-accent outline-none resize-none leading-relaxed max-h-24 overflow-y-auto"
                autoFocus
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendCommand(e, selectedAgent.id);
                  }
                }}
              />
              <button 
                type="submit"
                disabled={!commandInput.trim()}
                className="btn btn-primary text-xs py-1 px-2 disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
          {/* Arrow pointing down to agent */}
          <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-rim-accent mx-auto" />
        </div>
      )}

      {/* Main shaped panel */}
      <div 
        onClick={handleProjectClick}
        onKeyDown={(e) => e.key === 'Enter' && handleProjectClick(e as any)}
        role="button"
        tabIndex={0}
        className={clsx(
          "h-full flex flex-col cursor-pointer group relative project-area",
          isVacant && "opacity-70"
        )}
      >
        {/* Room Content */}
        <div className="flex-1 p-2 relative">
          <div className="absolute inset-2 flex items-center justify-center">
            <div
              className={clsx(
                "relative w-full h-full max-w-full max-h-full overflow-hidden",
                isSelectedForChanges && "ring-2 ring-rim-accent",
                hasWorkingAgents && !isVacant && "ring-1 ring-rim-success"
              )}
              style={{
                aspectRatio: `${cols} / ${rows}`,
              }}
            >
              <div
                className="absolute inset-0 tile-grid pointer-events-none"
                style={{
                  gridTemplateColumns: `repeat(${cols}, 1fr)`,
                  gridTemplateRows: `repeat(${rows}, 1fr)`,
                }}
              >
                {tiles.map((row, rowIndex) =>
                  row.split("").map((cell, colIndex) => {
                    let tileClass = "tile-empty";
                    if (cell === "W") tileClass = "tile-wall";
                    if (cell === "F") tileClass = "tile-floor";
                    if (cell === "D") tileClass = "tile-door";
                    return (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        className={clsx("tile", tileClass)}
                      />
                    );
                  })
                )}
              </div>

              {/* Large Background Project Name */}
          {!isVacant && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
              <div className="flex items-center gap-3 text-white/12 select-none whitespace-nowrap">
                {hasProjectIcon && projectIcon?.type === 'emoji' && (
                  <span className="text-6xl leading-none text-white/10">{projectIcon.value}</span>
                )}
                {hasProjectIcon && projectIcon?.type === 'image' && (
                  <div className="w-16 h-16 opacity-30">
                    <img
                      src={projectIcon.value}
                      alt={`${project?.name || 'Project'} icon`}
                      className="w-full h-full object-cover rounded"
                    />
                  </div>
                )}
                <span className="font-bold text-3xl text-white/10">
                  {project!.name}
                </span>
              </div>
            </div>
          )}

          {!isVacant && (
            <div className="absolute top-2 left-2 z-20 flex items-start gap-2">
              {hasProjectIcon && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (project && canOpenProjectSite && onProjectIconClick) {
                      onProjectIconClick(project);
                    }
                  }}
                  disabled={!canOpenProjectSite}
                  className={clsx(
                    "w-8 h-8 rounded border border-rim-border/70 bg-black/60 flex items-center justify-center overflow-hidden",
                    canOpenProjectSite ? "cursor-pointer hover:border-rim-accent" : "cursor-default opacity-80"
                  )}
                  title={canOpenProjectSite ? "Open website" : "No website configured"}
                  aria-label={canOpenProjectSite ? "Open website" : "No website configured"}
                >
                  {projectIcon?.type === 'emoji' && (
                    <span className="text-lg">{projectIcon.value}</span>
                  )}
                  {projectIcon?.type === 'image' && (
                    <img src={projectIcon.value} alt={`${project?.name || 'Project'} icon`} className="w-full h-full object-cover" />
                  )}
                </button>
              )}
              <div className="flex flex-col gap-1">
                <div className="bg-black/50 border border-rim-border/70 text-[10px] uppercase tracking-[0.12em] text-rim-muted px-2 py-1">
                  <div className="flex items-center gap-2 text-rim-text/80">
                    <span className={deployDotClass} title={`Deploy ${deployState}`} />
                    <span>R {latestMetrics?.requests ?? '--'}</span>
                    <span>H {cacheHit !== null ? `${cacheHit}%` : '--'}</span>
                    <span className="text-rim-warning">4 {latestMetrics?.status_4xx ?? '--'}</span>
                    <span className="text-rim-error">5 {latestMetrics?.status_5xx ?? '--'}</span>
                    <span>🕒 {lastActiveLabel}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

              {isVacant ? (
                /* Empty State */
                <div className="absolute inset-0 flex items-center justify-center text-rim-muted group-hover:text-rim-accent transition-colors">
                  <div className="text-center">
                    <div className="text-5xl mb-3 opacity-40">🏢</div>
                    <p className="text-xs uppercase tracking-wider font-bold">Click to Inhabit</p>
                    <p className="text-[10px] mt-1 opacity-60">Assign Project</p>
                  </div>
                </div>
              ) : (
                /* Occupied State: Desks + Agents */
                <div className="absolute inset-0">
                  {/* Render Desks */}
                  {desks.map((desk, idx) => {
                    // Check if this desk has an agent
                    const agentAtDesk = agents.find(agent => agent.deskIndex === idx);
                    const hasAgent = !!agentAtDesk;
                    const left = ((desk.col + 0.5) / cols) * 100;
                    const top = ((desk.row + 0.5) / rows) * 100;
                    
                    return (
                      <div
                        key={`desk-${idx}`}
                        onClick={(e) => handleDeskClick(e, idx)}
                        className={clsx(
                          "absolute w-8 h-8 rounded-sm shadow-md border transition-all cursor-pointer",
                          hasAgent ? "bg-amber-800 border-amber-900/50" : "bg-amber-700/50 border-amber-800/30 hover:bg-amber-700 hover:border-amber-800"
                        )}
                        style={{
                          left: `${left}%`,
                          top: `${top}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                        title={hasAgent ? undefined : "Click to spawn agent"}
                      >
                        {/* Desk decoration */}
                        <div className="absolute inset-1.5 bg-amber-700/30 rounded-[2px]" />
                      </div>
                    );
                  })}

                  {/* Render Agents at their designated desks */}
                  {agents.map((agent) => {
                    const desk = desks[agent.deskIndex];
                    if (!desk) return null; // Safety check
                    const left = ((desk.col + 0.5) / cols) * 100;
                    const top = ((desk.row + 0.5) / rows) * 100;
                    
                    const isWorking = agent.status === 'working';
                    const isError = agent.status === 'error';
                    const isHovered = hoveredAgentId === agent.id;
                    const isSelectedAgent = selectedAgentId === agent.id;
                    
                    let borderColor = 'border-rim-muted';
                    let bgColor = 'bg-rim-panel';
                    let dotColor = 'bg-rim-muted';
                    let animation = '';
                    
                    if (isWorking) {
                      borderColor = 'border-rim-success';
                      bgColor = 'bg-rim-accent';
                      dotColor = 'bg-rim-success';
                      animation = 'animate-bounce-small';
                    } else if (isError) {
                      borderColor = 'border-rim-error';
                      bgColor = 'bg-rim-error';
                      dotColor = 'bg-rim-error';
                    }

                    if (isSelectedAgent) {
                      borderColor = 'border-rim-accent';
                      bgColor = 'bg-rim-accent';
                    }
                    
                    return (
                      <div 
                        key={agent.id}
                        className={clsx("absolute z-10 flex flex-col items-center transition-all duration-300 cursor-pointer", animation)}
                        style={{
                          left: `${left}%`,
                          top: `${top}%`,
                          transform: 'translate(-50%, -50%)',
                          animationDelay: isWorking ? `${Math.random() * 500}ms` : '0ms'
                        }}
                        onMouseEnter={() => setHoveredAgentId(agent.id)}
                        onMouseLeave={() => setHoveredAgentId(null)}
                        onClick={(e) => handleAgentClick(e, agent.id)}
                      >
                        {/* Agent Avatar */}
                        <div className={clsx(
                          "w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg border-2 transition-colors duration-300 relative",
                          borderColor,
                          bgColor
                        )}>
                          {agent.name.charAt(0)}
                          
                          {/* X button on hover */}
                          {isHovered && (
                            <button
                              type="button"
                              onClick={(e) => handleAgentStop(e, agent.id)}
                              className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-rim-error text-white rounded-full flex items-center justify-center text-[10px] hover:scale-110 transition-transform shadow-md z-20"
                              title="Stop agent"
                            >
                              ✕
                            </button>
                          )}

                          {/* Logs button on hover */}
                          {isHovered && onViewLogs && (
                            <button
                              type="button"
                              onClick={(e) => handleViewLogs(e, agent.id)}
                              className="absolute -bottom-1 -right-1 w-4.5 h-4.5 bg-rim-panel text-white rounded-full flex items-center justify-center text-[10px] hover:scale-110 transition-transform shadow-md z-20 border border-rim-border"
                              title="View live logs"
                            >
                              ≡
                            </button>
                          )}
                          
                          {/* Task Complete Bubble - top right */}
                          {completedAgents.has(agent.id) && (
                            <button
                              type="button"
                              onClick={(e) => handleBubbleClick(e, agent.id)}
                              className="absolute -top-2 -right-2 w-5.5 h-5.5 bg-rim-success text-white rounded-full flex items-center justify-center text-xs hover:scale-110 transition-transform shadow-lg z-20 animate-bounce"
                              title="Task completed! Click to view output"
                            >
                              ✓
                            </button>
                          )}
                        </div>
                        
                        {/* Status Indicator */}
                        <div className={clsx(
                          "w-1.5 h-1.5 rounded-full mt-0.5 transition-colors duration-300", 
                          dotColor,
                          isWorking && "animate-pulse"
                        )} />

                        {/* Working ring */}
                        {isWorking && (
                          <div className="absolute inset-0 rounded-full border-2 border-rim-success animate-ping opacity-75" />
                        )}

                        {/* Selection ring (no animation) */}
                        {isSelectedAgent && (
                          <div className="absolute inset-0 rounded-full border-2 border-rim-accent/80" />
                        )}

                        {/* Command popup removed from here - rendered in outer container */}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
