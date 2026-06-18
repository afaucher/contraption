export interface LevelData {
  width: number;
  height: number;
  tileSize: number;
  tiles: number[]; // 1D array of length width * height. 0 = empty. >0 = tile ID.
  entities: EntityData[];
}

export interface EntityData {
  type: EntityType;
  x: number; // Grid X coordinate (0 to width - 1)
  y: number; // Grid Y coordinate (0 to height - 1)
  properties?: Record<string, any>;
}

export type EntityType =
  | 'playerSpawn'
  | 'door'
  | 'key'
  | 'flag' // Checkpoint
  | 'jumpPad'
  | 'ladder'
  | 'spike'
  | 'spikeBall'
  | 'weight' // Drops down
  | 'water'
  | 'heart' // Restores 1/2 health
  | 'coin'
  | 'gem'
  | 'button' // e.g. blue button that removes blue blocks
  | 'coloredBlock' // e.g. blue blocks that disappear
  | 'teleporter';

// Common Properties examples:
// door, key, flag, button, coloredBlock: { color: 'red' | 'blue' | 'green' }
// weight: { triggerDistance: number }
