/*
	JavaScript dynamic dead code elimination tool.
	Niels Groot Obbink
*/

'use strict';


require('./native_extentions');
const Graph = require('./graph'),
      GraphTools = require('./graph_tools'),
      file_system = require('fs'),
      path = require('path'),
      webpage_tools = require('./webpage_tools'),
      async_loop = require('./async_retval_loop');



const CONSTRUCTED_EDGE = {name: 'constructed', value: 0x01};


function get_available_analyzers(folder)
{
	let available_instances = [],
	    files = file_system.readdirSync(folder);

	for(let i = 0; i < files.length; i++)
	{
		let file = files[i],
		    split = file.split('.');

		if(split.pop() == 'js')
		{
			available_instances.push( split.join('.') );
		}
	}

	return available_instances;
}


function get_analyzer_data(filter)
{
	const folder = path.join(__dirname, '/analyzers');

	let fingerprints = [];
	let id = CONSTRUCTED_EDGE.value;	// first value.

	fingerprints.push(CONSTRUCTED_EDGE);

	let analyzers = [],
	    available_analyzers = get_available_analyzers(folder);

	filter.forEach(function(name)
	{
		if( available_analyzers.indexOf( name ) != -1 )
		{
			let require_name = path.join(folder, name);

			let analyzer = require(require_name);
			let instance = new analyzer();

			id *= 2;	// Flip the next higher bit (0001 -> 0010 -> 0100 -> 1000, etc.).
			fingerprints.push({name: name, value: id});

			analyzers.push( instance.run );
		}else{
			console.log('Note: analyzer \'' + name + '\' not found in analyzers/');
		}
	});

	return { functions: analyzers, fingerprints: fingerprints };
}


function remove_uncalled_functions(nodes, directory, html_file)
{
	// Create a map of files and the functions that need to be removed in that file.
	let file, files = {};

	nodes.forEach(function(node)
	{
		let file,
		    func = node.get_data();

		// Fix null -> html file name.
		if(func.script_name == null)
		{
			file = html_file;
		}else{
			file = path.join(directory, func.script_name);
		}

		if( ! files[file] )
		{
			files[file] = [];
		}

		files[file].push( func.data );
	});

	for(file in files)
	{
		if( files.hasOwnProperty(file) )
		{
			remove_functions_from_file(file, files[file]);
		}
	}
}


function remove_functions_from_file(file_name, functions)
{
	// Retrieve the source.
	let source_code = file_system.readFileSync(file_name).toString();

	// Remove nested functions. If a function is nested within another function, it will get removed by the parents' removal.
	functions = remove_nested_functions(functions);

	// Sort all functions based on start/end location. If we don't, removing with an offset won't work.
	functions = functions.sort(function(a, b)
	{
		return a.start - b.start;
	});

	// Keep track of how much we removed, as it changes the start position of subsequent functions.
	let offset = 0;

	functions.forEach(function(func)
	{
		// If the function type is an expression, replace it with an empty function, otherwise (i.e. function declaration) remove it completely.
		let insert = func.type == 'expression' ? 'function(){}' : ('function ' + func.name + '(){}');

		// Remove source code from the starting position (minus offset, i.e. the length of code we removed already), length of the function is still end - start.
		source_code = source_code.splice(func.start - offset, func.end - func.start, insert);

		// Increment offset with what we removed.
		offset += func.end - func.start;
		// Decrement offset with what we added (insert)
		offset -= insert.length;
	});

	// Now, write the new source to the file.
	file_system.writeFileSync(file_name, source_code);
}


function remove_nested_functions(functions)
{
	let reduced = [];

	functions.forEach(function(func)
	{
		let nested = false;

		functions.forEach(function(test)
		{
			if(func.start > test.start && func.end < test.end)
			{
				nested = true;
			}
		});

		if(nested == false)
		{
			reduced.push( func );
		}
	});

	return reduced;
}



module.exports =
{
	run: function(settings, callback)
	{
		// Keep a timer, so we know how long the tool took to run.
		let start_time = process.hrtime();

		// Save statistics, so we can return them to our caller later.
		let stats = 
		{
			js_files: 0,
			function_count: 0,
			functions_removed: 0,
			run_time: 0,
			analyzer_info: [],
			error: ''
		};


		// Retrieve all scripts in this page (ordered based on execution order).
		let scripts = webpage_tools.get_scripts( settings.html_path, settings.directory );

		stats.js_files = scripts.length;

		// Create a graph with each function as a node, plus the base caller node.
		// Connect them all together from the start, using the CONSTRUCTED_EDGE type.
		let nodes = GraphTools.build_function_graph(scripts, CONSTRUCTED_EDGE.value);

		// The number of functions is the number of nodes in the graph, minus one for the base caller node.
		stats.function_count = nodes.length - 1;

		// Get a list of readily prepared analyzer functions (but only those in the settings.analyzer list) and their fingerprints.
		let analyzers = get_analyzer_data(settings.analyzer);

		// Build the correct settings object for the analyzers.
		let analyzer_settings =
		{
			directory: settings.directory,
			html_path: settings.html_path,
			html_file: path.basename(settings.html_path),
			scripts: scripts,
			nodes: nodes,
			base_node: GraphTools.get_base_caller_node(nodes),
			fingerprints: analyzers.fingerprints,
			timeout: settings.timeout,
			pace: settings.pace,
			error_handler: function(name, message)
			{
				if(settings.missteps)
				{
					console.error('Analyzer \'' + name + '\' encountered an error:', message);
				}
			}
		};

		if(analyzers.functions.length > 0)
		{
			// Run each analyzer in turn, letting it edit the graph (mark edges).
			async_loop(analyzers.functions, analyzer_settings, function(analyzer_run_info)
			{
				stats.analyzer_info = analyzer_run_info.reduce(function(acc, current)
				{
					acc.push( current[0] + ': ' + current[1] );
					return acc;
				}, []).join(';');

				// Once we are done with analyzing the source, start processing the marked graph.
				process_marked_graph();
			});
		}else{
			// If there are no analyzers set, just process the graph.
			// This is useful for e.g. call graph image generation.
			process_marked_graph();
		}


		function process_marked_graph()
		{
			// Once we're done with all the analyzers, remove any edge that was constructed.
			if(!settings.noremove)
			{
				nodes = GraphTools.remove_constructed_edges(nodes, CONSTRUCTED_EDGE.value);


				let disconnected_nodes = GraphTools.get_disconnected_nodes(nodes);

				// Do the actual work: remove all nodes that are disconnected (= functions without incoming edges = uncalled functions).
				remove_uncalled_functions(disconnected_nodes, settings.directory, settings.html_path);

				// The number of removed functions equals the number of nodes without any incoming edges (a disconnected node).
				// The base caller node is never disconnected, so don't subtract from this.
				stats.functions_removed = disconnected_nodes.length;
			}else{
				stats.functions_removed = 0;
			}

			if(settings.graph)
			{
				// Return the graph image too.
				if(settings.show_disconnected)
				{
					stats.graph = GraphTools.output_function_graph(nodes, analyzers.fingerprints);
				}else{
					// Only show reachable nodes.
					stats.graph = GraphTools.output_function_graph(GraphTools.get_connected_nodes(nodes), analyzers.fingerprints);
				}
			}

			return_results();
		}



		function return_results()
		{
			// Calculate run time and save it in the stats object.
			let end_time = process.hrtime(start_time);
			stats.run_time = parseInt(   ((end_time[0] * 1e9 + end_time[1]) * 1e-6).toFixed(0),  10);

			// Return statistics to caller.
			callback( stats );
		}
	}
};
