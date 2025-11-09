'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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

interface ScrapedData {
  businessName: string;
  businessUrl: string;
  totalReviews: number;
  averageRating: number;
  scrapedAt: string;
  reviews: Review[];
}

interface SentimentScores {
  overallExperience: number;
  safetyProfessionalism: number;
  valueForMoney: number;
  staffServiceQuality: number;
}

interface PilotStats {
  [pilotName: string]: {
    totalMentions: number;
    ratings: number[];
    averageRating: number;
    reviews: string[];
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

export default function ReviewsDashboard() {
  const [url, setUrl] = useState('');
  const [maxReviews, setMaxReviews] = useState(50);
  const [scraping, setScraping] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);
  const [analytics, setAnalytics] = useState<AggregatedAnalytics | null>(null);
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [filterRating, setFilterRating] = useState<number | 'all'>('all');

  // Load existing data on mount
  useEffect(() => {
    loadReviews();
    loadAnalysis();
  }, []);

  const loadReviews = async () => {
    try {
      const response = await fetch('/api/reviews');
      const result = await response.json();
      if (result.success && result.data) {
        setScrapedData(result.data);
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  };

  const loadAnalysis = async () => {
    try {
      const response = await fetch('/api/analyze-reviews');
      const result = await response.json();
      if (result.success && result.data) {
        setAnalytics(result.data.aggregated);
      }
    } catch (error) {
      console.error('Error loading analysis:', error);
    }
  };

  const handleScrape = async () => {
    if (!url) {
      setMessage('Please enter a Google Maps URL');
      return;
    }

    setScraping(true);
    setMessage('Scraping reviews... This may take several minutes.');

    try {
      const response = await fetch('/api/scrape-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, maxReviews })
      });

      const result = await response.json();

      if (result.success) {
        setMessage(`Successfully scraped ${result.data.reviews.length} reviews!`);
        setScrapedData(result.data);
      } else {
        setMessage(`Error: ${result.error}`);
      }
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setScraping(false);
    }
  };

  const handleAnalyze = async (forceReanalyze: boolean = false) => {
    if (!scrapedData) {
      setMessage('No reviews to analyze. Scrape reviews first.');
      return;
    }

    setAnalyzing(true);
    setMessage(forceReanalyze
      ? 'Re-analyzing ALL reviews with AI... This may take a few minutes.'
      : 'Analyzing reviews with AI... This may take a few minutes.'
    );

    try {
      const response = await fetch('/api/analyze-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analyzeAll: forceReanalyze })
      });

      const result = await response.json();

      if (result.success) {
        setMessage(result.message);
        setAnalytics(result.data.aggregated);
      } else {
        setMessage(`Error: ${result.error}`);
      }
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  // Collect all images from reviews
  const allImages = scrapedData?.reviews.flatMap(r => r.imageUrls) || [];

  // Filter reviews by rating
  const filteredReviews = scrapedData?.reviews.filter(review => {
    if (filterRating === 'all') return true;
    return review.starRating === filterRating;
  }) || [];

  // Calculate total analyzed reviews
  const totalAnalyzed = scrapedData?.reviews.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-block mb-4 text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Google Reviews Dashboard
          </h1>
          <p className="text-gray-600">
            Scrape, analyze, and explore Google Maps reviews with AI-powered insights
          </p>
        </div>

        {/* Scraper Form */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Scrape Reviews
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Google Maps Business URL
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.google.com/maps/place/..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                disabled={scraping}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Reviews to Scrape
              </label>
              <input
                type="number"
                value={maxReviews}
                onChange={(e) => setMaxReviews(parseInt(e.target.value))}
                min="1"
                max="500"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                disabled={scraping}
              />
            </div>

            <button
              onClick={handleScrape}
              disabled={scraping}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {scraping ? 'Scraping...' : 'Start Scraping'}
            </button>
          </div>

          {message && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
              {message}
            </div>
          )}
        </div>

        {/* Stats Overview */}
        {scrapedData && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Overview
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
                <div className="text-3xl font-bold">{scrapedData.reviews.length}</div>
                <div className="text-blue-100">Reviews Scraped</div>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
                <div className="text-3xl font-bold">{scrapedData.averageRating.toFixed(1)}</div>
                <div className="text-green-100">Average Rating</div>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
                <div className="text-3xl font-bold">{allImages.length}</div>
                <div className="text-purple-100">Photos</div>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 text-white">
                <div className="text-3xl font-bold">
                  {analytics ? totalAnalyzed : 0}
                </div>
                <div className="text-orange-100">AI Analyzed</div>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              <p><strong>Business:</strong> {scrapedData.businessName}</p>
              <p><strong>Scraped:</strong> {new Date(scrapedData.scrapedAt).toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* AI Analysis Button */}
        {scrapedData && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              AI-Powered Analysis
            </h2>

            <p className="text-gray-600 mb-4">
              Extract sentiment scores, key topics, highlights, concerns, and actionable insights from reviews
            </p>

            <div className="flex gap-4">
              <button
                onClick={() => handleAnalyze(false)}
                disabled={analyzing}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {analyzing ? 'Analyzing...' : 'Analyze New Reviews'}
              </button>

              <button
                onClick={() => handleAnalyze(true)}
                disabled={analyzing}
                className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {analyzing ? 'Analyzing...' : 'Re-analyze ALL Reviews'}
              </button>
            </div>

            <p className="text-sm text-gray-500 mt-2">
              Use &quot;Analyze New Reviews&quot; to only process uncached reviews, or &quot;Re-analyze ALL&quot; to force re-process everything (useful for testing)
            </p>
          </div>
        )}

        {/* Sentiment Scores */}
        {analytics && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Sentiment Scores
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Overall Experience</span>
                  <span className="text-lg font-bold text-gray-900">{analytics.averageSentimentScores.overallExperience}/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all"
                    style={{ width: `${analytics.averageSentimentScores.overallExperience}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Safety & Professionalism</span>
                  <span className="text-lg font-bold text-gray-900">{analytics.averageSentimentScores.safetyProfessionalism}/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all"
                    style={{ width: `${analytics.averageSentimentScores.safetyProfessionalism}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Value for Money</span>
                  <span className="text-lg font-bold text-gray-900">{analytics.averageSentimentScores.valueForMoney}/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all"
                    style={{ width: `${analytics.averageSentimentScores.valueForMoney}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Staff & Service Quality</span>
                  <span className="text-lg font-bold text-gray-900">{analytics.averageSentimentScores.staffServiceQuality}/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 rounded-full transition-all"
                    style={{ width: `${analytics.averageSentimentScores.staffServiceQuality}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Topics Mentioned */}
        {analytics && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Key Topics Mentioned
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">{analytics.topicFrequency.safety}</div>
                <div className="text-sm text-gray-600 mt-1">Safety</div>
              </div>

              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-green-600">{analytics.topicFrequency.sceneryLocation}</div>
                <div className="text-sm text-gray-600 mt-1">Scenery/Location</div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-purple-600">{analytics.topicFrequency.firstTimeExperience}</div>
                <div className="text-sm text-gray-600 mt-1">First-Time</div>
              </div>

              <div className="bg-orange-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-orange-600">{analytics.topicFrequency.wouldRecommend}</div>
                <div className="text-sm text-gray-600 mt-1">Would Recommend</div>
              </div>

              <div className="bg-red-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-red-600">{analytics.topicFrequency.issuesProblems}</div>
                <div className="text-sm text-gray-600 mt-1">Issues/Problems</div>
              </div>
            </div>
          </div>
        )}

        {/* Highlights & Concerns */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Positive Highlights */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Top Positive Highlights
              </h2>
              {analytics.topPositivePhrases.length > 0 ? (
                <div className="space-y-2">
                  {analytics.topPositivePhrases.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="text-gray-800">{item.phrase}</span>
                      <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold">{item.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No highlights extracted yet</p>
              )}
            </div>

            {/* Top Concerns */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Top Concerns
              </h2>
              {analytics.topConcerns.length > 0 ? (
                <div className="space-y-2">
                  {analytics.topConcerns.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <span className="text-gray-800">{item.concern}</span>
                      <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold">{item.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No concerns found</p>
              )}
            </div>
          </div>
        )}

        {/* Actionable Insights */}
        {analytics && (analytics.commonHiddenCosts.length > 0 || analytics.improvementSuggestions.length > 0) && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Actionable Insights
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {analytics.commonHiddenCosts.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">Hidden Costs Mentioned</h3>
                  <ul className="space-y-2">
                    {analytics.commonHiddenCosts.map((cost, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-orange-500 mr-2">💰</span>
                        <span className="text-gray-700">{cost}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analytics.improvementSuggestions.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">Improvement Suggestions</h3>
                  <ul className="space-y-2">
                    {analytics.improvementSuggestions.map((suggestion, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-blue-500 mr-2">💡</span>
                        <span className="text-gray-700">{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Word Cloud */}
        {analytics && analytics.wordCloud.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Most Mentioned Words
            </h2>
            <div className="flex flex-wrap gap-3">
              {analytics.wordCloud.slice(0, 20).map((item, idx) => {
                const size = Math.min(12 + (item.frequency * 2), 32);
                return (
                  <span
                    key={idx}
                    className="inline-block px-3 py-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg text-gray-800 font-medium"
                    style={{ fontSize: `${size}px` }}
                  >
                    {item.word} ({item.frequency})
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Pilot Stats */}
        {analytics && analytics.pilotStats && Object.keys(analytics.pilotStats).length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Pilot / Staff Ratings
            </h2>
            <p className="text-gray-600 mb-4">
              Individual ratings for pilots, instructors, or staff members mentioned in reviews
            </p>
            <div className="space-y-3">
              {Object.entries(analytics.pilotStats)
                .sort((a, b) => b[1].averageRating - a[1].averageRating)
                .map(([name, stats]) => (
                  <div
                    key={name}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div>
                      <div className="font-semibold text-gray-900 text-lg">{name}</div>
                      <div className="text-sm text-gray-600">
                        {stats.totalMentions} mention{stats.totalMentions !== 1 ? 's' : ''} across {stats.reviews.length} review{stats.reviews.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-gray-900">
                        {stats.averageRating.toFixed(1)} ⭐
                      </div>
                      <div className="text-xs text-gray-500">
                        {stats.ratings.join(', ')}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Photo Gallery */}
        {allImages.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Photo Gallery ({allImages.length})
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {allImages.map((imgUrl, idx) => (
                <div
                  key={idx}
                  className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setSelectedImage(imgUrl)}
                >
                  <img
                    src={imgUrl}
                    alt={`Review photo ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews List */}
        {scrapedData && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">
                Reviews ({filteredReviews.length})
              </h2>

              <select
                value={filterRating}
                onChange={(e) => setFilterRating(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </div>

            <div className="space-y-4">
              {filteredReviews.map((review) => (
                <div
                  key={review.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-semibold text-gray-900">
                        {review.reviewerName}
                      </div>
                      <div className="text-sm text-gray-500">{review.date}</div>
                    </div>
                    <div className="flex items-center">
                      <span className="text-yellow-500 text-lg mr-1">{'⭐'.repeat(review.starRating)}</span>
                      <span className="text-gray-400 text-lg">{'⭐'.repeat(5 - review.starRating)}</span>
                    </div>
                  </div>

                  {review.isTranslated && (
                    <div className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded mb-2">
                      Translated{review.originalLanguage ? ` from ${review.originalLanguage}` : ''}
                    </div>
                  )}

                  <p className="text-gray-700 mb-2">{review.reviewText}</p>

                  {review.imageUrls.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {review.imageUrls.map((imgUrl, idx) => (
                        <img
                          key={idx}
                          src={imgUrl}
                          alt={`Photo ${idx + 1}`}
                          className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-80"
                          onClick={() => setSelectedImage(imgUrl)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Image Lightbox */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedImage(null)}
          >
            <img
              src={selectedImage}
              alt="Full size"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        )}
      </div>
    </div>
  );
}
