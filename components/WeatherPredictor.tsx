"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface DayForecast {
  date: string;
  dayName: string;
  percentage: number;
  windSpeed: number;
  windDirection: number;
  temperature: number;
  rain: number;
  cloudBase: number;
  conditions: string[];
}

export default function WeatherPredictor() {
  const [forecast, setForecast] = useState<DayForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWeather();
  }, []);

  const fetchWeather = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/weather-forecast");

      if (!response.ok) {
        throw new Error("Failed to fetch weather data");
      }

      const data = await response.json();
      setForecast(data.forecast);
    } catch (err: any) {
      setError(err.message || "Failed to load weather forecast");
      console.error("Weather fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 70) return "bg-green-500";
    if (percentage >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getPercentageTextColor = (percentage: number) => {
    if (percentage >= 70) return "text-green-700";
    if (percentage >= 40) return "text-yellow-700";
    return "text-red-700";
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <svg
            className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="text-gray-600">Loading weather data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
          <button
            onClick={fetchWeather}
            className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold"
          >
            <svg
              className="w-5 h-5 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Home
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🪂</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Breitenberg Takeoff Forecast
          </h1>
          <p className="text-gray-600">
            Pfronten, Bavaria • 1,690m elevation
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Optimal directions: North, Northeast, East, Southeast
          </p>
        </div>

        {/* Weekly Forecast Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {forecast.map((day, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-md overflow-hidden border-2 border-gray-200 hover:shadow-lg transition-shadow"
            >
              {/* Day Header */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3">
                <div className="font-bold text-lg">{day.dayName}</div>
                <div className="text-sm opacity-90">{day.date}</div>
              </div>

              {/* Percentage Circle */}
              <div className="flex items-center justify-center py-6 bg-gray-50">
                <div className="relative">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="#e5e7eb"
                      strokeWidth="12"
                      fill="none"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke={day.percentage >= 70 ? "#22c55e" : day.percentage >= 40 ? "#eab308" : "#ef4444"}
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${(day.percentage / 100) * 352} 352`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-3xl font-bold ${getPercentageTextColor(day.percentage)}`}>
                      {day.percentage}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Weather Details */}
              <div className="px-4 py-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">🌡️ Temp</span>
                  <span className="font-semibold">{day.temperature}°C</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">💨 Wind</span>
                  <span className="font-semibold">{day.windSpeed} km/h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">🧭 Dir</span>
                  <span className="font-semibold">{day.windDirection}°</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">☁️ Base</span>
                  <span className="font-semibold">{day.cloudBase}m</span>
                </div>
                {day.rain > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">🌧️ Rain</span>
                    <span className="font-semibold text-red-600">{day.rain}mm</span>
                  </div>
                )}
              </div>

              {/* Conditions */}
              {day.conditions.length > 0 && (
                <div className="px-4 pb-4">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-xs font-semibold text-blue-900 mb-1">
                      Conditions:
                    </div>
                    <ul className="text-xs text-blue-800 space-y-1">
                      {day.conditions.map((condition, idx) => (
                        <li key={idx}>• {condition}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-8 bg-white rounded-xl shadow-md p-6">
          <h3 className="font-bold text-gray-900 mb-3">Understanding the Percentage</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <div>
                <div className="font-semibold text-sm">70-100%: Excellent</div>
                <div className="text-xs text-gray-600">Great conditions for takeoff</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
              <div>
                <div className="font-semibold text-sm">40-69%: Moderate</div>
                <div className="text-xs text-gray-600">Possible but challenging</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              <div>
                <div className="font-semibold text-sm">0-39%: Poor</div>
                <div className="text-xs text-gray-600">Not recommended</div>
              </div>
            </div>
          </div>
          <div className="mt-4 text-xs text-gray-600">
            <strong>Calculation factors:</strong> Wind direction (N/NE/E/SE optimal),
            wind speed (8-24 km/h ideal), precipitation, and estimated cloud base height.
          </div>
        </div>

        {/* Refresh Button */}
        <div className="mt-6 text-center">
          <button
            onClick={fetchWeather}
            className="rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            🔄 Refresh Forecast
          </button>
        </div>
      </div>
    </div>
  );
}
