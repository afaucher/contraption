import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.load.setPath('assets/platformer_pack/Spritesheets/');
    this.load.atlasXML('characters', 'spritesheet-characters-default.png', 'spritesheet-characters-default.xml');
    this.load.atlasXML('tiles', 'spritesheet-tiles-default.png', 'spritesheet-tiles-default.xml');
    this.load.atlasXML('enemies', 'spritesheet-enemies-default.png', 'spritesheet-enemies-default.xml');
    this.load.atlasXML('backgrounds', 'spritesheet-backgrounds-default.png', 'spritesheet-backgrounds-default.xml');

    this.load.setPath('assets/platformer_pack/Sprites/Backgrounds/Default/');
    this.load.image('bg_cloud', 'background_solid_cloud.png');
    this.load.image('bg_hills', 'background_color_hills.png');
  }

  create() {
    this.scene.start('MenuScene');
  }
}
