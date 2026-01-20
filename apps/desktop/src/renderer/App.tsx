import React, { useEffect } from 'react';

function App() {
  useEffect(() => {
    console.log("Renderer mounted");
    console.log("CommandDeck API available:", !!window.commanddeck);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-rim-bg text-rim-text select-none">
      {/* Header */}
      <header className="h-10 bg-rim-panel border-b border-rim-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold tracking-wider text-rim-accent">COMMANDDECK</span>
          <div className="h-4 w-[1px] bg-rim-border mx-2" />
          <span className="text-xs text-rim-muted">RIMWORLD EDITION</span>
        </div>
        
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rim-success animate-pulse"></span>
            <span>Online</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main View (World) */}
        <main className="flex-1 p-4 overflow-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Placeholder Project Zones */}
            <div className="panel h-64 flex items-center justify-center text-rim-muted border-dashed border-2 bg-transparent">
              <div className="text-center">
                <p className="mb-2">No Projects</p>
                <button className="btn btn-primary">Create New Zone</button>
              </div>
            </div>
          </div>
        </main>

        {/* Sidebar (Control) */}
        <aside className="w-80 bg-rim-panel border-l border-rim-border flex flex-col shrink-0">
          <div className="panel-header">Control</div>
          <div className="p-4 flex-1 overflow-auto">
            <div className="space-y-4">
              <section>
                <h3 className="text-xs font-bold text-rim-muted mb-2 uppercase">Agents</h3>
                <div className="p-4 bg-rim-bg border border-rim-border rounded text-center text-sm text-rim-muted">
                  No active agents
                </div>
              </section>
            </div>
          </div>
        </aside>
      </div>

      {/* Footer / Change Queue */}
      <div className="h-48 bg-rim-panel border-t border-rim-border flex flex-col shrink-0">
        <div className="panel-header flex justify-between">
          <span>Changes (0)</span>
          <button className="text-[10px] hover:text-white">Approve All</button>
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
