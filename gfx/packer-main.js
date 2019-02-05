const { addColors, blank, config, image,map,multiPalette,palette,sprite,tileset, readTmx,tiledMap, global } = require('../tools/gfxConverter/dsl.js');
const {Palette} = require('../tools/gfxConverter/palette.js');
const fs = require('fs');

config({ compact: true, debug: true }, () => {
	palette('level1', () => {
		const tmx = readTmx('gfx/level1-composite.tmx');
 		//tileset('level1', blank(16, 16), 32, 32, () => {
 		//	map('base', 'gfx/level1-til.png'); // just to load the tileset with the existing tiles
		//	map('level1-lo', 'gfx/level1-lo.png'); // then add the new tiles at the end
		//	map('level1-hi', 'gfx/level1-hi.png'); // for both planes
		//});
		//tmx.updateMap('level1-lo', global.mapNamed['level1-lo']);
		//tmx.updateMap('level1-hi', global.mapNamed['level1-hi']);
		//tmx.updateTileset('level1', global.tilesetNamed['level1']);
		//tmx.writeTmx();

		const til = tmx.readTileset('level1', global.paletteNamed['level1'], {tilesetWidth: 12});
		tileset(til);
		map(tmx.readMap('level1-hi', til));
		map(tmx.readMap('level1-lo', til));

		const collisionTil = tmx.readTileset('objects', new Palette('temp'));
		map(tmx.readMap('collisions', collisionTil));


		const objects = {
			objects: tmx.json.map.objectgroup[0].object,
			firstTile: parseInt(tmx.getTileset('objects')['$'].firstgid)
		};
		fs.writeFileSync('src/level1-objects.json', JSON.stringify(objects));

		tileset('level1-more', 'gfx/level1-more.png', 32, 32, {tilesetWidth: 1});
	});

	palette('level1-transparent', () => {
		sprite('firewall', 'gfx/firewall.png');
	});

	palette('perso', () => {
		tileset('perso', 'gfx/perso.png', 24, 24, {tilesetWidth: 1});
		sprite('shadow', 'gfx/shadow.png');
		tileset('enemy1', 'gfx/enemy1.png', 24, 24, {tilesetWidth: 1});
	});

	palette('objects', () => {
		sprite('flame', 'gfx/flame.png');
	});
});
