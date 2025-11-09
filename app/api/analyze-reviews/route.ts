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

interface SentimentScores {
  overallExperience: number;
  safetyProfessionalism: number;
  valueForMoney: number;
  staffServiceQuality: number;
}

interface TopicsMentioned {
  safety: boolean;
  sceneryLocation: boolean;
  firstTimeExperience: boolean;
  wouldRecommend: boolean;
  issuesProblems: boolean;
}

interface PilotMention {
  pilotName: string;
  rating: number;
  confidence: 'high' | 'medium' | 'low';
  sentimentScores: SentimentScores;  // Per-pilot sentiment scores
  positiveHighlights: string[];  // Specific to this pilot
  concerns: string[];  // Specific to this pilot
}

interface ReviewAnalysis {
  reviewId: string;
  sentimentScores: SentimentScores;
  topicsMentioned: TopicsMentioned;
  positiveHighlights: string[];
  concerns: string[];
  hiddenCosts: string[];
  suggestions: string[];
  keyWords: string[];
  pilots: PilotMention[];
  analyzedAt: string;
}

interface AnalysisCache {
  [reviewId: string]: ReviewAnalysis;
}

interface PilotStats {
  [pilotName: string]: {
    totalMentions: number;
    ratings: number[];
    averageRating: number;
    reviews: string[];
    averageSentimentScores: SentimentScores;  // Average across all mentions
    topPositiveHighlights: Array<{ phrase: string; count: number }>;  // Most common highlights
    topConcerns: Array<{ concern: string; count: number }>;  // Most common concerns
  };
}

interface AggregatedAnalytics {
  averageSentimentScores: SentimentScores;
  topicFrequency: {
    safety: number;
    sceneryLocation: number;
    firstTimeExperience: number;
    wouldRecommend: number;
    issuesProblems: number;
  };
  topPositivePhrases: Array<{ phrase: string; count: number }>;
  topConcerns: Array<{ concern: string; count: number }>;
  commonHiddenCosts: string[];
  improvementSuggestions: string[];
  wordCloud: Array<{ word: string; frequency: number }>;
  pilotStats: PilotStats;
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

