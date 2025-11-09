import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

interface Review {
  id: string;
  reviewerName: string;
  starRating: number;
  date: string;
  reviewText: string;
  imageUrls: string[];
  isTranslated: boolean;
  originalLanguage?: string;
  scrapedAt: string;
}

interface PilotMention {
  pilotName: string;
  rating: number;
  confidence: 'high' | 'medium' | 'low';
}

interface ReviewAnalysis {
  reviewId: string;
  pilots: PilotMention[];
  analyzedAt: string;
}

interface AnalysisCache {
  [reviewId: string]: ReviewAnalysis;
}

export async function POST(request: NextRequest) {
  const { analyzeAll = false } = await request.json();

  try {
    // Read reviews
    const reviewsPath = path.join(process.cwd(), 'data', 'reviews.json');
    const reviewsContent = await fs.readFile(reviewsPath, 'utf-8');
    const reviewsData = JSON.parse(reviewsContent);
    const reviews: Review[] = reviewsData.reviews;

    // Read cache
    const cachePath = path.join(process.cwd(), 'data', 'ai-analysis-cache.json');
    let cache: AnalysisCache = {};

    try {
      const cacheContent = await fs.readFile(cachePath, 'utf-8');
      cache = JSON.parse(cacheContent);
    } catch {
      console.log('No existing cache found, starting fresh');
    }

    // Determine which reviews need analysis
    const reviewsToAnalyze = reviews.filter(review => {
      return analyzeAll || !cache[review.id];
    });

    console.log(`Analyzing ${reviewsToAnalyze.length} reviews (${reviews.length - reviewsToAnalyze.length} already cached)`);

    // Analyze reviews with AI
    const apiKey = process.env.AI_SECRET_KEY;
    if (!apiKey) {
      throw new Error('AI_SECRET_KEY not configured');
    }

    let analyzedCount = 0;

    for (const review of reviewsToAnalyze) {
      try {
        console.log(`Analyzing review ${analyzedCount + 1}/${reviewsToAnalyze.length}`);

        const prompt = `You are analyzing a paragliding review. Extract any pilot names mentioned and determine what rating/sentiment the reviewer gave to each specific pilot.

Review:
Reviewer: ${review.reviewerName}
Overall Rating: ${review.starRating} stars
Text: ${review.reviewText}

Task: Extract pilot names and their associated ratings. If a pilot is mentioned positively, infer a high rating (4-5 stars). If mentioned negatively, infer low rating (1-3 stars). If the overall review is positive and a pilot is mentioned neutrally, assume they inherit the overall rating.

Respond ONLY with valid JSON in this exact format (no other text):
{
  "pilots": [
    {"pilotName": "Name", "rating": 5, "confidence": "high"},
    {"pilotName": "Name2", "rating": 4, "confidence": "medium"}
  ]
}

If no pilots are mentioned, return: {"pilots": []}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'grok-2-latest',
            messages: [
              {
                role: 'system',
                content: 'You are a precise data extraction assistant. Always respond with valid JSON only, no additional text.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.1, // Low temperature for consistent extraction
            max_tokens: 300
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('AI API error:', errorText);
          throw new Error(`AI API returned ${response.status}`);
        }

        const aiResponse = await response.json();
        const content = aiResponse.choices[0]?.message?.content || '{"pilots": []}';

        // Parse AI response
        let parsedResult;
        try {
          parsedResult = JSON.parse(content);
        } catch {
          // Try to extract JSON from response if AI added extra text
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsedResult = JSON.parse(jsonMatch[0]);
          } else {
            parsedResult = { pilots: [] };
          }
        }

        // Store in cache
        cache[review.id] = {
          reviewId: review.id,
          pilots: parsedResult.pilots || [],
          analyzedAt: new Date().toISOString()
        };

        analyzedCount++;

        // Throttle AI calls (wait 1-2 seconds between calls to avoid rate limits)
        if (analyzedCount < reviewsToAnalyze.length) {
          const delay = 1000 + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }

      } catch (error: any) {
        console.error(`Error analyzing review ${review.id}:`, error);
        // Continue with other reviews even if one fails
        cache[review.id] = {
          reviewId: review.id,
          pilots: [],
          analyzedAt: new Date().toISOString()
        };
      }
    }

    // Save updated cache
    await fs.writeFile(cachePath, JSON.stringify(cache, null, 2), 'utf-8');

    // Aggregate pilot statistics
    const pilotStats: {
      [pilotName: string]: {
        totalMentions: number;
        ratings: number[];
        averageRating: number;
        reviews: string[]; // review IDs
      }
    } = {};

    Object.values(cache).forEach(analysis => {
      analysis.pilots.forEach(pilot => {
        const name = pilot.pilotName;
        if (!pilotStats[name]) {
          pilotStats[name] = {
            totalMentions: 0,
            ratings: [],
            averageRating: 0,
            reviews: []
          };
        }

        pilotStats[name].totalMentions++;
        pilotStats[name].ratings.push(pilot.rating);
        pilotStats[name].reviews.push(analysis.reviewId);
      });
    });

    // Calculate averages
    Object.keys(pilotStats).forEach(name => {
      const stats = pilotStats[name];
      stats.averageRating = stats.ratings.reduce((a, b) => a + b, 0) / stats.ratings.length;
    });

    return NextResponse.json({
      success: true,
      message: `Analyzed ${analyzedCount} new reviews`,
      data: {
        totalReviews: reviews.length,
        analyzedReviews: Object.keys(cache).length,
        pilotStats,
        cache
      }
    });

  } catch (error: any) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze reviews',
        details: error.message
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Read cache
    const cachePath = path.join(process.cwd(), 'data', 'ai-analysis-cache.json');

    try {
      await fs.access(cachePath);
    } catch {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No analysis cache found'
      });
    }

    const cacheContent = await fs.readFile(cachePath, 'utf-8');
    const cache = JSON.parse(cacheContent);

    // Aggregate pilot statistics
    const pilotStats: {
      [pilotName: string]: {
        totalMentions: number;
        ratings: number[];
        averageRating: number;
        reviews: string[];
      }
    } = {};

    Object.values(cache).forEach((analysis: any) => {
      analysis.pilots.forEach((pilot: any) => {
        const name = pilot.pilotName;
        if (!pilotStats[name]) {
          pilotStats[name] = {
            totalMentions: 0,
            ratings: [],
            averageRating: 0,
            reviews: []
          };
        }

        pilotStats[name].totalMentions++;
        pilotStats[name].ratings.push(pilot.rating);
        pilotStats[name].reviews.push(analysis.reviewId);
      });
    });

    // Calculate averages
    Object.keys(pilotStats).forEach(name => {
      const stats = pilotStats[name];
      stats.averageRating = stats.ratings.reduce((a, b) => a + b, 0) / stats.ratings.length;
    });

    return NextResponse.json({
      success: true,
      data: {
        pilotStats,
        cache
      }
    });

  } catch (error: any) {
    console.error('Error reading analysis:', error);
    return NextResponse.json(
      {
        error: 'Failed to read analysis',
        details: error.message
      },
      { status: 500 }
    );
  }
}
