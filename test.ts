  ladderWinnable.tiles[11 * ladderWinnable.width + 8] = 1;
  ladderWinnable.entities.push({ type: 'ladder', x: 7, y: 13 });
  ladderWinnable.entities.push({ type: 'ladder', x: 7, y: 12 });
  ladderWinnable.entities.push({ type: 'ladder', x: 7, y: 11 });
  runGraderOn('debug_ladder_winnable', ladderWinnable, true);
  
  // Debug Level: Ladder Unwinnable (Ladder doesn't reach high enough)
  const ladderUnwinnable = createBaseLevel();
  ladderUnwinnable.tiles[13 * ladderUnwinnable.width + 8] = 1;
  ladderUnwinnable.tiles[12 * ladderUnwinnable.width + 8] = 1;
  ladderUnwinnable.tiles[11 * ladderUnwinnable.width + 8] = 1;
  ladderUnwinnable.tiles[10 * ladderUnwinnable.width + 8] = 1;
  ladderUnwinnable.entities.push({ type: 'ladder', x: 7, y: 13 });
  ladderUnwinnable.entities.push({ type: 'ladder', x: 7, y: 12 });
  // Missing top ladders
> runGraderOn('debug_ladder_unwinnable', ladderUnwinnable);
  
  // Debug Level: Teleporter Winnable
