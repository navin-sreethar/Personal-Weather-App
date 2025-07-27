"use client";

import { useState, useCallback } from "react";
import { Sun, Wind, Thermometer, Cloud, Search, Loader2 } from "lucide-react";
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

export function WeatherApp() {
  const [city, setCity] = useState("San Francisco");
  const [weather, setWeather] = useState<GetWeatherOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSearch = useCallback(async (searchCity: string) => {
    if (!searchCity) return;
    setIsLoading(true);
    setWeather(null);
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
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSearch(city);
  }

  return (
    <div className="w-full max-w-md mx-auto">
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
          {weather && <WeatherDisplay weather={weather} city={city} />}
          {!isLoading && !weather && <InitialState />}
        </CardContent>
      </Card>
    </div>
  );
}

function WeatherDisplay({ weather, city }: { weather: GetWeatherOutput, city: string }) {
  return (
    <div className="space-y-6">
       <h2 className="text-xl font-semibold text-center capitalize">{city}</h2>
      <div className="flex justify-around text-center">
        <div className="flex flex-col items-center">
          <Thermometer className="w-10 h-10 text-destructive mb-2" />
          <p className="text-2xl font-bold">{weather.temperature}°C</p>
          <p className="text-sm text-muted-foreground">Temperature</p>
        </div>
        <div className="flex flex-col items-center">
          <Wind className="w-10 h-10 text-blue-500 mb-2" />
          <p className="text-2xl font-bold">{weather.windSpeed} km/h</p>
          <p className="text-sm text-muted-foreground">Wind Speed</p>
        </div>
      </div>
      <div className="flex items-center justify-center gap-4 p-4 bg-secondary/50 rounded-lg">
        <Cloud className="w-8 h-8 text-primary" />
        <p className="text-lg font-medium">{weather.weatherCondition}</p>
      </div>
    </div>
  );
}

function WeatherSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
        <Skeleton className="h-8 w-1/2 mx-auto" />
      <div className="flex justify-around">
        <div className="flex flex-col items-center space-y-2">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex flex-col items-center space-y-2">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
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
