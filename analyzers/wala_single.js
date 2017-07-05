/*
	wala_single
	Analysis by the WALA framework for JavaScript.
	Parses per-file.

	See https://github.com/wala/WALA.
*/


const Graph = require('../graph'),
      GraphTools = require('../graph_tools'),
      wala_single_analyzer = require('./wala_single/wala_single');



module.exports = function()
{
	this.run = function(settings, callback)
	{
		function handle_results(called_functions)
		{
			if(called_functions === null)
			{
				callback(false);
				return;
			}

			called_functions.forEach(function(funcs)
			{
				try
				{
					let called = GraphTools.find_node(funcs.called, settings.nodes)

					if( funcs.caller.start == null && funcs.caller.end == null )
					{
						caller = settings.base_node;
					}else{
						caller = GraphTools.find_node(funcs.caller, settings.nodes);
					}

					GraphTools.mark( caller, called, settings.fingerprint );
				}catch(e)
				{
					settings.error_handler('wala_single', e);
					callback(false);
					return;
				}
			});

			callback(true);
		}

		wala_single_analyzer(settings.scripts, settings.directory, settings.timeout, settings.error_handler, handle_results);
	};
};
