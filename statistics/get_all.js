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


function execute( cmd )
{
	const execute = child_process.execSync;

	return execute(cmd);

}


function build_getter(path)
{
	return [
		'node',
		'./get_all/get_all.js',
		path
	].join(' ');
}



const directory = './processed/';
let folders = get_directories(directory);


for(let i = 0; i <= folders.length; i++)
{
	let entry = folders[i];
	if(!entry) continue;
	let each_path = path.join(directory, entry, 'original/');

	if(file_system.existsSync( path.join(each_path, 'index.html') ) )
	{
		let result = execute( build_getter( each_path ) );

		file_system.writeFileSync( path.join(directory, entry, 'all.txt'), result );
	}else{
		file_system.writeFileSync( path.join(directory, entry, 'all.txt'), '' );
	}
}
