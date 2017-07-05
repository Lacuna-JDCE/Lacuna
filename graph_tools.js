/*
	GraphTools
	Niels Groot Obbink

	Function graph tools.
*/



const Graph = require('./graph');



// Create a 'caller' node, which simulates [the index.html / any js file] that calls a function directly.
let base_caller_node = new Graph.Node(
{
	script_name: '<base caller node>',
	data: '<base caller node>',
	equals: function(other)
	{
		// This is the only 'function' node with id -1.
		return this.script_name == other.script_name;
	},
	toString: function()
	{
		return '<base caller node>';
	}
});



function build_function_graph(scripts, constructed_edge_value)
{
	let nodes = [];

	// Create nodes for every function in every file.
	scripts.forEach(function(script)
	{
		script.functions.forEach(function(func)
		{
			let value =
			{
				script_name: script.file,
				data: func,

				equals: function(other)
				{
					// ID is per file/inline, start and end locations can't overlap in a single file.
					return this.script_name == other.script_name && this.data.start == other.data.start && this.data.end == other.data.end;
				},

				toString: function()
				{
					let name = script.file;
					let name_parts = [name, '@', this.data.start, '-', this.data.end, ' ', this.data.type];

					if(this.data.type == 'declaration')
					{
						name_parts.push(':');
						name_parts.push(this.data.name);
					}

					return name_parts.join('');
				}
			};

			let node = new Graph.Node(value);

			nodes.push(node);
		});
	});

	// Now that we got all nodes, connect each to all other nodes.
	// Also connect to yourself (i.e. for recursive functions).
	let i, j;

	for(i = 0; i < nodes.length; i++)
	{
		// Base caller -> this node.
		base_caller_node.connect( nodes[i], constructed_edge_value );

		for(j = 0; j < nodes.length; j++)
		{
			nodes[i].connect(nodes[j], constructed_edge_value);
		}
	}

	// Add the base caller node last, so it doesn't connect to itself, above.
	nodes.push(base_caller_node);

	return nodes;
}


function get_base_caller_node(nodes)
{
	for(let i = 0; i < nodes.length; i++)
	{
		if( nodes[i].equals(base_caller_node) )
		{
			return nodes[i];
		}
	}
};


function edge_name(value, fingerprints)
{
	let i,
	    names = [];

	for(i = 0; i < fingerprints.length; i++)
	{
		if(value & fingerprints[i].value)
		{
			names.push( fingerprints[i].name );
		}
	}

	return names.join(', ');
}


function get_percentage_color(count, max)
{
	let color_ranges =
	[
		{ percent: 0.0, color: { red: 0xff, green: 0x00, blue: 0x00 } },
		{ percent: 0.5, color: { red: 0xff, green: 0xff, blue: 0x00 } },
		{ percent: 1.0, color: { red: 0x00, green: 0xff, blue: 0x00 } }
	];

	let color_index = 0,
	    percent = count / max;

	for(let i = 1; i <= color_ranges.length - 1; i++)
	{
		if(percent <= color_ranges[i].percent)
		{
			color_index = i;
			break;
		}
	}

	let lower = color_ranges[color_index - 1],
	    upper = color_ranges[color_index];

	let range = upper.percent - lower.percent,
	    range_percent = (percent - lower.percent) / range;

	let percent_lower = 1 - range_percent,
	    percent_upper = range_percent;

	let color =
	{
		red:	Math.floor(lower.color.red * percent_lower + upper.color.red * percent_upper),
		green:	Math.floor(lower.color.green * percent_lower + upper.color.green * percent_upper),
		blue:	Math.floor(lower.color.blue * percent_lower + upper.color.blue * percent_upper)
	};

	let hex =
	[
		('0' + color.red.toString(16)).slice(-2),
		('0' + color.green.toString(16)).slice(-2),
		('0' + color.blue.toString(16)).slice(-2)
	];

	return '#' + hex.join('');
}


function number_bits_set(i)
{
	i = i - ((i >> 1) & 0x55555555);
	i = (i & 0x33333333) + ((i >> 2) & 0x33333333);
	return (((i + (i >> 4)) & 0x0F0F0F0F) * 0x01010101) >> 24;
}


