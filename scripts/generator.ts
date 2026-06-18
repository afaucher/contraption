import * as fs from 'fs';
import * as path from 'path';

interface EntityData { type: string; x: number; y: number; properties?: Record<string, any>; }

export enum Terrain {
  Empty = 0,
  Solid = 1,
  SlopeShortUp = 2,
  SlopeShortDown = 3,
  SlopeLongDownA = 4,
  SlopeLongDownB = 5,
  SlopeLongDownC = 6,
  SlopeLongUpA = 7,
  SlopeLongUpB = 8,
  SlopeLongUpC = 9,
  PlatformLeft = 10,
  PlatformMid = 11,
  PlatformRight = 12,
  PillarTop = 13,
  PillarMid = 14,
  PillarBottom = 15,
  Dirt = 16
}

class LevelBuilder {
    width: number;
    height: number;
    tileSize = 64;
    tiles: number[];
    entities: EntityData[] = [];

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.tiles = new Array(width * height).fill(0);
    }

    setTile(x: number, y: number, tileId: Terrain) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.tiles[y * this.width + x] = tileId;
        }
    }

    fillFloor(y: number, startX = 0, endX = this.width - 1, tileId = Terrain.Solid) {
        for (let x = startX; x <= endX; x++) {
            this.setTile(x, y, tileId);
            for (let dy = 1; dy < this.height - y; dy++) {
                this.setTile(x, y + dy, Terrain.Dirt);
            }
        }
    }

    fillBottomRowWithWater() {
      for (let x = 0; x < this.width; x++) {
        if (this.tiles[(this.height - 1) * this.width + x] === Terrain.Empty) {
          this.addEntity('water', x, this.height - 1);
        }
      }
    }
  
    addLongRampDown(x: number, y: number) {
      this.setTile(x, y, Terrain.SlopeLongDownA);
      this.setTile(x + 1, y, Terrain.SlopeLongDownB);
      // Fill the blocks underneath to make it solid
      this.fillFloor(y + 1, x, x + 1, Terrain.Dirt);
    }
  
    addLongRampUp(x: number, y: number) {
      this.setTile(x, y, Terrain.SlopeLongUpA);
      this.setTile(x + 1, y, Terrain.SlopeLongUpB);
      // Fill the blocks underneath
      this.fillFloor(y + 1, x, x + 1, Terrain.Dirt);
    }
    
    addPlatform(x: number, y: number, width: number) {
        this.setTile(x, y, Terrain.PlatformLeft);
        for (let i = 1; i < width - 1; i++) {
            this.setTile(x + i, y, Terrain.PlatformMid);
        }
        this.setTile(x + width - 1, y, Terrain.PlatformRight);
    }
    
    addPillar(x: number, y: number, height: number) {
        this.setTile(x, y, Terrain.PillarTop);
        for (let i = 1; i < height - 1; i++) {
            this.setTile(x, y + i, Terrain.PillarMid);
        }
        this.setTile(x, y + height - 1, Terrain.PillarBottom);
    }

    addEntity(type: string, x: number, y: number, properties?: Record<string, any>) {
        this.entities.push({ type, x, y, properties });
    }

    addLadder(x: number, y: number, height: number) {
        for (let i = 0; i < height; i++) {
            this.addEntity('ladder', x, y + i);
        }
    }

    addFlag(x: number, y: number) {
        this.addEntity('flag', x, y);
    }

    addHeart(x: number, y: number) {
        this.addEntity('heart', x, y);
    }

    addTeleporterPair(x1: number, y1: number, x2: number, y2: number, id1: string, id2: string) {
        this.addEntity('teleporter', x1, y1, { id: id1, targetId: id2 });
        this.addEntity('teleporter', x2, y2, { id: id2, targetId: id1 });
    }

    addButtonWithBlocks(x: number, y: number, color: string, blockCoords: {x: number, y: number}[]) {
        this.addEntity('button', x, y, { color });
        for (const coord of blockCoords) {
            this.addEntity('coloredBlock', coord.x, coord.y, { color, active: true });
        }
    }

    addCrushWeight(x: number, y: number) {
        this.addEntity('weight', x, y);
    }

    addSpikyBall(x: number, y: number, range: number, direction: 'horizontal' | 'vertical') {
        this.addEntity('spikeBall', x, y, { range, direction });
    }

    build() {
        return {
            width: this.width,
            height: this.height,
            tileSize: this.tileSize,
            tiles: this.tiles,
            entities: this.entities
        };
    }
}