        const prompt = `Analyze this review and extract standardized data + detailed pilot information. Review details:

Reviewer: ${review.reviewerName}
Star Rating: ${review.starRating}/5
Text: ${review.reviewText}

Extract the following (respond ONLY with valid JSON, no other text):

{
  "sentimentScores": {
    "overallExperience": 0-100,
    "safetyProfessionalism": 0-100,
    "valueForMoney": 0-100,
    "staffServiceQuality": 0-100
  },
  "topicsMentioned": {
    "safety": true/false,
    "sceneryLocation": true/false,
    "firstTimeExperience": true/false,
    "wouldRecommend": true/false,
    "issuesProblems": true/false
  },
  "positiveHighlights": ["short phrase 1", "short phrase 2"],
  "concerns": ["concern 1", "concern 2"],
  "hiddenCosts": ["any unexpected costs mentioned"],
  "suggestions": ["improvements suggested"],
  "keyWords": ["important", "words", "from", "review"],
  "pilots": [
    {
      "pilotName": "Name",
      "rating": 5,
      "confidence": "high",
      "sentimentScores": {
        "overallExperience": 95,
        "safetyProfessionalism": 100,
        "valueForMoney": 90,
        "staffServiceQuality": 95
      },
      "positiveHighlights": ["very professional", "made me feel safe"],
      "concerns": []
    }
  ]
}

Guidelines:
- Sentiment scores: 0=very negative, 50=neutral, 100=very positive
- If topic not mentioned, set to false
- Extract 2-5 key positive phrases (max 5 words each)
- Extract any concerns/negatives mentioned
- List any hidden/unexpected costs mentioned
- Extract improvement suggestions if any
- Extract 5-10 most significant words (exclude common words)

PILOTS (DETAILED):
- Extract ANY pilot/instructor/guide/staff names mentioned
- For EACH pilot, provide:
  - rating: Overall rating (1-5) based on how they're described
  - confidence: "high" if clearly named, "medium" if somewhat clear, "low" if uncertain
  - sentimentScores: Individual scores for this specific pilot based on what's said about them
  - positiveHighlights: Specific positive things said about THIS pilot (2-5 phrases)
  - concerns: Specific concerns/negatives about THIS pilot (if any)
- If no pilots mentioned, return empty array
- If pilot mentioned but no specific details, still provide best-guess sentiment scores based on overall tone`;

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
                content: 'You are a precise data extraction assistant for business reviews. Always respond with valid JSON only, no additional text.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.1,
            max_tokens: 800  // Increased for detailed pilot data
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
        const content = aiResponse.choices[0]?.message?.content || '{}';

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
            // Default empty analysis
            parsedResult = {
              sentimentScores: {
                overallExperience: review.starRating * 20,
                safetyProfessionalism: review.starRating * 20,
                valueForMoney: review.starRating * 20,
                staffServiceQuality: review.starRating * 20
              },
              topicsMentioned: {
                safety: false,
                sceneryLocation: false,
                firstTimeExperience: false,
                wouldRecommend: false,
                issuesProblems: false
              },
              positiveHighlights: [],
              concerns: [],
              hiddenCosts: [],
              suggestions: [],
              keyWords: [],
              pilots: []
            };
          }
        }

        // Store in cache
        cache[review.id] = {
          reviewId: review.id,
          sentimentScores: parsedResult.sentimentScores || {},
          topicsMentioned: parsedResult.topicsMentioned || {},
          positiveHighlights: parsedResult.positiveHighlights || [],
          concerns: parsedResult.concerns || [],
          hiddenCosts: parsedResult.hiddenCosts || [],
          suggestions: parsedResult.suggestions || [],
          keyWords: parsedResult.keyWords || [],
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
          sentimentScores: {
            overallExperience: review.starRating * 20,
            safetyProfessionalism: 50,
            valueForMoney: 50,
            staffServiceQuality: 50
          },
          topicsMentioned: {
            safety: false,
            sceneryLocation: false,
            firstTimeExperience: false,
            wouldRecommend: false,
            issuesProblems: false
          },
          positiveHighlights: [],
          concerns: [],
          hiddenCosts: [],
          suggestions: [],
          keyWords: [],
          pilots: [],
          analyzedAt: new Date().toISOString()
        };
      }
    }

    // Save updated cache
    await fs.writeFile(cachePath, JSON.stringify(cache, null, 2), 'utf-8');

    // Aggregate analytics (includes detailed pilot stats)
    const aggregated = aggregateAnalytics(cache);

    return NextResponse.json({
      success: true,
      message: `Analyzed ${analyzedCount} new reviews`,
      data: {
        totalReviews: reviews.length,
        analyzedReviews: Object.keys(cache).length,
        aggregated,
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

    // Aggregate analytics (includes detailed pilot stats)
    const aggregated = aggregateAnalytics(cache);

    return NextResponse.json({
      success: true,
      data: {
        aggregated,
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

function aggregateAnalytics(cache: AnalysisCache): AggregatedAnalytics {
  const analyses = Object.values(cache);
  const count = analyses.length;

  if (count === 0) {
    return {
      averageSentimentScores: {
        overallExperience: 0,
        safetyProfessionalism: 0,
        valueForMoney: 0,
        staffServiceQuality: 0
      },
      topicFrequency: {
        safety: 0,
        sceneryLocation: 0,
        firstTimeExperience: 0,
        wouldRecommend: 0,
        issuesProblems: 0
      },
      topPositivePhrases: [],
      topConcerns: [],
      commonHiddenCosts: [],
      improvementSuggestions: [],
      wordCloud: [],
      pilotStats: {}
    };
  }

  // Calculate average sentiment scores
  const sentimentTotals = {
    overallExperience: 0,
    safetyProfessionalism: 0,
    valueForMoney: 0,
    staffServiceQuality: 0
  };

  const topicCounts = {
    safety: 0,
    sceneryLocation: 0,
    firstTimeExperience: 0,
    wouldRecommend: 0,
    issuesProblems: 0
  };

  const phraseCounts: { [phrase: string]: number } = {};
  const concernCounts: { [concern: string]: number } = {};
  const wordCounts: { [word: string]: number } = {};
  const allHiddenCosts: string[] = [];
  const allSuggestions: string[] = [];

  // DETAILED PILOT AGGREGATION
  const pilotStats: PilotStats = {};

  analyses.forEach(analysis => {
    // Sum sentiment scores
    sentimentTotals.overallExperience += analysis.sentimentScores?.overallExperience || 0;
    sentimentTotals.safetyProfessionalism += analysis.sentimentScores?.safetyProfessionalism || 0;
    sentimentTotals.valueForMoney += analysis.sentimentScores?.valueForMoney || 0;
    sentimentTotals.staffServiceQuality += analysis.sentimentScores?.staffServiceQuality || 0;

    // Count topics
    if (analysis.topicsMentioned?.safety) topicCounts.safety++;
    if (analysis.topicsMentioned?.sceneryLocation) topicCounts.sceneryLocation++;
    if (analysis.topicsMentioned?.firstTimeExperience) topicCounts.firstTimeExperience++;
    if (analysis.topicsMentioned?.wouldRecommend) topicCounts.wouldRecommend++;
    if (analysis.topicsMentioned?.issuesProblems) topicCounts.issuesProblems++;

    // Count phrases
    analysis.positiveHighlights?.forEach(phrase => {
      phraseCounts[phrase] = (phraseCounts[phrase] || 0) + 1;
    });

    // Count concerns
    analysis.concerns?.forEach(concern => {
      concernCounts[concern] = (concernCounts[concern] || 0) + 1;
    });

    // Count words
    analysis.keyWords?.forEach(word => {
      wordCounts[word.toLowerCase()] = (wordCounts[word.toLowerCase()] || 0) + 1;
    });

    // Collect hidden costs and suggestions
    allHiddenCosts.push(...(analysis.hiddenCosts || []));
    allSuggestions.push(...(analysis.suggestions || []));

    // AGGREGATE DETAILED PILOT DATA
    analysis.pilots?.forEach(pilot => {
      const name = pilot.pilotName;
      if (!pilotStats[name]) {
        pilotStats[name] = {
          totalMentions: 0,
          ratings: [],
          averageRating: 0,
          reviews: [],
          averageSentimentScores: {
            overallExperience: 0,
            safetyProfessionalism: 0,
            valueForMoney: 0,
            staffServiceQuality: 0
          },
          topPositiveHighlights: [],
          topConcerns: []
        };
      }

      pilotStats[name].totalMentions++;
      pilotStats[name].ratings.push(pilot.rating);
      pilotStats[name].reviews.push(analysis.reviewId);

      // Accumulate sentiment scores for averaging
      if (pilot.sentimentScores) {
        pilotStats[name].averageSentimentScores.overallExperience += pilot.sentimentScores.overallExperience || 0;
        pilotStats[name].averageSentimentScores.safetyProfessionalism += pilot.sentimentScores.safetyProfessionalism || 0;
        pilotStats[name].averageSentimentScores.valueForMoney += pilot.sentimentScores.valueForMoney || 0;
        pilotStats[name].averageSentimentScores.staffServiceQuality += pilot.sentimentScores.staffServiceQuality || 0;
      }
    });
  });

  // Calculate averages
  const averageSentimentScores = {
    overallExperience: Math.round(sentimentTotals.overallExperience / count),
    safetyProfessionalism: Math.round(sentimentTotals.safetyProfessionalism / count),
    valueForMoney: Math.round(sentimentTotals.valueForMoney / count),
    staffServiceQuality: Math.round(sentimentTotals.staffServiceQuality / count)
  };

  // Get top phrases and concerns
  const topPositivePhrases = Object.entries(phraseCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([phrase, count]) => ({ phrase, count }));

  const topConcerns = Object.entries(concernCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([concern, count]) => ({ concern, count }));

  // Get word cloud data
  const wordCloud = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([word, frequency]) => ({ word, frequency }));

  // Get unique hidden costs and suggestions
  const commonHiddenCosts = [...new Set(allHiddenCosts)].slice(0, 10);
  const improvementSuggestions = [...new Set(allSuggestions)].slice(0, 10);

  // Calculate pilot averages and aggregate highlights/concerns
  Object.keys(pilotStats).forEach(name => {
    const stats = pilotStats[name];
    const mentionCount = stats.totalMentions;

    // Average rating
    stats.averageRating = stats.ratings.reduce((a, b) => a + b, 0) / stats.ratings.length;

    // Average sentiment scores
    stats.averageSentimentScores = {
      overallExperience: Math.round(stats.averageSentimentScores.overallExperience / mentionCount),
      safetyProfessionalism: Math.round(stats.averageSentimentScores.safetyProfessionalism / mentionCount),
      valueForMoney: Math.round(stats.averageSentimentScores.valueForMoney / mentionCount),
      staffServiceQuality: Math.round(stats.averageSentimentScores.staffServiceQuality / mentionCount)
    };

    // Aggregate pilot-specific highlights and concerns
    const pilotHighlightCounts: { [phrase: string]: number } = {};
    const pilotConcernCounts: { [concern: string]: number } = {};

    analyses.forEach(analysis => {
      analysis.pilots?.forEach(pilot => {
        if (pilot.pilotName === name) {
          pilot.positiveHighlights?.forEach(phrase => {
            pilotHighlightCounts[phrase] = (pilotHighlightCounts[phrase] || 0) + 1;
          });
          pilot.concerns?.forEach(concern => {
            pilotConcernCounts[concern] = (pilotConcernCounts[concern] || 0) + 1;
          });
        }
      });
    });

    stats.topPositiveHighlights = Object.entries(pilotHighlightCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([phrase, count]) => ({ phrase, count }));

    stats.topConcerns = Object.entries(pilotConcernCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([concern, count]) => ({ concern, count }));
  });

  return {
    averageSentimentScores,
    topicFrequency: {
      safety: topicCounts.safety,
      sceneryLocation: topicCounts.sceneryLocation,
      firstTimeExperience: topicCounts.firstTimeExperience,
      wouldRecommend: topicCounts.wouldRecommend,
      issuesProblems: topicCounts.issuesProblems
    },
    topPositivePhrases,
    topConcerns,
    commonHiddenCosts,
    improvementSuggestions,
    wordCloud,
    pilotStats
  };
}
