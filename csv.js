/*
	CSV
	Niels Groot Obbink

	Functions to handle CSV data output.
*/
let file_system = require('fs');



module.exports = function(file, filter)
{
	this.file = file;
	this.filter = filter;

	this.append = function(data)
	{
		let line = filter(data).join(',') + '\n';

		file_system.appendFileSync(this.file, line, function(error)
		{
			console.error('Failed to write to file', file, ':', error);
			process.exit(1);
		});
	};
};
