import clsx from 'clsx';
import type { Project } from '../../stores/projectStore';
import type { Agent } from '../../stores/agentStore';
import type { DeskPosition, ColonySlot } from '../../config/colony';
import { useState, useEffect, useRef } from 'react';

interface ProjectZoneProps {
  project?: Project;
  onSelect: () => void;
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
  onProjectClick?: () => void;
  isSelectedForChanges?: boolean;
  selectedAgentId?: string | null;
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
  onProjectClick,
  isSelectedForChanges,
  selectedAgentId
}: ProjectZoneProps) {
  const isVacant = !project || isEmpty;
  const [hoveredAgentId, setHoveredAgentId] = useState<string | null>(null);
  const [commandInput, setCommandInput] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [completedAgents, setCompletedAgents] = useState<Set<string>>(new Set());
  const previousStatusRef = useRef<Map<string, string>>(new Map());
  
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

  const handleProjectClick = (e: React.MouseEvent) => {
    // Only trigger if clicking the main area, not on buttons/agents
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.project-area')) {
      if (onProjectClick) {
        onProjectClick();
      }
    }
  };
  
  // Find selected agent and its desk for command popup positioning
  const selectedAgent = selectedAgentId ? agents.find(a => a.id === selectedAgentId) : null;
  const selectedAgentDesk = selectedAgent ? desks[selectedAgent.deskIndex] : null;
  
  return (
    <div 
      className="relative h-64" 
      style={{ 
        // Boost z-index when this project is selected or has an active command popup
        // to prevent overlapping by subsequent grid items
        zIndex: (isSelectedForChanges || selectedAgent) ? 50 : 1 
      }}
    >
      {/* Top-right icon controls - outside clip-path, positioned on original rectangle */}
      <div className="absolute top-2 right-2 z-30 flex items-center gap-1.5 pointer-events-auto">
        {!isVacant && agents.length > 0 && (
          <div className="bg-rim-panel/90 backdrop-blur-sm border border-rim-border rounded px-1.5 py-0.5 text-[10px] text-rim-success flex items-center gap-1">
            <span>👤</span>
            <span>{agents.length}/{desks.length}</span>
          </div>
        )}
        {/* Dissolve button shows on hover */}
        {!isVacant && onDissolve && isHovered && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDissolve(); }}
            className="bg-rim-error/90 backdrop-blur-sm border border-rim-error text-white rounded px-1.5 py-0.5 text-[10px] hover:bg-rim-error transition-colors"
            title="Dissolve Project"
          >
            ✕
          </button>
        )}
      </div>

      {/* Command Input Popup - positioned in outer container to avoid clipping */}
      {selectedAgent && selectedAgentDesk && onSendMessage && (
        <div 
          className="absolute z-50 w-64"
          style={{
            left: `${selectedAgentDesk.x}%`,
            top: `calc(${selectedAgentDesk.y}% - 80px)`,
            transform: 'translateX(-50%)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-rim-panel border-2 border-rim-accent rounded shadow-2xl p-2 backdrop-blur-sm">
            <form onSubmit={(e) => handleSendCommand(e, selectedAgent.id)} className="flex gap-1">
              <input
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                placeholder={`Command ${selectedAgent.name}...`}
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

      {/* Main shaped panel */}
      <div 
        onClick={handleProjectClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onKeyDown={(e) => e.key === 'Enter' && handleProjectClick(e as any)}
        role="button"
        tabIndex={0}
        style={{
          clipPath: slot.clipPath,
          // VERY strong selection glow - triple layer for maximum visibility
          filter: isSelectedForChanges 
            ? 'drop-shadow(0 0 25px rgba(79, 209, 197, 1)) drop-shadow(0 0 15px rgba(79, 209, 197, 0.8)) drop-shadow(0 0 8px rgba(79, 209, 197, 0.6))'
            : hasWorkingAgents && !isVacant
              ? 'drop-shadow(0 0 15px rgba(79, 209, 197, 0.4))'
              : 'none',
          transition: 'filter 0.3s ease'
        }}
        className={clsx(
          "h-full flex flex-col cursor-pointer group relative overflow-visible project-area border border-rim-border",
          isVacant && "bg-black/80 border-rim-border/30 hover:border-rim-accent/50",
          // Selected state: brighter background, distinct border
          isSelectedForChanges && !isVacant && "bg-rim-panel/80 border-rim-accent shadow-[inset_0_0_20px_rgba(79,209,197,0.2)]",
          // Normal state: darker background, muted border
          !isSelectedForChanges && !isVacant && "bg-rim-panel hover:bg-rim-panel/70 hover:border-rim-muted"
        )}
      >



      
      {/* Room Content */}
      <div 
        className={clsx(
          "flex-1 p-4 relative",
          isVacant && "opacity-30"
        )}
      >
        {/* Floor Pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{ 
               backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', 
               backgroundSize: '20px 20px' 
             }} 
        />

        {/* Large Background Project Name */}
        {!isVacant && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
            <span className="font-bold text-4xl text-white/10 select-none whitespace-nowrap">
              {project!.name}
            </span>
          </div>
        )}
        
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

                  {/* Command popup removed from here - rendered in outer container */}
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
