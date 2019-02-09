const { addColors, blank, config, image,map,multiPalette,palette,sprite,tileset, readTmx,tiledMap, global } = require('../tools/gfxConverter/dsl.js');
const {Palette} = require('../tools/gfxConverter/palette.js');
const fs = require('fs');

config({ compact: true, debug: true }, () => {
	palette('level1', () => {
		const tmx = readTmx('level1-new.tmx');
		const til = tmx.readTileset('level1', global.paletteNamed['level1'], {tilesetWidth: 16});
		tileset(til);
		map(tmx.readMap('level1-hi', til));
		map(tmx.readMap('level1-lo', til));

		const objects = {
			objects: tmx.json.map.objectgroup[0].object,
			firstTile: parseInt(tmx.getTileset('objects')['$'].firstgid),
			tileTypes: [
				'0-2;6-8;12-14;18-21;24-25;38-41;46-47;66-69;86-89;97-98;102-104', 'wall',
				'108-113', 'fire|void|goleft',
				'37;45;53;41;114-117', 'void|godown',
			]
		};
		fs.writeFileSync('../src/level1.json', JSON.stringify(objects));

		tileset('level1-more', 'level1-more.png', 32, 32, {tilesetWidth: 1});
		sprite('rock-pillar', 'rock-pillar.png');
	});

	palette('perso', () => {
		tileset('perso', 'perso.png', 24, 24, {tilesetWidth: 1});
		sprite('shadow', 'shadow.png');
		tileset('enemy1', 'enemy1.png', 24, 24, {tilesetWidth: 1});
	});

	palette('objects', () => {
		sprite('firewall', 'firewall.png');
		sprite('flame', 'flame.png');
		sprite('cart-lateral', 'cart-lateral.png');
		sprite('cart-vertical', 'cart-vertical.png');
	});

	palette('blank1', () => {});
	palette('blank2', () => {});
	palette('blank3', () => {});
});
