import clsx from 'clsx';
import type { Project } from '../../stores/projectStore';
import type { Agent } from '../../stores/agentStore';
import type { DeskPosition } from '../../config/colony';
import { useState, useEffect, useRef } from 'react';

interface ProjectZoneProps {
  project?: Project;
  onSelect: () => void;
  agents: Agent[];
  desks: DeskPosition[];
  slotId: number;
  isEmpty?: boolean;
  onDeskClick?: (deskIndex: number) => void;
  onAgentClick?: (agentId: string) => void;
  onAgentStop?: (payload: { agentId: string }) => void;
  onDissolve?: () => void;
  onSendMessage?: (agentId: string, text: string) => void;
  onBubbleClick?: (agentId: string) => void;
  selectedAgentId?: string | null;
}

export function ProjectZone({ 
  project, 
  onSelect,  
  agents, 
  desks, 
  slotId, 
  isEmpty,
  onDeskClick,
  onAgentClick,
  onAgentStop,
  onDissolve,
  onSendMessage,
  onBubbleClick,
  selectedAgentId
}: ProjectZoneProps) {
  const isVacant = !project || isEmpty;
  const [hoveredAgentId, setHoveredAgentId] = useState<string | null>(null);
  const [commandInput, setCommandInput] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [completedAgents, setCompletedAgents] = useState<Set<string>>(new Set());
  const previousStatusRef = useRef<Map<string, string>>(new Map());
  
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

  const handleSendCommand = (e: React.FormEvent, agentId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (onSendMessage && commandInput.trim()) {
      onSendMessage(agentId, commandInput);
      setCommandInput('');
    }
  };
  
  return (
    <div 
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      role="button"
      tabIndex={0}
      className={clsx(
        "panel h-64 flex flex-col transition-all duration-300 cursor-pointer group relative overflow-visible",
        isVacant && "bg-black/80 border-rim-border/30 hover:border-rim-accent/50",
        !isVacant && "hover:bg-rim-panel/50 hover:border-rim-muted"
      )}
    >
      {/* Header */}
      <div className={clsx(
        "panel-header transition-colors flex justify-between items-center",
        isVacant && "bg-black/60 text-rim-muted"
      )}>
        <span>{isVacant ? `Slot ${slotId} - Vacant` : project!.name}</span>
        <div className="flex items-center gap-2">
          {!isVacant && agents.length > 0 && (
            <span className="text-[10px] bg-rim-success/20 text-rim-success px-1.5 rounded">
              {agents.length}/{desks.length}
            </span>
          )}
          {/* Dissolve button shows on hover */}
          {!isVacant && onDissolve && isHovered && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDissolve(); }}
              className="text-[10px] bg-rim-error/20 text-rim-error px-1.5 rounded hover:bg-rim-error hover:text-white transition-colors"
              title="Dissolve Project"
            >
              ✕ Dissolve
            </button>
          )}
        </div>
      </div>
      
      {/* Room Content */}
      <div className={clsx(
        "flex-1 p-4 relative",
        isVacant && "opacity-30"
      )}>
        {/* Floor Pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{ 
               backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', 
               backgroundSize: '20px 20px' 
             }} 
        />
        
        {isVacant ? (
          /* Empty State */
          <div className="flex items-center justify-center h-full text-rim-muted group-hover:text-rim-accent transition-colors">
            <div className="text-center">
              <div className="text-5xl mb-3 opacity-40">🏢</div>
              <p className="text-xs uppercase tracking-wider font-bold">Click to Inhabit</p>
              <p className="text-[10px] mt-1 opacity-60">Assign Project</p>
            </div>
          </div>
        ) : (
          /* Occupied State: Desks + Agents */
          <div className="relative h-full">
            {/* Render Desks */}
            {desks.map((desk, idx) => {
              // Check if this desk has an agent
              const agentAtDesk = agents.find(agent => agent.deskIndex === idx);
              const hasAgent = !!agentAtDesk;
              
              return (
                <div
                  key={`desk-${idx}`}
                  onClick={(e) => handleDeskClick(e, idx)}
                  className={clsx(
                    "absolute w-6 h-6 rounded-sm shadow-md border transition-all cursor-pointer",
                    hasAgent ? "bg-amber-800 border-amber-900/50" : "bg-amber-700/50 border-amber-800/30 hover:bg-amber-700 hover:border-amber-800"
                  )}
                  style={{
                    left: `${desk.x}%`,
                    top: `${desk.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  title={hasAgent ? undefined : "Click to spawn agent"}
                >
                  {/* Desk decoration */}
                  <div className="absolute inset-1 bg-amber-700/30 rounded-[2px]" />
                </div>
              );
            })}

            {/* Render Agents at their designated desks */}
            {agents.map((agent) => {
              const desk = desks[agent.deskIndex];
              if (!desk) return null; // Safety check
              
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
                    left: `${desk.x}%`,
                    top: `${desk.y}%`,
                    transform: 'translate(-50%, -50%)',
                    animationDelay: isWorking ? `${Math.random() * 500}ms` : '0ms'
                  }}
                  onMouseEnter={() => setHoveredAgentId(agent.id)}
                  onMouseLeave={() => setHoveredAgentId(null)}
                  onClick={(e) => handleAgentClick(e, agent.id)}
                >
                  {/* Agent Avatar */}
                  <div className={clsx(
                    "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg border-2 transition-colors duration-300 relative",
                    borderColor,
                    bgColor
                  )}>
                    {agent.name.charAt(0)}
                    
                    {/* X button on hover */}
                    {isHovered && (
                      <button
                        type="button"
                        onClick={(e) => handleAgentStop(e, agent.id)}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-rim-error text-white rounded-full flex items-center justify-center text-[10px] hover:scale-110 transition-transform shadow-md z-20"
                        title="Stop agent"
                      >
                        ✕
                      </button>
                    )}
                    
                    {/* Task Complete Bubble - top right */}
                    {completedAgents.has(agent.id) && (
                      <button
                        type="button"
                        onClick={(e) => handleBubbleClick(e, agent.id)}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-rim-success text-white rounded-full flex items-center justify-center text-xs hover:scale-110 transition-transform shadow-lg z-20 animate-bounce"
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

                  {/* Selection ring */}
                  {isSelectedAgent && (
                    <div className="absolute inset-0 rounded-full border-2 border-rim-accent animate-ping opacity-75" />
                  )}

                  {/* Command Input Popup (appears above agent when selected) */}
                  {isSelectedAgent && onSendMessage && (
                    <div 
                      className="absolute z-50 -top-16 left-1/2 transform -translate-x-1/2 w-64"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="bg-rim-panel border-2 border-rim-accent rounded shadow-2xl p-2 backdrop-blur-sm">
                        <form onSubmit={(e) => handleSendCommand(e, agent.id)} className="flex gap-1">
                          <input
                            type="text"
                            value={commandInput}
                            onChange={(e) => setCommandInput(e.target.value)}
                            placeholder={`Command ${agent.name}...`}
                            className="flex-1 bg-rim-bg border border-rim-border px-2 py-1 text-xs focus:border-rim-accent outline-none"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
