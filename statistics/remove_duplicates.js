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


function fix_duplicates(str)
{
	let list = str.split("\n");
	let obj = {};
	let all = [];

	for(let i = 0; i < list.length; i++)
	{
		obj[ list[i] ] = true;
	}

	for(let entry in obj)
	{
		all.push( entry );
	}

	return all.join('\n');
}



const directory = './processed/';
let folders = get_directories(directory);

let each_file = ['dynamic.txt', 'dynamic_static_nativecalls.txt', 'original.txt', 'static_nativecalls.txt'];

for(let i = 0; i <= folders.length; i++)
{
	let entry = folders[i];
	if(!entry) continue;
	let each_path = path.join(directory, entry);


	for(let j = 0; j < each_file.length; j++)
	{
		let txt_path = path.join(each_path, each_file[j]);

		if(file_system.existsSync( txt_path ) )
		{
			let contents = file_system.readFileSync(txt_path).toString();

			file_system.writeFileSync( txt_path, fix_duplicates(contents) );
		}else{
			console.log("WARNING: file", txt_path, 'doesn\'t exist');
			continue;
		}
	}
}
