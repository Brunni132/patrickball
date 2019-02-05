const fs = require('fs');
const DEBOUNCE_DELAY = 200;
//let lastChangeDate = new Date().getTime();
//let lastSyncDate = lastChangeDate;
let timer = null;

function watch(directory, cb) {
	// TODO make it so you don't need the gfx/ anymore
	fs.watch(directory, {recursive:true}, (eventType, filename) => {
		//console.log('CHANGE', filename, eventType);
		//lastChangeDate = new Date().getTime();

		if (timer) clearTimeout(timer);
		timer = setTimeout(() => {
			cb();
		}, DEBOUNCE_DELAY);
	});
}

module.exports = {
	watch
};