function genLevel1() {
    const builder = new LevelBuilder(160, 15);
    
    // ==================
    // PHASE 1: 0-40 (The Basics)
    // ==================
    // Flat start
    builder.fillFloor(12, 0, 8);
    builder.addEntity('playerSpawn', 2, 8);
    
    // Slope down
    builder.fillFloor(13, 9, 9);
    builder.setTile(9, 12, Terrain.SlopeShortDown);
    builder.fillFloor(14, 10, 10);
    builder.setTile(10, 13, Terrain.SlopeShortDown);
    
    // Valley
    builder.fillFloor(14, 11, 20);
    builder.addEntity('spike', 15, 13);
    builder.addEntity('spike', 16, 13);
    
    // Slope up
    builder.fillFloor(14, 21, 21);
    builder.setTile(21, 13, Terrain.SlopeShortUp);
    builder.fillFloor(13, 22, 22);
    builder.setTile(22, 12, Terrain.SlopeShortUp);
    builder.fillFloor(12, 23, 40);
    builder.addEntity('coin', 30, 11);
    builder.addEntity('coin', 36, 11);


    // ==================
    // PHASE 2: 40-80 (Water Pits)
    // ==================
    // First water gap
    builder.addEntity('coin', 42, 11);
    for(let x=41; x<=43; x++) builder.addEntity('water', x, 14);
    builder.fillFloor(12, 44, 55);
    builder.addEntity('coin', 50, 11);

    // Step down
    builder.fillFloor(13, 56, 60);

    // Larger water gap with floating platform
    for(let x=61; x<=70; x++) builder.addEntity('water', x, 14);
    builder.addPlatform(63, 12, 5); // 63, 64, 65, 66, 67
    builder.addEntity('coin', 65, 11);
    builder.addEntity('gem', 66, 10, { color: 'green' });
    
    builder.fillFloor(13, 71, 80);
    builder.addFlag(78, 12);
    builder.addHeart(80, 12);

    // ==================
    // PHASE 3: 80-120 (Slopes & Hurdles)
    // ==================
    // Slopes
    builder.addLongRampDown(81, 13); // ends at x=82, y=14
    builder.fillFloor(14, 83, 90);
    builder.addEntity('spike', 85, 13);
    builder.addEntity('spike', 87, 13);
    builder.addEntity('coin', 86, 11);

    builder.addLongRampUp(91, 13); // base is y=14
    builder.fillFloor(13, 93, 100);

    // First red door challenge
    builder.addPillar(110, 10, 4); // 110, 10..13
    builder.addEntity('key', 111, 9, { color: 'red' });
    builder.addEntity('jumpPad', 108, 13); // To get the key
    
    builder.addPillar(115, 0, 13);
    builder.addEntity('door', 115, 13, { color: 'red' });
    
    builder.fillFloor(14, 101, 120); // Floor drops
    builder.addEntity('coin', 98, 12);
    builder.addEntity('coin', 105, 13);

    // ==================
    // PHASE 4: 120-160 (The Final Jump)
    // ==================
    // Huge water gap
    for(let x=121; x<=140; x++) builder.addEntity('water', x, 14);
    
    // Stepping stones
    builder.addPlatform(123, 13, 3);
    builder.addPlatform(128, 13, 3);
    builder.addPlatform(133, 13, 3);
    builder.addPlatform(138, 13, 2);
    builder.addEntity('coin', 133, 12);
    builder.addEntity('coin', 138, 12);

    builder.fillFloor(12, 141, 160);

    // Final Door
    builder.addEntity('key', 145, 11, { color: 'green' });
    builder.addPillar(150, 0, 11);
    builder.addEntity('door', 150, 11, { color: 'green' });
    
    // Teleporter
    builder.addEntity('teleporter', 158, 11);

    builder.fillBottomRowWithWater();
    return builder.build();
}

