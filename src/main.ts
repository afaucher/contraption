import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { VictoryScene } from './scenes/VictoryScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'app',
  render: {
    roundPixels: true
  },
  physics: {
    default: 'matter',
    matter: {
      gravity: { x: 0, y: 1 },
      debug: false,
      enableSleeping: false
    }
  },
  scene: [BootScene, MenuScene, GameScene, UIScene, VictoryScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

new Phaser.Game(config);
