import Phaser from 'phaser';

export class VictoryScene extends Phaser.Scene {
  private levelName: string = 'levels/level1.json';
  private characterType: string = 'green';
  private coins: number = 0;

  constructor() {
    super('VictoryScene');
  }

  init(data: { levelName?: string, character?: string, coins?: number }) {
    if (data && data.levelName) {
      this.levelName = data.levelName;
    }
    if (data && data.character) {
      this.characterType = data.character;
    }
    if (data && data.coins !== undefined) {
      this.coins = data.coins;
    }
  }

  create() {
    // Backgrounds
    const bgSky = this.add.tileSprite(0, 0, this.cameras.main.width, this.cameras.main.height, 'bg_cloud');
    bgSky.setOrigin(0, 0);
    const bgHills = this.add.tileSprite(0, this.cameras.main.height - 256, this.cameras.main.width, 256, 'bg_hills');
    bgHills.setOrigin(0, 0);

    // Title
    this.add.text(this.cameras.main.centerX, 100, 'LEVEL COMPLETE!', { 
      fontSize: '48px', color: '#00ff00', stroke: '#000000', strokeThickness: 6 
    }).setOrigin(0.5);

    // Player Sprite
    this.add.sprite(this.cameras.main.centerX, 220, 'characters', `character_${this.characterType}_idle`).setScale(2);

    // Score
    this.add.text(this.cameras.main.centerX, 300, `Coins Collected: ${this.coins}`, { 
      fontSize: '32px', color: '#ffffff', stroke: '#000000', strokeThickness: 4 
    }).setOrigin(0.5);

    let nextLevel = '';
    if (this.levelName === 'levels/level1.json') nextLevel = 'levels/level2.json';
    else if (this.levelName === 'levels/level2.json') nextLevel = 'levels/level3.json';

    if (nextLevel !== '') {
      const btnNext = this.add.text(this.cameras.main.centerX, 420, 'Next Level', { 
        fontSize: '36px', color: '#ffff00', stroke: '#000000', strokeThickness: 4 
      }).setOrigin(0.5).setInteractive();
      btnNext.on('pointerdown', () => {
        this.scene.start('GameScene', { level: nextLevel, character: this.characterType });
      });
      btnNext.on('pointerover', () => btnNext.setScale(1.1));
      btnNext.on('pointerout', () => btnNext.setScale(1));
    } else {
      const btnMenu = this.add.text(this.cameras.main.centerX, 420, 'Back to Menu', { 
        fontSize: '36px', color: '#ffff00', stroke: '#000000', strokeThickness: 4 
      }).setOrigin(0.5).setInteractive();
      btnMenu.on('pointerdown', () => {
        this.scene.start('MenuScene');
      });
      btnMenu.on('pointerover', () => btnMenu.setScale(1.1));
      btnMenu.on('pointerout', () => btnMenu.setScale(1));
    }
  }
}
