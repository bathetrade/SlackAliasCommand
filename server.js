var express = require("express");
var parser = require("body-parser");
var process = require("process");
var tokenParser = require("./token_parser");
var fs = require("fs");
var logger = require("./logging");

var tokenFile = "./token.txt";
var aliasFile = "./aliases.txt";
var port = 15001;

//Load token
var token = tokenParser.getToken(tokenFile);
if (token == null) {
	logger.log(`Could not start server because the token file '${tokenFile}' could not be loaded.`);	
	process.exit();
}
logger.log(`Loaded token ${token}`);

//Load aliases file if it exists
var aliases = loadAliases(aliasFile);
if (aliases == null) {
	process.exit();
}

//Configure server
var server = express();
server.use(parser.urlencoded({extended:true}));

//Patterns
var newAliasPattern = /[ ]*alias[ ]*=[ ]*([a-z][a-z1-9\._]*)[ ]*link[ ]*=[ ]*(.*)$/i;
var existingAliasPattern = /[ ]*([a-z][a-z1-9\._]*)[ ]*/i;

//Register routes
server.post('/alias', function(req, res) {
	if (!checkToken(token, req, res)) {
		return;
	}
	var body = req.body;
	var command = req.body.text;
	logger.log(`${body.user_name} sent command (alias): '${command}'`);
	
	var newAliasMatch = command.match(newAliasPattern);
	var existingAliasMatch = command.match(existingAliasPattern);
	
	//Register new alias
	if (newAliasMatch != null) {
		var name = newAliasMatch[1];
		var link = newAliasMatch[2];
		
		aliases[name] = link;
		
		//Serialize aliases (TODO: do this less frequently, maybe with a timer callback and a shared queue)
		fs.writeFileSync(aliasFile, JSON.stringify(aliases));
		
		res.send(`Registered new alias!\n${name} = ${link}`);
		return;
	}
	
	//Get link for existing alias
	else if (existingAliasMatch != null) {
		var name = existingAliasMatch[1];
		var link = aliases[name];
		if (link == null) {
			res.send("Alias not found");
			return;
		}
		
		res.json(buildVisibleResponse(link, false));
		return;
	}
	
	else {
		res.send("Unrecognized command.");
		return;
	}
});

//TODO: does the global aliases object need to be thread-safe? Not entirely sure!
server.post("/alias-list", function(req, res) {
	if (!checkToken(token, req, res)) {
		return;
	}
	
	logger.log(`${req.body.user_name} listed existing aliases`);
	var responseString = [];
	for (var key in aliases) {
		if (aliases.hasOwnProperty(key)) {
			responseString.push(`\`${key}\` = ${aliases[key]}`);
		}
	}
	res.send(responseString.join('\n'));
	return;
});

server.post("/alias-delete", function(req, res) {
	if (!checkToken(token, req, res)) {
		return;
	}
	
	logger.log(`${req.body.user_name} sent command (alias-delete): '${req.body.text}'`);

	var aliasMatch = req.body.text.match(existingAliasPattern);
	var name = null;
	
	if (aliasMatch != null) {
		name = aliasMatch[1];
	}
	else {
		res.send("Unrecognized format");
		return;
	}
	
	delete aliases[name];
	
	//Serialize updated aliases
	fs.writeFileSync(aliasFile, JSON.stringify(aliases));
	
	logger.log(`Deleted alias \`${name}\`.`);
	res.send(`Deleted alias \`${name}\`.`);
	return;
});

//Start server
server.listen(port);
logger.log(`Server running at http://127.0.0.1:${port}/`);

/*
Functions
*/

function loadAliases(aliasFilename, encoding = "utf8") {
	if (fs.existsSync(aliasFile)) {
		var contents = fs.readFileSync(aliasFile, { encoding : "utf8" });
		if (contents == null) {
			logger.log("Warning: alias file contents were null");
			return null;
		}
		var parsedAliases = JSON.parse(contents);
		if (parsedAliases == null) {
			logger.log("Warning: alias file contents could not be loaded");
			return null;
		}
		logger.log("Loaded alias file");
		return parsedAliases;
	}
	else {
		logger.log("No alias file found");
		return {};
	}
}

function buildVisibleResponse(txt, markdown = true) {
	return {
		text : txt,
		response_type : "in_channel",
		markdown : markdown
	};
}

function checkToken(token, req, res) {
	if (!(token === req.body.token)) {
		logger.log("Invalid token!");
		res.send("Invalid token!");
		return false;
	}
	else {
		return true;
	}
}