'use strict';



const file_system = require('fs'),
      path = require('path');

require('./array');


// How many digits after the dot for precision/recall fractions.
const precision = 3;
const wrapper_folder = 'processed/';



if(!file_system.existsSync( process.argv[2] ) )
{
	console.log("Usage: statistics.js <dir> <verbose>");
	console.log('');
	console.log("Default output type is JSON.");
	console.log("When <verbose> is set to the literal string 'verbose', output is generated in human-readable form.");
	process.exit(1);
}

let dir = process.argv[2];
let verbose = process.argv[3] == 'verbose';

let files = ['all.txt', 'original.txt', 'dynamic.txt', 'static_nativecalls.txt', 'dynamic_static_nativecalls.txt'];
let contents = [];

for(let i = 0; i < files.length; i++)
{
	let f = path.join(dir, files[i]);

	if(!file_system.existsSync( f ) )
	{
		console.log('Missing file', files[i], 'in directory', dir);
		process.exit(2);
	}else{
		contents[i] = file_system.readFileSync(f).toString().split("\n");
	}
}

for(let i = 0; i < files.length; i++)
{
	if(contents[i][ contents[i].length - 1] == '' || contents[i][ contents[i].length - 1] == '||' ||  contents[i][ contents[i].length - 1] == '|' )
	{
		contents[i].pop();	// remove last item
	}
}




let all_functions = contents[0];
let original_functions = contents[1];
let dynamic_functions = contents[2];
let static_functions = contents[3];
let hybrid_functions = contents[4];

let dead_functions = all_functions.difference(original_functions);
let alive_functions = original_functions;



if(verbose)
{
	console.log('For entry', dir.replace(wrapper_folder, ''));
	console.log('-------------------------------');
	console.log('# all functions:', all_functions.length);
	console.log('# alive:', alive_functions.length);
	console.log('# dead:', dead_functions.length);
	console.log('');
}else{
	console.log("{");
	console.log('   "name": "' + dir.replace(wrapper_folder, '') + '",');
	console.log('   "all": ' + all_functions.length + ",");
	console.log('   "alive": ' + alive_functions.length + ",");
	console.log('   "dead": ' + dead_functions.length + ",");
	console.log('   "analyzers":');
	console.log("   {");
}

show_output(dynamic_functions, 'dynamic');
show_output(static_functions, 'static');
show_output(hybrid_functions, 'hybrid');

if(!verbose)
{
	console.log("   }");
	console.log("}");
}


function show_output(strategy, name)
{
	// Dead
	let found_dead = all_functions.difference(strategy);
	let found_dead_correctly = dead_functions.same(found_dead);

	let dead_precision = [found_dead_correctly.length, found_dead.length];
	let dead_recall = [found_dead_correctly.length, dead_functions.length];

	// Alive
	let found_alive = strategy;
	let found_alive_correctly = alive_functions.same(strategy);

	let alive_precision = [found_alive_correctly.length, strategy.length];
	let alive_recall = [found_alive_correctly.length, original_functions.length];


	// Output
	if(verbose)
	{
		console.log('--------------------------------');
		console.log('            ', name);
		console.log('--------------------------------');
		console.log('   dead:');
		console.log('      identified:', found_dead.length);
		console.log('      true positives:', found_dead_correctly.length);
		console.log('      false positives:', found_dead.length - found_dead_correctly.length);
		console.log('      precision:', dead_precision[0] + '/' + dead_precision[1], '=', (dead_precision[0] / dead_precision[1]).toFixed(precision));
		console.log('      recall:', dead_recall[0] + '/' + dead_recall[1], '=', (dead_recall[0] / dead_recall[1]).toFixed(precision));
		console.log('');
		console.log('   alive:');
		console.log('      identified:', found_alive.length);
		console.log('      true positives:', found_alive_correctly.length);
		console.log('      false positives:', found_alive.length - found_alive_correctly.length);
		console.log('      precision:', alive_precision[0] + '/' + alive_precision[1], '=', (alive_precision[0] / alive_precision[1]).toFixed(precision));
		console.log('      recall:', alive_recall[0] + '/' + alive_recall[1], '=', (alive_recall[0] / alive_recall[1]).toFixed(precision));
		console.log('');
		console.log('');
	}else{
		let data =
		{
			dead:
			{
				identified: found_dead.length,
				true_positives: found_dead_correctly.length,
				false_positives: found_dead.length - found_dead_correctly.length,
				precision: parseFloat((dead_precision[0] / dead_precision[1]).toFixed(precision)),
				recall: parseFloat((dead_recall[0] / dead_recall[1]).toFixed(precision))
			},
			alive:
			{
				identified: found_alive.length,
				true_positives: found_alive_correctly.length,
				false_positives: found_alive.length - found_alive_correctly.length,
				precision: parseFloat((alive_precision[0] / alive_precision[1]).toFixed(precision)),
				recall: parseFloat((alive_recall[0] / alive_recall[1]).toFixed(precision))
			}
		}

		console.log('   "' + name + '":' + JSON.stringify(data) + (name != 'hybrid' ? ',' : ''));
	}
}
