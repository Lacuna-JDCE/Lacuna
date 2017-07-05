/*
	dynamic
	Dynamic analysis analyzer for the 'hybrid' JDCE tool.

	Dynamically analyze the source, then returns a list of functions to remove.

	Because we can't easily detect calling nodes, mark all functions called from the base caller node.
	This doesn't result in an accurate graph, but does preserve what functions were called.
*/


const path = require('path'),
      Graph = require('../graph'),
      GraphTools = require('../graph_tools'),
      dynamic_analyzer = require('./dynamic/dynamic');



module.exports = function()
{
	this.run = function(settings, callback)
	{
		// Start the analyzation process. Since this runs async, use a callback.
		dynamic_analyzer(settings.directory, settings.html_path, settings.timeout, settings.scripts, parse_results);


		// Parse the results.
		function parse_results(data)
		{
			for(let file in data)
			{
				if(data.hasOwnProperty(file))
				{
					mark_nodes_in_file(file, data[file]);
				}
			}

			callback(true);
		};


		// A function that marks nodes based on a list of called functions.
		function mark_nodes_in_file(file, locations)
		{
			try
			{
				locations.forEach(function(location)
				{
					let loc = {file: file, start: location.start, end: location.end};

					let called = GraphTools.find_node(loc, settings.nodes);


					GraphTools.mark( settings.base_node, called, settings.fingerprint );
				});
			}catch(e)
			{
				settings.error_handler('dynamic', e);
				callback(false);
			}
		};
	};
};
