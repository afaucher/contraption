import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface LevelData {
  width: number;
  height: number;
  tileSize: number;
  tiles: number[];
  entities: any[];
}

function createBaseLevel(): LevelData {
  const width = 20;
  const height = 15;
  const level: LevelData = {
    width,
    height,
    tileSize: 64,
    tiles: new Array(width * height).fill(0),
    entities: [
      { type: 'playerSpawn', x: 2, y: 13 },
      { type: 'teleporter', x: 18, y: 13 },
      { type: 'coin', x: 15, y: 13 }
    ]
  };
  
  // Fill solid floor
  for (let x = 0; x < width; x++) {
    level.tiles[14 * width + x] = 1; // Solid Grass
  }
  
  return level;
}

function runGraderOn(name: string, level: LevelData, expectPass: boolean = false) {
  const filePath = `./public/levels/test_${name}.json`;
  fs.writeFileSync(filePath, JSON.stringify(level, null, 2));
  
  try {
    console.log(`\n--- Testing ${name} ---`);
    execSync(`npx tsx scripts/grader.ts ${filePath}`, { stdio: 'pipe' });
    if (expectPass) {
        console.log(`✅ Grader correctly passed ${name}.`);
    } else {
        console.log(`❌ ERROR: Grader PASSED ${name} when it should have FAILED!`);
    }
  } catch (err: any) {
    if (expectPass) {
        console.log(`❌ ERROR: Grader FAILED ${name} when it should have PASSED!`);
    } else {
        const output = err.stderr ? err.stderr.toString() : err.stdout.toString();
        console.log(`✅ Grader correctly failed ${name}. Output snippet:\n${output.split('\n')[1] || output}`);
    }
  }
  
  // Cleanup
  fs.unlinkSync(filePath);
}

// Bad Level 1: Hole in the bottom row without hazard
const badBottom = createBaseLevel();
badBottom.tiles[14 * badBottom.width + 10] = 0; // Empty hole
runGraderOn('bad_bottom', badBottom);

// Bad Level 2: Missing Exit
const badExit = createBaseLevel();
badExit.entities = badExit.entities.filter(e => e.type !== 'teleporter');
runGraderOn('bad_exit', badExit);

// Bad Level 3: Missing Key
const missingKey = createBaseLevel();
missingKey.entities.push({ type: 'door', x: 10, y: 13, properties: { color: 'green' } });
runGraderOn('missing_key', missingKey);

// Bad Level 4: Floating Door
const floatingDoor = createBaseLevel();
floatingDoor.entities.push({ type: 'key', x: 5, y: 13, properties: { color: 'blue' } });
floatingDoor.entities.push({ type: 'door', x: 10, y: 5, properties: { color: 'blue' } }); 
runGraderOn('floating_door', floatingDoor);

// Bad Level 5: Clean Slope Geometry (grass under slope)
const badSlope = createBaseLevel();
badSlope.tiles[13 * badSlope.width + 5] = 4; // Long Slope A
runGraderOn('bad_slope', badSlope);

// Bad Level 6: Floating Water (spills)
const floatingWater = createBaseLevel();
floatingWater.entities.push({ type: 'water', x: 10, y: 10 });
runGraderOn('floating_water', floatingWater);

// Bad Level 7: No Collectibles
const noCoins = createBaseLevel();
noCoins.entities.push({ type: 'water', x: 5, y: 5 }); // Just something else
// Base level actually doesn't have coins, so we'll just test the base level itself.
// Wait, createBaseLevel doesn't add a coin, so it should fail the collectibles check!
runGraderOn('no_coins', noCoins);

// Bad Level 8: Button without matching block
const badButton = createBaseLevel();
badButton.entities.push({ type: 'coin', x: 5, y: 13 });
badButton.entities.push({ type: 'button', x: 8, y: 13, properties: { color: 'purple' } });
runGraderOn('bad_button', badButton);

// Bad Level 9: Floating Spike
const floatingSpike = createBaseLevel();
floatingSpike.entities.push({ type: 'coin', x: 5, y: 13 });
floatingSpike.entities.push({ type: 'spike', x: 10, y: 5 }); // floating
runGraderOn('floating_spike', floatingSpike);

// Bad Level 10: Floating Flag
const floatingFlag = createBaseLevel();
floatingFlag.entities.push({ type: 'coin', x: 5, y: 13 });
floatingFlag.entities.push({ type: 'flag', x: 12, y: 5 }); // floating
runGraderOn('floating_flag', floatingFlag);

// Debug Level: Ladder Winnable
const ladderWinnable = createBaseLevel();
ladderWinnable.tiles[13 * ladderWinnable.width + 8] = 1;
ladderWinnable.tiles[12 * ladderWinnable.width + 8] = 1;
ladderWinnable.tiles[11 * ladderWinnable.width + 8] = 1;
ladderWinnable.entities.push({ type: 'ladder', x: 7, y: 13 });
ladderWinnable.entities.push({ type: 'ladder', x: 7, y: 12 });
ladderWinnable.entities.push({ type: 'ladder', x: 7, y: 11 });
runGraderOn('debug_ladder_winnable', ladderWinnable, true);

