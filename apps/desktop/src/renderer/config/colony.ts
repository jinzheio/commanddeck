// Colony layout configuration - 10 fixed rooms
export interface DeskPosition {
  x: number; // percentage
  y: number; // percentage
}

export interface ColonySlot {
  id: number;
  gridClass: string;
  type: 'hub' | 'office' | 'lab' | 'storage' | 'server';
  desks: DeskPosition[];
}

export const COLONY_SLOTS: ColonySlot[] = [
  // Hub - Large central room (2x2)
  {
    id: 0,
    gridClass: "col-span-2 row-span-2",
    type: 'hub',
    desks: [
      { x: 25, y: 30 },
      { x: 75, y: 30 },
      { x: 25, y: 70 },
      { x: 75, y: 70 },
      { x: 50, y: 50 },
    ]
  },
  // Small Office Room
  {
    id: 1,
    gridClass: "col-span-1 row-span-1",
    type: 'office',
    desks: [
      { x: 20, y: 25 },
      { x: 80, y: 25 },
      { x: 20, y: 75 },
      { x: 80, y: 75 },
      { x: 50, y: 50 },
    ]
  },
  // Wide Lab/Hall (2x1)
  {
    id: 2,
    gridClass: "col-span-2 row-span-1",
    type: 'lab',
    desks: [
      { x: 15, y: 40 },
      { x: 35, y: 40 },
      { x: 50, y: 40 },
      { x: 65, y: 40 },
      { x: 85, y: 40 },
    ]
  },
  // Tall Server Room (1x2)
  {
    id: 3,
    gridClass: "col-span-1 row-span-2",
    type: 'server',
    desks: [
      { x: 30, y: 20 },
      { x: 70, y: 20 },
      { x: 30, y: 45 },
      { x: 70, y: 45 },
      { x: 50, y: 70 },
    ]
  },
  // Small Storage
  {
    id: 4,
    gridClass: "col-span-1 row-span-1",
    type: 'storage',
    desks: [
      { x: 20, y: 30 },
      { x: 80, y: 30 },
      { x: 20, y: 70 },
      { x: 80, y: 70 },
      { x: 50, y: 50 },
    ]
  },
  // Office
  {
    id: 5,
    gridClass: "col-span-1 row-span-1",
    type: 'office',
    desks: [
      { x: 25, y: 25 },
      { x: 75, y: 25 },
      { x: 25, y: 75 },
      { x: 75, y: 75 },
      { x: 50, y: 50 },
    ]
  },
  // Wide Workshop (2x1)
  {
    id: 6,
    gridClass: "col-span-2 row-span-1",
    type: 'lab',
    desks: [
      { x: 20, y: 45 },
      { x: 35, y: 45 },
      { x: 50, y: 45 },
      { x: 65, y: 45 },
      { x: 80, y: 45 },
    ]
  },
  // Small Room
  {
    id: 7,
    gridClass: "col-span-1 row-span-1",
    type: 'office',
    desks: [
      { x: 30, y: 30 },
      { x: 70, y: 30 },
      { x: 30, y: 70 },
      { x: 70, y: 70 },
      { x: 50, y: 50 },
    ]
  },
  // Server Tower (1x2)
  {
    id: 8,
    gridClass: "col-span-1 row-span-2",
    type: 'server',
    desks: [
      { x: 35, y: 25 },
      { x: 65, y: 25 },
      { x: 35, y: 50 },
      { x: 65, y: 50 },
      { x: 50, y: 75 },
    ]
  },
  // Small Room
  {
    id: 9,
    gridClass: "col-span-1 row-span-1",
    type: 'office',
    desks: [
      { x: 25, y: 35 },
      { x: 75, y: 35 },
      { x: 25, y: 65 },
      { x: 75, y: 65 },
      { x: 50, y: 50 },
    ]
  },
];
