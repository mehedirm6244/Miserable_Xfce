// The clock and date
const days = [
	'Sunday', 'Monday', 'Tuesday', 'Wednesday',
	'Thursday', 'Friday', 'Saturday'
	];

function datetime()
{
	const today = new Date();

	let hrs = today.getHours(),
		mins = today.getMinutes(),
		tt = "AM",
		day = today.getDay(),
		dd = today.getDate(),
		mm = today.getMonth()+1,
		yy = today.getFullYear();

	if(mins<10) mins = '0' + mins;
	if(hrs>12) hrs = hrs%12, tt = "PM";
	else tt = "AM";
	if(hrs<10) hrs = '0' + hrs;

	if(dd<10) dd = '0' + dd;
	if(mm<10) mm = '0' + mm;

	document.getElementById('time').innerHTML = hrs+':'+mins+' '+tt+' ';
	document.getElementById('date').innerHTML = days[day]+', '+dd+'.'+mm+'.'+yy;
	setTimeout(datetime, 1000);
}

datetime();

// This function searches for your keyword when you press "Enter"
// Notice there's no search icon
document.getElementById('searchbar').addEventListener("keyup", function(event)
{
	// The keywords which will be searched for
	let str = document.getElementById("searchbar").value;
	// The search engine which will be used
	let search_engine = document.getElementById('engine').value;

	// If user presses "enter"
		// If the string is not equal to NULL and has anything except whitespace
			// Then search for the keyword

	if(event.keyCode === 13)
		if(str!==null && str.match(/^ *$/) === null)
			window.open(search_engine+str, "_self");
});
