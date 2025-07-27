"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Sun,
  Wind,
  Thermometer,
  Cloud,
  Search,
  Loader2,
  Droplets,
  CloudRain,
  X,
  MessageSquareQuote,
} from "lucide-react";
import { getWeather, type GetWeatherOutput, searchCities, CitySearchOutput } from "@/ai/flows/analyze-image";
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
  const [suggestions, setSuggestions] = useState<CitySearchOutput>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [savedCities, setSavedCities] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  const [weatherData, setWeatherData] = useState<Record<string, GetWeatherOutput | null>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchingCities, setIsSearchingCities] = useState(false);
  const [tempUnit, setTempUnit] = useState<TemperatureUnit>("celsius");
  const { toast } = useToast();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    try {
      const citiesFromStorage = localStorage.getItem(SAVED_CITIES_KEY);
      if (citiesFromStorage) {
        const parsedCities: string[] = JSON.parse(citiesFromStorage);
        setSavedCities(parsedCities);
        if (parsedCities.length > 0) {
          const lastCity = parsedCities[parsedCities.length - 1];
          setActiveTab(lastCity);
          handleGetWeather(lastCity, tempUnit, false);
        }
      }
    } catch (error) {
      console.error("Could not parse cities from localStorage", error);
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);


  const handleGetWeather = useCallback(
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
        // Also remove city from saved list if API call fails for it
        setSavedCities(prev => prev.filter(c => c !== searchCity));
        if (activeTab === searchCity) {
            setActiveTab(savedCities[0] || "");
        }

      } finally {
        setIsLoading(false);
      }
    },
    [toast, savedCities, activeTab]
  );
  
  const handleCitySearch = (query: string) => {
    setCity(query);
    setShowSuggestions(true);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (query.length > 1) {
        setIsSearchingCities(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const results = await searchCities({ query });
          setSuggestions(results);
        } catch (error) {
          console.error("Failed to search cities:", error);
          setSuggestions([]);
        } finally {
            setIsSearchingCities(false);
        }
      }, 300);
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (selectedCity: string) => {
    setCity(selectedCity);
    setSuggestions([]);
    setShowSuggestions(false);
    handleGetWeather(selectedCity, tempUnit);
  };


  const removeCity = (cityToRemove: string) => {
    const newSavedCities = savedCities.filter((c) => c !== cityToRemove);
    setSavedCities(newSavedCities);
    localStorage.setItem(SAVED_CITIES_KEY, JSON.stringify(newSavedCities));

    const newWeatherData = { ...weatherData };
    delete newWeatherData[cityToRemove];
    setWeatherData(newWeatherData);

    if (activeTab === cityToRemove && newSavedCities.length > 0) {
        const newActiveTab = newSavedCities.includes(activeTab) ? activeTab : newSavedCities[0];
        setActiveTab(newActiveTab);
    } else if (newSavedCities.length === 0) {
        setActiveTab("");
    }

    toast({
      title: "City removed",
      description: `${cityToRemove} has been removed from your list.`,
    });
  };

  const handleUnitChange = (checked: boolean) => {
    const newUnit = checked ? "fahrenheit" : "celsius";
    setTempUnit(newUnit);
    
    if (savedCities.length > 0) {
      setIsLoading(true);
      const weatherPromises = savedCities.map(city => 
        getWeather({ city, temperature_unit: newUnit }).catch(err => {
            console.error(`Failed to fetch weather for ${city}:`, err);
            return { error: true, city };
        })
      );

      Promise.all(weatherPromises).then(results => {
        const newWeatherData: Record<string, GetWeatherOutput | null> = {};
        const updatedCities: string[] = [];
        
        results.forEach((result, index) => {
            const cityName = savedCities[index];
            if (result && !('error' in result)) {
                 newWeatherData[cityName] = result as GetWeatherOutput;
                 updatedCities.push(cityName);
            } else {
                newWeatherData[cityName] = null;
                toast({
                    title: `Failed to update weather for ${cityName}`,
                    variant: 'destructive'
                })
            }
        });
        setWeatherData(newWeatherData);
        setSavedCities(updatedCities);
        localStorage.setItem(SAVED_CITIES_KEY, JSON.stringify(updatedCities));
        setIsLoading(false);
      });
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
          <div className="flex justify-between items-start mb-4 gap-4">
             <div className="relative flex-grow" ref={wrapperRef}>
               <div className="flex items-center gap-2">
                <Input
                    value={city}
                    onChange={(e) => handleCitySearch(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="E.g., London, Tokyo"
                    className="flex-grow"
                />
                 <Button type="button" size="icon" disabled={isLoading && !isSearchingCities} onClick={() => handleGetWeather(city, tempUnit)}>
                    {(isLoading && !isSearchingCities) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
               </div>
                {showSuggestions && (city.length > 1) && (
                    <Card className="absolute top-full mt-2 w-full z-10 max-h-60 overflow-y-auto">
                        <CardContent className="p-2">
                            {isSearchingCities ? (
                                <div className="p-2 text-center text-sm text-muted-foreground">Searching...</div>
                            ) : suggestions.length > 0 ? (
                                suggestions.map((s, index) => (
                                    <div
                                        key={index}
                                        className="p-2 hover:bg-secondary rounded-md cursor-pointer"
                                        onClick={() => handleSuggestionClick(s.name)}
                                    >
                                        {s.name}, {s.country}
                                    </div>
                                ))
                            ) : (
                                <div className="p-2 text-center text-sm text-muted-foreground">No cities found.</div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Label htmlFor="temp-unit">°F</Label>
              <Switch id="temp-unit" checked={tempUnit === 'fahrenheit'} onCheckedChange={handleUnitChange} />
            </div>
          </div>

          {savedCities.length > 0 ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="overflow-x-auto pb-2">
                <TabsList>
                  {savedCities.map((savedCity) => (
                    <div key={savedCity} className="relative group flex-shrink-0">
                      <TabsTrigger value={savedCity} className="pr-8">
                        {savedCity}
                      </TabsTrigger>
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
                    </div>
                  ))}
                </TabsList>
              </div>
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
                      <p>Loading weather data...</p>
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
            <MessageSquareQuote className="w-12 h-12 text-accent" />
            <p className="text-base italic">"{weather.summary}"</p>
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
         <WeatherMetric
          icon={<Cloud className="text-primary" />}
          label="Condition"
          value={weather.weatherCondition}
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
       <Card className="p-4 bg-secondary/50">
        <div className="flex items-center justify-center gap-4 text-center">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-40" />
            </div>
        </div>
      </Card>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
           <Card key={i} className="p-4 flex flex-col items-center justify-center gap-2">
             <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-4 w-20" />
          </Card>
        ))}
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
