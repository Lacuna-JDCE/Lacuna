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


let logger_name=  '___jdce_logger',
    logger_name_safe = '___jdce_logger_safe';


if(process.argv.length < 3)
{
	console.log('usage: node add_logs.js <directory>');
}

let html_path = process.argv[2];
let html_file = path.join(html_path, 'index.html');

if(!fs.existsSync(html_file))
{
	console.log(html_file,'doesn\'t exist!');
	process.exit(42);
}

// Log call is formatted 'identifier|file|start|end'.
let js_head_code = `
	var ` + logger_name_safe + ` = [];

	var ` + logger_name + ` = function(file_name, index)
	{
		` + logger_name_safe + `.push(file_name + '|' + index);
	};
`;


// Create a new HTML editor instance. We'll reset the HTML source later.
let html = new HtmlEditor();

// Retrieve HTML source.
html.load(html_file);

// Add the script tag to the begining of the <head> tag.
html.add( '<script>' + js_head_code + '</script>', html.location.HEAD_FIRST );

// Overwrite the old source.
html.save();

let script_editors = [];


let scripts = webpage_tools.get_scripts( html_file, html_path );

scripts.forEach(function(logger_name)
{
	return function(script_data)
	{
		// Only deal with .js files, HTML file won't parse right.
		if(script_data.file.split('.').pop() == 'js')
		{
			// Create a new script editor instance and save it so we can change the source, and reset it afterwards.
			let js = new JsEditor();

			// Save it, so we can access it later (and restore the original source).
			script_editors[script_data.file] = js;

			js.load(script_data.full_path, script_data.source);

			// Add a log call to each function in this script. The only argument (a function) specifies the format.
			js.add_log_calls(html_path, function(file, index)
			{
				return logger_name + '("' + file + '", ' + index + ');';
			});

			js.save();
		}
	}
}(logger_name));

