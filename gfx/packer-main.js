const { addColors, blank, config, image,map,multiPalette,palette,sprite,tileset, readTmx,tiledMap, paletteNamed, mapNamed, tilesetNamed, conv } = require('../tools/gfxConverter/dsl');




// TODO Florian -- remove disableCache option, dangerous
config({ compact: true, debug: true, disableCache: true }, () => {
	palette('level1', () => {
		const tmx = readTmx('gfx/level1-composite.tmx');
		//tileset('level1', blank(16, 16), 32, 32, () => {
		//	map('level1-lo', 'gfx/level1-lo.png');
		//	map('level1-hi', 'gfx/level1-hi.png');
		//});
		//tmx.updateMap('level1-lo', mapNamed['level1-lo']);
		//tmx.updateMap('level1-hi', mapNamed['level1-hi']);
		//tmx.updateTileset('level1', tilesetNamed['level1']);
		//tmx.writeTmx();

		//tiledMap('level1-lo', 'gfx/level1-lo', { tileWidth: 32, tileHeight: 32, tilesetWidth: 16, tilesetHeight: 16 });
		//tiledMap('level1-hi', 'gfx/level1-hi', { tileWidth: 32, tileHeight: 32, tilesetWidth: 16, tilesetHeight: 16 });

		const til = tmx.readTileset('level1', paletteNamed['level1']);
		tileset(til);
		map(tmx.readMap('level1-hi', til));
		map(tmx.readMap('level1-lo', til));
	});

	palette('level1-transparent', () => {
		sprite('firewall', 'gfx/firewall.png');
	});

	palette('perso', () => {
		tileset('perso', 'gfx/perso.png', 40, 40);
		sprite('shadow', 'gfx/shadow.png');
	});
});
