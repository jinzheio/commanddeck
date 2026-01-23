// Colony layout configuration - 10 fixed rooms with unique shapes
export interface DeskPosition {
  col: number;
  row: number;
}

export interface ColonySlot {
  id: number;
  gridClass: string;
  type: 'hub' | 'office' | 'lab' | 'storage' | 'server';
  shape: string; // Shape name for visual reference
  clipPath: string; // CSS clip-path polygon
  tiles: string[];
  desks: DeskPosition[];
}

const DEFAULT_MAX_AGENTS = 3;
const envMaxAgents = Number(import.meta.env.VITE_MAX_AGENTS_PER_PROJECT);
export const MAX_AGENTS_PER_PROJECT =
  Number.isFinite(envMaxAgents) && envMaxAgents > 0 ? envMaxAgents : DEFAULT_MAX_AGENTS;

export const COLONY_SLOTS: ColonySlot[] = [
  // Slot 0: Hub - Hexagon (2x2 central)
  {
    id: 0,
    gridClass: "col-span-2 row-span-1",
    type: 'hub',
    shape: 'hexagon',
    clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
    tiles: [
      "..WWWWWWWWWWWWWW..",
      ".WFFFFFFFFFFFFFFW.",
      "WFFFFFFFFFFFFFFFFW",
      "WFFFFFFFFFFFFFFFFW",
      "WFFFFFFFFFFFFFFFFW",
      "WFFFFFFFFFFFFFFFFW",
      "WFFFFFFFFFFFFFFFFW",
      "WFFFFFFFFFFFFFFFFW",
      "WFFFFFFFFFFFFFFFFW",
      "WFFFFFFFFFFFFFFFFW",
      ".WFFFFFFFFFFFFFFW.",
      "..WWWWWWWDWWWWWW..",
    ],
    desks: [
      { col: 5, row: 3 },
      { col: 9, row: 3 },
      { col: 13, row: 3 },
      { col: 5, row: 7 },
      { col: 13, row: 7 },
    ]
  },
  
  // Slot 1: Office - Rounded Rectangle (1x1)
  {
    id: 1,
    gridClass: "col-span-1 row-span-1",
    type: 'office',
    shape: 'rounded-rect',
    clipPath: 'polygon(0% 15%, 15% 0%, 85% 0%, 100% 15%, 100% 85%, 85% 100%, 15% 100%, 0% 85%)',
    tiles: [
      "..WWWWWWWW..",
      ".WFFFFFFFFW.",
      "WFFFFFFFFFFW",
      "WFFFFFFFF..W",
      "WFFFFFFFF..W",
      "WFFFFFFFFFFW",
      ".WFFFFFFFFW.",
      "..WWWWDWWW..",
    ],
    desks: [
      { col: 3, row: 2 },
      { col: 8, row: 2 },
      { col: 3, row: 5 },
      { col: 8, row: 5 },
      { col: 6, row: 4 },
    ]
  },
  
  // Slot 2: Lab - Pentagon (2x1 wide)
  {
    id: 2,
    gridClass: "col-span-2 row-span-1",
    type: 'lab',
    shape: 'pentagon',
    clipPath: 'polygon(50% 0%, 100% 35%, 85% 100%, 15% 100%, 0% 35%)',
    tiles: [
      "..WWWWWWWWWWWWWW..",
      ".WFFFFFFFFFFFFFFW.",
      "WFFFFFFFFFFFFFFFFW",
      "WFFFFFFFFFF..FFFFW",
      "WFFFFFFFFFF..FFFFW",
      "WFFFFFFFFFFFFFFFFW",
      ".WFFFFFFFFFFFFFFW.",
      "..WWWWWWWDWWWWWW..",
    ],
    desks: [
      { col: 4, row: 3 },
      { col: 7, row: 3 },
      { col: 10, row: 3 },
      { col: 13, row: 3 },
      { col: 8, row: 5 },
    ]
  },
  
  // Slot 3: Server - Octagon (1x2 tall)
  {
    id: 3,
    gridClass: "col-span-1 row-span-2",
    type: 'server',
    shape: 'octagon',
    clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
    tiles: [
      "..WWWWWW..",
      ".WFFFFFFW.",
      "WFFFFFFFFW",
      "WFFFF..FFW",
      "WFFFF..FFW",
      "WFFFFFFFFW",
      "WFFFFFFFFW",
      "WFFFFFFFFW",
      "WFFFFFFFFW",
      "WFFFFFFFFW",
      ".WFFFFFFW.",
      "..WWWWDW..",
    ],
    desks: [
      { col: 3, row: 3 },
      { col: 6, row: 3 },
      { col: 3, row: 7 },
      { col: 6, row: 7 },
      { col: 4, row: 10 },
    ]
  },
  
  // Slot 4: Storage - L-Shape (1x1)
  {
    id: 4,
    gridClass: "col-span-1 row-span-1",
    type: 'storage',
    shape: 'l-shape',
    clipPath: 'polygon(0% 0%, 65% 0%, 65% 35%, 100% 35%, 100% 100%, 0% 100%)',
    tiles: [
      "..WWWWWWWW..",
      ".WFFFFFFFFW.",
      "WFFFFFF....W",
      "WFFFFFF....W",
      "WFFFFFFFF..W",
      "WFFFFFFFFFFW",
      ".WFFFFFFFFW.",
      "..WWWWDWWW..",
    ],
    desks: [
      { col: 3, row: 2 },
      { col: 8, row: 3 },
      { col: 3, row: 5 },
      { col: 6, row: 5 },
      { col: 4, row: 4 },
    ]
  },
  
  // Slot 5: Office - Diamond (1x1)
  {
    id: 5,
    gridClass: "col-span-1 row-span-1",
    type: 'office',
    shape: 'diamond',
    clipPath: 'polygon(50% 5%, 95% 50%, 50% 95%, 5% 50%)',
    tiles: [
      "..WWWWWW..",
      ".WFFFFFFW.",
      "WFFFFFFFFW",
      "WFF..FFFFW",
      "WFFFFFFFFW",
      ".WFFFFFFW.",
      "..WWDWWW..",
      "..WWWWWW..",
    ],
    desks: [
      { col: 3, row: 2 },
      { col: 6, row: 2 },
      { col: 3, row: 5 },
      { col: 6, row: 5 },
      { col: 4, row: 4 },
    ]
  },
  
  // Slot 6: Lab - Trapezoid (2x1 wide)
  {
    id: 6,
    gridClass: "col-span-2 row-span-1",
    type: 'lab',
    shape: 'trapezoid',
    clipPath: 'polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%)',
    tiles: [
      "..WWWWWWWWWWWWWW..",
      ".WFFFFFFFFFFFFFFW.",
      "WFFFFFFFFFFFFFFFFW",
      "WFFFFFFFFFF..FFFFW",
      "WFFFFFFFFFF..FFFFW",
      "WFFFFFFFFFFFFFFFFW",
      ".WFFFFFFFFFFFFFFW.",
      "..WWWWWWWWDWWWWW..",
    ],
    desks: [
      { col: 4, row: 3 },
      { col: 7, row: 3 },
      { col: 10, row: 3 },
      { col: 13, row: 3 },
      { col: 9, row: 5 },
    ]
  },
  
  // Slot 7: Office - Rounded Square (1x1)
  {
    id: 7,
    gridClass: "col-span-1 row-span-1",
    type: 'office',
    shape: 'rounded-square',
    clipPath: 'polygon(0% 20%, 20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%)',
    tiles: [
      "..WWWWWW..",
      ".WFFFFFFW.",
      "WFFFFFFFFW",
      "WFFFF..FFW",
      "WFFFF..FFW",
      "WFFFFFFFFW",
      ".WFFFFFFW.",
      "..WWDWWW..",
    ],
    desks: [
      { col: 3, row: 2 },
      { col: 6, row: 2 },
      { col: 3, row: 5 },
      { col: 6, row: 5 },
      { col: 4, row: 4 },
    ]
  },
  
  // Slot 8: Server - Chevron/Arrow (1x2 tall)
  {
    id: 8,
    gridClass: "col-span-1 row-span-2",
    type: 'server',
    shape: 'chevron',
    clipPath: 'polygon(50% 0%, 100% 20%, 100% 80%, 50% 100%, 0% 80%, 0% 20%)',
    tiles: [
      "..WWWWWW..",
      ".WFFFFFFW.",
      "WFFFFFFFFW",
      "WFFFF..FFW",
      "WFFFF..FFW",
      "WFFFFFFFFW",
      "WFFFFFFFFW",
      "WFFFFFFFFW",
      "WFFFFFFFFW",
      "WFFFFFFFFW",
      ".WFFFFFFW.",
      "..WWWWDW..",
    ],
    desks: [
      { col: 3, row: 3 },
      { col: 6, row: 3 },
      { col: 3, row: 7 },
      { col: 6, row: 7 },
      { col: 4, row: 10 },
    ]
  },
  
  // Slot 9: Office - Pentagon (1x1)
  {
    id: 9,
    gridClass: "col-span-1 row-span-1",
    type: 'office',
    shape: 'pentagon-small',
    clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
    tiles: [
      "..WWWWWWWW..",
      ".WFFFFFFFFW.",
      "WFFFFFFFFFFW",
      "WFF..FFFFF.W",
      "WFF..FFFFF.W",
      "WFFFFFFFFFFW",
      ".WFFFFFFFFW.",
      "..WWWWDWWW..",
    ],
    desks: [
      { col: 3, row: 2 },
      { col: 8, row: 2 },
      { col: 3, row: 5 },
      { col: 8, row: 5 },
      { col: 6, row: 4 },
    ]
  },
];
