import { NextResponse } from "next/server";

// Load from environment variables with defaults
const BREITENBERG_LAT = parseFloat(process.env.BREITENBERG_LAT || "47.47056");
const BREITENBERG_LON = parseFloat(process.env.BREITENBERG_LON || "10.38222");
const BREITENBERG_ELEVATION = parseInt(process.env.BREITENBERG_ELEVATION || "1690");

// Parse Wind Direction Ranges from .env
// Format: "0-45:100,45-90:100,90-135:90,..."
interface WindDirectionRange {
  start: number;
  end: number;
  score: number;
}

const DEFAULT_WIND_DIRECTION_RANGES = "0-45:100,45-90:100,90-135:90,135-180:60,180-225:30,225-270:20,270-315:10,315-360:100";

function parseWindDirectionRanges(rangesStr: string): WindDirectionRange[] {
  return rangesStr.split(',').map(range => {
    const [degrees, score] = range.split(':');
    const [start, end] = degrees.split('-').map(Number);
    return { start, end, score: parseInt(score) };
  });
}

const WIND_DIRECTION_RANGES = parseWindDirectionRanges(
  process.env.WIND_DIRECTION_RANGES || DEFAULT_WIND_DIRECTION_RANGES
);

// Wind Speed Scores
const WIND_SPEED_0_5_SCORE = parseInt(process.env.WIND_SPEED_0_5_SCORE || "50");
const WIND_SPEED_5_8_SCORE = parseInt(process.env.WIND_SPEED_5_8_SCORE || "70");
const WIND_SPEED_8_24_SCORE = parseInt(process.env.WIND_SPEED_8_24_SCORE || "100");
const WIND_SPEED_24_29_SCORE = parseInt(process.env.WIND_SPEED_24_29_SCORE || "60");
const WIND_SPEED_29_35_SCORE = parseInt(process.env.WIND_SPEED_29_35_SCORE || "30");
const WIND_SPEED_35_PLUS_SCORE = parseInt(process.env.WIND_SPEED_35_PLUS_SCORE || "10");

// Calculation Weights
const WEIGHT_WIND_DIRECTION = parseInt(process.env.WEIGHT_WIND_DIRECTION || "40");
const WEIGHT_WIND_SPEED = parseInt(process.env.WEIGHT_WIND_SPEED || "30");
const WEIGHT_PRECIPITATION = parseInt(process.env.WEIGHT_PRECIPITATION || "20");
const WEIGHT_CLOUD_COVER = parseInt(process.env.WEIGHT_CLOUD_COVER || "10");

// Precipitation Penalty
const PRECIPITATION_PENALTY_PER_MM = parseInt(process.env.PRECIPITATION_PENALTY_PER_MM || "20");

// Safety Constraints
const MIN_CLOUD_BASE_MARGIN = parseInt(process.env.MIN_CLOUD_BASE_MARGIN || "200");
const MIN_WIND_SPEED_FOR_DIRECTION_CHECK = parseInt(process.env.MIN_WIND_SPEED_FOR_DIRECTION_CHECK || "5");
const MAX_WIND_SPEED_KMH = parseInt(process.env.MAX_WIND_SPEED_KMH || "35");
const MAX_PRECIPITATION_MM = parseInt(process.env.MAX_PRECIPITATION_MM || "5");
const DANGEROUS_WIND_DIRECTION_THRESHOLD = parseInt(process.env.DANGEROUS_WIND_DIRECTION_THRESHOLD || "50");

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

function calculateCloudBase(temperature: number, dewpoint: number): number {
  // Cloud base formula: ((Temperature - Dewpoint) / 2.5) * 1000 feet
  // Convert to meters: feet * 0.3048
  const tempDiff = temperature - dewpoint;
  const cloudBaseFeet = (tempDiff / 2.5) * 1000;
  const cloudBaseMeters = cloudBaseFeet * 0.3048;

  // Add to ground elevation
  return Math.round(BREITENBERG_ELEVATION + cloudBaseMeters);
}

function getDirectionName(degrees: number): string {
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
}

function getQualityLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Acceptable";
  if (score >= 30) return "Poor";
  return "Bad";
}

function getWindDirectionLabel(windDirection: number): string {
  const score = getWindDirectionScore(windDirection);
  const dirName = getDirectionName(windDirection);
  const quality = getQualityLabel(score);
  return `${dirName} (${quality})`;
}

