---
name: implement_contraption_feature
description: Guide for fully implementing a new gameplay feature, entity, or hazard in the Contraption platformer engine, ensuring no steps are missed.
---

# Implementing a Contraption Feature

When tasked with implementing a new mechanical feature, entity, or hazard in the Contraption game engine, you MUST follow this exact sequence of steps to ensure the feature is fully integrated, playable, and mathematically verifiable by the pathfinding grader.

## Step 1: Define the Entity (schema.ts)
- Open `src/schema.ts`
- If the feature introduces a new map entity, add it to the `EntityType` union type.
- Add any new required `properties` to the schema documentation block at the bottom of the file (e.g., `{ color: 'red' }`).

## Step 2: Implement Physics & Rendering (GameScene.ts)
- Open `src/scenes/GameScene.ts`
- In `create()`, find the section where `level.entities.forEach(ent => ...)` is processed.
- Render the entity using the appropriate sprite from the tileset (check `spritesheet-tiles-default.xml` for frame names).
- Add any necessary Phaser 3 physics bodies (`this.physics.add.sprite` or `this.physics.add.staticSprite`).
- Add overlap or collider logic (e.g., `this.physics.add.overlap(this.player, newEntity, callback)`).
- Implement the core mechanical logic (e.g., modifying score, modifying velocity, killing the player).

## Step 3: Update the Level Generator (generator.ts)
- Open `scripts/generator.ts`
- Add a helper method to the `LevelBuilder` class to easily place the new feature (e.g., `addLadder(x, y, height)`, `addTeleporterPair(...)`).
- Integrate the new feature into the actual game levels (`genLevel1`, `genLevel2`, or `genLevel3`) so players can experience it. Make sure the placement is physically jumpable!

## Step 4: Write Debug Maps (test_bad_levels.ts)
- Open `scripts/test_bad_levels.ts`
- Create at least one intentionally "bad" or unwinnable level map focusing on your new feature (e.g., "Level with a floating ladder", "Level where a teleporter leads into spikes").
- Add the test to the script and verify that running it fails the grader.

## Step 5: Update the Pathfinding Grader (grader.ts)
- Open `scripts/grader.ts`
- **Structural Checks**: If your feature has placement rules (e.g., must be placed on solid ground), add a rule to `validateStructure()`.
- **Pathfinding Logic**: Update `getNextKeysAndButtons()` or the BFS state transitions to correctly mathematically simulate your feature. For example, if adding ladders, ensure the pathfinder allows vertical movement without spending jump points. If adding teleporters, push the target coordinates to the queue.

## Step 6: Verify and Test
- Run `npx tsx scripts/test_bad_levels.ts` to ensure your bad levels are caught.
- Run `npx tsx scripts/generator.ts` followed by `npx tsx scripts/grader.ts public/levels/level1.json public/levels/level2.json public/levels/level3.json` to ensure the real levels are 100% winnable.
- Boot the Vite server (`npm run dev`) and manually playtest the feature in the browser to ensure the physics "feel" right.
