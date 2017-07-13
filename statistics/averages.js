const file_system = require('fs'),
      path = require('path'),
      child_process = require('child_process');


function execute( cmd )
{
	const execute = child_process.execSync;

	try
	{
		return execute(cmd).toString();
	}catch(e)
	{
		return null;
	}
}


let output_type = process.argv[2];
let types = ['dynamic', 'static', 'hybrid'];

if(types.indexOf(output_type) == -1)
{
	console.log('no such type:', output_type);
	console.log('usage: statistics.js [hybrid|static|dynamic]');
	process.exit(1);
}


const directory = './processed/';
let folders = file_system.readFileSync('list.txt').toString().split('\n');

let results = { precision: [], recall: [] };

for(let i = 0; i < folders.length; i++)
{
	let entry = folders[i];
	if(!entry) continue;
	let full_path = path.join(directory, entry);

	let command = 'node ./statistics/statistics.js ' + full_path;
	let result = execute( command );

	let row = [];

	if(result != null)
	{
		let data = JSON.parse(result);

		if(data.analyzers[output_type].dead.precision)
		{
			results.precision.push(  data.analyzers[output_type].dead.precision );
		}

		if(data.analyzers[output_type].dead.recall)
		{
			results.recall.push( data.analyzers[output_type].dead.recall );
		}

	}
}

let average_precision = 0;
let average_recall = 0;

for(let i = 0; i < results.precision.length; i++)
{
	average_precision += results.precision[i];
	average_recall += results.recall[i];
}

console.log('for strategy', output_type);
console.log('over', results.precision.length, 'entries');

console.log('avg. precision:', (average_precision / results.precision.length).toFixed(3));
console.log('avg. recall:', (average_recall / results.recall.length).toFixed(3));


results.precision.sort();
results.recall.sort();

console.log('median precision:', results.precision[ Math.ceil(results.precision.length / 2) ] );
console.log('median recall:',  results.recall[ Math.ceil(results.recall.length / 2) ] );

