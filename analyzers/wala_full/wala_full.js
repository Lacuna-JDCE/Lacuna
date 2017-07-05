'use strict';

const path = require('path'),
      child_process = require('child_process'),
      esprima = require('esprima');


function run_wala(folder, html_file, timeout, callback, onerror)
{
	let command = 'java -jar ./analyzers/wala_full/WalaCG.jar ' + folder + ' ' + html_file;

	let settings = {};

	if(timeout)
	{
		settings = {timeout: timeout};
	}

	settings.maxBuffer = 1024 * 1000 * 1000;	// 1 GB

	// Run the WALA jar.
	child_process.exec(command, settings, function(error, stdout, stderr)
	{
		if(error)
		{
			onerror(error.message);
		}else{
			callback(stdout);
		}
	});
}


function get_script_by_file(file, script_data)
{
	for(let i = 0; i < script_data.length; i++)
	{
		let script = script_data[i];

		if(script.full_path == file)
		{
			return script;
		}
	}

	return null;
}


function parse_script_location(location_string)
{
	let splitted = location_string.split('@'),
	    location = splitted[1].split('-');

	return {
		file: splitted[0],
		start: parseInt(location[0], 10),
		end: parseInt(location[1], 10)
	};
}


function get_first_html_script_offset(script_data)
{
	for(let i = 0; i < script_data.length; i++)
	{
		let script = script_data[i];

		if(script.type == 'inline')
		{
			return script.location;
		}
	}

	// Should never happen.
	return {start: 0, end: 0};
}


function fix_path(file, folder)
{
	let f = file.substr(folder.length);

	if(f.indexOf('/') == 0)
	{
		return f.substr(1);
	}else{
		return f;
	}
}


function fix_caller(caller_location, script_data, html_path, folder, first_html_script_offset)
{
	let script_info = get_script_by_file(caller_location.file, script_data);

	if(script_info != null)
	{
		// If we're dealing with the index HTML file, fix the offset.
		if(caller_location.file == html_path)
		{
			caller_location.start += first_html_script_offset.start;
			caller_location.end += first_html_script_offset.start;
		}

		// Remove the path in front of the file name, because the framework expects file names relative to the dir.
		caller_location.file = fix_path(caller_location.file, folder);

		return get_containing_function(caller_location, script_info);
	}else{
		return null;
	}
}


function fix_called(called_location, script_data, html_path, folder, first_html_script_offset)
{
	let script_info = get_script_by_file(called_location.file, script_data);

	if(script_info != null)
	{
		// If we're dealing with the index HTML file, fix the offset.
		if(called_location.file == html_path)
		{
			called_location.start += first_html_script_offset.start;
			called_location.end += first_html_script_offset.start;
		}

		// Remove the path in front of the file name, because the framework expects file names relative to the dir.
		called_location.file = fix_path(called_location.file, folder);

		return called_location;
	}else{
		return null;
	}
}


function get_containing_function(called_location, script_info)
{
	for(let i = 0; i < script_info.functions.length; i++)
	{
		let func = script_info.functions[i];

		if(func.start < called_location.start && func.end > called_location.end)
		{
			called_location.start = func.start;
			called_location.end = func.end;

			return called_location;
		}
	}

	// Not in one of the functions, so global.
	called_location.start = null;
	called_location.end = null;

	return called_location;
}


module.exports = function(script_data, folder, html_file, timeout, error_handler, callback)
{
	run_wala(folder, html_file, timeout, function(result)
	{
		let called_functions = [];

		if(result == null)
		{
			callback([]);
			return;
		}


		// Used for inline JS scripts.
		let first_html_script_offset = get_first_html_script_offset(script_data);

		// The path to the HTML file.
		let html_path = path.join(folder, html_file);

		// [result] is a JSON object.
		let json = JSON.parse(result);


		for(let caller_string in json)
		{
			if(json.hasOwnProperty(caller_string))
			{
				let called_string = json[caller_string][0];

				let caller_location = parse_script_location(caller_string),
				    called_location = parse_script_location(called_string);
				
				let caller = fix_caller(caller_location, script_data, html_path, folder, first_html_script_offset),
				    called = fix_called(called_location, script_data, html_path, folder, first_html_script_offset);

				if(caller != null && called != null)
				{
					called_functions.push(
					{
						caller: caller,
						called: called
					});
				}
			}
		}

		callback(called_functions);
	}, function(error_message)
	{
		error_handler('wala_full', error_message);
		callback(null);
	});
};
