import {startGame, VDP} from '../lib/vdp-lib';
const objectDefinitions = require('./level1-objects.json');

const TIMESTEP = 1 / 60;
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

	isVisible(object) {
		const pos = this.transform(object.x, object.y);
		return pos.x + object.width >= 0 && pos.y + object.height >= 0 &&
			pos.x < vdp.screenWidth && pos.y < vdp.screenHeight;
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

class Animatable {
	constructor() {
		this.animState = 'normal';
		this.animCoroutine = null;
	}

	setCoroutine(coroutine) {
		this.animCoroutine = coroutine.bind(this)();
		console.log(`TEMP BORDEL`, this);
	}

	updateAnims() {
		const coroutine = this.animCoroutine;
		if (coroutine && coroutine.next().done) {
			if (this.animCoroutine === coroutine) this.animCoroutine = null;
		}
	}
}

class Perso extends Animatable {
	constructor(x, y) {
		super();
		this.x = x;
		this.y = y;
		this.z = 0;
		this.vx = this.vy = this.vz = 0;
		this.width = 24;
		this.height = 12;
	}

	draw() {
		let tileNo = 0;
		if (this.vy > 0 && Math.abs(this.vy) > Math.abs(this.vx)) tileNo = 0;
		else if (this.vy <= 0 && Math.abs(this.vy) > Math.abs(this.vx)) tileNo = 1;
		else if (this.vx > 0) tileNo = 2;
		else if (this.vx <= 0) tileNo = 3;

		if (this.animState === 'hit') tileNo = 4;

		const persoTile = vdp.sprite('perso').tile(tileNo);
		const shadowTile = vdp.sprite('shadow');
		const pos = camera.transformWithoutShake(this.x, this.y);
		vdp.drawObject(persoTile, pos.x - 12, pos.y - 18 + this.z / 2, { prio: 3 });
		vdp.drawObject(shadowTile, pos.x - shadowTile.w / 2, pos.y, { prio: 3, transparent: true });
	}

	get left() { return this.x - this.width / 2; }
	get right() { return this.x + this.width / 2; }
	get top() { return this.y - this.height / 2; }
	get bottom() { return this.y + this.height / 2; }
	get grounded() { return this.z >= -0.1; }
	set left(value) { this.x = value + this.width / 2; }

	stompedEnemy() {
		this.vz = -6;
	}

	takeDamage(standardPushSideways = true, impulseZ = -8) {
		this.vz = impulseZ;
		if (standardPushSideways) {
			Object.assign(this, {vz: impulseZ, vx: -4 * Math.sign(this.vx), vy: 0});
		}
		this.setCoroutine(function *changeAnimationState() {
			for (let i = 0; i < 60; i++) {
				this.animState = 'hit';
				yield;
			}
		});
	}

	update() {
		const speed = 2, impulseSpeed = 3, jumpImpulse = -6;
		const targetVelocity = { x: 0, y: 0 };
		const impulse = { x: 0, y: 0 };

		if (this.animState !== 'hit') {
			if (vdp.input.isDown(vdp.input.Key.Up)) targetVelocity.y = -speed;
			if (vdp.input.isDown(vdp.input.Key.Down)) targetVelocity.y = +speed;
			if (vdp.input.isDown(vdp.input.Key.Left)) targetVelocity.x = -speed;
			if (vdp.input.isDown(vdp.input.Key.Right)) targetVelocity.x = +speed;
			if (vdp.input.hasToggledDown(vdp.input.Key.A) && this.grounded) this.vz = jumpImpulse;
		}

		this.animState = 'normal';

		// TODO Florian -- refactor to vdp.input.KeyUp
		// if (vdp.input.hasToggledDown(vdp.input.Key.Up)) impulse.y = -impulseSpeed;
		// if (vdp.input.hasToggledDown(vdp.input.Key.Down)) impulse.y = impulseSpeed;
		// if (vdp.input.hasToggledDown(vdp.input.Key.Left)) impulse.x = -impulseSpeed;
		// if (vdp.input.hasToggledDown(vdp.input.Key.Right)) impulse.x = impulseSpeed;

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

		// Coroutines take precedence over animation state
		this.updateAnims();
	}
}

class Fire {
	constructor() {
		this.x = 0;
	}

	update(perso) {
		this.x += 0.5;

		// Collision with character
		if (perso.left < this.x) {
			perso.takeDamage(false);
			Object.assign(perso, { vx: 10, vy: 3 });
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
			vdp.configObjectTransparency({op: 'add', blendDst: '#888', blendSrc: '#fff'});
			vdp.drawObject('firewall', x, -15, {prio: 8, transparent: true, width: scaleX, height: 290 + scaleY});
			// vdp.drawObject('firewall', x + scaleX - vdp.sprite('firewall').w, -15, {prio: 4, transparent: true, height: 290 + scaleY});
		}
	}
}

class LiveObject extends Animatable {
	constructor(objDef) {
		super();
		this.width = parseInt(objDef.width);
		this.height = parseInt(objDef.height);
		this.x = parseInt(objDef.x);
		this.y = parseInt(objDef.y) - this.height;
	}

	collidesWith(perso, margin = 0) {
		const z = 0, depth = 2;
		return perso.right + margin >= this.left && perso.left - margin < this.right &&
			perso.bottom + margin >= this.top && perso.top - margin < this.bottom &&
			Math.abs(perso.z - 0) <  depth;
	}

	destroy() {
		const thisIndex = liveObjects.indexOf(this);
		liveObjects.splice(thisIndex, 1);
	}

	draw() {}

	get left() { return this.x; }
	get right() { return this.x + this.width; }
	get top() { return this.y; }
	get bottom() { return this.y + this.height; }

	update(perso) {}
}

class CrackledTile extends LiveObject {
	constructor(objDef, props) {
		super(objDef);
		this.explosionAnimation = 0;
	}

	draw() {
		const pos = camera.transform(this.x, this.y);

		if (this.explosionAnimation < 3) {
			const animTile = Math.min(2, Math.ceil(this.explosionAnimation));
			vdp.drawObject(vdp.sprite('level1-more').tile(animTile), pos.x, pos.y, {prio: 2});
		}
		else {
			const animSpeed = 50;
			const height = Math.min(192, (this.explosionAnimation - 3) * animSpeed);
			const flameTop = vdp.sprite('flame').offsetted(0, 0, 32, 25);
			const flameBody = vdp.sprite('flame').offsetted(0, 25, 32, 48 - 25);
			const flameBodyHeight = Math.max(0, height - 25);
			const width = 32 + Math.sin(this.explosionAnimation * 100) * 5;
			vdp.drawObject(flameTop, pos.x - (width - 32) / 2, pos.y + 32 - height, {prio: 4, width, height: Math.min(25, height) });
			vdp.drawObject(flameBody, pos.x - (width - 32) / 2, pos.y + 32 - flameBodyHeight, {prio: 4, width, height: flameBodyHeight });
		}
	}

	update(perso) {
		if (this.explosionAnimation > 0) {
			this.explosionAnimation += TIMESTEP * 8;
		}
		else if (perso.right >= this.left - 48) {
			this.explosionAnimation = TIMESTEP * 8;
		}

		if (this.explosionAnimation >= 3 && this.collidesWith(perso, -8)) {
			perso.takeDamage(true);
		}
	}
}

class Enemy1 extends LiveObject {
	constructor(objDef, props) {
		super(objDef);
		this.width = this.height = 24;
		this.followPlayer = props.followPlayer;
	}

	draw() {
		let tileNo = (frameNo / 16) % 3;
		const pos = camera.transform(this.x, this.y);
		if (this.animState !== 'blinking' || frameNo % 2) {
			vdp.drawObject(vdp.sprite('enemy1').tile(tileNo), pos.x, pos.y, {prio: 2});
		}
	}

	update(perso) {
		this.updateAnims();
		if (this.followPlayer && camera.isVisible(this)) {
			this.x -= Math.sign(this.x - perso.x) * 0.25;
			this.y -= Math.sign(this.y - perso.y) * 0.25;
		}
		if (this.collidesWith(perso, -4)) {
			if (perso.z < 0) {
				perso.stompedEnemy();
				this.setCoroutine(function*() {
					for (let i = 0; i < 30; i++) {
						this.animState = 'blinking';
						yield;
					}
					this.destroy();
				});
			}
			else perso.takeDamage();
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

function addObject(obj) {
	liveObjects.push(obj);
}

function drawObjects() {
	for (let i = 0; i < liveObjects.length; i++) {
		if (camera.isVisible(liveObjects[i])) liveObjects[i].draw();
	}
}

function prepareObjects() {
	for (let i = 0; i < objectDefinitions.objects.length; i++) {
		const obj = objectDefinitions.objects[i];
		if (!obj['$'].gid) continue;
		const tileNo = parseInt(obj['$'].gid - objectDefinitions.firstTile);
		const properties = obj.properties || {};
		if (tileNo === 2) addObject(new CrackledTile(obj['$'], properties));
		else if (tileNo === 3) addObject(new Enemy1(obj['$'], properties));
		else if (tileNo === 4) addObject(new Enemy1(obj['$'], Object.assign({ followPlayer: true }, properties)));
		else throw new Error(`Unsupported object type ${tileNo + objectDefinitions.firstTile}`);
	}
}

function shakeScreen() {
	if (frameNo % 3 === 0) {
		camera.shakeX = Math.random() * 3 - 1;
		camera.shakeY = Math.random() * 3 - 1;
	}
}

function updateObjects(perso) {
	for (let i = liveObjects.length - 1; i >= 0; i--) {
		liveObjects[i].update(perso);
	}
}

function rotatePalettes() {
	// Fire
	if (frameNo % 4 === 0) {
		const firePal = vdp.readPalette('level1-transparent');
		// const fireCol = ['#400', '#600', '#800', '#a00', '#c00', '#e00', '#f00', '#e00', '#c00', '#a00', '#800', '#600', '#400'];
		const it = (frameNo / 4) % 8;
		// if (frameNo % 16 === 0) {
		// 	[firePal.array[2], firePal.array[3], firePal.array[4]] = [firePal.array[3], firePal.array[4], firePal.array[2]];
		// }
		// firePal.array[1] = vdp.color.make(fireCol[it % fireCol.length]);
		firePal.array[1] = vdp.color.make(255, 160 + it * 16, 0);
		firePal.array[2] = vdp.color.make(160 + it * 8, 0, 0);
		firePal.array[3] = vdp.color.make(255, 64 + it * 8, 0);
		vdp.writePalette('level1-transparent', firePal);
	}

	if (frameNo % 4 === 0) {
		const pal = vdp.readPalette('objects');
		[pal.array[1], pal.array[2], pal.array[3]] = [pal.array[2], pal.array[3], pal.array[1]];
		vdp.writePalette('objects', pal);
	}
}

/** @type {VDP} */
let vdp;
let frameNo;
let camera = new Camera();
let map;
let liveObjects = [];
let coroutines = [];

function *main(_vdp) { vdp = _vdp;
	const fireLimitPos = 960;
	 //const perso = new Perso(128, 128);
	const perso = new Perso(1400, 500);
	const fire = new Fire();
	let subscene = 0;

	vdp.configBackdropColor('#000');
	map = new Map('level1');
	frameNo = 0;

	prepareObjects();

	while (true) {
		// Default config, may be overriden
		vdp.configObjectTransparency({ op: 'add', blendDst: '#888', blendSrc: '#fff'});

		perso.update();
		camera.update(perso);
		updateObjects(perso);
		rotatePalettes();
		for (let i = 0; i < coroutines.length; i++) coroutines[i].next();

		if (subscene === 0) {
			shakeScreen();
			// Make the fire continously approach
			if (fire.x - camera.x < -0) fire.x = camera.x - 0;
			if (perso.x >= fireLimitPos) {
				subscene = 1;
			}
		}
		else if (subscene === 1) {
			// Close the view
			camera.minimumX = Math.min(fireLimitPos, camera.x + 1);
			fire.x = Math.min(fire.x + 4, fireLimitPos - 35);
			if (camera.x < fireLimitPos) shakeScreen();
		}

		const bgPos = camera.transform(0, 0);
		vdp.drawBackgroundTilemap('level1-lo', { scrollX: -bgPos.x, scrollY: -bgPos.y, prio: 1 });
		vdp.drawBackgroundTilemap('level1-hi', { scrollX: -bgPos.x, scrollY: -bgPos.y, prio: 13 });
		perso.draw();
		drawObjects();

		fire.update(perso);

		frameNo++;
		yield;
	}
}

startGame('#glCanvas', vdp => main(vdp));
