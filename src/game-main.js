import {startGame, VDP} from '../lib/vdp-lib';

const GRAVITY = 0.3;

class Camera {
	constructor() {
		this.x = this.y = 0;
		this.shakeX = this.shakeY = 0;
		this.minimumX = 0;
	}

	update(perso) {
		const camLimit = 16;
		const ofsX = perso.x - this.x;
		const ofsY = perso.y - this.y;

		if (ofsX < vdp.screenWidth / 2 - camLimit) this.x = perso.x - (vdp.screenWidth / 2 - camLimit);
		if (ofsX > vdp.screenWidth / 2) this.x = perso.x - (vdp.screenWidth / 2);
		if (ofsY < vdp.screenHeight / 2 - camLimit) this.y = perso.y - (vdp.screenHeight / 2 - camLimit);
		if (ofsY > vdp.screenHeight / 2 + camLimit) this.y = perso.y - (vdp.screenHeight / 2 + camLimit);

		this.x = Math.min(map.width * map.tileWidth - vdp.screenWidth,  Math.max(this.minimumX, this.x));
		this.y = Math.min(map.height * map.tileHeight - vdp.screenHeight,  Math.max(0, this.y));
	}

	get xFinal() { return this.x + this.shakeX; }
	get yFinal() { return this.y + this.shakeY; }

	transform(x, y) {
		return { x: x - this.xFinal, y: y - this.yFinal };
	}

	transformWithoutShake(x, y) {
		return { x: x - this.x, y: y - this.y };
	}
}

class Perso {
	constructor(x, y) {
		this.x = x;
		this.y = y;
		this.z = 0;
		this.vx = this.vy = this.vz = 0;
		this.width = 24;
		this.height = 24;
	}

	draw() {
		let tileNo = 0;
		if (this.vy > 0 && Math.abs(this.vy) > Math.abs(this.vx)) tileNo = 0;
		else if (this.vy <= 0 && Math.abs(this.vy) > Math.abs(this.vx)) tileNo = 1;
		else if (this.vx > 0) tileNo = 2;
		else if (this.vx <= 0) tileNo = 3;

		const persoTile = vdp.sprite('perso').tile(tileNo);
		const shadowTile = vdp.sprite('shadow');
		const pos = camera.transformWithoutShake(this.x, this.y);
		vdp.drawObject(persoTile, pos.x - persoTile.tw / 2, pos.y - persoTile.th / 2 + this.z / 2, { prio: 3 });
		vdp.drawObject(shadowTile, pos.x - shadowTile.w / 2, pos.y, { prio: 2, transparent: true });
	}

	get left() { return this.x - this.width / 2; }
	get right() { return this.x + this.width / 2; }
	get top() { return this.y - this.height / 2; }
	get bottom() { return this.y + this.height / 2; }
	get grounded() { return this.z >= -0.1; }
	set left(value) { this.x = value + this.width / 2; }

	takeDamage() {

	}

	update() {
		const speed = 2, impulseSpeed = 4, jumpImpulse = -6;
		const targetVelocity = { x: 0, y: 0 };
		const impulse = { x: 0, y: 0 };

		// if (vdp.input.isDown(vdp.input.Key.Up)) targetVelocity.y = -speed;
		// if (vdp.input.isDown(vdp.input.Key.Down)) targetVelocity.y = +speed;
		// if (vdp.input.isDown(vdp.input.Key.Left)) targetVelocity.x = -speed;
		// if (vdp.input.isDown(vdp.input.Key.Right)) targetVelocity.x = +speed;

		// TODO Florian -- refactor to vdp.input.KeyUp
		if (vdp.input.hasToggledDown(vdp.input.Key.Up)) impulse.y = -impulseSpeed;
		if (vdp.input.hasToggledDown(vdp.input.Key.Down)) impulse.y = impulseSpeed;
		if (vdp.input.hasToggledDown(vdp.input.Key.Left)) impulse.x = -impulseSpeed;
		if (vdp.input.hasToggledDown(vdp.input.Key.Right)) impulse.x = impulseSpeed;
		if (vdp.input.hasToggledDown(vdp.input.Key.A) && this.grounded) this.vz = jumpImpulse;

		this.vx += (targetVelocity.x - this.vx) * 0.1;
		this.vy += (targetVelocity.y - this.vy) * 0.1;
		this.vz += GRAVITY;
		this.vx += impulse.x;
		this.vy += impulse.y;

		this.z += this.vz;
		// Do not fall under the ground
		this.z = Math.min(0, this.z);

		// Basic collision detection
		this.x += this.vx;
		while (map.checkCollisionAt(this.left, this.top) || map.checkCollisionAt(this.left, this.bottom)) {
			this.x++;
			//this.vx = 0;
		}
		while (map.checkCollisionAt(this.right, this.top) || map.checkCollisionAt(this.right, this.bottom)) {
			this.x--;
			//this.vx = 0;
		}

		this.y += this.vy;
		while (map.checkCollisionAt(this.left, this.top) || map.checkCollisionAt(this.right, this.top)) {
			this.y++;
			//this.vy = 0;
		}
		while (map.checkCollisionAt(this.left, this.bottom) || map.checkCollisionAt(this.right, this.bottom)) {
			this.y--;
			//this.vy = 0;
		}

		// Can not go to the left
		this.left = Math.max(camera.x, this.left);
	}
}