function genLevel2() {
    const builder = new LevelBuilder(160, 15);
    
    // ==================
    // PHASE 1: 0-40 (Blue Factory)
    // ==================
    builder.fillFloor(10, 0, 10);
    builder.addEntity('playerSpawn', 2, 8);
    
    // Jump over water
    for(let x=11; x<=14; x++) builder.addEntity('water', x, 14);
    builder.fillFloor(12, 15, 23);
    
    builder.addEntity('jumpPad', 20, 11);
    
    // Wall to jump over made of blue blocks, and button to open it
    builder.addButtonWithBlocks(18, 11, 'blue', [
        { x: 23, y: 8 }, { x: 23, y: 9 }, { x: 23, y: 10 }, { x: 23, y: 11 }
    ]);
    
    builder.addEntity('coin', 18, 9);
    
    // Long Ramp Down
    builder.addLongRampDown(24, 12); // ends at 25, 13
    builder.fillFloor(13, 26, 40);
    builder.addEntity('coin', 33, 12);

    // ==================
    // PHASE 2: 40-80 (The Bounce Pit)
    // ==================
    // Huge pit covered in jump pads on tiny pillars
    for(let x=41; x<=70; x++) builder.addEntity('water', x, 14);
    
    builder.addPillar(44, 13, 2);
    builder.addEntity('jumpPad', 44, 12);
    builder.addPillar(48, 13, 2);
    builder.addEntity('jumpPad', 48, 12);
    builder.addPillar(52, 13, 2);
    builder.addEntity('jumpPad', 52, 12);
    builder.addPillar(56, 13, 2);
    builder.addEntity('jumpPad', 56, 12);
    builder.addEntity('coin', 58, 9);
    builder.addPillar(60, 13, 2);
    builder.addEntity('jumpPad', 60, 12);
    builder.addPillar(64, 13, 2);
    builder.addEntity('jumpPad', 64, 12);
    builder.addEntity('gem', 66, 8, { color: 'red' });
    builder.addPillar(68, 13, 2);
    builder.addEntity('jumpPad', 68, 12);

    builder.fillFloor(12, 71, 80);
    builder.addFlag(72, 11);
    builder.addHeart(74, 11);

    // ==================
    // PHASE 3: 80-120 (Traps & Verticality)
    // ==================
    // Falling weights (must be attached to ceiling)
    builder.addPlatform(75, 3, 1);
    builder.addCrushWeight(75, 4);
    builder.addPlatform(78, 2, 1);
    builder.addCrushWeight(78, 3);
    builder.addPlatform(81, 3, 1);
    builder.addCrushWeight(81, 4);
    builder.fillFloor(12, 81, 90);

    // Vertical climb using a ladder instead of just jump pads
    builder.addLadder(90, 8, 4); // 90, 8 to 11
    builder.addPlatform(89, 12, 3);
    
    builder.addPlatform(90, 8, 3);
    builder.addEntity('jumpPad', 91, 7);
    builder.addPlatform(95, 4, 3);
    
    // Key on top
    builder.addEntity('key', 96, 3, { color: 'yellow' });
    
    // Safety drop
    builder.fillFloor(13, 91, 120);
    builder.addEntity('coin', 100, 12);
    builder.addEntity('coin', 110, 12);
    builder.addEntity('coin', 118, 12);
    
    // ==================
    // PHASE 4: 120-160 (The Maze)
    // ==================
    // Requires yellow key from Phase 3
    builder.addPillar(125, 0, 12);
    builder.addEntity('door', 125, 12, { color: 'yellow' });
    
    // Inside the maze: Red Button opens Red Blocks
    const redBlocks = [];
    for(let y=0; y<=12; y++) redBlocks.push({ x: 135, y });
    builder.addButtonWithBlocks(130, 12, 'red', redBlocks);
    
    // Final exit door requires Red Key
    builder.addEntity('key', 140, 12, { color: 'red' });
    builder.addPillar(150, 0, 12);
    builder.addEntity('door', 150, 12, { color: 'red', nextLevel: 'level3' });
    
    builder.addEntity('teleporter', 155, 12);
    builder.fillFloor(13, 121, 160);

    builder.fillBottomRowWithWater();
    return builder.build();
}

