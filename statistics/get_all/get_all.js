/*
	JavaScript dynamic dead code elimination tool.
	Niels Groot Obbink
*/

'use strict';


let fs = require('fs'),path = require('path'),
    HtmlEditor = require('./html_editor'),
	JsEditor = require('./js_editor'),
    Browser = require('./browser'),
    webpage_tools = require('./webpage_tools');


if(process.argv.length < 3)
{
	console.log('usage: node get_all.js <directory>');
}

let html_path = process.argv[2];
let html_file = path.join(html_path, 'index.html');

if(!fs.existsSync(html_file))
{
	console.log(html_file,'doesn\'t exist!');
	process.exit(42);
}



let scripts = webpage_tools.get_scripts( html_file, html_path );


let functions = [];

scripts.forEach(function(script_data)
{
	// Only deal w	ith .js files, HTML file won't parse right.
	if(script_data.file.split('.').pop() == 'js')
	{
		// Create a new script editor instance and save it so we can change the source, and reset it afterwards.
		let js = new JsEditor();

		js.load(script_data.full_path, script_data.source);

		for(let i = 0; i < js.functions.length; i++)
		{
			functions.push( '/'  +script_data.file + '|' + i );
		}

		js.save();
	}
});

console.log(functions.join('\n'));
