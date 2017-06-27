var fs = require("fs");
exports.getToken = function(tokenFilename, encoding = "utf8") {
	if (!fs.existsSync(tokenFilename)) {
		return null;
	}
	var contents = fs.readFileSync(tokenFilename, { encoding : encoding });
	var tokenPattern = /token[ ]*=[ ]*[a-zA-Z1-9]+/;
	var tokenMatch = contents.match(tokenPattern);
	if (!tokenMatch) {
		return null;
	}
	var tokenString = tokenMatch[0];
	var tokenSubPattern = /=([a-zA-Z1-9]+)/;
	return tokenString = tokenString.match(tokenSubPattern)[1];
}