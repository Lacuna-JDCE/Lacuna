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
	console.log('usage: statistics.js <type>');
	process.exit(1);
}


const directory = './processed/';
let folders = file_system.readFileSync('list.txt').toString().split('\n');

let result_rows = [];

result_rows.push("\\begin{table*}[ht]");
result_rows.push("	\\centering{");
result_rows.push("      \\begin{tabular}{lcccccc}");

let header =
[
	"Framework",
	"functions",
	"dead functions",
];

header.push( 'dead identified');
header.push( 'true positives');
header.push( 'precision');
header.push( 'recall');


result_rows.push( header.join(' & ') + "\\\\" );
result_rows.push("\\hline");

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

		row.push( data.name.split('_').join('\\_'));
		row.push( data.all );
		row.push( data.dead );

		row.push( data.analyzers[output_type].dead.identified || '-' );
		row.push( data.analyzers[output_type].dead.true_positives || '-' );

		row.push( data.analyzers[output_type].dead.precision || '-' );
		row.push( data.analyzers[output_type].dead.recall || '-' );

		result_rows.push(row.join(' & ') + "\\\\");
	}
}


result_rows.push(" \\end{tabular}");
result_rows.push("	}");
result_rows.push("    \\caption{TodoMVC application dead function data, with " + output_type + " analysis.}");
result_rows.push("	\\label{table todomvc pr " + output_type + "}");
result_rows.push("\\end{table*}");

console.log(result_rows.join('\n'));
