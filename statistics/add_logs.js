const file_system = require('fs'),
      path = require('path'),
      child_process = require('child_process');



function get_directories(src_path)
{
	return file_system.readdirSync(src_path).filter(function(file)
	{
		return file_system.lstatSync(path.join(src_path, file)).isDirectory();
	});
}


function get_copy_command(from, to)
{
	return 'cp -rf "' + from + '" "' + to + '"';
}



function execute( cmd )
{
	const execute = child_process.execSync;

	return execute(cmd);
}


function build_adder(path)
{
	return [
		'node',
		'./add_logs/add_logs.js',
		path
	].join(' ');
}



const directory = './processed/';
let folders = get_directories(directory);

let each_type = ['original', 'dynamic', 'static_nativecalls', 'dynamic_static_nativecalls'];

for(let i = 0; i <= folders.length; i++)
{
	let entry = folders[i];
	if(!entry) continue;
	let each_path = path.join(directory, entry);

	for(let j = 0; j < each_type.length; j++)
	{
		let the_path = path.join(each_path, each_type[j]);

		if(file_system.existsSync( path.join(the_path, 'index.html') ) )
		{
			execute( build_adder( the_path ) );
		}
	}
}
