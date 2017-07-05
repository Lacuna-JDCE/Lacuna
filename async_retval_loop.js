/*
	Async loop
	Niels Groot Obbink

	Executes the functions in array one by one, passing the result, settings object and callback function as arguments.
*/

module.exports = function(functions, settings, callback)
{
	let i = -1,
	    length = functions.length,
	    analyzer_results = [];

	let loop = function(result)
	{
		i++;

		if(i >= 1)
		{
			if( i <= length)
			{
				analyzer_results.push( [settings.fingerprints[i].name, result] );
			}else{
				return;
			}

			if( i == length )
			{
				callback(analyzer_results);
				return;
			}
		}


		settings.fingerprint = settings.fingerprints[i + 1];	// +1 for ignoring CONSTRUCTED edge type.

		if(settings.pace)
		{
			console.log('running analyzer ' + settings.fingerprint.name + '...');
		}

		functions[i](settings, loop);
	}
 
	let result = loop(true);
};
