/*
	JavaScript dynamic dead code elimination tool.
	Niels Groot Obbink
*/

'use strict';


let path = require('path'),
    HtmlEditor = require('./html_editor'),
	JsEditor = require('./js_editor'),
    Browser = require('./browser');


module.exports =
{
	settings:
	{
		logger_name: '___jdce_logger'
	},


	run: function(settings, callback)
	{
		// Log call is formatted 'identifier|file|start|end'.
		let js_head_code = `
			var ` + this.settings.logger_name + ` = function(file_name, start, end)
			{
				console.log('` + this.settings.logger_name + `|' + file_name + '|' + start + '|' + end);
			};
		`;

		// Create a new HTML editor instance. We'll reset the HTML source later.
		let html = new HtmlEditor();

		// Retrieve HTML source.
		html.load(settings.html_path);

		// Add the script tag to the begining of the <head> tag.
		html.add( '<script>' + js_head_code + '</script>', html.location.HEAD_FIRST );

		// Overwrite the old source.
		html.save();

		let script_editors = [];

		settings.scripts.forEach(function(logger_name)
		{
			return function(script_data)
			{
				// Only deal with .js files, HTML file won't parse right.
				if(script_data.file.split('.').pop() == 'js')
				{
					// Create a new script editor instance and save it so we can change the source, and reset it afterwards.
					let js = new JsEditor();

					// Save it, so we can access it later (and restore the original source).
					script_editors[script_data.file] = js;

					js.load(script_data.full_path, script_data.source);

					// Add a log call to each function in this script. The only argument (a function) specifies the format.
					js.add_log_calls(function(file, start, end)
					{
						return logger_name + '("' + file + '", ' + start + ', ' + end + ');';
					});

					js.save();
				}
			}
		}(this.settings.logger_name));

		// Create a new Browser instance, and a list of all log calls.
		let browser = new Browser(),
		    log_calls = [],
		    logger_name = this.settings.logger_name;

		// Open the web app, and deal with the results.
		browser.start();

		browser.load(settings.html_path, settings.timeout, function(console_logs)
		{
			let logs = parse_logs(console_logs, logger_name);
			cleanup();
			return_results(logs);
		});



		function parse_logs(logs, logger_name)
		{
			let logs_per_file = {};

			logs.forEach(function(log)
			{
				// logs are formatted 'identifier|file|start|stop'.
				let regex = /([^\|]+)\|([^\|]+)\|([0-9]+)\|([0-9]+)/g;
				let result = regex.exec(log);	// [data, logger_name, file_name, start, end]

				// Only look for logs that start with our log identifier.
				if(result === null ||  result[1] != logger_name)
				{
					return;
				}

				let file = result[2],
				    start = result[3],
				    end = result[4];

				if( ! logs_per_file.hasOwnProperty(file) )
				{
					logs_per_file[ file ] = [];
				}

				// Comparison function
				let exists = function(entry)
				{
					return entry.start == start && entry.end == end;
				};

				// Functions can be called twice or more, so remove duplicate entries before inserting.
				if( ! logs_per_file[ file ].some( exists ) )
				{
					logs_per_file[ file ].push(
					{
						start: start,
						end: end
					});
				}
			});

			return logs_per_file;
		}



		function cleanup()
		{
			// Reset JS files.
			for(let editor in script_editors)
			{
				if(script_editors.hasOwnProperty(editor))
				{
					script_editors[editor].restore();
					script_editors[editor].save();
				}
			}

			// Remove inserted script tag from the HTML source.
			html.restore();

			// Close the browser.
			browser.stop();
		}



		function fix_results(results)
		{
			let files = [];

			settings.scripts.forEach(function(script)
			{
				let correct_name = script.file;

				for(let file in results)
				{
					if(results.hasOwnProperty(file) )
					{
						if( path.join(settings.directory, correct_name) == file )
						{
							files[correct_name] = results[file];
						}
					}
				}
			});

			return files;
		}



		function return_results(results)
		{
			results = fix_results(results);

			// Return statistics to caller.
			callback( results );
		}
	}
};
