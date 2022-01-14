// A huge thanks to https://github.com/fahadhassan1213/Weather-Teller

// Put the name of your city here
const city = 'Dhaka';

// Grab your own key from https://www.accuweather.com/
const key = '';

const getCity = async(city) =>
{
    const   url = 'https://dataservice.accuweather.com/locations/v1/cities/search',
            query = `?apikey=${key}&q=${city}`,
            response = await fetch(url+query),
            data = await response.json();

    return data[0];
}


const getWeather = async(id) =>
{
    const   url = 'https://dataservice.accuweather.com/currentconditions/v1/',
            query = `${id}?apikey=${key}`,
            response = await fetch(url+query),
            data = await response.json();

    return data[0];
}


window.onload = function()
{
    // Do this only if the computer is online
    if(window.navigator.onLine)
        updateCity(city)
        .then(data => updateUI(data))
        .catch(err =>
            {
                document.getElementById('city').innerHTML = '<i class="fa fa-map-marker"></i> '+city+' | ';
                document.getElementById('temperature').innerHTML = '<i class="fa fa-cloud"></i> N/A';

            });
}

let updateCity = async (city) =>
{
    let cityName = await getCity(city),
        weatherDetail = await getWeather(cityName.Key);

    return{cityName,weatherDetail};
}

const updateUI = (data) =>
{
    document.getElementById('temperature').innerHTML = data.weatherDetail.Temperature.Metric.Value + '&deg C ';
    document.getElementById('weather-condition').innerHTML = data.weatherDetail.WeatherText;
    document.getElementById('city').innerHTML = '<i class="fa fa-map-marker"></i> '+data.cityName.EnglishName+' | ';
}