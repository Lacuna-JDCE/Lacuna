/*
	random
	Random 'analyzer' for the 'hybrid' JDCE tool.

	Randomly connect nodes within the graph. This 'analyzer' can be run multiple times, and will yield different outputs.
*/


const Graph = require('../graph'),
      GraphTools = require('../graph_tools');



module.exports = function()
{
	this.run = function(settings, callback)
	{
		// To how many functions is each function possibly connected?
		const NUM_FUNCTIONS = 3;
		// Chance (for each node) a node connects to (NUM_FUNCTIONS times) another _random_ node.
		const CONNECT_CHANCE = 0.3;
		// Chance the base node connects to a node (for each node).
		const CONNECT_BASE_CHANCE = 0.01;

		// The amount of nodes each node connects to is, on average, (NUM_FUNCTIONS * CONNECT_CHANCE).

		function random_node()
		{
			let index = Math.floor(Math.random() * settings.nodes.length);

			return settings.nodes[index];
		}

		settings.nodes.forEach(function(node)
		{
			// Connect to three random nodes (not base caller node).
			for(let i = 0; i < NUM_FUNCTIONS; i++)
			{
				if( Math.random() < CONNECT_CHANCE )
				{
					GraphTools.mark( node, random_node(), settings.fingerprint );
				}
			}

			// Connect base caller node to this node.
			if( Math.random() < CONNECT_BASE_CHANCE)
			{
				GraphTools.mark( settings.base_node,  node, settings.fingerprint);
			}
		});	

		callback(true);
	};
};
