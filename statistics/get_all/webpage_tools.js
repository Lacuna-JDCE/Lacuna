/*
	Webpage tools
	Niels Groot Obbink
*/

const path = require('path'),
      file_system = require('fs'),
      cheerio = require('cheerio'),
      esprima = require('esprima');



function is_valid_type(type)
{
	const valid_types = ['text/javascript', 'application/javascript', 'application/ecmascript', 'text/ecmascript'];

	valid_types.forEach(function(entry)
	{
		if(type.indexOf(type) != -1)
		{
			return true;
		}
	});

	return false;
}


function get_functions(entry)
{
	let functions = [];
	let source_code = entry.source;

	// Parse the source code, retrieve function nodes including range data.
	esprima.parse(source_code, {range: true}, function(node)
	{
		// We are only interested in functions (declarations and expressions).
		if(node.type == 'FunctionDeclaration' || node.type == 'FunctionExpression')
		{
			let function_data =
			{
				type: null,
				name: null,

				start: node.range[0],
				end: node.range[1],

				body:
				{
					start: node.body.range[0],
					end: node.body.range[1]
				}
			};

			if(node.type == 'FunctionDeclaration')
			{
				function_data.type = 'declaration';
				function_data.name = node.id.name;
			}else{
				// If it's not a FunctionDeclaration, it must be a FunctionExpression.
				function_data.type = 'expression';
			}

			// Special case: if inline js, add offset to location.
			if(entry.type == 'inline')
			{
				function_data.start += entry.location.start;
				function_data.end += entry.location.start;
				function_data.body.start += entry.location.start;
				function_data.body.end += entry.location.start;
			}

			// Save the function data.
			functions.push(function_data);
		}
	});

	return functions;
}


let get_scripts = function(html_file, directory)
{
	let scripts =
	{
		normal: [],
		async: [],
		defered: []
	};

	let source = file_system.readFileSync(html_file).toString();
	let html = cheerio.load(source);
	let script_tags = html('script');
	let id = 0;

	// We don't want to add scripts multiple times, so keep track of which ones we already added.
	let sources = [];

	script_tags.each(function(index, element)
	{
		// We only want script tags with either no type or a valid type.
		if(element.attribs.hasOwnProperty('type') && ! is_valid_type(element.attribs['type'])) return;

		let entry =
		{
			id: id,				// id, for easier lookup.
			type: null,			// 'inline', 'script'
			source: null,		// source code
			file: null,			// file name of the script (or HTML file name).
			functions: null,	// list of functions and location
			// Optional:
			location: null,		// if type is 'inline', the offset of the code in the HTML document ({start, end}).
		};

		if(!element.attribs.hasOwnProperty('src'))
		{
			// Inline script.
			let content = cheerio(element).html()
			let start = source.indexOf(content);

			if(start == -1)
			{
				throw 'webpage_tools error: can\'t find start location for inline script file ' + index;
			}

			entry.type = 'inline';

			entry.file = path.basename(html_file);
			entry.full_path = html_file;
			entry.location = {start: start, end: start + content.length};
			entry.source = content;

			entry.file_indexed = entry.file + '#' + id;
			entry.full_path_indexed = entry.full_path + '#' + id;
		}else{
			// External script.
			let src = element.attribs['src'];
			let parsed_path = path.join( directory, src );

			if( sources.indexOf(parsed_path) > -1 )
			{
				// Already added this script, don't add it again.
				return;
			}else{
				sources.push( parsed_path );
			}

			entry.type = 'script';
if(file_system.existsSync(parsed_path))
{
			entry.source = file_system.readFileSync( parsed_path ).toString();
			entry.file = src;
			entry.full_path = parsed_path;

			entry.file_indexed = entry.file;
			entry.full_path_indexed = entry.full_path;
}else{
return;
}
		}

		try
		{
			entry.functions = get_functions(entry);
		}catch(exception)
		{
			throw 'webpage_tools error: JS parse error: ' + exception;
		}

		// Check in what order this script should be executed.
		let order = null;

		if(element.attribs.hasOwnProperty('async') )
		{
			order = scripts.async;
		}else if(element.attribs.hasOwnProperty('defer'))
		{
			order = scripts.defered;
		}else{
			order = scripts.normal;
		}


		// FIXME for ES6 modules
		// Parse the script, and see if there are any import statements, then insert them before [entry].
		// Do so recursive, because one can import a module within a module.


		// Add the script.
		order.push(entry);

		id++;
	});

	// first normal scripts, then defered, then async.
	return scripts.normal.concat(scripts.defered).concat(scripts.async);
};


module.exports =
{
	get_scripts: get_scripts
}
