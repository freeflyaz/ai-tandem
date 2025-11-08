import { NextResponse } from "next/server";

// Load from environment variables with defaults
const BREITENBERG_LAT = parseFloat(process.env.BREITENBERG_LAT || "47.47056");
const BREITENBERG_LON = parseFloat(process.env.BREITENBERG_LON || "10.38222");
const BREITENBERG_ELEVATION = parseInt(process.env.BREITENBERG_ELEVATION || "1690");

// Wind Direction Scores
const WIND_DIR_NORTH_SCORE = parseInt(process.env.WIND_DIR_NORTH_SCORE || "100");
const WIND_DIR_NE_E_SCORE = parseInt(process.env.WIND_DIR_NE_E_SCORE || "100");
const WIND_DIR_E_SE_SCORE = parseInt(process.env.WIND_DIR_E_SE_SCORE || "90");
const WIND_DIR_SE_S_SCORE = parseInt(process.env.WIND_DIR_SE_S_SCORE || "60");
const WIND_DIR_S_SW_SCORE = parseInt(process.env.WIND_DIR_S_SW_SCORE || "30");
const WIND_DIR_SW_W_SCORE = parseInt(process.env.WIND_DIR_SW_W_SCORE || "20");
const WIND_DIR_W_NW_SCORE = parseInt(process.env.WIND_DIR_W_NW_SCORE || "10");

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

function getWindDirectionLabel(windDirection: number): string {
  if ((windDirection >= 315 && windDirection <= 360) || (windDirection >= 0 && windDirection <= 45)) {
    return "North (Best)";
  }
  if (windDirection > 45 && windDirection <= 90) {
    return "Northeast-East (Excellent)";
  }
  if (windDirection > 90 && windDirection <= 135) {
    return "East-Southeast (Good)";
  }
  if (windDirection > 135 && windDirection <= 180) {
    return "Southeast-South (Acceptable)";
  }
  if (windDirection > 180 && windDirection <= 225) {
    return "South-Southwest (Poor)";
  }
  if (windDirection > 225 && windDirection <= 270) {
    return "Southwest-West (Poor)";
  }
  return "West-Northwest (Bad)";
}

function getWindDirectionScore(windDirection: number): number {
  // North sector (315-360 and 0-45)
  if ((windDirection >= 315 && windDirection <= 360) || (windDirection >= 0 && windDirection <= 45)) {
    return WIND_DIR_NORTH_SCORE;
  }
  // Northeast to East (45-90)
  if (windDirection > 45 && windDirection <= 90) {
    return WIND_DIR_NE_E_SCORE;
  }
  // East to Southeast (90-135)
  if (windDirection > 90 && windDirection <= 135) {
    return WIND_DIR_E_SE_SCORE;
  }
  // Southeast to South (135-180)
  if (windDirection > 135 && windDirection <= 180) {
    return WIND_DIR_SE_S_SCORE;
  }
  // South to Southwest (180-225)
  if (windDirection > 180 && windDirection <= 225) {
    return WIND_DIR_S_SW_SCORE;
  }
  // Southwest to West (225-270)
  if (windDirection > 225 && windDirection <= 270) {
    return WIND_DIR_SW_W_SCORE;
  }
  // West to Northwest (270-315)
  return WIND_DIR_W_NW_SCORE;
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
  cloudCover: number
): { percentage: number; conditions: string[]; breakdown: CalculationBreakdown } {
  const conditions: string[] = [];

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
      const windSpeed = dailyData.windspeed_10m_max[i];
      const windDirection = dailyData.winddirection_10m_dominant[i];
      const cloudCover = hourlyData.cloudcover[middayIndex];

      const cloudBase = calculateCloudBase(temperature, dewpoint);

      const { percentage, conditions, breakdown } = calculateTakeoffPercentage(
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
