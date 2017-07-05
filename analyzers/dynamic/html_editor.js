/*
	HTML source editor.
	Niels Groot Obbink
*/

'use strict';



require('./native_extentions');

let file_system = require('fs');



module.exports = function()
{
	this.file_name = null;
	this.source = null;
	this.original_source = null;
 

	this.location =
	{
		HEAD_FIRST: 'HEAD_FIRST'
	};


	this.load = function(file_name)
	{
		if(file_name)
		{
			this.file_name = file_name;
			this.original_source = this.source = file_system.readFileSync(file_name).toString();
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


	this.add = function(data, location)
	{
		let source_index = -1;

		switch(location)
		{
			case this.location.HEAD_FIRST:
				source_index = this.source.toLowerCase().indexOf('<head>') + 6;
			break;

			case this.location.BODY_FIRST:
				source_index = this.source.toLowerCase().indexOf('<body>') + 6;
			break;
		}

		if( source_index == -1)
		{
			throw 'Can\'t add script tag at location ' + location;
		}

		this.source = this.source.insert( source_index, data );
	};


	this.restore = function()
	{
		this.source = this.original_source;

		this.save();
	};
};
