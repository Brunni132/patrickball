const fs = require('fs');
const { _restart } = require('./dsl');
const { watch } = require('./watcher');
const utils = require('./utils');
const args = process.argv.slice(2);
let noWatch = false, noServer = false;

function packGfx() {
	_restart();
	try {
		let code = fs.readFileSync('gfx/packer-main.js', 'utf-8');
		//code = code.replace(/^import .*?;/gm, '').replace(/.*?require\(.*?;/gm, '');
		//code = `(function({conv,currentPalette,currentPaletteMultiple,currentTileset,paletteNamed,spriteNamed,tilesetNamed,mapNamed,addColors,blank,config,image,map,multiPalette,palette,sprite,tileset,tiledMap}){${code}})`;
		code = code.replace(/\.\.\/tools\/gfxConverter\//g, './');
		code = `(function(){${code}})`;
		eval(code)();
	} catch (err) {
		console.error('Error evaluating your code!', err);
	}
}

args.forEach((v) => {
	if (/help/.test(v)) {
		console.log(`Usage: packer [no-server] [no-watch]`);
		process.exit();
	}
	else if (/no-server/.test(v)) noServer = true;
	else if (/no-watch/.test(v)) noWatch = true;
	else console.error(`Unrecognized argument ${v}`.formatAs(utils.FG_RED));
});

console.log('Packing graphics into build directory…');
packGfx();

if (!noServer) {
	const express = require('express');
	const app = express();
	const port = 8080;
	app.use(express.static('./'));
	app.listen(port, () => console.log(`Open your browser to: http://localhost:${port}/`));
	if (noWatch) {
		console.log('After you\'ve made changes to graphics, close and rerun this app'.formatAs(utils.BRIGHT, utils.FG_GREEN));
	}
}

if (!noWatch) {
	watch('gfx', () => {
		console.log('Triggered reload because of change in gfx directory'.formatAs(utils.BRIGHT, utils.FG_MAGENTA));
		packGfx();
		console.log('Done. You can reload the webpage.');
	});
	console.log('Watching for changes on your gfx/ directory; will automatically rebuild.'.formatAs(utils.BRIGHT, utils.FG_GREEN));
}