// Debug Level: Ladder Unwinnable (Ladder doesn't reach high enough)
const ladderUnwinnable = createBaseLevel();
ladderUnwinnable.tiles[13 * ladderUnwinnable.width + 8] = 1;
ladderUnwinnable.tiles[12 * ladderUnwinnable.width + 8] = 1;
ladderUnwinnable.tiles[11 * ladderUnwinnable.width + 8] = 1;
ladderUnwinnable.tiles[10 * ladderUnwinnable.width + 8] = 1;
ladderUnwinnable.entities.push({ type: 'ladder', x: 7, y: 13 });
ladderUnwinnable.entities.push({ type: 'ladder', x: 7, y: 12 });
// Missing top ladders
runGraderOn('debug_ladder_unwinnable', ladderUnwinnable);

// Debug Level: Teleporter Winnable
const teleporterWinnable = createBaseLevel();
// Create a wall that cannot be jumped over
teleporterWinnable.tiles[13 * teleporterWinnable.width + 10] = 1;
teleporterWinnable.tiles[12 * teleporterWinnable.width + 10] = 1;
teleporterWinnable.tiles[11 * teleporterWinnable.width + 10] = 1;
teleporterWinnable.tiles[10 * teleporterWinnable.width + 10] = 1;
teleporterWinnable.tiles[9 * teleporterWinnable.width + 10] = 1;
teleporterWinnable.entities.push({ type: 'teleporter', x: 5, y: 13, properties: { id: 't1', targetId: 't2' } });
teleporterWinnable.entities.push({ type: 'teleporter', x: 15, y: 13, properties: { id: 't2', targetId: 't1' } });
runGraderOn('debug_teleporter_winnable', teleporterWinnable, true);

// Debug Level: Teleporter Unwinnable (Teleports to an enclosed trap)
const teleporterUnwinnable = createBaseLevel();
teleporterUnwinnable.tiles[13 * teleporterUnwinnable.width + 10] = 1;
teleporterUnwinnable.tiles[12 * teleporterUnwinnable.width + 10] = 1;
teleporterUnwinnable.tiles[11 * teleporterUnwinnable.width + 10] = 1;
teleporterUnwinnable.tiles[10 * teleporterUnwinnable.width + 10] = 1;
teleporterUnwinnable.tiles[9 * teleporterUnwinnable.width + 10] = 1;
teleporterUnwinnable.entities.push({ type: 'teleporter', x: 5, y: 13, properties: { id: 't1', targetId: 'trap' } });
// Trap room
teleporterUnwinnable.tiles[5 * teleporterUnwinnable.width + 5] = 1;
teleporterUnwinnable.tiles[5 * teleporterUnwinnable.width + 6] = 1;
teleporterUnwinnable.tiles[5 * teleporterUnwinnable.width + 7] = 1;
teleporterUnwinnable.tiles[4 * teleporterUnwinnable.width + 5] = 1;
teleporterUnwinnable.tiles[4 * teleporterUnwinnable.width + 7] = 1;
teleporterUnwinnable.tiles[3 * teleporterUnwinnable.width + 5] = 1;
teleporterUnwinnable.tiles[3 * teleporterUnwinnable.width + 6] = 1;
teleporterUnwinnable.tiles[3 * teleporterUnwinnable.width + 7] = 1;
teleporterUnwinnable.entities.push({ type: 'teleporter', x: 6, y: 4, properties: { id: 'trap', targetId: 't1' } });
runGraderOn('debug_teleporter_unwinnable', teleporterUnwinnable);

// Debug Level: Empty Screen (10 columns without features)
const emptyScreen = createBaseLevel();
emptyScreen.width = 30;
emptyScreen.tiles = new Array(30 * 15).fill(0);
// Re-fill solid floor for the new width
for (let x = 0; x < 30; x++) {
    emptyScreen.tiles[14 * 30 + x] = 1;
}
// Clear old entities and place them far apart to create a gap of >10
emptyScreen.entities = [
    { type: 'playerSpawn', x: 2, y: 13 },
    { type: 'coin', x: 20, y: 13 }, // Gap from x=3 to x=19 (17 columns!)
    { type: 'teleporter', x: 28, y: 13 }
];
runGraderOn('debug_empty_screen', emptyScreen);

// Bad Level 11: Floating Weight
const floatingWeight = createBaseLevel();
floatingWeight.entities.push({ type: 'weight', x: 10, y: 5 }); // no ceiling
runGraderOn('floating_weight', floatingWeight);

// Bad Level 12: Floating Button
const floatingButton = createBaseLevel();
floatingButton.entities.push({ type: 'coloredBlock', x: 12, y: 13, properties: { color: 'blue' } });
floatingButton.entities.push({ type: 'button', x: 8, y: 5, properties: { color: 'blue' } }); // floating
runGraderOn('floating_button', floatingButton);
