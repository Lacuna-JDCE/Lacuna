/*
	Graph
	Niels Groot Obbink

	Node and Edge constructors for creating a graph.
*/



let edge = function(_type, _to)
{
	let to = _to || null;
	let type = _type || 0x00;



	this.get_type = function()
	{
		return type;
	};


	this.set_type = function(_type)
	{
		type = _type;
	};


	this.add_type = function(_type)
	{
		type = type | _type;
	};


	this.remove_type = function(_type)
	{
		type = type & ~ _type;
	};


	this.get_to = function()
	{
		return to;
	};


	this.equals = function(edge)
	{
		return type == edge.get_type() && to.equals(edge.get_to());
	};


	this.toString = this.valueOf = function()
	{
		return '--[' + type + ']--> \'' + to + '\'';
	};
};



let node = function(value)
{
	// NOTE assume value has an .equals and .toString method.
	let edges = [];
	let data = value || null



	// Add a this -> other edge.
	this.connect = function(node, edge_type)
	{
		let new_edge = new edge(edge_type, node);

		edges.push(new_edge);
	};


	// Remove a this -> other edge.
	this.disconnect = function(node, edge_type)
	{
		let i, edge;

		for(i = 0; i < edges.length; i++)
		{
			edge = edges[i];

			if( edge.get_type() == edge_type &&
			    edge.get_to().equals( node ) )
			{
				// Remove the edge from our edge list.
				edges.splice(i, 1);
				return;
			}
		}
	};


	this.get_edges = function()
	{
		return edges;
	};


	this.set_data = function(new_data)
	{
		data = new_data;
	}


	this.get_data = function()
	{
		return data;
	};


	this.equals = function(node)
	{
		return data.equals(node.get_data());	// Assume all data has an equals method.
	};


	this.toString = this.valueOf = function()
	{
		return data.toString();
	};
};



module.exports =
{
	Edge: edge,
	Node: node
};	
