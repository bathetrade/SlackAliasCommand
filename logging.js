var date = new Date();
exports.log = function(txt) {
	var n = new Date(Date.now());
	console.log(`[${n.toUTCString()}] ${txt}`);
}