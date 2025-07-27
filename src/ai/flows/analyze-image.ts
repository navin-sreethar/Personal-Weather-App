'use server';
/**
 * @fileOverview A weather agent that fetches real-time weather data.
 *
 * - getWeather - A function that handles the weather fetching process.
 * - GetWeatherInput - The input type for the getWeather function.
 * - GetWeatherOutput - The return type for the getWeather function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetWeatherInputSchema = z.object({
  city: z.string().describe('The city for which to get the weather.'),
});
export type GetWeatherInput = z.infer<typeof GetWeatherInputSchema>;

const GetWeatherOutputSchema = z.object({
  temperature: z.number().describe('The current temperature in Celsius.'),
  windSpeed: z.number().describe('The current wind speed in km/h.'),
  weatherCondition: z.string().describe('A description of the current weather condition.'),
  humidity: z.number().describe('The current relative humidity in percent.'),
  precipitation: z.number().describe('The current precipitation in millimeters.'),
  apparentTemperature: z.number().describe('The apparent temperature in Celsius.'),
});
export type GetWeatherOutput = z.infer<typeof GetWeatherOutputSchema>;

interface GeocodingResponse {
  results?: {
    latitude: number;
    longitude: number;
  }[];
}

interface WeatherResponse {
  current: {
    temperature_2m: number;
    wind_speed_10m: number;
    weather_code: number;
    relative_humidity_2m: number;
    precipitation: number;
    apparent_temperature: number;
  };
}

// https://open-meteo.com/en/docs/dwd-weather-models-icon-d2-europe-isobars
const WEATHER_CODES: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow fall',
  73: 'Moderate snow fall',
  75: 'Heavy snow fall',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

const getCurrentWeather = ai.defineTool(
  {
    name: 'getCurrentWeather',
    description: 'Get the current weather for a given city.',
    inputSchema: GetWeatherInputSchema,
    outputSchema: GetWeatherOutputSchema,
  },
  async ({city}) => {
    // 1. Get lat/lon for the city
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      city
    )}`;
    const geoResponse = await fetch(geoUrl);
    if (!geoResponse.ok) {
      throw new Error(`Failed to fetch geocoding data for ${city}`);
    }
    const geoData: GeocodingResponse = await geoResponse.json();
    const location = geoData.results?.[0];
    if (!location) {
      throw new Error(`Could not find location: ${city}`);
    }

    // 2. Get weather for the lat/lon
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m`;
    const weatherResponse = await fetch(weatherUrl);
    if (!weatherResponse.ok) {
      throw new Error('Failed to fetch weather data.');
    }
    const weatherData: WeatherResponse = await weatherResponse.json();

    return {
      temperature: weatherData.current.temperature_2m,
      windSpeed: weatherData.current.wind_speed_10m,
      weatherCondition:
        WEATHER_CODES[weatherData.current.weather_code] ??
        'Unknown condition',
      humidity: weatherData.current.relative_humidity_2m,
      precipitation: weatherData.current.precipitation,
      apparentTemperature: weatherData.current.apparent_temperature,
    };
  }
);


export async function getWeather(input: GetWeatherInput): Promise<GetWeatherOutput> {
  return getWeatherFlow(input);
}

const getWeatherFlow = ai.defineFlow(
  {
    name: 'getWeatherFlow',
    inputSchema: GetWeatherInputSchema,
    outputSchema: GetWeatherOutputSchema,
  },
  async input => {
    return await getCurrentWeather(input);
  }
);
