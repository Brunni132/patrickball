import {startGame, VDP} from '../lib/vdp-lib';
import {Coroutines} from "./utils";
const objectDefinitions = require('./level1.json');

const TIMESTEP = 1 / 60;
const GRAVITY = 0.3;
const MAX_Z = 300;

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

class Perso {
	constructor(x, y) {
		this.x = x;
		this.y = y;
		this.z = 0;
		this.vx = this.vy = this.vz = 0;
		this.width = 24;
		this.height = 12;
		this.maxZ = 0;
		this.direction = 0; // 0=down, 1=up, 2=right, 3=left
	}

	draw() {
		let tileNo = this.direction;
		if (this.animState === 'hit') tileNo = 4;

		const persoTile = vdp.sprite('perso').tile(tileNo);
		const shadowTile = vdp.sprite('shadow');
		const pos = camera.transformWithoutShake(this.x, this.y);
		const prio = this.falling ? 2 : 3; // go behind objects when falling
		vdp.drawObject(persoTile, pos.x - 12, pos.y - 18 + this.z / 2, { prio });
		if (this.overGround) {
			vdp.drawObject(shadowTile, pos.x - shadowTile.w / 2, pos.y, {prio, transparent: true});
		} else if (!this.overGround && this.z < 10) {
			vdp.drawObject(shadowTile, pos.x - shadowTile.w / 2 + 6, pos.y + 12, {prio: 2, transparent: true, width: 12, height: 5 });
		}
	}

	get left() { return this.x - this.width / 2; }
	get right() { return this.x + this.width / 2; }
	get top() { return this.y - this.height / 2; }
	get bottom() { return this.y + this.height / 2; }
	get falling() { return !this.overGround && this.z >= 10 && this.vz >= 0; }
	get grounded() { return this.z >= -0.1 && this.overGround; }
	get overGround() { return this.maxZ < MAX_Z; }
	set left(value) { this.x = value + this.width / 2; }

	notifyGroundOnObject(obj) {
		this.maxZ = 0;
	}

	stompedEnemy() {
		this.vz = -6;
	}

	takeDamage(pushSideways = true, impulseZ = -8) {
		if (pushSideways) {
			Object.assign(this, {vz: impulseZ, vx: -6 * Math.sign(this.vx), vy: 0});
		}
		coroutines.replace(this, 'anim', frame => {
			this.animState = 'hit';
			return frame < 60;
		});
	}

