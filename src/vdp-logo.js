import {VDP} from '../lib/vdp-lib';

/** @type {VDP} */
let vdp;

export function *logo(_vdp) {
	vdp = _vdp;
	let offset = 15;
	let intro = -100;

	vdp.configBackdropColor('#000');
	const basePal = vdp.readPalette('vdp-logo', vdp.CopySource.rom);
	const pals = vdp.readPaletteMemory(0, 0, 16, 8, vdp.CopySource.blank);
	for (let j = 0; j < 7; j++) {
		for (let i = 0; i < 16; i++) {
			const col = vdp.color.toHsl(basePal.array[i]);
			col.h = j / 7;
			col.s = 1;
			col.l *= 0.7;
			pals.setElement(i, j + 1, vdp.color.makeFromHsl(col));
		}
	}
	for (let i = 0; i < 16; i++) {
		pals.setElement(i, 0, basePal.array[i]);
	}
	vdp.writePaletteMemory(0, 0, 16, 8, pals);

	const lineTransform = new vdp.LineTransformationArray();
	while (intro < 100) {
		for (let i = 0; i < lineTransform.length; i++) {
			const mat = vdp.mat3.create();
			let x = Math.max(0, Math.floor(i / 2) - intro);
			vdp.mat3.translate(mat, mat, [i % 2 ? x : -x, i]);
			lineTransform.setLine(i, mat);
		}

		const palette = vdp.palette('vdp-logo');
		palette.y = 0;
		vdp.drawBackgroundTilemap('vdp-logo', { wrap: false, scrollY: -80, scrollX: -50, winH: 140, lineTransform, palette });
		vdp.drawBackgroundTilemap('vdp-logo-2', {wrap: false, scrollY: -140, winY: 140, winH: Math.max(0, intro - 20), lineTransform, palette });
		intro += 2;
		yield;
	}


	const logoMap = vdp.readMap('vdp-logo');
	let frameNo = 0;
	while (frameNo < 136) {
		const palZero = vdp.palette('vdp-logo');
		palZero.y = 0;

		const centerX = Math.floor(logoMap.width * 0.75);
		const centerY = Math.floor(logoMap.height * 0.5);
		for (let j = 0; j < logoMap.height; j++) {
			for (let i = 0; i < logoMap.width; i++) {
				// Part without palette
				let el = logoMap.getElement(i, j) & 0x1fff;
				let dist = Math.sqrt(Math.abs(i - centerX) * Math.abs(i - centerX) + Math.abs(j - centerY) * Math.abs(j - centerY));
				dist = Math.pow(dist, 0.8);
				dist = Math.max(0, Math.min(16, Math.floor(dist / 2 + offset)));
				logoMap.setElement(i, j, el | dist << 13);
			}
		}
		vdp.writeMap('vdp-logo', logoMap);

		vdp.drawBackgroundTilemap('vdp-logo', { wrap: false, scrollY: -80, scrollX: -50, palette: palZero });
		vdp.drawBackgroundTilemap('vdp-logo-2', { wrap: false, scrollY: -140, winY: 140, palette: palZero });
		offset -= 0.5;
		frameNo++;

		if (frameNo >= 120) {
			vdp.configFade({ color: '#000', factor: (frameNo - 120) * 16 });
		}
		yield;
	}

	vdp.writePaletteMemory(0, 0, 16, 8, vdp.readPaletteMemory(0, 0, 16, 8, vdp.CopySource.rom));
	vdp.configFade({ color: '#000', factor: 0 });
}