function output_function_graph(nodes, fingerprints)
{
	let output = ['digraph functiongraph'];

	output.push('{');

	nodes.forEach(function(node)
	{
		let count = 0;

		node.get_edges().forEach(function(edge)
		{
			count++;

			let name = edge_name( edge.get_type(), fingerprints );

			let max = fingerprints.length,
			    bits_set = number_bits_set(edge.get_type());

			// To get the correct colors, subtract from max and bits_set in some cases.
			if(max > 1)
			{
				// Remove one from max (the constructed edges) if it's not the only edge (don't want /0 errors).
				max -= 1;
			}
			if(edge.get_type() & 0x01)
			{
				// Remove one from the bits set, the constructed edge, if it's set.
				bits_set -= 1;
			}

			let color = get_percentage_color( bits_set, max);

			output.push('\t"' + node.get_data() + '" -> "' + edge.get_to().get_data() + '" [label="' + name + '" color="' + color + '"];');
		});

		if(count == 0)
		{
			// Disconnected node
			output.push('\t"' + node.get_data() + '"');
		}
	});

	output.push('}');

	return output.join('\n');
}


function remove_constructed_edges(nodes, constructed_edge_value)
{
	nodes.forEach(function(node)
	{
		let index = 0;

		while(true)
		{
			let edges = node.get_edges();

			if(edges.length > index)
			{
				let edge = edges[index];

				// If the edge is of type CONSTRUCTED (thus not marked by any analyzer) remove it.
				if( edge.get_type() == constructed_edge_value )
				{
					node.disconnect( edge.get_to(), edge.get_type() );

					// We removed an edge, so edges.length will be one less than before.
					// Decrement index to keep the index count correct.
					index--;
				}else{
					// Remove the CONSTRUCTED type from this edge.
					edge.remove_type( constructed_edge_value );
				}

				// Consider next edge.
				index++;
			}else{
				// There are no more new edges available.
				break;
			}
		}
	});

	return nodes;
}


function traverse_graph(node, done)
{
	// For each child, recursively traverse them, and add each node to the list of traversed nodes.

	// First time around, done might not be initialized.
	if( !Array.isArray(done) )
	{
		done = [];
	}

	let traversed = [node],
	    edges = node.get_edges();

	for(let i = 0; i < edges.length; i++)
	{
		// We don't want infinite recursion for a <-> b nodes, so keep track where we've been.
		let stop = false;

		for(let j = 0; j < done.length; j++)
		{
			if( done[j].equals( edges[i].get_to() ) )
			{
				stop = true;
			}
		}

		if(stop)
		{
			continue;
		}

		done.push( edges[i].get_to() );

		// Traverse recursively.
		let child_traversed = traverse_graph( edges[i].get_to(), done );

		traversed = traversed.concat( child_traversed );
	}

	return traversed;
}


function get_connected_nodes(nodes)
{
	let base = get_base_caller_node(nodes);

	// Traverse the graph, starting from base.
	let connected_nodes = traverse_graph( base );

	return connected_nodes;
}


function get_disconnected_nodes(nodes)
{
	let disconnected_nodes = [],
	    connected_nodes = get_connected_nodes(nodes);

	nodes.forEach(function(node)
	{
		for(let i = 0; i < connected_nodes.length; i++)
		{
			if( connected_nodes[i].equals( node ) )
			{
				return;
			}
		}

		disconnected_nodes.push( node );
	});

	return disconnected_nodes;
}


function find_node(info, nodes)
{
	let i;

	for(i = 0; i < nodes.length; i++)
	{
		let node = nodes[i];
		let data = node.get_data();

		if( data.script_name == info.file &&
		    data.data.start == info.start &&
		    data.data.end == info.end)
		{
			return node;
		}
	}

	throw 'GraphTools exception: can\'t find node {file: ' + info.file + ', start: ' + info.start + ', end: ' + info.end + '}';
}


function mark(node_from, node_to, value)
{
	let i,
	    edges = node_from.get_edges();

	for(i = 0; i < edges.length; i++)
	{
		edge = edges[i];

		if( edge.get_to().equals( node_to ) )
		{
			edge.add_type( value.value );
		}
	}
}



module.exports =
{
	build_function_graph: build_function_graph,
	output_function_graph: output_function_graph,
	remove_constructed_edges: remove_constructed_edges,
	get_disconnected_nodes: get_disconnected_nodes,
	get_connected_nodes: get_connected_nodes,
	get_base_caller_node: get_base_caller_node,
	find_node: find_node,
	mark: mark
};
