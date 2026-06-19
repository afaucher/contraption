import Phaser from 'phaser';
import { Player } from '../player/Player';
import type { LevelData, EntityData } from '../schema';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private score: number = 0;
  private keys: string[] = [];
  private levelName!: string;
  private playerChar!: string;

  private bgSky!: Phaser.GameObjects.TileSprite;
  private bgHills!: Phaser.GameObjects.TileSprite;
  private telemetry: any[] = [];
  private lastLogTime: number = 0;
  private interactables: Phaser.Physics.Matter.Sprite[] = [];
  private gameEnded: boolean = false;
  
  private debugGroup!: Phaser.GameObjects.Group;
  private isDebugVisible: boolean = false;

  private touchingLadders: number = 0;
  private lastTeleportTime: number = 0;
  
  private respawnX!: number;
  private respawnY!: number;

  // Dynamic camera zoom
  private currentZoom: number = 1;
  private targetZoom: number = 1;
  private worldWidth: number = 0;
  private worldHeight: number = 0;

  constructor() {
    super('GameScene');
  }

  init(data: { level: string, character?: string }) {
    this.levelName = data.level;
    this.playerChar = data.character || 'green';
    this.score = 0;
    this.keys = [];
    this.telemetry = [];
    this.lastLogTime = 0;
    this.interactables = [];
    this.gameEnded = false;
    this.touchingLadders = 0;
    this.lastTeleportTime = 0;
  }

  preload() {
    if (this.cache.json.exists('levelData')) {
      this.cache.json.remove('levelData');
    }
    this.load.json('levelData', this.levelName);
  }

  create() {
    this.scene.launch('UIScene');
    
    this.debugGroup = this.add.group();
    this.isDebugVisible = false;
    
    this.input.keyboard?.on('keydown-F1', (event: any) => {
      event.preventDefault();
      this.isDebugVisible = !this.isDebugVisible;
      this.debugGroup.getChildren().forEach((child: any) => child.setVisible(this.isDebugVisible));
    });
    
    this.bgSky = this.add.tileSprite(0, 0, this.cameras.main.width, this.cameras.main.height, 'bg_cloud');
    this.bgSky.setOrigin(0, 0);
    this.bgSky.setScrollFactor(0);
    this.bgSky.setDepth(-10);

    this.bgHills = this.add.tileSprite(0, this.cameras.main.height - 256, this.cameras.main.width, 256, 'bg_hills');
    this.bgHills.setOrigin(0, 0);
    this.bgHills.setScrollFactor(0);
    this.bgHills.setDepth(-9);

    const data: LevelData = this.cache.json.get('levelData');
    if (!data) return;

    const ts = data.tileSize || 64;
    let spawnX = 100, spawnY = 100;

    for (let y = 0; y < data.height; y++) {
      for (let x = 0; x < data.width; x++) {
        const id = data.tiles[y * data.width + x];
        if (id > 0) {
          const px = x * ts + ts / 2;
          const py = y * ts + ts / 2;
          let frame = 'terrain_grass_block_center';
          let flipX = false;

          if (id === 1) {
            const up = (y > 0) ? data.tiles[(y - 1) * data.width + x] : 0;
            const down = (y < data.height - 1) ? data.tiles[(y + 1) * data.width + x] : 1; 
            const left = (x > 0) ? data.tiles[y * data.width + (x - 1)] : 0;
            const right = (x < data.width - 1) ? data.tiles[y * data.width + (x + 1)] : 0;

            if (up === 2 || (up >= 7 && up <= 9)) {
              // The block above is a / slope. Use flipped ramp_short_a for the grass corner.
              frame = (up === 2) ? 'terrain_grass_ramp_short_a' : 'terrain_grass_block_top_left';
              if (up === 2) flipX = true;
            } else if (up === 3 || (up >= 4 && up <= 6)) {
              // The block above is a \ slope. Use ramp_short_a for the grass corner.
              frame = (up === 3) ? 'terrain_grass_ramp_short_a' : 'terrain_grass_block_top_right';
            } else {
              const u = up !== 0;
              const d = down !== 0;
              const l = left !== 0;
              const r = right !== 0;

              if (!u) {
                if (!l && !r) frame = 'terrain_grass_block';
                else if (!l) frame = 'terrain_grass_block_top_left';
                else if (!r) frame = 'terrain_grass_block_top_right';
                else frame = 'terrain_grass_block_top';
              } else if (!d) {
                if (!l && !r) frame = 'terrain_grass_block_bottom';
                else if (!l) frame = 'terrain_grass_block_bottom_left';
                else if (!r) frame = 'terrain_grass_block_bottom_right';
                else frame = 'terrain_grass_block_bottom';
              } else {
                if (!l && !r) frame = 'terrain_grass_block_center';
                else if (!l) frame = 'terrain_grass_block_left';
                else if (!r) frame = 'terrain_grass_block_right';
                else frame = 'terrain_grass_block_center';
              }
            }
          } else if (id === 2) { // / slope
            frame = 'terrain_grass_ramp_short_b';
            flipX = true;
          } else if (id === 3) { // \ slope
            frame = 'terrain_grass_ramp_short_b';
          } else if (id === 4 || id === 5) { // Long Down (\)
            if (id === 4) frame = 'terrain_grass_ramp_long_a';
            if (id === 5) frame = 'terrain_grass_ramp_long_b';
          } else if (id === 7 || id === 8) { // Long Up (/)
            if (id === 7) frame = 'terrain_grass_ramp_long_b'; // Left block rises from 64 to 32
            if (id === 8) frame = 'terrain_grass_ramp_long_a'; // Right block rises from 32 to 0
            flipX = true; // Kenney only has \ long ramps, so flip them for /
          } else if (id >= 10 && id <= 12) { // Platform
            if (id === 10) frame = 'terrain_grass_horizontal_left';
            if (id === 11) frame = 'terrain_grass_horizontal_middle';
            if (id === 12) frame = 'terrain_grass_horizontal_right';
          } else if (id >= 13 && id <= 15) { // Pillar
            if (id === 13) frame = 'terrain_grass_vertical_top';
            if (id === 14) frame = 'terrain_grass_vertical_middle';
            if (id === 15) frame = 'terrain_grass_vertical_bottom';
          } else if (id === 16) { // Dirt block (underneath surface)
            frame = 'terrain_grass_block_center';
          }
          
          const tile = this.add.sprite(px, py, 'tiles', frame);
          if (flipX) tile.setFlipX(true);
          // Overlap by 0.5 pixels on all sides to hide subpixel rendering gaps
          tile.setDisplaySize(ts + 1, ts + 1);
          
          if (id === 1 || id === 16) {
            this.matter.add.rectangle(px, py, ts, ts, { isStatic: true });
          } else if (id === 2 || id === 3) {
            const verts = id === 2 ? '0 64 64 64 64 0' : '0 0 64 64 0 64';
            const body = this.matter.add.fromVertices(px, py, verts, { isStatic: true });
            
            // Calculate the bounds offset to shift the body's bounding box back onto the grid
            const bounds = body.bounds;
            const boundsCenterX = bounds.min.x + (bounds.max.x - bounds.min.x) / 2;
            const boundsCenterY = bounds.min.y + (bounds.max.y - bounds.min.y) / 2;
            
            const dx = px - boundsCenterX;
            const dy = py - boundsCenterY;
            
            this.matter.body.setPosition(body, { x: body.position.x + dx, y: body.position.y + dy });
          } else if (id === 4 || id === 5 || id === 7 || id === 8) {
            // Long Ramp Down (4,5) and Up (7,8)
            let verts = '';
            if (id === 4) verts = '0 0 64 32 64 64 0 64';
            else if (id === 5) verts = '0 32 64 64 0 64';
            else if (id === 7) verts = '0 64 64 32 64 64';
            else if (id === 8) verts = '0 32 64 0 64 64 0 64';
            
            const body = this.matter.add.fromVertices(px, py, verts, { isStatic: true });
            
            const bounds = body.bounds;
            const boundsCenterX = bounds.min.x + (bounds.max.x - bounds.min.x) / 2;
            const boundsCenterY = bounds.min.y + (bounds.max.y - bounds.min.y) / 2;
            
            const dx = px - boundsCenterX;
            const dy = py - boundsCenterY;
            
            this.matter.body.setPosition(body, { x: body.position.x + dx, y: body.position.y + dy });
          } else if (id >= 10 && id <= 12) {
            // Thin Platform (top half)
            this.matter.add.rectangle(px, py - 16, ts, 32, { isStatic: true });
          } else if (id >= 13 && id <= 15) {
            // Vertical Pillar (middle third)
            this.matter.add.rectangle(px, py, 32, ts, { isStatic: true });
          }
          
          // Debug Text
          let dbgText = `${x},${y}\n#${id} ${frame.replace('terrain_grass_', '')}`;
          if (id === 1) {
            const up = (y > 0) ? data.tiles[(y - 1) * data.width + x] : 0;
            const down = (y < data.height - 1) ? data.tiles[(y + 1) * data.width + x] : 1; 
            const left = (x > 0) ? data.tiles[y * data.width + (x - 1)] : 0;
            const right = (x < data.width - 1) ? data.tiles[y * data.width + (x + 1)] : 0;
            dbgText += `\nU${up} D${down} L${left} R${right}`;
          }
          const text = this.add.text(px, py, dbgText, { 
            fontSize: '9px', 
            color: '#ffffff', 
            stroke: '#000000', 
            strokeThickness: 3, 
            align: 'center' 
          }).setOrigin(0.5);
          text.setVisible(this.isDebugVisible);
          this.debugGroup.add(text);
        }
      }
    }

    data.entities.forEach(ent => {
      const px = ent.x * ts + ts / 2;
      const py = ent.y * ts + ts / 2;
      
      if (ent.type === 'playerSpawn') {
        spawnX = px;
        spawnY = py;
        this.respawnX = px;
        this.respawnY = py;
      } else {
        let frame = 'block_empty';
        if (ent.type === 'key') frame = `key_${ent.properties?.color || 'yellow'}`;
        if (ent.type === 'door') frame = `lock_${ent.properties?.color || 'red'}`;
        if (ent.type === 'coloredBlock') {
          const active = ent.properties?.active !== false; // default true
          frame = active ? `block_${ent.properties?.color || 'blue'}` : 'block_empty';
        }
        if (ent.type === 'button') {
          const pressed = !!ent.properties?.pressed;
          frame = pressed ? `switch_${ent.properties?.color || 'blue'}_pressed` : `switch_${ent.properties?.color || 'blue'}`;
        }
        if (ent.type === 'flag') frame = 'flag_off';
        if (ent.type === 'spike') frame = 'spikes';
        if (ent.type === 'jumpPad') frame = 'spring';
        if (ent.type === 'heart') frame = 'heart';
        if (ent.type === 'teleporter') frame = 'sign_exit';
        if (ent.type === 'water') frame = 'water_top';
        if (ent.type === 'coin') frame = 'coin_gold';
        if (ent.type === 'gem') frame = `gem_${ent.properties?.color || 'blue'}`;
        if (ent.type === 'ladder') frame = 'ladder_middle';
        if (ent.type === 'weight') frame = 'weight';
        if (ent.type === 'spikeBall') frame = 'saw';

        // Doors, blocks, and weights are solid
        const isSolid = (ent.type === 'door' || ent.type === 'weight' || (ent.type === 'coloredBlock' && ent.properties?.active !== false));
        
        const sprite = this.matter.add.sprite(px, py, 'tiles', frame, {
          isStatic: ent.type !== 'weight',
          isSensor: !isSolid
        });
        
        sprite.setDisplaySize(ts, ts);
        
        // Ensure weight is initially static and unaffected by gravity until triggered
        if (ent.type === 'weight') {
          sprite.setStatic(true);
          sprite.setIgnoreGravity(true);
          sprite.setData('falling', false);
        }
        
        sprite.setData('entityData', ent);
        this.interactables.push(sprite);
      }
    });

    this.player = new Player(this, spawnX, spawnY, this.playerChar);
    
    this.matter.world.on('collisionstart', (event: Phaser.Physics.Matter.Events.CollisionStartEvent) => {
      event.pairs.forEach((pair) => {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;
        
        let playerBody = null;
        let otherBody = null;
        
        if (bodyA === this.player.body) { playerBody = bodyA; otherBody = bodyB; }
        else if (bodyB === this.player.body) { playerBody = bodyB; otherBody = bodyA; }
        
        if (playerBody && otherBody) {
          const sprite = otherBody.gameObject as Phaser.Physics.Matter.Sprite;
          if (sprite && sprite.getData) {
            const ent = sprite.getData('entityData') as EntityData;
            if (ent) {
              if (ent.type === 'ladder') {
                this.touchingLadders++;
              }
              this.handleEntityInteraction(sprite, ent);
            }
          }
        }
      });
    });

    this.matter.world.on('collisionactive', (event: Phaser.Physics.Matter.Events.CollisionActiveEvent) => {
      event.pairs.forEach((pair) => {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;
        let playerBody = null;
        let otherBody = null;
        if (bodyA === this.player.body) { playerBody = bodyA; otherBody = bodyB; }
        else if (bodyB === this.player.body) { playerBody = bodyB; otherBody = bodyA; }
        if (playerBody && otherBody) {
          const sprite = otherBody.gameObject as Phaser.Physics.Matter.Sprite;
          if (sprite && sprite.getData) {
            const ent = sprite.getData('entityData') as EntityData;
            if (ent && (ent.type === 'spike' || ent.type === 'water' || ent.type === 'spikeBall' || ent.type === 'weight')) {
              this.handleEntityInteraction(sprite, ent);
            }
          }
        }
      });
    });

    this.matter.world.on('collisionend', (event: Phaser.Physics.Matter.Events.CollisionEndEvent) => {
      event.pairs.forEach((pair) => {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;
        
        let playerBody = null;
        let otherBody = null;
        
        if (bodyA === this.player.body) { playerBody = bodyA; otherBody = bodyB; }
        else if (bodyB === this.player.body) { playerBody = bodyB; otherBody = bodyA; }
        
        if (playerBody && otherBody) {
          const sprite = otherBody.gameObject as Phaser.Physics.Matter.Sprite;
          if (sprite && sprite.getData) {
            const ent = sprite.getData('entityData') as EntityData;
            if (ent && ent.type === 'ladder') {
              this.touchingLadders = Math.max(0, this.touchingLadders - 1);
            }
          }
        }
      });
    });

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.worldWidth = data.width * ts;
    this.worldHeight = data.height * ts;
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.matter.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
  }

  safeDestroy(entity: Phaser.Physics.Matter.Sprite) {
    if (!entity || !entity.active) return;
    entity.setCollisionCategory(0);
    entity.setVisible(false);
    this.time.delayedCall(0, () => {
      if (entity && entity.active) entity.destroy();
    });
  }

  private shouldEndGame: boolean = false;
  private victoryFlag: boolean = false;

  handleEntityInteraction(entity: Phaser.Physics.Matter.Sprite, ent: EntityData) {
    if (this.gameEnded) return;
    this.telemetry.push({ event: 'interact', type: ent.type, time: Date.now() });

    if (ent.type === 'key') {
      this.addKey(ent.properties?.color || 'generic');
      this.safeDestroy(entity);
    } else if (ent.type === 'button') {
      const now = this.time.now;
      const lastToggled = entity.getData('lastToggled') || 0;
      if (now - lastToggled < 500) return;
      entity.setData('lastToggled', now);

      const color = ent.properties?.color || 'blue';
      const isPressed = ent.properties?.pressed || false;
      const newPressed = !isPressed;
      ent.properties = ent.properties || {};
      ent.properties.pressed = newPressed;
      
      entity.setFrame(newPressed ? `switch_${color}_pressed` : `switch_${color}`);
      
      this.interactables.forEach(i => {
        if (i.active && i.getData) {
          const iEnt = i.getData('entityData') as EntityData;
          if (iEnt && iEnt.type === 'coloredBlock' && iEnt.properties?.color === color) {
            const active = iEnt.properties?.active !== false;
            const newActive = !active;
            iEnt.properties = iEnt.properties || {};
            iEnt.properties.active = newActive;
            
            if (newActive) {
              i.setSensor(false);
              i.setFrame(`block_${color}`);
              i.setAlpha(1.0);
            } else {
              i.setSensor(true);
              i.setFrame('block_empty');
              i.setAlpha(0.5); // semitransparent when inactive
            }
          }
        }
      });
    } else if (ent.type === 'flag') {
      if (entity.frame.name !== 'flag_green_a') {
        console.log('Checkpoint reached');
        entity.setFrame('flag_green_a');
        this.respawnX = entity.x;
        this.respawnY = entity.y;
      }
    } else if (ent.type === 'door') {
      if (this.hasKey(ent.properties?.color || 'generic')) {
        this.safeDestroy(entity);
      }
    } else if (ent.type === 'spike' || ent.type === 'water' || ent.type === 'spikeBall') {
      if (this.player.isInvulnerable || this.player.isDying) return;
      
      this.player.hp -= 1;
      this.events.emit('update-health', this.player.hp);
      this.player.setVelocityY(-10); // Knockback
      
      if (this.player.hp <= 0) {
        this.player.playDeathAnimation(() => {
          this.player.hp = 6;
          this.events.emit('update-health', this.player.hp);
          this.player.setPosition(this.respawnX, this.respawnY);
          this.player.setVelocity(0, 0);
          this.player.startInvulnerability(1500);
        });
      } else {
        this.player.startInvulnerability(1500);
      }
    } else if (ent.type === 'weight') {
      if (this.player.isInvulnerable || this.player.isDying) return;
      if (entity.getData('falling') && this.player.y >= entity.y - 32) {
        this.player.hp -= 1;
        this.events.emit('update-health', this.player.hp);
        this.player.setVelocityY(-10);
        
        if (this.player.hp <= 0) {
          this.player.playDeathAnimation(() => {
            this.player.hp = 6;
            this.events.emit('update-health', this.player.hp);
            this.player.setPosition(this.respawnX, this.respawnY);
            this.player.setVelocity(0, 0);
            this.player.startInvulnerability(1500);
          });
        } else {
          this.player.startInvulnerability(1500);
        }
      }
    } else if (ent.type === 'jumpPad') {
      this.player.setVelocityY(-30);
      entity.setFrame('spring_out');
      this.time.delayedCall(500, () => {
        if (entity && entity.active) entity.setFrame('spring');
      });
    } else if (ent.type === 'heart') {
      if (this.player.hp < 6) {
        this.player.hp = Math.min(6, this.player.hp + 1);
        this.events.emit('update-health', this.player.hp);
        this.safeDestroy(entity);
      }
    } else if (ent.type === 'coin' || ent.type === 'gem') {
      this.addScore(ent.type === 'gem' ? 10 : 1);
      if (ent.type === 'gem') {
        const emitter = this.add.particles(entity.x, entity.y, 'tiles', {
          frame: entity.frame.name,
          speed: 150,
          scale: { start: 0.4, end: 0 },
          lifespan: 600,
          blendMode: 'ADD'
        });
        emitter.explode(8);
      }
      this.safeDestroy(entity);
    } else if (ent.type === 'teleporter') {
      if (ent.properties && ent.properties.targetId !== undefined) {
        if (this.time.now - this.lastTeleportTime < 500) return;
        
        const targetTeleporter = this.interactables.find(i => {
          const iEnt = i.getData('entityData') as EntityData;
          return iEnt && iEnt.type === 'teleporter' && iEnt.properties && iEnt.properties.id === ent.properties!.targetId;
        });
        
        if (targetTeleporter) {
          this.lastTeleportTime = this.time.now;
          this.player.setPosition(targetTeleporter.x, targetTeleporter.y);
          this.player.setVelocity(0, 0);
        }
      } else {
        this.endGame(true);
      }
    }
  }

  private endGame(victory: boolean) {
    if (this.gameEnded) return;
    this.gameEnded = true;
    this.victoryFlag = victory;

    try {
      localStorage.setItem(`telemetry_${this.levelName}_${Date.now()}`, JSON.stringify(this.telemetry));
    } catch (e) {
      console.warn("Telemetry save failed:", e);
    }

    // Flag to transition on the next update loop, safely outside physics resolution
    this.shouldEndGame = true;
  }

  update(time: number, _delta: number) {
    if (this.shouldEndGame) {
      this.shouldEndGame = false;
      this.scene.stop('UIScene');
      this.scene.start(this.victoryFlag ? 'VictoryScene' : 'MenuScene', { 
        levelName: this.levelName, 
        character: this.playerChar,
        coins: this.score
      }); 
      return;
    }

    if (this.gameEnded) return;

    if (this.player) {
      this.player.update();
      if (this.bgHills) {
        this.bgHills.tilePositionX = this.cameras.main.scrollX * 0.5;
      }
      
      if (this.touchingLadders > 0) {
        this.player.setIgnoreGravity(true);
        // Map Up/Down to vertical velocity
        const cursors = this.input.keyboard!.createCursorKeys();
        const wKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        const sKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        
        const isUp = cursors.up.isDown || wKey.isDown;
        const isDown = cursors.down.isDown || sKey.isDown;
        
        let vY = 0;
        if (isUp) vY = -4;
        else if (isDown) vY = 4;
        
        this.player.setVelocityY(vY);
      } else {
        this.player.setIgnoreGravity(false);
      }

      // Dynamic camera zoom: zoom out when airborne for better reaction time
      const vy = this.player.body ? this.player.body.velocity.y : 0;
      const isAirborne = Math.abs(vy) > 2 && this.touchingLadders === 0;
      this.targetZoom = isAirborne ? 0.7 : 1.0;
      
      // Smooth lerp toward target
      const lerpSpeed = isAirborne ? 0.02 : 0.05; // Zoom out slowly, zoom in faster
      this.currentZoom += (this.targetZoom - this.currentZoom) * lerpSpeed;
      this.cameras.main.setZoom(this.currentZoom);

      // Resize backgrounds to fill the viewport at any zoom level
      const viewW = this.cameras.main.width / this.currentZoom;
      const viewH = this.cameras.main.height / this.currentZoom;
      if (this.bgSky) {
        this.bgSky.setSize(viewW, viewH);
      }
      if (this.bgHills) {
        this.bgHills.setSize(viewW, 256 / this.currentZoom);
        this.bgHills.setY(viewH - 256 / this.currentZoom);
      }

      // Adjust camera bounds so zoomed-out view doesn't show outside the world
      this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
    }

    this.interactables.forEach(i => {
      if (!i.active) return;
      const ent = i.getData('entityData') as EntityData;
      if (!ent) return;

      if (ent.type === 'weight') {
        if (!i.getData('falling')) {
          const dx = Math.abs(this.player.x - i.x);
          const dy = this.player.y - i.y;
          if (dx < 32 && dy > 0 && dy < 600) {
            i.setData('falling', true);
            i.setStatic(false);
            i.setIgnoreGravity(false);
          }
        }
      } else if (ent.type === 'spikeBall') {
        if (!i.getData('initialized')) {
          i.setData('initialized', true);
          i.setData('startX', i.x);
          i.setData('startY', i.y);
          i.setData('timer', 0);
        }
        const range = ent.properties?.range || 128;
        const dir = ent.properties?.direction || 'horizontal';
        const timer = i.getData('timer') + _delta * 0.003;
        i.setData('timer', timer);
        
        if (dir === 'horizontal') {
          i.x = i.getData('startX') + Math.sin(timer) * range;
        } else {
          i.y = i.getData('startY') + Math.sin(timer) * range;
        }
      }
    });

    if (time - this.lastLogTime > 1000) {
      this.telemetry.push({ event: 'pos', x: Math.round(this.player.x), y: Math.round(this.player.y), time: Date.now() });
      this.lastLogTime = time;
    }
  }

  public addScore(points: number) {
    this.score += points;
    this.events.emit('update-score', this.score);
  }

  public addKey(color: string) {
    this.keys.push(color);
    this.events.emit('update-keys', this.keys);
  }

  public hasKey(color: string): boolean {
    return this.keys.includes(color);
  }
}
