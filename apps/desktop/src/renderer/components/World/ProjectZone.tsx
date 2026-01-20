import clsx from 'clsx';
import type { Project } from '../../stores/projectStore';
import type { Agent } from '../../stores/agentStore';

interface ProjectZoneProps {
  project: Project;
  onSelect: () => void;
  isSelected?: boolean;
  agents: Agent[];
}

export function ProjectZone({ project, onSelect, isSelected, agents }: ProjectZoneProps) {
  return (
    <div 
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      role="button"
      tabIndex={0}
      className={clsx(
        "panel h-64 flex flex-col transition-all duration-200 cursor-pointer group",
        isSelected ? "ring-2 ring-rim-accent bg-rim-panel/80" : "hover:bg-rim-panel/50 hover:border-rim-muted"
      )}
    >
      <div className={clsx("panel-header", isSelected && "bg-rim-accent text-white")}>
        <span>{project.name}</span>
        <div className="flex items-center gap-2">
          {agents.length > 0 && (
            <span className="text-[10px] bg-rim-success/20 text-rim-success px-1.5 rounded">
              {agents.length} agent{agents.length > 1 ? 's' : ''}
            </span>
          )}
          {isSelected && <span className="animate-pulse">● Active</span>}
        </div>
      </div>
      
      <div className="flex-1 p-4 relative overflow-hidden">
        {/* Floor Pattern (CSS Grid) */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '20px 20px' }} 
        />
        
        {agents.length === 0 ? (
          <div className="flex items-center justify-center h-full text-rim-muted group-hover:text-rim-text transition-colors">
            <div className="text-center">
              <div className="text-4xl mb-2 opacity-50">📦</div>
              <p className="text-xs uppercase tracking-wider">Zone Empty</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3 justify-center items-end h-full pb-2 relative z-10">
            {agents.map((agent) => {
              // Status Styling Logic
              const isWorking = agent.status === 'working';
              const isError = agent.status === 'error';
              
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
              
              return (
                <div 
                  key={agent.id} 
                  className={clsx("flex flex-col items-center transition-all duration-300", animation)}
                  style={{ animationDelay: isWorking ? `${Math.random() * 500}ms` : '0ms' }}
                >
                  {/* Agent Avatar */}
                  <div className={clsx(
                    "w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-lg border-2 transition-colors duration-300",
                    borderColor,
                    bgColor
                  )}>
                    {agent.name.charAt(0)}
                  </div>
                  {/* Agent Name */}
                  <span className="text-[10px] text-rim-text mt-1 bg-rim-panel/80 px-1 rounded shadow-sm">
                    {agent.name}
                  </span>
                  {/* Status Indicator */}
                  <div className={clsx(
                    "w-2 h-2 rounded-full mt-0.5 transition-colors duration-300", 
                    dotColor,
                    isWorking && "animate-pulse"
                  )} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
