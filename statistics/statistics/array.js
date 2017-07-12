Array.prototype.difference = function(other)
{
	return this.filter(function(entry)
	{
		return other.indexOf(entry) == -1;
	});
}


Array.prototype.same = function(other)
{
	return this.filter(function(entry)
	{
		return other.indexOf(entry) >= 0;
	});
}
