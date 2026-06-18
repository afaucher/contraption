import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  private selectedChar: string = 'green';

  constructor() {
    super('MenuScene');
  }

  create() {
    this.add.tileSprite(0, 0, 800, 600, 'backgrounds', 'background_solid_cloud').setOrigin(0, 0);
    this.add.tileSprite(0, 600 - 256, 800, 256, 'backgrounds', 'background_color_hills').setOrigin(0, 0);

    this.add.text(400, 100, 'CONTRAPTION', { fontSize: '48px', color: '#ffffff', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5);

    // Character Selection
    const chars = ['beige', 'green', 'pink', 'purple', 'yellow'];

    const headSprites: Phaser.GameObjects.Sprite[] = [];

    chars.forEach((c, index) => {
      // 128x128 images. Scale them down.
      const sprite = this.add.sprite(200 + index * 100, 260, 'characters', `character_${c}_idle`)
        .setInteractive();
      
      const updateScale = () => {
        sprite.setScale(c === this.selectedChar ? 1.0 : 0.6);
      };
      updateScale();

      sprite.on('pointerdown', () => {
        this.selectedChar = c;
        headSprites.forEach(s => (s as any).updateScale());
      });

      (sprite as any).updateScale = updateScale;
      headSprites.push(sprite);
    });

    const startBtn = this.add.text(400, 360, 'Start Game', { fontSize: '36px', color: '#00ff00', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5).setInteractive();
    startBtn.on('pointerdown', () => {
      this.scene.start('GameScene', { level: 'levels/level1.json', character: this.selectedChar });
    });

    // Debug Menu - Hidden by default
    const debugGroup = this.add.group();
    const debugTitle = this.add.text(400, 420, '--- Debug Levels ---', { fontSize: '24px', color: '#ffff00', stroke: '#000000', strokeThickness: 2 }).setOrigin(0.5);
    debugGroup.add(debugTitle);

    const debugs = ['spikes.json', 'doors.json', 'jumppad.json', 'water.json', 'buttons.json'];
    debugs.forEach((d, index) => {
      const btn = this.add.text(150 + index * 125, 470, d.split('.')[0], { fontSize: '18px', color: '#ffaaaa', stroke: '#000000', strokeThickness: 2 }).setOrigin(0.5).setInteractive();
      btn.on('pointerdown', () => {
        this.scene.start('GameScene', { level: `levels/debug/${d}`, character: this.selectedChar });
      });
      debugGroup.add(btn);
    });

    const actualLevels = ['level1.json', 'level2.json', 'level3.json'];
    actualLevels.forEach((l, index) => {
      const btn = this.add.text(250 + index * 125, 510, l.split('.')[0], { fontSize: '18px', color: '#aaffaa', stroke: '#000000', strokeThickness: 2 }).setOrigin(0.5).setInteractive();
      btn.on('pointerdown', () => {
        this.scene.start('GameScene', { level: `levels/${l}`, character: this.selectedChar });
      });
      debugGroup.add(btn);
    });

    // Hide debug by default
    debugGroup.setVisible(false);

    // Spiky ball button (top right) to toggle debug
    const debugToggle = this.add.sprite(750, 50, 'enemies', 'saw_rest').setInteractive();
    debugToggle.setScale(0.8);
    debugToggle.on('pointerdown', () => {
      const isVisible = (debugGroup.getChildren()[0] as Phaser.GameObjects.Text).visible;
      debugGroup.setVisible(!isVisible);
    });
  }
}
