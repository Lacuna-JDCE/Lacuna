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

	// Add an caller->called entry to functions_called[]
	function add_entry(caller, called)
	{
		function equals(a)
		{
			return a.caller.file == caller.file && a.caller.start == caller.start && a.caller.end == caller.end &&
			       a.called.file == called.file && a.called.start == called.start && a.called.end == called.end;
		}

		// If it's not yet in there, put it in.
		if( ! functions_called.some(equals) )
		{
			caller = fix_entry(caller, script_data, html_file);
			called = fix_entry(called, script_data, html_file);

			functions_called.push(
			{
				caller: caller,
				called: called
			});
		}
	}

	// Retrieve all called functions
	cg.edges.iter(function(caller, called)
	{
		// All we care about are native calls (that is, the 'called' node has type NativeVertex and is a function that accepts a function as one of its arguments).
		// All posibilities are listed in javascript-call-graph/harness.js.
		// Instead of using a huge switch() case, just loop over all arguments, and if any of them is a FunctionExpression, 

		if( called.type == 'NativeVertex')
		{
			let args = caller.call.arguments;

			for(let i = 0; i < args.length; i++)
			{
				if( args[i].type == 'FunctionExpression' )
				{
					handle_function_argument(caller, caller.call.arguments[i]);
				}
			}
		}
	});


	function handle_function_argument(caller_node, func)
	{
		let caller = {file: null, start: null, end: null},
			called = {file: null, start: null, end: null};

		called.start = func.range[0];
		called.end = func.range[1],
		called.file = func.attr.enclosingFile;

		let enclosing_function = caller_node.call.attr.enclosingFunction;

		if(enclosing_function)
		{
			caller.file = enclosing_function.attr.enclosingFile;
			caller.start = enclosing_function.range[0];
			caller.end = enclosing_function.range[1];
		}else{
			caller.file = caller_node.call.attr.enclosingFile;
			// start and end are defaulted to null.
		}

		add_entry(caller, called);
	}


	return functions_called;
};
