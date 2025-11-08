import { NextResponse } from "next/server";

// Breitenberg coordinates
const BREITENBERG_LAT = 47.47056;
const BREITENBERG_LON = 10.38222;
const BREITENBERG_ELEVATION = 1690; // meters

interface WeatherData {
  time: string[];
  temperature_2m: number[];
  dewpoint_2m: number[];
  precipitation: number[];
  windspeed_10m: number[];
  winddirection_10m: number[];
  cloudcover: number[];
}

function calculateCloudBase(temperature: number, dewpoint: number): number {
  // Cloud base formula: ((Temperature - Dewpoint) / 2.5) * 1000 feet
  // Convert to meters: feet * 0.3048
  const tempDiff = temperature - dewpoint;
  const cloudBaseFeet = (tempDiff / 2.5) * 1000;
  const cloudBaseMeters = cloudBaseFeet * 0.3048;

  // Add to ground elevation
  return Math.round(BREITENBERG_ELEVATION + cloudBaseMeters);
}

function getWindDirectionScore(windDirection: number): number {
  // Breitenberg optimal directions: N (0/360), NE (45), E (90), SE (135)
  // Good range: 315-135 degrees (North through East to Southeast)

  // North sector (315-360 and 0-45): Best
  if ((windDirection >= 315 && windDirection <= 360) || (windDirection >= 0 && windDirection <= 45)) {
    return 100;
  }

  // Northeast to East (45-90): Excellent
  if (windDirection > 45 && windDirection <= 90) {
    return 100;
  }

  // East to Southeast (90-135): Good
  if (windDirection > 90 && windDirection <= 135) {
    return 90;
  }

  // Southeast to South (135-180): Acceptable
  if (windDirection > 135 && windDirection <= 180) {
    return 60;
  }

  // South to Southwest (180-225): Poor
  if (windDirection > 180 && windDirection <= 225) {
    return 30;
  }

  // Southwest to West (225-270): Poor
  if (windDirection > 225 && windDirection <= 270) {
    return 20;
  }

  // West to Northwest (270-315): Bad
  if (windDirection > 270 && windDirection < 315) {
    return 10;
  }

  return 50; // Default
}

function getWindSpeedScore(windSpeed: number): number {
  // Ideal: 8-24 km/h (5-15 mph)
  // Safe range: 5-29 km/h
  // Dangerous: >29 km/h (18 mph)

  if (windSpeed < 5) {
    return 50; // Too calm, not ideal for paragliding
  }

  if (windSpeed >= 5 && windSpeed <= 8) {
    return 70; // Light winds
  }

  if (windSpeed > 8 && windSpeed <= 24) {
    return 100; // Perfect range
  }

  if (windSpeed > 24 && windSpeed <= 29) {
    return 60; // Getting strong
  }

  if (windSpeed > 29 && windSpeed <= 35) {
    return 30; // Too strong for most pilots
  }

  return 10; // Dangerous
}

function calculateTakeoffPercentage(
  temperature: number,
  dewpoint: number,
  precipitation: number,
  windSpeed: number,
  windDirection: number,
  cloudCover: number
): { percentage: number; conditions: string[] } {
  const conditions: string[] = [];
  let totalScore = 0;

  // 1. Wind Direction (40% weight)
  const directionScore = getWindDirectionScore(windDirection);
  totalScore += directionScore * 0.4;

  if (directionScore >= 90) {
    conditions.push("✓ Optimal wind direction");
  } else if (directionScore >= 60) {
    conditions.push("⚠ Acceptable wind direction");
  } else {
    conditions.push("✗ Poor wind direction");
  }

  // 2. Wind Speed (30% weight)
  const speedScore = getWindSpeedScore(windSpeed);
  totalScore += speedScore * 0.3;

  if (speedScore >= 90) {
    conditions.push("✓ Ideal wind speed");
  } else if (speedScore >= 60) {
    conditions.push("⚠ Manageable wind speed");
  } else if (windSpeed > 29) {
    conditions.push("✗ Wind too strong");
  } else {
    conditions.push("⚠ Wind too light");
  }

  // 3. Precipitation (20% weight)
  let precipScore = 100;
  if (precipitation > 0) {
    precipScore = Math.max(0, 100 - (precipitation * 20));
    if (precipitation > 2) {
      conditions.push("✗ Rain expected");
    } else {
      conditions.push("⚠ Light precipitation");
    }
  } else {
    conditions.push("✓ No precipitation");
  }
  totalScore += precipScore * 0.2;

  // 4. Cloud Cover (10% weight)
  const cloudScore = Math.max(0, 100 - cloudCover);
  totalScore += cloudScore * 0.1;

  if (cloudCover < 30) {
    conditions.push("✓ Clear skies");
  } else if (cloudCover < 70) {
    conditions.push("⚠ Partly cloudy");
  } else {
    conditions.push("⚠ Heavy cloud cover");
  }

  return {
    percentage: Math.round(totalScore),
    conditions
  };
}

export async function GET() {
  try {
    // Fetch 7-day forecast from Open-Meteo (FREE API)
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${BREITENBERG_LAT}&longitude=${BREITENBERG_LON}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,winddirection_10m_dominant&hourly=temperature_2m,dewpoint_2m,precipitation,windspeed_10m,winddirection_10m,cloudcover&timezone=Europe/Berlin&forecast_days=7`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Failed to fetch weather data from Open-Meteo");
    }

    const data = await response.json();

    // Process daily forecasts
    const forecasts = [];
    const dailyData = data.daily;
    const hourlyData = data.hourly;

    for (let i = 0; i < 7; i++) {
      const date = new Date(dailyData.time[i]);
      const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
      const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      // Get midday conditions (around 12:00) for each day
      const middayIndex = i * 24 + 12; // Approximate noon for each day

      const temperature = hourlyData.temperature_2m[middayIndex];
      const dewpoint = hourlyData.dewpoint_2m[middayIndex];
      const precipitation = dailyData.precipitation_sum[i];
      const windSpeed = dailyData.windspeed_10m_max[i];
      const windDirection = dailyData.winddirection_10m_dominant[i];
      const cloudCover = hourlyData.cloudcover[middayIndex];

      const cloudBase = calculateCloudBase(temperature, dewpoint);

      const { percentage, conditions } = calculateTakeoffPercentage(
        temperature,
        dewpoint,
        precipitation,
        windSpeed,
        windDirection,
        cloudCover
      );

      forecasts.push({
        date: dateStr,
        dayName,
        percentage,
        windSpeed: Math.round(windSpeed),
        windDirection: Math.round(windDirection),
        temperature: Math.round(temperature),
        rain: Math.round(precipitation * 10) / 10,
        cloudBase,
        conditions
      });
    }

    return NextResponse.json({
      forecast: forecasts,
      location: "Breitenberg, Bavaria",
      elevation: BREITENBERG_ELEVATION
    });

  } catch (error: any) {
    console.error("Weather API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch weather data", details: error.message },
      { status: 500 }
    );
  }
}
