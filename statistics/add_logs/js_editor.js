/*
	HTML source editor.
	Niels Groot Obbink
*/

'use strict';



require('./native_extentions');

let file_system = require('fs'),
    esprima = require('esprima');



module.exports = function()
{
	this.file_name = null;
	this.source = null;
	this.original_source = null;
	this.functions = null;
 


	this.load = function(file_name, source)
	{
		if(file_name)
		{
			this.file_name = file_name;
			this.original_source = this.source = source;

			// Also retrieve and save a list of all functions in this script file.
			this.functions = this.get_functions( this.source );
		}
	};


	this.save = function()
	{
		if(this.file_name == null)
		{
			return;
		}

		file_system.writeFileSync( this.file_name, this.source );
	};



	this.restore = function()
	{
		this.source = this.original_source;

		this.save();
	};



	this.add_log_calls = function(html_path, logger)
	{
		let log_call,
		    offset = 0,
		    new_source = this.source;	// Start with the original source.

		for(let i = 0; i < this.functions.length; i++)
		{
			let this_function = this.functions[i];

let file_n = this.file_name.replace(html_path, '');

			// Create a log call for this function.
			log_call = logger(file_n, i);

			// Insert the log call in the source.
			// Starting character position is function body location (plus one for the { character) plus length of all previously inserted log calls.
			new_source = new_source.insert(this_function.body.start + 1 + offset, log_call);

			// Increment the offset with the length of the log call, so the next insertion is at the right place.
			offset += log_call.length;
		}

		this.source = new_source;
	};



	this.get_functions = function(source)
	{
		let functions = [];

		let last_function = null;

		esprima.parse(source, {range: true}, function(node, meta)
		{
			// We are only interested in functions (declarations and expressions).
			if(node.type == 'FunctionDeclaration' || node.type == 'FunctionExpression')
			{
				let containing_function = last_function;
				last_function = node;

				// Gather the data for this function in a abbreviated format.
				let function_data =
				{
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
					// If it's not a FunctionDeclaration it must be a FunctionExpression.
					function_data.type = 'expression';
				}

				// Save the function data.
				functions.push(function_data);
			}
		});

		// Esprima doesn't return an ordered node list, so sort the functions based on starting position.
		functions = functions.sort(function(a, b)
		{
			return a.start - b.start;
		});

		return functions;
	};
};
