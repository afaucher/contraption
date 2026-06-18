import * as fs from 'fs';
import * as path from 'path';

interface LevelData {
  width: number;
  height: number;
  tileSize: number;
  tiles: number[];
  entities: EntityData[];
}

interface EntityData {
  type: string;
  x: number;
  y: number;
  properties?: Record<string, any>;
}

interface State {
    x: number;
    y: number;
    jumps: number;
    keys: string;
    buttons: string;
}

function stateHash(s: State) {
    return `${s.x},${s.y},${s.jumps},${s.keys},${s.buttons}`;
}

function hasColor(collection: string, color: string) {
    if (!color || !collection) return false;
    return collection.split(',').includes(color);
}

function addColor(collection: string, color: string) {
    if (!color) return collection;
    const parts = collection ? collection.split(',') : [];
    if (!parts.includes(color)) {
        parts.push(color);
        return parts.sort().join(',');
    }
    return collection;
}

function gradeLevel(levelPath: string) {
    const data = fs.readFileSync(levelPath, 'utf8');
    const level: LevelData = JSON.parse(data);

    const entitiesByPos = new Map<string, EntityData[]>();
    for (const e of level.entities) {
        const k = `${e.x},${e.y}`;
        if (!entitiesByPos.has(k)) entitiesByPos.set(k, []);
        entitiesByPos.get(k)!.push(e);
    }

    function getEntities(x: number, y: number) {
        return entitiesByPos.get(`${x},${y}`) || [];
    }

    function isSolid(x: number, y: number, keys: string, buttons: string) {
        if (x < 0 || x >= level.width || y < 0 || y >= level.height) return true;
        if (level.tiles[y * level.width + x] > 0) return true;
        for (const e of getEntities(x, y)) {
            if (e.type === 'door' && !hasColor(keys, e.properties?.color)) return true;
            if (e.type === 'coloredBlock' && !hasColor(buttons, e.properties?.color)) return true;
        }
        return false;
    }

    function isHazard(x: number, y: number) {
        for (const e of getEntities(x, y)) {
            if (['spike', 'spikeBall', 'water', 'weight'].includes(e.type)) return true;
        }
        return false;
    }

    function isLadder(x: number, y: number) {
        for (const e of getEntities(x, y)) {
            if (e.type === 'ladder') return true;
        }
        return false;
    }

    function getNextKeysAndButtons(nx: number, ny: number, currentKeys: string, currentButtons: string) {
        let newKeys = currentKeys;
        let newButtons = currentButtons;
        for (const e of getEntities(nx, ny)) {
            if (e.type === 'key' && e.properties?.color) {
                newKeys = addColor(newKeys, e.properties.color);
            }
            if (e.type === 'button' && e.properties?.color) {
                newButtons = addColor(newButtons, e.properties.color);
            }
        }
        return { keys: newKeys, buttons: newButtons };
    }

    function validateStructure() {
        let errors: string[] = [];

        // Entity counts
        let spawnCount = 0;
        let exitCount = 0;
        let collectibleCount = 0;
        const availableKeys = new Set<string>();
        const availableButtons = new Set<string>();
        const availableBlocks = new Set<string>();

        // Pre-scan entities
        for (const e of level.entities) {
            if (e.type === 'playerSpawn') spawnCount++;
            if (e.type === 'teleporter') {
                if (!e.properties || e.properties.targetId === undefined) {
                    exitCount++;
                }
            }
            if (e.type === 'coin' || e.type === 'gem') collectibleCount++;
            if (e.type === 'key' && e.properties?.color) availableKeys.add(e.properties.color);
            if (e.type === 'button' && e.properties?.color) availableButtons.add(e.properties.color);
            if (e.type === 'coloredBlock' && e.properties?.color) availableBlocks.add(e.properties.color);
        }

        if (spawnCount !== 1) errors.push(`Level Requirements: Found ${spawnCount} playerSpawns. Exactly 1 is required.`);
        if (exitCount !== 1) errors.push(`Level Requirements: Found ${exitCount} teleporters (exits). Exactly 1 is required.`);
        if (collectibleCount === 0) errors.push(`Level Requirements: No coins or gems found.`);

        // Helper to check if a tile is solid terrain
        const isTerrainSolid = (x: number, y: number) => {
            if (x < 0 || x >= level.width || y < 0 || y >= level.height) return true; // Map bounds are solid
            return level.tiles[y * level.width + x] > 0;
        };
        const hasWater = (x: number, y: number) => {
            return level.entities.some(e => e.type === 'water' && e.x === x && e.y === y);
        };

        // 1. Unsafe Bottom Row
        for (let x = 0; x < level.width; x++) {
            const y = level.height - 1;
            const tile = level.tiles[y * level.width + x];
            if (tile === 0 && !isHazard(x, y)) {
                errors.push(`Unsafe Bottom Row: Empty space without hazard/water at (${x}, ${y})`);
            }
        }

        // 1.5. Empty Screen Check (10 columns without variation/features)
        let consecutiveEmpty = 0;
        let lastHeight = -1;
        for (let x = 0; x < level.width; x++) {
            let hasEntity = level.entities.some(e => e.x === x);
            
            let currentHeight = -1;
            for (let y = 0; y < level.height; y++) {
                if (isTerrainSolid(x, y)) {
                    currentHeight = y;
                    break;
                }
            }

            if (!hasEntity && currentHeight === lastHeight) {
                consecutiveEmpty++;
                if (consecutiveEmpty >= 10) {
                    errors.push(`Empty Screen: 10 consecutive columns without features starting at x=${x - 9}`);
                    consecutiveEmpty = 0; // reset to avoid duplicate spam for the same stretch
                }
            } else {
                consecutiveEmpty = !hasEntity ? 1 : 0;
                lastHeight = currentHeight;
            }
        }

        // 2. Clean Slope Geometry
        for (let y = 0; y < level.height - 1; y++) {
            for (let x = 0; x < level.width; x++) {
                const tile = level.tiles[y * level.width + x];
                if (tile === 4 || tile === 5 || tile === 7 || tile === 8) { // long slopes
                    const tileBelow = level.tiles[(y + 1) * level.width + x];
                    if (tileBelow === 1) { // Terrain.Solid (Grass)
                        errors.push(`Clean Slope Geometry: Grass-topped block directly below slope at (${x}, ${y + 1}). Should be pure dirt or empty.`);
                    }
                }
            }
        }

        // Entity rules
        for (const e of level.entities) {
            const tileBelowSolid = isTerrainSolid(e.x, e.y + 1) || level.entities.some(other => other.x === e.x && other.y === e.y + 1 && (other.type === 'coloredBlock' || other.type === 'door'));
            
            // Door Placement & Logic
            if (e.type === 'door') {
                if (e.properties?.color && !availableKeys.has(e.properties.color)) {
                    errors.push(`Missing Key: Door at (${e.x}, ${e.y}) requires ${e.properties.color} key, but none found.`);
                }
                
                const tileAboveSolid = isTerrainSolid(e.x, e.y - 1) || level.entities.some(other => other.x === e.x && other.y === e.y - 1 && (other.type === 'coloredBlock' || other.type === 'door'));
                
                if (!tileBelowSolid) errors.push(`Door Placement: Door at (${e.x}, ${e.y}) is floating (no solid tile below).`);
                if (!tileAboveSolid) errors.push(`Door Placement: Door at (${e.x}, ${e.y}) can be jumped over (no solid tile above).`);
            }

            // Button & Block Logic
            if (e.type === 'button') {
                if (!tileBelowSolid) errors.push(`Grounded Entities: button at (${e.x}, ${e.y}) is floating.`);
                if (e.properties?.color && !availableBlocks.has(e.properties.color)) {
                    errors.push(`Button Matching: Button at (${e.x}, ${e.y}) is ${e.properties.color}, but no matching coloredBlocks found.`);
                }
            }
            if (e.type === 'coloredBlock' && e.properties?.color) {
                if (!availableButtons.has(e.properties.color)) errors.push(`Button Matching: coloredBlock at (${e.x}, ${e.y}) is ${e.properties.color}, but no matching button found.`);
            }

            // Bounded Water
            if (e.type === 'water') {
                if (!isTerrainSolid(e.x, e.y + 1) && !hasWater(e.x, e.y + 1)) errors.push(`Bounded Water: Water at (${e.x}, ${e.y}) is floating (empty below).`);
                if (!isTerrainSolid(e.x - 1, e.y) && !hasWater(e.x - 1, e.y)) errors.push(`Bounded Water: Water at (${e.x}, ${e.y}) spills to the left.`);
                if (!isTerrainSolid(e.x + 1, e.y) && !hasWater(e.x + 1, e.y)) errors.push(`Bounded Water: Water at (${e.x}, ${e.y}) spills to the right.`);
            }

            // Grounded Entities
            if (e.type === 'spike' || e.type === 'jumpPad' || e.type === 'flag') {
                if (!tileBelowSolid) errors.push(`Grounded Entities: ${e.type} at (${e.x}, ${e.y}) is floating.`);
            }

            // Falling Weights
            if (e.type === 'weight') {
                const tileAboveSolid = isTerrainSolid(e.x, e.y - 1) || level.entities.some(other => other.x === e.x && other.y === e.y - 1 && (other.type === 'coloredBlock' || other.type === 'door'));
                if (!tileAboveSolid) errors.push(`Falling Weights: weight at (${e.x}, ${e.y}) is not attached to a ceiling.`);
                if (tileBelowSolid) errors.push(`Falling Weights: weight at (${e.x}, ${e.y}) has no empty space below it to fall.`);
            }
        }

        return errors;
    }

    const structErrors = validateStructure();
    if (structErrors.length > 0) {
        console.error(`FAIL: Level ${levelPath} failed structural validation:`);
        structErrors.forEach(err => console.error(`  - ${err}`));
        return false;
    }

    const spawn = level.entities.find(e => e.type === 'playerSpawn');
    if (!spawn) {
        console.error(`FAIL: No playerSpawn found in ${levelPath}`);
        return false;
    }

    let initialKeys = "";
    let initialButtons = "";
    const initItems = getNextKeysAndButtons(spawn.x, spawn.y, "", "");
    initialKeys = initItems.keys;
    initialButtons = initItems.buttons;

    const initialState: State = {
        x: spawn.x,
        y: spawn.y,
        jumps: 0,
        keys: initialKeys,
        buttons: initialButtons
    };

    const queue: State[] = [initialState];
    const visited = new Set<string>();
    visited.add(stateHash(initialState));

    let reachedGoal = false;
    let furthestX = 0;
    let head = 0;

    while (head < queue.length) {
        const current = queue[head++];
        const { x, y, jumps, keys, buttons } = current;

        if (x > furthestX) furthestX = x;

        // Check if goal reached at current
        for (const e of getEntities(x, y)) {
            if (e.type === 'teleporter' && (!e.properties || e.properties.targetId === undefined)) {
                reachedGoal = true;
                break;
            }
        }
        if (reachedGoal) break;

        // Handle point-to-point teleportation
        let teleported = false;
        if (!(current as any).justTeleported) {
            for (const e of getEntities(x, y)) {
                if (e.type === 'teleporter' && e.properties && e.properties.targetId !== undefined) {
                    const targetId = e.properties.targetId;
                    const targetTeleporter = level.entities.find(other => 
                        other.type === 'teleporter' && other.properties && other.properties.id === targetId
                    );
                    
                    if (targetTeleporter) {
                        teleported = true;
                        // Instantly enqueue the teleported state
                        const ns: State & { justTeleported?: boolean } = { ...current, x: targetTeleporter.x, y: targetTeleporter.y, jumps: 0, justTeleported: true };
                        const hash = stateHash(ns);
                        if (!visited.has(hash)) {
                            visited.add(hash);
                            queue.push(ns);
                        }
                    }
                }
            }
        }
        
        if (teleported) continue;

        const supported = isLadder(x, y) || isSolid(x, y + 1, keys, buttons);
        let maxJump = 2;
        for (const e of getEntities(x, y)) {
            if (e.type === 'jumpPad') maxJump = 4;
        }

        const rawNextStates: Omit<State, 'keys' | 'buttons'>[] = [];

        if (supported) {
            rawNextStates.push({ x: x - 1, y, jumps: 0 });
            rawNextStates.push({ x: x + 1, y, jumps: 0 });
            rawNextStates.push({ x, y: y + 1, jumps: 0 });
            
            rawNextStates.push({ x, y: y - 1, jumps: maxJump - 1 });
            rawNextStates.push({ x: x - 1, y: y - 1, jumps: maxJump - 1 });
            rawNextStates.push({ x: x + 1, y: y - 1, jumps: maxJump - 1 });
            
            if (isLadder(x, y)) {
                rawNextStates.push({ x, y: y - 1, jumps: 0 });
            }
        } else {
            rawNextStates.push({ x, y: y + 1, jumps: 0 });
            rawNextStates.push({ x: x - 1, y: y + 1, jumps: 0 });
            rawNextStates.push({ x: x + 1, y: y + 1, jumps: 0 });
            
            if (jumps > 0) {
                rawNextStates.push({ x, y: y - 1, jumps: jumps - 1 });
                rawNextStates.push({ x: x - 1, y: y - 1, jumps: jumps - 1 });
                rawNextStates.push({ x: x + 1, y: y - 1, jumps: jumps - 1 });
            }
        }

        for (const rawNs of rawNextStates) {
            if (rawNs.x < 0 || rawNs.x >= level.width || rawNs.y < 0 || rawNs.y >= level.height) continue;
            if (isSolid(rawNs.x, rawNs.y, keys, buttons)) continue;
            if (isHazard(rawNs.x, rawNs.y)) continue;

            const { keys: nextKeys, buttons: nextButtons } = getNextKeysAndButtons(rawNs.x, rawNs.y, keys, buttons);
            
            const ns: State = { ...rawNs, keys: nextKeys, buttons: nextButtons };
            const hash = stateHash(ns);
            if (!visited.has(hash)) {
                visited.add(hash);
                queue.push(ns);
            }
        }
    }

    if (reachedGoal) {
        console.log(`SUCCESS: Level ${levelPath} is valid!`);
        return true;
    } else {
        console.error(`FAIL: Level ${levelPath} is unwinnable. FURTHEST X: ${furthestX}`);
        return false;
    }
}

const args = process.argv.slice(2);
if (args.length === 0) {
    console.error("Usage: tsx scripts/grader.ts <level1.json> [level2.json ...]");
    process.exit(1);
}

let allPassed = true;
for (const file of args) {
    const passed = gradeLevel(file);
    if (!passed) allPassed = false;
}

if (!allPassed) process.exit(1);