	update() {
		const speed = 2, impulseSpeed = 3, jumpImpulse = -6;
		const targetVelocity = { x: 0, y: 0 };
		const impulse = { x: 0, y: 0 };

		if (this.animState !== 'hit') {
			if (vdp.input.isDown(vdp.input.Key.Up)) { targetVelocity.y = -speed; this.direction = 1; }
			if (vdp.input.isDown(vdp.input.Key.Down)) { targetVelocity.y = +speed; this.direction = 0; }
			if (vdp.input.isDown(vdp.input.Key.Left)) { targetVelocity.x = -speed; this.direction = 3; }
			if (vdp.input.isDown(vdp.input.Key.Right)) { targetVelocity.x = +speed; this.direction = 2; }
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
		this.z = Math.min(this.maxZ, this.z);

		// Fallen out of the map
		if (this.z >= MAX_Z) replacePersoInLevel(this);
		if (this.grounded) this.vz = 0;

		if (!this.falling) {
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
		}

		// Can not go to the left
		this.left = Math.max(camera.x, this.left);
		this.maxZ = 0;

		// Special tile roles (fire)
		const roles = map.listRolesAt(this.x, this.y);
		if (roles.includes('void')) this.maxZ = MAX_Z;
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
			Object.assign(perso, { vx: 10, vy: 3, vz: -10 });
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

class LiveObject {
	constructor(objDef) {
		this.width = parseInt(objDef.width);
		this.height = parseInt(objDef.height);
		this.x = parseInt(objDef.x);
		this.y = parseInt(objDef.y) - this.height;
	}

	collidesWith(perso, margin = 0, {ignoreDepth = false} = {}) {
		const z = 0, depth = 2;
		return perso.right + margin >= this.left && perso.left - margin < this.right &&
			perso.bottom + margin >= this.top && perso.top - margin < this.bottom &&
			(Math.abs(perso.z - 0) <  depth || ignoreDepth);
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

	objectPriority(perso) { return this.top <= perso.bottom ? 2 : 3; }

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
			perso.takeDamage();
		}
	}
}

class Enemy1 extends LiveObject {
	constructor(objDef, props) {
		super(objDef);
		this.width = this.height = 24;
		this.followPlayer = props.followPlayer;
		this.disableFor = 0;
	}

	draw() {
		let tileNo = (frameNo / 16) % 3;
		const pos = camera.transform(this.x, this.y);
		if (this.animState !== 'blinking' || frameNo % 2) {
			vdp.drawObject(vdp.sprite('enemy1').tile(tileNo), pos.x, pos.y, {prio: 2});
		}
	}

	update(perso) {
		if (this.followPlayer && camera.isVisible(this) && this.disableFor <= 0) {
			this.x -= Math.sign(this.x - perso.x) * 0.25;
			this.y -= Math.sign(this.y - perso.y) * 0.25;
		}
		this.disableFor = Math.max(0, this.disableFor - TIMESTEP);
		if (this.collidesWith(perso, -4)) {
			if (perso.z < 0) {
				perso.stompedEnemy();
				this.update = () => {};
				coroutines.replace(this, 'anim', frame => {
					if (frame < 30) {
						this.animState = 'blinking';
						return true;
					}
					this.destroy();
					return false;
				});
			}
			else {
				perso.takeDamage();
				this.disableFor = 1;
			}
		}
	}
}

class RockPillar extends LiveObject {
	constructor(objDef, props) {
		super(objDef);
		this.width = this.height = 32;
		this.visiblePart = 0;
	}

	draw(perso) {
		const pos = camera.transform(this.x, this.y - this.visiblePart + 32);
		if (this.visiblePart < 32) {
			pos.x += Math.random() * 3 - 1;
			pos.y += Math.random() * 3 - 1;
		}

		const top = vdp.sprite('rock-pillar').offsetted(0, 0, 32, Math.min(32, this.visiblePart));
		vdp.drawObject(top, pos.x, pos.y, {prio: this.objectPriority(perso)});
		//if (this.visiblePart >= 32) {
		//	const pillar = vdp.sprite('rock-pillar').offsetted(0, 32, 32, this.visiblePart - 32);
		//	vdp.drawObject(pillar, pos.x, pos.y + 32, {prio: 2});
		//}
	}

	update(perso) {
		if (camera.isVisible(this)) {
			if (this.visiblePart < 1) this.visiblePart += 0.05;
			else this.visiblePart = Math.min(32, this.visiblePart + 1);
		}
		if (this.collidesWith(perso, -2, {ignoreDepth: true}) && perso.z <= 0) {
			perso.notifyGroundOnObject(this);
		}
	}
}

class Map {
	constructor(name) {
		this.hiPlane = vdp.readMap(name + '-hi');
		this.loPlane = vdp.readMap(name + '-lo');
		this.tileWidth = vdp.sprite(name).tw;
		this.tileHeight = vdp.sprite(name).th;
		this.width = this.loPlane.width;
		this.height = this.loPlane.height;
		this.tileRoles = {};

		// Parse tile roles (['1-3;5-6', 'role1|role2', '4;7-8', 'role3', …]
		for (let i =  0; i < objectDefinitions.tileTypes.length; i += 2) {
			const intervals = objectDefinitions.tileTypes[i].split(';');
			const roles = objectDefinitions.tileTypes[i + 1].split('|');
			for (let interval of intervals) {
				let [lo, up] = interval.split('-');
				for (let j = up || lo; j >= lo; j--) {
					this.tileRoles[j] = roles;
				}
			}
		}
	}

	checkCollisionAt(x, y) {
		return this.listRolesAt(x, y).includes('wall');
	}

	listRolesAt(x, y) {
		const loTile = this.getBlockAt(this.loPlane, x, y);
		const hiTile = this.getBlockAt(this.hiPlane, x, y);
		return (this.tileRoles[loTile] || []).concat(this.tileRoles[hiTile] || []);
	}

	getBlockAt(plane, x, y) {
		return plane.getElement(x / this.tileWidth, y / this.tileHeight);
	}
}

function addObject(obj) {
	liveObjects.push(obj);
}

function animateLevel() {
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

		let pal = vdp.readPalette('objects');
		[pal.array[1], pal.array[2], pal.array[3]] = [pal.array[2], pal.array[3], pal.array[1]];
		vdp.writePalette('objects', pal);

		// Pulse red of the fire field
		//let triangle = Math.floor(frameNo / 16) % 8;
		//if (triangle >= 4) triangle = 7 - triangle;
		//pal = vdp.readPalette('level1');
		//pal.array[10] = vdp.color.make(0xcc + 0x11 * triangle, 0, 0x22);
		//vdp.writePalette('level1', pal);
	}

	if (frameNo % 16 === 1) {
		// Replace fire bubble tile
		let tileNo = 110 + Math.max(0, Math.floor(frameNo / 16) % 6 - 2);
		let tile = vdp.readSprite(vdp.sprite('level1').tile(tileNo), vdp.CopySource.rom);
		vdp.writeSprite(vdp.sprite('level1').tile(111), tile);
	}

	if (frameNo % 8 === 1) {
		let tileNo = 113 + Math.floor(frameNo / 8) % 4;
		if (tileNo === 113) tileNo = 108;
		const tile = vdp.readSprite(vdp.sprite('level1').tile(tileNo), vdp.CopySource.rom);
		vdp.writeSprite(vdp.sprite('level1').tile(108), tile);
	}
}

function drawObjects(perso) {
	for (let i = 0; i < liveObjects.length; i++) {
		if (camera.isVisible(liveObjects[i])) liveObjects[i].draw(perso);
	}
}

function replacePersoInLevel(perso) {
	perso.z = 0;
	perso.vz = -10;
	perso.vx = -10;
	//perso.vz = perso.vx = perso.vy = 0;
	//perso.x = 1711;
	//perso.y = 568;
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
		else if (tileNo === 5) addObject(new RockPillar(obj['$'], properties));
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

/** @type {VDP} */
let vdp;
let frameNo;
let camera = new Camera();
let map;
let liveObjects = [];
let coroutines = new Coroutines();

function *main(_vdp) { vdp = _vdp;
	const fireLimitPos = 960;
	//const perso = new Perso(100, 128);
	const perso = new Perso(2160, 550);
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
		animateLevel();
		// Coroutines take precedence on previous handlers (including objects)
		coroutines.updateAll();

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
		drawObjects(perso);

		fire.update(perso);

		frameNo++;
		yield;
	}
}

startGame('#glCanvas', vdp => main(vdp));
