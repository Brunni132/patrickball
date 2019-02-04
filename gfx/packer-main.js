const { addColors, blank, config, image,map,multiPalette,palette,sprite,tileset, readTmx,tiledMap, paletteNamed, mapNamed, tilesetNamed } = require('../tools/gfxConverter/dsl');
const {Palette} = require("../tools/gfxConverter/palette");
const fs = require('fs');


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

		// TODO Florian -- Make a nice API for that
		const til = tmx.readTileset('level1', paletteNamed['level1'], {tilesetWidth: 12});
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