class Fire {
	constructor() {
		this.x = 0;
	}

	update(perso) {
		if (frameNo % 8 === 0) {
			const firePal = vdp.readPalette('level1-transparent');
			const fireCol = ['#400', '#600', '#800', '#a00', '#c00', '#e00', '#f00', '#e00', '#c00', '#a00', '#800', '#600', '#400'];
			const it = frameNo / 8;
			if (frameNo % 16 === 0) {
				[firePal.array[2], firePal.array[3], firePal.array[4]] = [firePal.array[3], firePal.array[4], firePal.array[2]];
			}
			firePal.array[1] = vdp.color.make(fireCol[it % fireCol.length]);
			vdp.writePalette('level1-transparent', firePal);
		}
		this.x += 0.5;

		// Collision with character
		if (perso.left < this.x) {
			perso.takeDamage();
			perso.vz = -8;
			perso.vx = 10;
			perso.vy = 3;
		}

		// Draw
		const sprite = vdp.sprite('firewall');
		const angle = frameNo / 3;
		let scaleX = Math.cos(angle) * 10, scaleY = Math.sin(angle) * 10;
		const screenPos = camera.transform(this.x, 0);
		const x = Math.min(0, -60 + screenPos.x);
		scaleX += Math.max(0, -60 + screenPos.x);
		scaleX = Math.min(128, sprite.w + scaleX);

		// Do not draw outside of the screen since we're affecting the shadow params
		if (x + scaleX > 0) {
			vdp.configObjectTransparency({op: 'add', blendDst: '#444', blendSrc: '#fff'});
			vdp.drawObject('firewall', x, -15, {prio: 4, transparent: true, width: scaleX, height: 290 + scaleY});
		}
	}
}

class Map {
	constructor(name) {
		this.collisionPlane = vdp.readMap('collisions');
		this.tileWidth = vdp.sprite(name).tw;
		this.tileHeight = vdp.sprite(name).th;
		this.width = this.collisionPlane.width;
		this.height = this.collisionPlane.height;
	}

	checkCollisionAt(x, y) {
		return this.getMapBlockAt(x, y);
	}

	getMapBlockAt(x, y) {
		return this.collisionPlane.getElement(x / this.tileWidth, y / this.tileHeight);
	}
}

function shakeScreen() {
	if (frameNo % 3 === 0) {
		camera.shakeX = Math.random() * 3 - 1;
		camera.shakeY = Math.random() * 3 - 1;
	}
}


/** @type {VDP} */
let vdp;
let frameNo;
let camera = new Camera();
let map;

function *main(_vdp) { vdp = _vdp;
	const fireLimitPos = 960;
	const perso = new Perso(128, 128);
	const fire = new Fire();
	let subscene = 0;

	vdp.configBackdropColor('#000');
	map = new Map('level1');
	frameNo = 0;

	while (true) {
		// Default config, may be overriden
		vdp.configObjectTransparency({ op: 'add', blendDst: '#888', blendSrc: '#fff'});

		perso.update();
		camera.update(perso);

		if (subscene === 0) {
			shakeScreen();
			// Make the fire continously approach
			if (fire.x - camera.x < -0) fire.x = camera.x - 0;
			if (perso.x >= fireLimitPos) {
				subscene = 1;
			}
		}
		else if (subscene === 1) {
			camera.minimumX = Math.min(fireLimitPos, camera.x);
		}

		const bgPos = camera.transform(0, 0);
		vdp.drawBackgroundTilemap('level1-lo', { scrollX: -bgPos.x, scrollY: -bgPos.y, prio: 1 });
		vdp.drawBackgroundTilemap('level1-hi', { scrollX: -bgPos.x, scrollY: -bgPos.y, prio: 13 });
		perso.draw();

		fire.x = Math.min(fire.x, fireLimitPos - 35);
		fire.update(perso);

		frameNo++;
		yield;
	}
}

startGame('#glCanvas', vdp => main(vdp));