function getWindDirectionScore(windDirection: number): number {
  // Find matching range in custom configuration
  for (const range of WIND_DIRECTION_RANGES) {
    // Check if this range wraps around 360/0 degrees
    if (range.start > range.end) {
      // Wrapping range (e.g., 290-30 means 290-360 and 0-30)
      if (windDirection >= range.start || windDirection <= range.end) {
        return range.score;
      }
    } else {
      // Normal range (e.g., 30-70)
      if (windDirection >= range.start && windDirection <= range.end) {
        return range.score;
      }
    }
  }

  // Default fallback
  return 50;
}

function isWindDirectionDangerous(windDirection: number): boolean {
  // Check if the wind direction score is at or below the dangerous threshold
  const score = getWindDirectionScore(windDirection);
  return score <= DANGEROUS_WIND_DIRECTION_THRESHOLD;
}

function getWindSpeedLabel(windSpeed: number): string {
  if (windSpeed < 5) return "Too calm";
  if (windSpeed >= 5 && windSpeed <= 8) return "Light winds";
  if (windSpeed > 8 && windSpeed <= 24) return "Perfect range";
  if (windSpeed > 24 && windSpeed <= 29) return "Getting strong";
  if (windSpeed > 29 && windSpeed <= 35) return "Too strong";
  return "Not flyable";
}

function getWindSpeedScore(windSpeed: number): number {
  if (windSpeed < 5) return WIND_SPEED_0_5_SCORE;
  if (windSpeed >= 5 && windSpeed <= 8) return WIND_SPEED_5_8_SCORE;
  if (windSpeed > 8 && windSpeed <= 24) return WIND_SPEED_8_24_SCORE;
  if (windSpeed > 24 && windSpeed <= 29) return WIND_SPEED_24_29_SCORE;
  if (windSpeed > 29 && windSpeed <= 35) return WIND_SPEED_29_35_SCORE;
  return WIND_SPEED_35_PLUS_SCORE;
}

