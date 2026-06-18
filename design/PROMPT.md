Lets create a simple new web game.  The game is a kids game, a 2d platformer.

The game is called "Contraption"

The Avatar
The player character is a rolling head with some sideways momentum.  When traveling side to side, once the player lets go they keep travelling a little bit.  The player can counteract this with pressing the other direction.  There should be a speed limit to travel so the player can retain control.  Their head model tilts in the direction of travel but behaves a little like a rolling wheel otherwise.  They will roll down slops unless stopped by the player.  They can jump multiple times their own height.  The sprite sheet has 5 heads, the player should be able to select their player from the main screen before starting.

The player has 6 hit points represented by 3 hearts.  The UI shows them in half-heart increments.  It also shows which keys have been collected.

Goal
The player must navigate the level, picking up keys, flipping switches and collecting all the flags before exiting the level.  The player can pickup gems and coins in the level for points but they are not required and have no consequence beyond the score.  Each flag the player touches acts as a checkpoint, preserving the score and position of the player if they die.

Level Design
The level should be largely linear as this is targeted at 8 year olds.  It should largely be a tunnel that wanders around with obstacles to progress.  For example, there could be a pit with spikes.

Each level should have a clear order in which steps should be taken with a clear path between them.  For example:
1. Jump to a raised platform to pickup red key
2. Open the red door to hit the red flag and access the rest of the level
3. Press the blue button which disappears the blue blocks for N seconds.
4. Quickly access the blue key behind the blocks
5. If the blue blocks reappear, exit via the teleporter door
etc

The interactive level elements are:
* jump pads - shoot the player 2x jump height when touched
* ladders - enable climbing upwards

Hazards - hurt the player, short term invincibility, may 'eject' the player with a jump to get them clear of the hazard
* water
* spikes
* spike-balls - pinned in the air, don't run into them
* weight-on-chain - drops down to crush the player based on trigger

There are decorative elements as well:
* Cactus, plants, crates

And helpful elements:
* Hearts - restore 1/2 health

There are 6 level pallets.  Each level should use one pallet consistently.

Art
Lets use a 2d tileset from https://kenney.nl/assets/new-platformer-pack and also include the extra sprites.

Engine
* Lets decide between a native web app and Godot targeting web (see other projects for templates)

Debugging
* We want to log player progress through the level so we can see after the fact what happened.  This should include each interaction with a level element (ex: switches) and periodic location updates.

Execution
We want to build:
* Basic start menu w/ high score
* 3 levels meeting the above criteria
* Interstitial screen between levels
* Victory screen
* Debug mode screen
  * Debug levels
* Player mechanics
  * Health
  * Movement (jump, roll)
  * Pickups (keys, hearts, coins, gems)
  * Scoring
  * Checkpoints
* Base Level mechanics
  * Generation
  * Keys, switches, pickup placement, hazards, etc

Use subagents as much as possible to build individual components.  For level design, we need to generate the levels and a grader to validate generations meet criteria.  Ideally we have a persistence format so we can generate and validate offline.  We probably wanted dedicated levels to validate each mechanic for debugging purposes.

Save this prompt under design/PROMPT.md - before halting, always check the design to see if there are remaining parts we need to build.  There will be some human validation required.  Lets create tasks for each and determine the optimal order to execute them.  Lets have a debug mode button from the UI that lets you start the debug levels with single mechanics in each.
