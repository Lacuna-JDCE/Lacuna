/*
	nativecalls
	Static analysis analyzer that only resolves native function calls that call user functions (i.e. addEventListeners' second parameter is a function that gets called when it triggers).

	Statically analyze the source, then returns a list of functions to remove.
	Static analysis tool copied & adapted from https://github.com/abort/javascript-call-graph
*/


const Graph = require('../graph'),
      GraphTools = require('../graph_tools'),
      nativecalls_analyzer = require('./nativecalls/nativecalls');



module.exports = function()
{
	this.run = function(settings, callback)
	{
		let called_functions = nativecalls_analyzer(settings.scripts, settings.html_file);

		// For each function
		called_functions.forEach(function(funcs)
		{
			try
			{
				let called = GraphTools.find_node(funcs.called, settings.nodes);

				if( funcs.caller.start == null && funcs.caller.end == null )
				{
					caller = settings.base_node;
				}else{
					caller = GraphTools.find_node(funcs.caller, settings.nodes);
				}

				GraphTools.mark( caller, called, settings.fingerprint );
			}catch(e)
			{
				settings.error_handler('nativecalls', e);
				callback(false);
			}
		});

		callback(true);
	};
};
