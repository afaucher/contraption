import Phaser from 'phaser';

export class Player extends Phaser.Physics.Matter.Sprite {
  public hp: number = 6;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private jumpKey: Phaser.Input.Keyboard.Key;
  private canJump: boolean = true;
  private wasd: any;

  // Invulnerability
  public isInvulnerable: boolean = false;
  private invulnerabilityTimer?: Phaser.Time.TimerEvent;
  private flashTween?: Phaser.Tweens.Tween;

  // Death animation
  public isDying: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, color: string) {
    super(scene.matter.world, x, y, 'characters', `character_${color}_idle`);
    
    scene.add.existing(this);
    
    // 128x128 sprite natively. Scale to 0.5 makes it 64x64 (1 block).
    this.setCircle(32);
    this.setScale(0.5);
    this.setFriction(0.005);
    this.setFrictionAir(0.01);
    this.setBounce(0.2);
    this.setFixedRotation(); // Stop physical rotation, we will tilt visually
    
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.wasd = scene.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    });
    this.jumpKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    
    // Simple jump logic
    scene.events.on('update', this.handleInput, this);
    
    // Reset jump when hitting something
    scene.matter.world.on('collisionstart', (event: any) => {
      event.pairs.forEach((pair: any) => {
        if (pair.bodyA === this.body || pair.bodyB === this.body) {
          this.canJump = true;
        }
      });
    });
  }

  handleInput() {
    const isUp = Phaser.Input.Keyboard.JustDown(this.jumpKey) || Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.wasd.up);
    if (isUp && this.canJump) {
      this.setVelocityY(-10);
      this.canJump = false;
    }
  }

  update() {
    if (this.isDying) return; // No input during death animation

    const isLeft = this.cursors.left.isDown || this.wasd.left.isDown;
    const isRight = this.cursors.right.isDown || this.wasd.right.isDown;

    const force = 0.003;
    if (isLeft) {
      this.applyForce(new Phaser.Math.Vector2(-force, 0));
    } else if (isRight) {
      this.applyForce(new Phaser.Math.Vector2(force, 0));
    }
    
    const maxVelocity = 8;
    if (this.body && this.body.velocity.x > maxVelocity) this.setVelocityX(maxVelocity);
    if (this.body && this.body.velocity.x < -maxVelocity) this.setVelocityX(-maxVelocity);

    // Visual tilt based on velocity
    const maxTilt = 30; // degrees
    if (this.body) {
      const tilt = (this.body.velocity.x / maxVelocity) * maxTilt;
      this.setAngle(tilt);
    }
  }

  /** Start invulnerability window with white flash effect */
  startInvulnerability(durationMs: number = 1500) {
    this.isInvulnerable = true;

    // Cancel any existing flash
    if (this.flashTween) this.flashTween.destroy();
    if (this.invulnerabilityTimer) this.invulnerabilityTimer.destroy();

    // Rapid flash: alternate between white tint and normal
    this.flashTween = this.scene.tweens.add({
      targets: this,
      alpha: { from: 1, to: 0.3 },
      duration: 100,
      yoyo: true,
      repeat: Math.floor(durationMs / 200),
      onUpdate: (_tween, target) => {
        // Flash white on the dim frames
        if (target.alpha < 0.7) {
          target.setTintFill(0xffffff);
        } else {
          target.clearTint();
        }
      },
      onComplete: () => {
        this.clearTint();
        this.setAlpha(1);
      }
    });

    this.invulnerabilityTimer = this.scene.time.delayedCall(durationMs, () => {
      this.isInvulnerable = false;
      this.clearTint();
      this.setAlpha(1);
      if (this.flashTween) {
        this.flashTween.destroy();
        this.flashTween = undefined;
      }
    });
  }

  /** Play death animation: spin + fade out, then call onComplete */
  playDeathAnimation(onComplete: () => void) {
    this.isDying = true;
    this.setCollisionCategory(0); // Disable collisions during death

    // Launch the player upward
    this.setVelocity(0, -12);
    this.setIgnoreGravity(false);

    // Spin and fade out
    this.scene.tweens.add({
      targets: this,
      angle: 720,
      alpha: 0,
      scale: 0.1,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
        this.isDying = false;
        this.setAlpha(1);
        this.setScale(0.5);
        this.setAngle(0);
        this.setCollisionCategory(1); // Re-enable collisions
        onComplete();
      }
    });
  }

  destroy(fromScene?: boolean) {
    if (this.scene && this.scene.events) {
      this.scene.events.off('update', this.handleInput, this);
    }
    super.destroy(fromScene);
  }
}
