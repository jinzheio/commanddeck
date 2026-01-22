// Colony layout configuration - 10 fixed rooms with unique shapes
export interface DeskPosition {
  x: number; // percentage
  y: number; // percentage
}

export interface ColonySlot {
  id: number;
  gridClass: string;
  type: 'hub' | 'office' | 'lab' | 'storage' | 'server';
  shape: string; // Shape name for visual reference
  clipPath: string; // CSS clip-path polygon
  desks: DeskPosition[];
}

export const COLONY_SLOTS: ColonySlot[] = [
  // Slot 0: Hub - Hexagon (2x2 central)
  {
    id: 0,
    gridClass: "col-span-2 row-span-2",
    type: 'hub',
    shape: 'hexagon',
    clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
    desks: [
      { x: 50, y: 25 },  // Top center
      { x: 75, y: 40 },  // Right top
      { x: 75, y: 60 },  // Right bottom
      { x: 25, y: 60 },  // Left bottom
      { x: 25, y: 40 },  // Left top
    ]
  },
  
  // Slot 1: Office - Rounded Rectangle (1x1)
  {
    id: 1,
    gridClass: "col-span-1 row-span-1",
    type: 'office',
    shape: 'rounded-rect',
    clipPath: 'polygon(0% 15%, 15% 0%, 85% 0%, 100% 15%, 100% 85%, 85% 100%, 15% 100%, 0% 85%)',
    desks: [
      { x: 25, y: 30 },
      { x: 75, y: 30 },
      { x: 25, y: 70 },
      { x: 75, y: 70 },
      { x: 50, y: 50 },
    ]
  },
  
  // Slot 2: Lab - Pentagon (2x1 wide)
  {
    id: 2,
    gridClass: "col-span-2 row-span-1",
    type: 'lab',
    shape: 'pentagon',
    clipPath: 'polygon(50% 0%, 100% 35%, 85% 100%, 15% 100%, 0% 35%)',
    desks: [
      { x: 20, y: 50 },
      { x: 35, y: 50 },
      { x: 50, y: 50 },
      { x: 65, y: 50 },
      { x: 80, y: 50 },
    ]
  },
  
  // Slot 3: Server - Octagon (1x2 tall)
  {
    id: 3,
    gridClass: "col-span-1 row-span-2",
    type: 'server',
    shape: 'octagon',
    clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
    desks: [
      { x: 35, y: 25 },
      { x: 65, y: 25 },
      { x: 35, y: 50 },
      { x: 65, y: 50 },
      { x: 50, y: 75 },
    ]
  },
  
  // Slot 4: Storage - L-Shape (1x1)
  {
    id: 4,
    gridClass: "col-span-1 row-span-1",
    type: 'storage',
    shape: 'l-shape',
    clipPath: 'polygon(0% 0%, 65% 0%, 65% 35%, 100% 35%, 100% 100%, 0% 100%)',
    desks: [
      { x: 30, y: 20 },  // Top horizontal part
      { x: 80, y: 60 },  // Bottom vertical part (right)
      { x: 30, y: 70 },  // Bottom left
      { x: 50, y: 70 },  // Bottom center
      { x: 35, y: 45 },  // Center left
    ]
  },
  
  // Slot 5: Office - Diamond (1x1)
  {
    id: 5,
    gridClass: "col-span-1 row-span-1",
    type: 'office',
    shape: 'diamond',
    clipPath: 'polygon(50% 5%, 95% 50%, 50% 95%, 5% 50%)',
    desks: [
      { x: 50, y: 30 },  // Top
      { x: 70, y: 50 },  // Right
      { x: 50, y: 70 },  // Bottom
      { x: 30, y: 50 },  // Left
      { x: 50, y: 50 },  // Center
    ]
  },
  
  // Slot 6: Lab - Trapezoid (2x1 wide)
  {
    id: 6,
    gridClass: "col-span-2 row-span-1",
    type: 'lab',
    shape: 'trapezoid',
    clipPath: 'polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%)',
    desks: [
      { x: 25, y: 40 },
      { x: 40, y: 50 },
      { x: 50, y: 55 },
      { x: 60, y: 50 },
      { x: 75, y: 40 },
    ]
  },
  
  // Slot 7: Office - Rounded Square (1x1)
  {
    id: 7,
    gridClass: "col-span-1 row-span-1",
    type: 'office',
    shape: 'rounded-square',
    clipPath: 'polygon(0% 20%, 20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%)',
    desks: [
      { x: 30, y: 30 },
      { x: 70, y: 30 },
      { x: 30, y: 70 },
      { x: 70, y: 70 },
      { x: 50, y: 50 },
    ]
  },
  
  // Slot 8: Server - Chevron/Arrow (1x2 tall)
  {
    id: 8,
    gridClass: "col-span-1 row-span-2",
    type: 'server',
    shape: 'chevron',
    clipPath: 'polygon(50% 0%, 100% 20%, 100% 80%, 50% 100%, 0% 80%, 0% 20%)',
    desks: [
      { x: 50, y: 25 },
      { x: 35, y: 40 },
      { x: 65, y: 40 },
      { x: 35, y: 60 },
      { x: 65, y: 60 },
    ]
  },
  
  // Slot 9: Office - Pentagon (1x1)
  {
    id: 9,
    gridClass: "col-span-1 row-span-1",
    type: 'office',
    shape: 'pentagon-small',
    clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
    desks: [
      { x: 50, y: 35 },  // Center-top (avoid sharp top)
      { x: 70, y: 55 },
      { x: 50, y: 70 },
      { x: 30, y: 55 },
      { x: 50, y: 50 },
    ]
  },
];
