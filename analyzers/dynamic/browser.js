/*
	Wrapper for headless browser.
	Niels Groot Obbink
*/

'use strict';

var phantomjs = require('phantomjs-prebuilt-that-works')
var selenium = require('selenium-webdriver')


module.exports = function()
{
	this.driver = null;
	this.min_required_time = 5000;

	this.start = function()
	{
		// Change the binary path from the default selenium phantomjs settings.
		let phantomjs_capabilities = selenium.Capabilities.phantomjs();

		phantomjs_capabilities.set("phantomjs.binary.path", phantomjs.path);

		// Build a custom phantomJS driver.
		this.driver = new selenium.Builder().withCapabilities(phantomjs_capabilities).build();
	};


	this.load = function(url, timeout, success)
	{
		let me = this;

		// Load the page.
		this.driver.get(url);


		// The function to run.
		let runner = function()
		{
			let logs = [];

			// Retrieve console.log results.
			me.driver.manage().logs().get('browser').then(function(entries)
			{
				entries.forEach(function(entry)
				{
					logs.push(entry.message);
				});

				success(logs);
			});
		};

			// After the timeout, collect the console.log entries and call the success callback function.
		if(timeout)
		{
			// Wait at least min_required_time (browser startup time) seconds, more if we have a longer timeout.
			setTimeout(runner, Math.max(timeout, me.min_required_time));
		}else{
			setTimeout(runner, me.min_required_time);
		}
	};


	this.stop = function()
	{
		this.driver.quit();
	}
};
