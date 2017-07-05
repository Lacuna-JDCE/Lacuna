/*
	Native type extentions.
	Niels Groot Obbink

	Extend some native JavaScript types with useful methods.
*/



// Insert a string at the [start] character position.
String.prototype.insert = function(start, new_string)
{
	return this.slice(0, start) + new_string + this.slice(start);
};


// Remove [length] characters from [start] and insert [insert] at position [start].
String.prototype.splice = function(start, length, insert)
{
	return this.substring(0, start) + insert + this.substring(start + length);
};


// Copy properties from [other] to [this] object.
Object.prototype.extend = function(other)
{
	let property;

	for (property in other)
	{
		if( other.hasOwnProperty(property) && other[property] != null )
		{
			this[property] = other[property];
		}
	}

	return this;
};
