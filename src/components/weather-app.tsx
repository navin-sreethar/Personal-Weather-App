"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Sun,
  Wind,
  Thermometer,
  Cloud,
  Search,
  Loader2,
  Droplets,
  CloudRain,
  Save,
  Trash2,
} from "lucide-react";
import { getWeather, type GetWeatherOutput } from "@/ai/flows/analyze-image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "./ui/separator";

const SAVED_CITIES_KEY = "saved_weather_cities";

export function WeatherApp() {
  const [city, setCity] = useState("San Francisco");
  const [savedCities, setSavedCities] = useState<string[]>([]);
  const [weather, setWeather] = useState<GetWeatherOutput | null>(null);
  const [currentCity, setCurrentCity] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const citiesFromStorage = localStorage.getItem(SAVED_CITIES_KEY);
      if (citiesFromStorage) {
        setSavedCities(JSON.parse(citiesFromStorage));
      }
    } catch (error) {
      console.error("Could not parse cities from localStorage", error);
    }
  }, []);

  const handleSearch = useCallback(
    async (searchCity: string) => {
      if (!searchCity) return;
      setIsLoading(true);
      setWeather(null);
      setCurrentCity(searchCity);
      try {
        const weatherResult = await getWeather({ city: searchCity });
        setWeather(weatherResult);
      } catch (e: any) {
        console.error(e);
        toast({
          title: "Failed to get weather",
          description: e.message || "There was an error fetching the weather data.",
          variant: "destructive",
        });
        setCurrentCity(null);
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSearch(city);
  };

  const saveCity = () => {
    if (currentCity && !savedCities.includes(currentCity)) {
      const newSavedCities = [...savedCities, currentCity];
      setSavedCities(newSavedCities);
      localStorage.setItem(SAVED_CITIES_KEY, JSON.stringify(newSavedCities));
      toast({
        title: "City saved!",
        description: `${currentCity} has been added to your list.`,
      });
    }
  };

  const removeCity = (cityToRemove: string) => {
    const newSavedCities = savedCities.filter((c) => c !== cityToRemove);
    setSavedCities(newSavedCities);
    localStorage.setItem(SAVED_CITIES_KEY, JSON.stringify(newSavedCities));
    toast({
      title: "City removed",
      description: `${cityToRemove} has been removed from your list.`,
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto grid gap-4">
      <Card className="shadow-lg rounded-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center gap-2 mb-2">
            <Sun className="w-8 h-8 text-yellow-500" />
            <CardTitle className="text-3xl font-headline tracking-tight">
              Weather Now
            </CardTitle>
          </div>
          <CardDescription>
            Enter a city to get the latest weather updates.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="flex items-center gap-2 mb-6">
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="E.g., London, Tokyo"
              className="flex-grow"
            />
            <Button type="submit" size="icon" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </form>

          {isLoading && <WeatherSkeleton />}
          {weather && currentCity && (
            <WeatherDisplay
              weather={weather}
              city={currentCity}
              onSave={saveCity}
              isSaved={savedCities.includes(currentCity)}
            />
          )}
          {!isLoading && !weather && <InitialState />}
        </CardContent>
      </Card>
      {savedCities.length > 0 && (
        <Card className="shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle>Saved Cities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {savedCities.map((savedCity) => (
                <div key={savedCity} className="flex items-center gap-1 bg-secondary rounded-full pr-2">
                   <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-full"
                    onClick={() => handleSearch(savedCity)}
                  >
                    {savedCity}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 rounded-full"
                    onClick={() => removeCity(savedCity)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function WeatherDisplay({
  weather,
  city,
  onSave,
  isSaved,
}: {
  weather: GetWeatherOutput;
  city: string;
  onSave: () => void;
  isSaved: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-center capitalize">{city}</h2>
        <Button onClick={onSave} disabled={isSaved} size="sm">
          <Save className="mr-2 h-4 w-4" />
          {isSaved ? "Saved" : "Save City"}
        </Button>
      </div>
      <Card className="p-4 bg-secondary/50">
        <div className="flex items-center justify-center gap-4 text-center">
            <Cloud className="w-12 h-12 text-primary" />
            <p className="text-2xl font-medium">{weather.weatherCondition}</p>
        </div>
      </Card>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <WeatherMetric
          icon={<Thermometer className="text-destructive" />}
          label="Temperature"
          value={`${weather.temperature}°C`}
        />
         <WeatherMetric
          icon={<Thermometer className="text-blue-400" />}
          label="Feels Like"
          value={`${weather.apparentTemperature}°C`}
        />
        <WeatherMetric
          icon={<Wind className="text-blue-500" />}
          label="Wind Speed"
          value={`${weather.windSpeed} km/h`}
        />
        <WeatherMetric
          icon={<Droplets className="text-sky-600" />}
          label="Humidity"
          value={`${weather.humidity}%`}
        />
        <WeatherMetric
          icon={<CloudRain className="text-gray-500" />}
          label="Precipitation"
          value={`${weather.precipitation} mm`}
        />
      </div>
    </div>
  );
}

function WeatherMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="p-4 flex flex-col items-center justify-center gap-2">
       <div className="[&>svg]:w-8 [&>svg]:h-8">{icon}</div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </Card>
  );
}


function WeatherSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <Skeleton className="h-8 w-1/2 mx-auto" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex flex-col items-center space-y-2 p-4 border rounded-lg">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-4">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-6 w-40" />
      </div>
    </div>
  );
}

function InitialState() {
  return (
    <div className="text-center text-muted-foreground py-10">
      <p>Your weather report will appear here.</p>
    </div>
  );
}
