import React from 'react';
import clsx from 'clsx';

interface WorldMapProps {
  children: React.ReactNode;
  biome?: 'forest' | 'desert' | 'tundra';
}

export function WorldMap({ children, biome = 'forest' }: WorldMapProps) {
  return (
    <div className={clsx(
      "w-full h-full min-h-full overflow-auto transition-colors duration-700 relative",
      biome === 'forest' && "bg-[#1e2b1a]", // Deep forest green
      biome === 'desert' && "bg-[#a67c52]", // Sand
      biome === 'tundra' && "bg-[#e5e7eb]"  // Snow/Ice
    )}>

      
      {/* Full-width content wrapper so texture spans entire map */}
      <div className="relative w-full min-h-full">
        {/* Texture Layer - Noise/Grass Pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-10"
          style={{
            backgroundImage: `
              repeating-linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000),
              repeating-linear-gradient(45deg, #000 25%, #222 25%, #222 75%, #000 75%, #000)
            `,
            backgroundPosition: '0 0, 10px 10px',
            backgroundSize: '20px 20px',
          }}
        />

        {/* Grid Content Container */}
        <div className="relative max-w-[1600px] mx-auto min-h-full px-8 pb-8 pt-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
