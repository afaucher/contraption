import Phaser from 'phaser';

export class UIScene extends Phaser.Scene {
  private scoreSprites: Phaser.GameObjects.Sprite[] = [];
  private heartSprites: Phaser.GameObjects.Sprite[] = [];
  private keySprites: Phaser.GameObjects.Sprite[] = [];

  constructor() {
    super('UIScene');
  }

  create() {
    // Score icon
    this.add.sprite(40, 40, 'tiles', 'hud_coin').setScale(0.8);
    this.updateScore(0);

    // Hearts (max 3)
    for (let i = 0; i < 3; i++) {
      const heart = this.add.sprite(40 + i * 50, 90, 'tiles', 'hud_heart').setScale(0.8);
      this.heartSprites.push(heart);
    }
    this.updateHealth(6);
    // Listen for events from GameScene
    const gameScene = this.scene.get('GameScene');
    gameScene.events.on('update-score', this.updateScore, this);
    gameScene.events.on('update-health', this.updateHealth, this);
    gameScene.events.on('update-keys', this.updateKeys, this);
  }

  updateScore(score: number) {
    this.scoreSprites.forEach(s => s.destroy());
    this.scoreSprites = [];
    const scoreStr = score.toString();
    for (let i = 0; i < scoreStr.length; i++) {
      const char = scoreStr[i];
      const s = this.add.sprite(80 + i * 35, 40, 'tiles', `hud_character_${char}`).setScale(0.8);
      this.scoreSprites.push(s);
    }
  }

  updateHealth(hp: number) {
    for (let i = 0; i < 3; i++) {
      const hpForThisHeart = hp - i * 2;
      if (hpForThisHeart >= 2) {
        this.heartSprites[i].setFrame('hud_heart');
      } else if (hpForThisHeart === 1) {
        this.heartSprites[i].setFrame('hud_heart_half');
      } else {
        this.heartSprites[i].setFrame('hud_heart_empty');
      }
    }
  }

  updateKeys(keys: string[]) {
    this.keySprites.forEach(s => s.destroy());
    this.keySprites = [];
    keys.forEach((color, i) => {
      const s = this.add.sprite(40 + i * 50, 140, 'tiles', `hud_key_${color}`).setScale(0.8);
      this.keySprites.push(s);
    });
  }
}
