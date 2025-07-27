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
  Trash2,
  X,
} from "lucide-react";
import { getWeather, type GetWeatherOutput } from "@/ai/flows/analyze-image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";

const SAVED_CITIES_KEY = "saved_weather_cities_tabs";
type TemperatureUnit = "celsius" | "fahrenheit";

export function WeatherApp() {
  const [city, setCity] = useState("");
  const [savedCities, setSavedCities] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  const [weatherData, setWeatherData] = useState<Record<string, GetWeatherOutput | null>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [tempUnit, setTempUnit] = useState<TemperatureUnit>("celsius");
  const { toast } = useToast();

  useEffect(() => {
    try {
      const citiesFromStorage = localStorage.getItem(SAVED_CITIES_KEY);
      if (citiesFromStorage) {
        const parsedCities: string[] = JSON.parse(citiesFromStorage);
        setSavedCities(parsedCities);
        if (parsedCities.length > 0) {
          const lastCity = parsedCities[parsedCities.length-1];
          setActiveTab(lastCity);
          handleSearch(lastCity, tempUnit, false);
        }
      }
    } catch (error) {
      console.error("Could not parse cities from localStorage", error);
    }
  }, []);

  const handleSearch = useCallback(
    async (searchCity: string, unit: TemperatureUnit, showToast = true) => {
      if (!searchCity) return;
      setIsLoading(true);
      setWeatherData((prev) => ({ ...prev, [searchCity]: null }));

      try {
        const weatherResult = await getWeather({ city: searchCity, temperature_unit: unit });
        setWeatherData((prev) => ({ ...prev, [searchCity]: weatherResult }));

        if (!savedCities.includes(searchCity)) {
          const newSavedCities = [...savedCities, searchCity];
          setSavedCities(newSavedCities);
          localStorage.setItem(SAVED_CITIES_KEY, JSON.stringify(newSavedCities));
        }
        setActiveTab(searchCity);

      } catch (e: any) {
        console.error(e);
        if (showToast) {
            toast({
              title: "Failed to get weather",
              description: e.message || "There was an error fetching the weather data.",
              variant: "destructive",
            });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [toast, savedCities]
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSearch(city, tempUnit);
    setCity("");
  };

  const removeCity = (cityToRemove: string) => {
    const newSavedCities = savedCities.filter((c) => c !== cityToRemove);
    setSavedCities(newSavedCities);
    localStorage.setItem(SAVED_CITIES_KEY, JSON.stringify(newSavedCities));

    const newWeatherData = { ...weatherData };
    delete newWeatherData[cityToRemove];
    setWeatherData(newWeatherData);

    if (activeTab === cityToRemove) {
      if (newSavedCities.length > 0) {
        setActiveTab(newSavedCities[0]);
      } else {
        setActiveTab("");
      }
    }
    
    toast({
      title: "City removed",
      description: `${cityToRemove} has been removed from your list.`,
    });
  };

  const handleUnitChange = (checked: boolean) => {
    const newUnit = checked ? "fahrenheit" : "celsius";
    setTempUnit(newUnit);
    if (activeTab) {
      handleSearch(activeTab, newUnit);
    }
  }

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
          <div className="flex justify-between items-center mb-4">
            <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-grow">
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
            <div className="flex items-center space-x-2 ml-4">
              <Label htmlFor="temp-unit">°F</Label>
              <Switch id="temp-unit" checked={tempUnit === 'fahrenheit'} onCheckedChange={handleUnitChange} />
            </div>
          </div>
          
          {savedCities.length > 0 ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="overflow-x-auto">
                {savedCities.map((savedCity) => (
                  <TabsTrigger key={savedCity} value={savedCity} className="relative group pr-8">
                    {savedCity}
                     <Button
                        size="icon"
                        variant="ghost"
                        className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                            e.stopPropagation();
                            removeCity(savedCity);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                  </TabsTrigger>
                ))}
              </TabsList>
              {savedCities.map((savedCity) => (
                <TabsContent key={savedCity} value={savedCity}>
                  {isLoading && activeTab === savedCity ? (
                    <WeatherSkeleton />
                  ) : weatherData[savedCity] ? (
                    <WeatherDisplay
                      weather={weatherData[savedCity]!}
                      city={savedCity}
                      unit={tempUnit}
                    />
                  ) : (
                    <div className="text-center text-muted-foreground py-10">
                      <p>Select a city or search for a new one.</p>
                   </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          ) : (
             <InitialState />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function WeatherDisplay({
  weather,
  city,
  unit,
}: {
  weather: GetWeatherOutput;
  city: string;
  unit: TemperatureUnit;
}) {
    const tempSymbol = unit === 'celsius' ? '°C' : '°F';
  return (
    <div className="space-y-4 pt-4">
      <h2 className="text-2xl font-bold text-center capitalize">{city}</h2>
      <Card className="p-4 bg-secondary/50">
        <div className="flex items-center justify-center gap-4 text-center">
            <Cloud className="w-12 h-12 text-primary" />
            <p className="text-2xl font-medium">{weather.weatherCondition}</p>
        </div>
      </Card>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
        <WeatherMetric
          icon={<Thermometer className="text-destructive" />}
          label="Temperature"
          value={`${weather.temperature}${tempSymbol}`}
        />
         <WeatherMetric
          icon={<Thermometer className="text-blue-400" />}
          label="Feels Like"
          value={`${weather.apparentTemperature}${tempSymbol}`}
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
    <div className="space-y-6 animate-pulse pt-4">
      <Skeleton className="h-8 w-1/2 mx-auto" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[...Array(5)].map((_, i) => (
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
      <p>Your weather report will appear here once you search for a city.</p>
    </div>
  );
}
