"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface CalculationBreakdown {
  windDirection: {
    value: number;
    score: number;
    weight: number;
    points: number;
    label: string;
  };
  windSpeed: {
    value: number;
    score: number;
    weight: number;
    points: number;
    label: string;
  };
  precipitation: {
    value: number;
    score: number;
    weight: number;
    points: number;
    label: string;
  };
  cloudCover: {
    value: number;
    score: number;
    weight: number;
    points: number;
    label: string;
  };
  cloudBase: {
    value: number;
    minRequired: number;
    isSafe: boolean;
  };
  safetyViolations: string[];
  total: number;
}

interface HourlyWind {
  hour: string;
  windSpeed: number;
  windDirection: number;
  percentage: number;
  isFlyable: boolean;
  temperature: number;
  cloudBase: number;
  precipitation: number;
  safetyViolations: string[];
}

interface DayForecast {
  date: string;
  dayName: string;
  percentage: number;
  windSpeed: number;
  windDirection: number;
  temperature: number;
  rain: number;
  cloudBase: number;
  cloudCover: number;
  conditions: string[];
  breakdown: CalculationBreakdown;
  hourlyWind: HourlyWind[];
}

export default function WeatherPredictor() {
  const [forecast, setForecast] = useState<DayForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [expandedHourly, setExpandedHourly] = useState<number | null>(null);

  const getDirectionName = (degrees: number): string => {
    const directions = [
      { name: "N", min: 0, max: 22.5 },
      { name: "NNE", min: 22.5, max: 45 },
      { name: "NE", min: 45, max: 67.5 },
      { name: "ENE", min: 67.5, max: 90 },
      { name: "E", min: 90, max: 112.5 },
      { name: "ESE", min: 112.5, max: 135 },
      { name: "SE", min: 135, max: 157.5 },
      { name: "SSE", min: 157.5, max: 180 },
      { name: "S", min: 180, max: 202.5 },
      { name: "SSW", min: 202.5, max: 225 },
      { name: "SW", min: 225, max: 247.5 },
      { name: "WSW", min: 247.5, max: 270 },
      { name: "W", min: 270, max: 292.5 },
      { name: "WNW", min: 292.5, max: 315 },
      { name: "NW", min: 315, max: 337.5 },
      { name: "NNW", min: 337.5, max: 360 },
    ];

    for (const dir of directions) {
      if (degrees >= dir.min && degrees < dir.max) {
        return dir.name;
      }
    }
    return "N"; // Default for 360 degrees
  };

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
                  <span className="font-semibold">{getDirectionName(day.windDirection)} ({day.windDirection}°)</span>
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

              {/* Calculation Breakdown */}
              <div className="px-4 pb-4">
                <button
                  onClick={() => setExpandedDay(expandedDay === index ? null : index)}
                  className="w-full text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center justify-center space-x-1 py-2 border-t border-gray-200"
                >
                  <span>{expandedDay === index ? "Hide" : "Show"} Calculation</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${expandedDay === index ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {expandedDay === index && (
                  <div className="mt-3 bg-gray-50 rounded-lg p-3 space-y-2 text-xs">
                    <div className="font-bold text-gray-900 mb-2">How {day.percentage}% was calculated:</div>

                    {/* Safety Violations */}
                    {day.breakdown.safetyViolations && day.breakdown.safetyViolations.length > 0 && (
                      <div className="bg-red-100 border-2 border-red-500 rounded-lg p-3 mb-3">
                        <div className="font-bold text-red-900 mb-2 flex items-center">
                          <span className="text-lg mr-2">⚠️</span>
                          SAFETY VIOLATIONS - NOT FLYABLE
                        </div>
                        <ul className="space-y-1 text-red-800">
                          {day.breakdown.safetyViolations.map((violation, idx) => (
                            <li key={idx} className="flex items-start">
                              <span className="mr-2">•</span>
                              <span>{violation}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-2 text-xs text-red-700 italic">
                          These conditions make flying unsafe. All scores set to 0.
                        </div>
                      </div>
                    )}

                    {/* Cloud Base Safety Check */}
                    <div className="border-b border-gray-200 pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-700">Cloud Base Safety</div>
                          <div className="text-gray-600">
                            {day.breakdown.cloudBase.value}m
                            {day.breakdown.cloudBase.isSafe ? " ✓" : " ✗"}
                            (min: {day.breakdown.cloudBase.minRequired}m)
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-semibold ${day.breakdown.cloudBase.isSafe ? "text-green-600" : "text-red-600"}`}>
                            {day.breakdown.cloudBase.isSafe ? "SAFE" : "UNSAFE"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Wind Direction */}
                    <div className="border-b border-gray-200 pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-700">Wind Direction</div>
                          <div className="text-gray-600">{day.windDirection}° = {day.breakdown.windDirection.label}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">{day.breakdown.windDirection.points} pts</div>
                          <div className="text-gray-500 text-xs">
                            {day.breakdown.windDirection.score} × {day.breakdown.windDirection.weight}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Wind Speed */}
                    <div className="border-b border-gray-200 pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-700">Wind Speed</div>
                          <div className="text-gray-600">{day.windSpeed} km/h = {day.breakdown.windSpeed.label}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">{day.breakdown.windSpeed.points} pts</div>
                          <div className="text-gray-500 text-xs">
                            {day.breakdown.windSpeed.score} × {day.breakdown.windSpeed.weight}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Precipitation */}
                    <div className="border-b border-gray-200 pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-700">Precipitation</div>
                          <div className="text-gray-600">{day.breakdown.precipitation.label}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">{day.breakdown.precipitation.points} pts</div>
                          <div className="text-gray-500 text-xs">
                            {day.breakdown.precipitation.score} × {day.breakdown.precipitation.weight}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Cloud Cover */}
                    <div className="border-b border-gray-200 pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-700">Cloud Cover</div>
                          <div className="text-gray-600">{day.cloudCover}% = {day.breakdown.cloudCover.label}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">{day.breakdown.cloudCover.points} pts</div>
                          <div className="text-gray-500 text-xs">
                            {day.breakdown.cloudCover.score} × {day.breakdown.cloudCover.weight}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Total */}
                    <div className="pt-2 border-t-2 border-gray-300">
                      <div className="flex justify-between items-center">
                        <div className="font-bold text-gray-900">Total Score</div>
                        <div className="text-lg font-bold text-blue-600">{day.breakdown.total}%</div>
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-gray-500 italic">
                      Tip: Adjust scoring in .env.local file to fine-tune calculations
                    </div>
                  </div>
                )}
              </div>

              {/* Hourly Breakdown - Main Focus */}
              <div className="px-4 pb-4">
                <button
                  onClick={() => setExpandedHourly(expandedHourly === index ? null : index)}
                  className="w-full text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center justify-center space-x-1 py-2 border-t border-gray-200"
                >
                  <span>{expandedHourly === index ? "Hide" : "Show"} Hourly Breakdown (9:00-16:00)</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${expandedHourly === index ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {expandedHourly === index && day.hourlyWind && (
                  <div className="mt-3 bg-gradient-to-b from-gray-50 to-white rounded-lg p-4 space-y-2">
                    <div className="font-bold text-gray-900 mb-3 text-sm">Hourly Forecast (Flying Hours):</div>

                    {day.hourlyWind.map((hourly, idx) => (
                      <div
                        key={idx}
                        className={`rounded-lg p-3 border-2 ${
                          hourly.isFlyable
                            ? hourly.percentage >= 70
                              ? "bg-green-50 border-green-300"
                              : "bg-yellow-50 border-yellow-300"
                            : "bg-red-50 border-red-300"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-bold text-lg text-gray-900">{hourly.hour}</div>
                          <div className={`text-2xl font-bold ${
                            hourly.isFlyable
                              ? hourly.percentage >= 70
                                ? "text-green-600"
                                : "text-yellow-600"
                              : "text-red-600"
                          }`}>
                            {hourly.percentage}%
                          </div>
                        </div>

                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">💨 Wind Speed:</span>
                            <span className="font-semibold">{hourly.windSpeed} km/h</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">🧭 Direction:</span>
                            <span className="font-semibold">
                              {getDirectionName(hourly.windDirection)} ({hourly.windDirection}°)
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">🌡️ Temperature:</span>
                            <span className="font-semibold">{hourly.temperature}°C</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">☁️ Cloud Base:</span>
                            <span className="font-semibold">{hourly.cloudBase}m</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">🌧️ Rain:</span>
                            <span className={`font-semibold ${hourly.precipitation > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {hourly.precipitation > 0 ? `${hourly.precipitation}mm` : 'None'}
                            </span>
                          </div>
                        </div>

                        {!hourly.isFlyable && hourly.safetyViolations && hourly.safetyViolations.length > 0 && (
                          <div className="mt-3 pt-2 border-t-2 border-red-400">
                            <div className="text-xs font-bold text-red-800 mb-1">⚠️ SAFETY VIOLATIONS:</div>
                            <ul className="text-xs text-red-700 space-y-1">
                              {hourly.safetyViolations.map((violation, vIdx) => (
                                <li key={vIdx} className="flex items-start">
                                  <span className="mr-1">•</span>
                                  <span>{violation}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
          <div className="mt-4 space-y-2">
            <div className="text-xs text-gray-600">
              <strong>Calculation factors:</strong> Wind direction (40% weight),
              wind speed (30% weight), precipitation (20% weight), and cloud cover (10% weight).
            </div>
            <div className="text-xs text-blue-600 bg-blue-50 p-3 rounded-lg">
              <strong>💡 Fine-tune the calculation:</strong> Create a <code className="bg-white px-1 py-0.5 rounded">.env.local</code> file
              (copy from <code className="bg-white px-1 py-0.5 rounded">.env.example</code>) to customize wind speed scores,
              wind direction scores, and calculation weights for your specific location.
            </div>
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