function genLevel3() {
    const builder = new LevelBuilder(160, 15);
    
    // ==================
    // PHASE 1: 0-40 (Slopes & Keys)
    // ==================
    builder.fillFloor(12, 0, 5);
    builder.addEntity('playerSpawn', 2, 8);
    
    // Ramp up
    builder.addLongRampUp(6, 11); // starts at y=11, goes to y=10
    builder.addLongRampUp(8, 10); // starts at y=10, goes to y=9
    builder.fillFloor(9, 10, 15);
    
    builder.addEntity('key', 12, 8, { color: 'blue' });
    
    // Ramp down
    builder.addLongRampDown(16, 9);
    builder.addLongRampDown(18, 10);
    
    builder.fillFloor(12, 20, 40);

    // Blue door wall
    builder.addPillar(25, 0, 11);
    builder.addEntity('door', 25, 11, { color: 'blue' });
    
    // Red key is placed AFTER the blue door
    builder.addEntity('key', 30, 11, { color: 'red' });
    builder.addEntity('coin', 32, 11);
    
    // Red door wall
    builder.addPillar(35, 0, 11);
    builder.addEntity('door', 35, 11, { color: 'red' });

    // ==================
    // PHASE 2: 40-80 (The Gauntlet)
    // ==================
    // Fast slope descent
    builder.addLongRampDown(41, 12); // ends at 42, 13
    builder.fillFloor(14, 43, 45);
    
    // Massive Spike Pit
    for (let x=46; x<=65; x++) {
        builder.fillFloor(14, x, x);
        builder.addEntity('spike', x, 13);
    }
    // Tiny safe platforms
    builder.addPlatform(48, 13, 2);
    builder.addEntity('jumpPad', 49, 12);
    builder.addPlatform(57, 13, 2);
    builder.addEntity('jumpPad', 58, 12);
    builder.addPlatform(66, 13, 2);
    builder.addEntity('coin', 67, 12);
    
    // Add a spiky ball over the final spike pit jump
    builder.addSpikyBall(62, 10, 64, 'vertical');
    
    builder.fillFloor(14, 68, 80);
    builder.addEntity('coin', 73, 13);
    builder.addFlag(78, 13);
    builder.addHeart(44, 13);

    // ==================
    // PHASE 3: 80-120 (Momentum)
    // ==================
    // Long ramp up requiring momentum
    builder.addLongRampUp(81, 13); // ends at y=12
    builder.addLongRampUp(83, 12); // ends at y=11
    builder.addLongRampUp(85, 11); // ends at y=10
    builder.addLongRampUp(87, 10); // ends at y=9
    builder.fillFloor(9, 89, 95);

    builder.addEntity('gem', 92, 8, { color: 'yellow' });
    
    // Add point-to-point teleporter skipping the pit if they find it
    builder.addTeleporterPair(81, 12, 95, 8, 't1', 't2');
    
    // Sheer drop
    builder.fillFloor(14, 96, 105);
    // Water to catch them
    for(let x=96; x<=99; x++) builder.addEntity('water', x, 13);
    builder.setTile(100, 13, Terrain.Solid); // Bound the water on the right
    
    builder.addEntity('button', 103, 13, { color: 'green' });
    
    // Green Blocks blocking a corridor
    for(let y=10; y<=13; y++) builder.addEntity('coloredBlock', 106, y, { color: 'green' });
    builder.fillFloor(14, 107, 120);
    builder.addEntity('coin', 113, 13);

    // ==================
    // PHASE 4: 120-160 (The Final Sprint)
    // ==================
    // A maze of ramps
    builder.addLongRampUp(121, 13);
    builder.addLongRampDown(125, 12);
    builder.fillFloor(14, 127, 160);
    
    builder.addPillar(135, 0, 13);
    builder.addEntity('door', 135, 13, { color: 'green' });
    builder.addEntity('coin', 145, 13);
    
    // Wait, need a green key!
    builder.addEntity('key', 128, 13, { color: 'green' });
    
    builder.addEntity('teleporter', 155, 13);

    builder.fillBottomRowWithWater();
    return builder.build();
}

fs.writeFileSync('public/levels/level1.json', JSON.stringify(genLevel1(), null, 2));
fs.writeFileSync('public/levels/level2.json', JSON.stringify(genLevel2(), null, 2));
fs.writeFileSync('public/levels/level3.json', JSON.stringify(genLevel3(), null, 2));
console.log("Generated public/levels/level1.json, public/levels/level2.json, public/levels/level3.json");