function calculateTakeoffPercentage(
  temperature: number,
  dewpoint: number,
  precipitation: number,
  windSpeed: number,
  windDirection: number,
  cloudCover: number,
  cloudBase: number
): { percentage: number; conditions: string[]; breakdown: CalculationBreakdown } {
  const conditions: string[] = [];
  const safetyViolations: string[] = [];

  // Calculate minimum required cloud base
  const minRequiredCloudBase = BREITENBERG_ELEVATION + MIN_CLOUD_BASE_MARGIN;
  const isCloudBaseSafe = cloudBase >= minRequiredCloudBase;

  // Check safety constraints (HARD LIMITS)
  if (!isCloudBaseSafe) {
    safetyViolations.push(`Cloud base ${cloudBase}m is below minimum ${minRequiredCloudBase}m`);
  }

  if (windSpeed > MAX_WIND_SPEED_KMH) {
    safetyViolations.push(`Wind too strong: ${windSpeed} km/h exceeds maximum ${MAX_WIND_SPEED_KMH} km/h`);
  }

  if (precipitation > MAX_PRECIPITATION_MM) {
    safetyViolations.push(`Heavy rain: ${precipitation}mm exceeds maximum ${MAX_PRECIPITATION_MM}mm`);
  }

  if (windSpeed > MIN_WIND_SPEED_FOR_DIRECTION_CHECK && isWindDirectionDangerous(windDirection)) {
    const dirName = getDirectionName(windDirection);
    safetyViolations.push(`Dangerous wind direction: ${dirName} (${windDirection}°) with ${windSpeed} km/h`);
  }

  // If any safety violation exists, return 0% NOT FLYABLE
  if (safetyViolations.length > 0) {
    return {
      percentage: 0,
      conditions: ["✗ NOT FLYABLE - Safety constraints violated"],
      breakdown: {
        windDirection: {
          value: windDirection,
          score: 0,
          weight: WEIGHT_WIND_DIRECTION,
          points: 0,
          label: getWindDirectionLabel(windDirection),
        },
        windSpeed: {
          value: windSpeed,
          score: 0,
          weight: WEIGHT_WIND_SPEED,
          points: 0,
          label: getWindSpeedLabel(windSpeed),
        },
        precipitation: {
          value: precipitation,
          score: 0,
          weight: WEIGHT_PRECIPITATION,
          points: 0,
          label: `${precipitation}mm rain`,
        },
        cloudCover: {
          value: cloudCover,
          score: 0,
          weight: WEIGHT_CLOUD_COVER,
          points: 0,
          label: cloudCover < 30 ? "Clear" : cloudCover < 70 ? "Partly cloudy" : "Heavy clouds",
        },
        cloudBase: {
          value: cloudBase,
          minRequired: minRequiredCloudBase,
          isSafe: isCloudBaseSafe,
        },
        safetyViolations,
        total: 0,
      },
    };
  }

  // 1. Wind Direction
  const directionScore = getWindDirectionScore(windDirection);
  const directionLabel = getWindDirectionLabel(windDirection);
  const directionPoints = (directionScore * WEIGHT_WIND_DIRECTION) / 100;

  if (directionScore >= 90) {
    conditions.push("✓ Optimal wind direction");
  } else if (directionScore >= 60) {
    conditions.push("⚠ Acceptable wind direction");
  } else {
    conditions.push("✗ Poor wind direction");
  }

  // 2. Wind Speed
  const speedScore = getWindSpeedScore(windSpeed);
  const speedLabel = getWindSpeedLabel(windSpeed);
  const speedPoints = (speedScore * WEIGHT_WIND_SPEED) / 100;

  if (speedScore >= 90) {
    conditions.push("✓ Ideal wind speed");
  } else if (speedScore >= 60) {
    conditions.push("⚠ Manageable wind speed");
  } else if (windSpeed > 29) {
    conditions.push("✗ Wind too strong");
  } else {
    conditions.push("⚠ Wind too light");
  }

  // 3. Precipitation
  let precipScore = 100;
  if (precipitation > 0) {
    precipScore = Math.max(0, 100 - (precipitation * PRECIPITATION_PENALTY_PER_MM));
    if (precipitation > 2) {
      conditions.push("✗ Rain expected");
    } else {
      conditions.push("⚠ Light precipitation");
    }
  } else {
    conditions.push("✓ No precipitation");
  }
  const precipPoints = (precipScore * WEIGHT_PRECIPITATION) / 100;
  const precipLabel = precipitation > 0 ? `${precipitation}mm rain` : "No rain";

  // 4. Cloud Cover
  const cloudScore = Math.max(0, 100 - cloudCover);
  const cloudPoints = (cloudScore * WEIGHT_CLOUD_COVER) / 100;
  const cloudLabel = cloudCover < 30 ? "Clear" : cloudCover < 70 ? "Partly cloudy" : "Heavy clouds";

  if (cloudCover < 30) {
    conditions.push("✓ Clear skies");
  } else if (cloudCover < 70) {
    conditions.push("⚠ Partly cloudy");
  } else {
    conditions.push("⚠ Heavy cloud cover");
  }

  const totalScore = directionPoints + speedPoints + precipPoints + cloudPoints;

  return {
    percentage: Math.round(totalScore),
    conditions,
    breakdown: {
      windDirection: {
        value: windDirection,
        score: directionScore,
        weight: WEIGHT_WIND_DIRECTION,
        points: Math.round(directionPoints * 10) / 10,
        label: directionLabel,
      },
      windSpeed: {
        value: windSpeed,
        score: speedScore,
        weight: WEIGHT_WIND_SPEED,
        points: Math.round(speedPoints * 10) / 10,
        label: speedLabel,
      },
      precipitation: {
        value: precipitation,
        score: precipScore,
        weight: WEIGHT_PRECIPITATION,
        points: Math.round(precipPoints * 10) / 10,
        label: precipLabel,
      },
      cloudCover: {
        value: cloudCover,
        score: cloudScore,
        weight: WEIGHT_CLOUD_COVER,
        points: Math.round(cloudPoints * 10) / 10,
        label: cloudLabel,
      },
      cloudBase: {
        value: cloudBase,
        minRequired: minRequiredCloudBase,
        isSafe: isCloudBaseSafe,
      },
      safetyViolations,
      total: Math.round(totalScore),
    },
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
      // Use hourly midday data for wind instead of daily aggregates for consistency
      const windSpeed = hourlyData.windspeed_10m[middayIndex];
      const windDirection = hourlyData.winddirection_10m[middayIndex];
      const cloudCover = hourlyData.cloudcover[middayIndex];

      const cloudBase = calculateCloudBase(temperature, dewpoint);

      const { percentage, conditions, breakdown } = calculateTakeoffPercentage(
        temperature,
        dewpoint,
        precipitation,
        windSpeed,
        windDirection,
        cloudCover,
        cloudBase
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
        cloudCover: Math.round(cloudCover),
        conditions,
        breakdown,
      });
    }

    return NextResponse.json({
      forecast: forecasts,
      location: "Breitenberg, Bavaria",
      elevation: BREITENBERG_ELEVATION,
    });
  } catch (error: any) {
    console.error("Weather API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch weather data", details: error.message },
      { status: 500 }
    );
  }
}
