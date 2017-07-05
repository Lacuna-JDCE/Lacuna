'use strict';

const path = require('path'),
      js_tools = require('./js_tools'),
      bindings = require('./javascript-call-graph/bindings'),
      astutil = require('./javascript-call-graph/astutil'),
      semioptimistic = require('./javascript-call-graph/semioptimistic');




function get_scriptdata_by_id(script_data, id)
{
	for(let script in script_data)
	{
		if(script_data.hasOwnProperty(script))
		{
			if(script_data[script].id == id)
			{
				return script_data[script];
			}
		}
	}

	throw 'error getting script data by id for id ' + id;
}


// HTML entries (inline) have the issue that they don't have a correct offset (in the HTML file).
// Fix this by checking what script ID they belong to (different script ID for each inline entry) and adding the offset.
function fix_entry(entry, script_data, html_file)
{
	// If it starts with '<html index file name>#' then it's the 
	if(entry.file.indexOf(html_file + '#') == 0)
	{
		let id = parseInt(entry.file.substr( (html_file + '#').length ), 10);
		let script = get_scriptdata_by_id(script_data, id);

		// Name without # and ID
		entry.file = html_file;

		// Only if caller is in global.
		if(entry.start != null)	// This means that entry.end != too.
		{
			entry.start += script.location.start;
			entry.end += script.location.start;
		}
	}

	return entry;
}



module.exports = function(script_data, html_file)
{
	let script_sources = [];

	// Add each script source and file name to a list.
	script_data.forEach(function(script)
	{
		script_sources.push( {filename: script.file_indexed, program: script.source} );
	});

	// Build the call graph.
	let ast = astutil.buildAST(script_sources);
	bindings.addBindings(ast);

	let cg = semioptimistic.buildCallGraph(ast, false);

	let functions_called = [];

	// Retrieve all called functions
	cg.edges.iter(function(caller, called)
	{
		if(called.type == 'NativeVertex')
		{
			// We don't care about calls to native functions (e.g. Math.floor or Array.prototype.map).
			return;
		};

		// Determine called.
		let file = called.func.attr.enclosingFile;
		let start = called.func.range[0];
		let end = called.func.range[1];

		// Determine caller.
		let caller_start, caller_end,
		    caller_file = caller.call.attr.enclosingFile;

		let enclosing_function = caller.call.callee.attr.enclosingFunction;

		if(enclosing_function)
		{
			caller_start = enclosing_function.range[0];
			caller_end = enclosing_function.range[1];
		}else{
			// In case it's called from the global scope.
			caller_start = caller_end = null;
		}

		function equals(a)
		{
			return a.caller.file == caller_file && a.caller.start == caller_start && a.caller.end == caller_end &&
			       a.called.file == file && a.called.start == start && a.called.end == end;
		}

		// If it's not yet in there, put it in.
		if( ! functions_called.some(equals) )
		{
			let caller = {file: caller_file, start: caller_start, end: caller_end};
			let called = {file: file, start: start, end: end};

			caller = fix_entry(caller, script_data, html_file);
			called = fix_entry(called, script_data, html_file);

			functions_called.push(
			{
				caller: caller,
				called: called
			});
		}
	});

	return functions_called;
};
