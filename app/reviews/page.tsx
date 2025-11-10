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
    averageSentimentScores: SentimentScores;
    topPositiveHighlights: Array<{ phrase: string; count: number }>;
    topConcerns: Array<{ concern: string; count: number }>;
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
  const [expandedPilots, setExpandedPilots] = useState<Set<string>>(new Set());

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

  // Toggle pilot expansion
  const togglePilot = (pilotName: string) => {
    setExpandedPilots(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pilotName)) {
        newSet.delete(pilotName);
      } else {
        newSet.add(pilotName);
      }
      return newSet;
    });
  };

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ backgroundColor: '#f5f7fb' }}>
      <div className="mx-auto" style={{ maxWidth: '1440px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <Link
            href="/"
            className="inline-block font-medium"
            style={{ marginBottom: '16px', color: '#4a6cf7' }}
          >
            ← Back to Home
          </Link>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#202233', marginBottom: '8px' }}>
            Google Reviews Dashboard
          </h1>
          <p style={{ color: '#636986' }}>
            Scrape, analyze, and explore Google Maps reviews with AI-powered insights
          </p>
        </div>

        {/* Scraper Form */}
        <div className="bg-white mb-6" style={{
          border: '1px solid #dde2ec',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
          padding: '20px'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#202233', marginBottom: '16px' }}>
            Scrape Reviews
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block mb-2" style={{ fontSize: '12px', fontWeight: 500, color: '#636986' }}>
                Google Maps Business URL
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.google.com/maps/place/..."
                className="w-full"
                style={{
                  height: '40px',
                  padding: '0 12px',
                  border: '1px solid #dde2ec',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#202233'
                }}
                disabled={scraping}
              />
            </div>

            <div>
              <label className="block mb-2" style={{ fontSize: '12px', fontWeight: 500, color: '#636986' }}>
                Max Reviews to Scrape
              </label>
              <input
                type="number"
                value={maxReviews}
                onChange={(e) => setMaxReviews(parseInt(e.target.value))}
                min="1"
                max="500"
                className="w-full"
                style={{
                  height: '40px',
                  padding: '0 12px',
                  border: '1px solid #dde2ec',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#202233'
                }}
                disabled={scraping}
              />
            </div>

            <button
              onClick={handleScrape}
              disabled={scraping}
              className="w-full font-semibold transition-colors"
              style={{
                backgroundColor: scraping ? '#a3a9bf' : '#4a6cf7',
                color: '#ffffff',
                padding: '8px 14px',
                borderRadius: '6px',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)'
              }}
              onMouseEnter={(e) => !scraping && (e.currentTarget.style.backgroundColor = '#384fd4')}
              onMouseLeave={(e) => !scraping && (e.currentTarget.style.backgroundColor = '#4a6cf7')}
            >
              {scraping ? 'Scraping...' : 'Start Scraping'}
            </button>
          </div>

          {message && (
            <div className="mt-4" style={{
              padding: '16px',
              backgroundColor: '#ebf7ff',
              border: '1px solid #9acfff',
              borderRadius: '6px',
              color: '#1067d4'
            }}>
              {message}
            </div>
          )}
        </div>

        {/* Stats Overview */}
        {scrapedData && (
          <div className="bg-white mb-6" style={{
            border: '1px solid #dde2ec',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
            padding: '20px'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#202233', marginBottom: '16px' }}>
              Overview
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 text-white" style={{ backgroundColor: '#4a6cf7', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: 700 }}>{scrapedData.reviews.length}</div>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>Reviews Scraped</div>
              </div>

              <div className="p-4 text-white" style={{ backgroundColor: '#0c9e64', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: 700 }}>{scrapedData.averageRating.toFixed(1)}</div>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>Average Rating</div>
              </div>

              <div className="p-4 text-white" style={{ backgroundColor: '#1985ff', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: 700 }}>{allImages.length}</div>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>Photos</div>
              </div>

              <div className="p-4 text-white" style={{ backgroundColor: '#f27f00', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: 700 }}>
                  {analytics ? totalAnalyzed : 0}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>AI Analyzed</div>
              </div>
            </div>

            <div className="mt-4" style={{ fontSize: '12px', color: '#636986' }}>
              <p><strong>Business:</strong> {scrapedData.businessName}</p>
              <p><strong>Scraped:</strong> {new Date(scrapedData.scrapedAt).toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* AI Analysis Button */}
        {scrapedData && (
          <div className="bg-white mb-6" style={{
            border: '1px solid #dde2ec',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
            padding: '20px'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#202233', marginBottom: '16px' }}>
              AI-Powered Analysis
            </h2>

            <p style={{ color: '#636986', marginBottom: '16px', fontSize: '14px' }}>
              Extract sentiment scores, key topics, highlights, concerns, and actionable insights from reviews
            </p>

            <div className="flex gap-4">
              <button
                onClick={() => handleAnalyze(false)}
                disabled={analyzing}
                className="font-semibold transition-colors"
                style={{
                  backgroundColor: analyzing ? '#a3a9bf' : '#4a6cf7',
                  color: '#ffffff',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)'
                }}
                onMouseEnter={(e) => !analyzing && (e.currentTarget.style.backgroundColor = '#384fd4')}
                onMouseLeave={(e) => !analyzing && (e.currentTarget.style.backgroundColor = '#4a6cf7')}
              >
                {analyzing ? 'Analyzing...' : 'Analyze New Reviews'}
              </button>

              <button
                onClick={() => handleAnalyze(true)}
                disabled={analyzing}
                className="font-semibold transition-colors"
                style={{
                  backgroundColor: analyzing ? '#a3a9bf' : '#f27f00',
                  color: '#ffffff',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)'
                }}
                onMouseEnter={(e) => !analyzing && (e.currentTarget.style.backgroundColor = '#cf6700')}
                onMouseLeave={(e) => !analyzing && (e.currentTarget.style.backgroundColor = '#f27f00')}
              >
                {analyzing ? 'Analyzing...' : 'Re-analyze ALL Reviews'}
              </button>
            </div>

            <p style={{ fontSize: '12px', color: '#8087a0', marginTop: '8px' }}>
              Use &quot;Analyze New Reviews&quot; to only process uncached reviews, or &quot;Re-analyze ALL&quot; to force re-process everything (useful for testing)
            </p>
          </div>
        )}

        {/* Sentiment Scores */}
        {analytics && (
          <div className="bg-white mb-6" style={{
            border: '1px solid #dde2ec',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
            padding: '20px'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#202233', marginBottom: '16px' }}>
              Sentiment Scores
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#636986' }}>Overall Experience</span>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#202233' }}>{analytics.averageSentimentScores.overallExperience}/100</span>
                </div>
                <div className="w-full rounded-full h-3" style={{ backgroundColor: '#dde2ec' }}>
                  <div
                    className="h-3 rounded-full transition-all"
                    style={{ width: `${analytics.averageSentimentScores.overallExperience}%`, backgroundColor: '#4a6cf7' }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#636986' }}>Safety & Professionalism</span>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#202233' }}>{analytics.averageSentimentScores.safetyProfessionalism}/100</span>
                </div>
                <div className="w-full rounded-full h-3" style={{ backgroundColor: '#dde2ec' }}>
                  <div
                    className="h-3 rounded-full transition-all"
                    style={{ width: `${analytics.averageSentimentScores.safetyProfessionalism}%`, backgroundColor: '#0c9e64' }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#636986' }}>Value for Money</span>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#202233' }}>{analytics.averageSentimentScores.valueForMoney}/100</span>
                </div>
                <div className="w-full rounded-full h-3" style={{ backgroundColor: '#dde2ec' }}>
                  <div
                    className="h-3 rounded-full transition-all"
                    style={{ width: `${analytics.averageSentimentScores.valueForMoney}%`, backgroundColor: '#1985ff' }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#636986' }}>Staff & Service Quality</span>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#202233' }}>{analytics.averageSentimentScores.staffServiceQuality}/100</span>
                </div>
                <div className="w-full rounded-full h-3" style={{ backgroundColor: '#dde2ec' }}>
                  <div
                    className="h-3 rounded-full transition-all"
                    style={{ width: `${analytics.averageSentimentScores.staffServiceQuality}%`, backgroundColor: '#f27f00' }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Topics Mentioned */}
        {analytics && (
          <div className="bg-white mb-6" style={{
            border: '1px solid #dde2ec',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
            padding: '20px'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#202233', marginBottom: '16px' }}>
              Key Topics Mentioned
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-4 text-center" style={{ backgroundColor: '#eef3ff', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#4a6cf7' }}>{analytics.topicFrequency.safety}</div>
                <div style={{ fontSize: '12px', color: '#636986', marginTop: '4px' }}>Safety</div>
              </div>

              <div className="p-4 text-center" style={{ backgroundColor: '#e7f9f1', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#0c9e64' }}>{analytics.topicFrequency.sceneryLocation}</div>
                <div style={{ fontSize: '12px', color: '#636986', marginTop: '4px' }}>Scenery/Location</div>
              </div>

              <div className="p-4 text-center" style={{ backgroundColor: '#ebf7ff', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#1985ff' }}>{analytics.topicFrequency.firstTimeExperience}</div>
                <div style={{ fontSize: '12px', color: '#636986', marginTop: '4px' }}>First-Time</div>
              </div>

              <div className="p-4 text-center" style={{ backgroundColor: '#e7f9f1', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#0c9e64' }}>{analytics.topicFrequency.wouldRecommend}</div>
                <div style={{ fontSize: '12px', color: '#636986', marginTop: '4px' }}>Would Recommend</div>
              </div>

              <div className="p-4 text-center" style={{ backgroundColor: '#ffecec', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#f13030' }}>{analytics.topicFrequency.issuesProblems}</div>
                <div style={{ fontSize: '12px', color: '#636986', marginTop: '4px' }}>Issues/Problems</div>
              </div>
            </div>
          </div>
        )}

        {/* Highlights & Concerns */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Positive Highlights */}
            <div className="bg-white mb-6" style={{
              border: '1px solid #dde2ec',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
              padding: '20px'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#202233', marginBottom: '16px' }}>
                Top Positive Highlights
              </h2>
              {analytics.topPositivePhrases.length > 0 ? (
                <div className="space-y-2">
                  {analytics.topPositivePhrases.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#e7f9f1' }}>
                      <span style={{ color: '#202233' }}>{item.phrase}</span>
                      <span className="text-white px-3 py-1 rounded-full text-sm font-semibold" style={{ backgroundColor: '#0c9e64' }}>{item.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#636986' }}>No highlights extracted yet</p>
              )}
            </div>

            {/* Top Concerns */}
            <div className="bg-white mb-6" style={{
              border: '1px solid #dde2ec',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
              padding: '20px'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#202233', marginBottom: '16px' }}>
                Top Concerns
              </h2>
              {analytics.topConcerns.length > 0 ? (
                <div className="space-y-2">
                  {analytics.topConcerns.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#ffecec' }}>
                      <span style={{ color: '#202233' }}>{item.concern}</span>
                      <span className="text-white px-3 py-1 rounded-full text-sm font-semibold" style={{ backgroundColor: '#f13030' }}>{item.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#636986' }}>No concerns found</p>
              )}
            </div>
          </div>
        )}

        {/* Actionable Insights */}
        {analytics && (analytics.commonHiddenCosts.length > 0 || analytics.improvementSuggestions.length > 0) && (
          <div className="bg-white mb-6" style={{
            border: '1px solid #dde2ec',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
            padding: '20px'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#202233', marginBottom: '16px' }}>
              Actionable Insights
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {analytics.commonHiddenCosts.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#202233', marginBottom: '12px' }}>Hidden Costs Mentioned</h3>
                  <ul className="space-y-2">
                    {analytics.commonHiddenCosts.map((cost, idx) => (
                      <li key={idx} className="flex items-start">
                        <span style={{ color: '#f27f00', marginRight: '8px' }}>💰</span>
                        <span style={{ color: '#636986' }}>{cost}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analytics.improvementSuggestions.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#202233', marginBottom: '12px' }}>Improvement Suggestions</h3>
                  <ul className="space-y-2">
                    {analytics.improvementSuggestions.map((suggestion, idx) => (
                      <li key={idx} className="flex items-start">
                        <span style={{ color: '#1985ff', marginRight: '8px' }}>💡</span>
                        <span style={{ color: '#636986' }}>{suggestion}</span>
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
          <div className="bg-white mb-6" style={{
            border: '1px solid #dde2ec',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
            padding: '20px'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#202233', marginBottom: '16px' }}>
              Most Mentioned Words
            </h2>
            <div className="flex flex-wrap gap-3">
              {analytics.wordCloud.slice(0, 20).map((item, idx) => {
                const size = Math.min(12 + (item.frequency * 2), 32);
                return (
                  <span
                    key={idx}
                    className="inline-block px-3 py-2 rounded-lg font-medium"
                    style={{
                      fontSize: `${size}px`,
                      backgroundColor: '#eef3ff',
                      color: '#4a6cf7'
                    }}
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
          <div className="bg-white mb-6" style={{
            border: '1px solid #dde2ec',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
            padding: '20px'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#202233', marginBottom: '16px' }}>
              Pilot / Staff Ratings
            </h2>
            <p style={{ color: '#636986', marginBottom: '16px', fontSize: '14px' }}>
              Individual ratings for pilots, instructors, or staff members mentioned in reviews. Click to view detailed analytics.
            </p>
            <div className="space-y-4">
              {Object.entries(analytics.pilotStats)
                .sort((a, b) => b[1].averageRating - a[1].averageRating)
                .map(([name, stats]) => {
                  const isExpanded = expandedPilots.has(name);
                  return (
                    <div
                      key={name}
                      style={{ border: '1px solid #dde2ec', borderRadius: '8px', overflow: 'hidden' }}
                    >
                      {/* Pilot Header - Clickable */}
                      <div
                        onClick={() => togglePilot(name)}
                        className="flex items-center justify-between p-4 hover:shadow-md transition-shadow cursor-pointer"
                        style={{ backgroundColor: '#f5f7fb' }}
                      >
                        <div className="flex-1">
                          <div style={{ fontWeight: 600, color: '#202233', fontSize: '16px' }}>{name}</div>
                          <div style={{ fontSize: '14px', color: '#636986' }}>
                            {stats.totalMentions} mention{stats.totalMentions !== 1 ? 's' : ''} across {stats.reviews.length} review{stats.reviews.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div style={{ fontSize: '24px', fontWeight: 700, color: '#202233' }}>
                              {stats.averageRating.toFixed(1)} ⭐
                            </div>
                            <div style={{ fontSize: '12px', color: '#8087a0' }}>
                              {stats.ratings.join(', ')}
                            </div>
                          </div>
                          <div style={{ fontSize: '20px', color: '#8087a0' }}>
                            {isExpanded ? '▼' : '▶'}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="p-4 bg-white" style={{ borderTop: '1px solid #dde2ec' }}>
                          {/* Per-Pilot Sentiment Scores */}
                          <div className="mb-6">
                            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#202233', marginBottom: '12px' }}>
                              Sentiment Breakdown for {name}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#636986' }}>Overall Experience</span>
                                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#202233' }}>{stats.averageSentimentScores.overallExperience}/100</span>
                                </div>
                                <div className="w-full rounded-full h-2" style={{ backgroundColor: '#dde2ec' }}>
                                  <div
                                    className="h-2 rounded-full"
                                    style={{ width: `${stats.averageSentimentScores.overallExperience}%`, backgroundColor: '#4a6cf7' }}
                                  />
                                </div>
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#636986' }}>Safety & Professionalism</span>
                                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#202233' }}>{stats.averageSentimentScores.safetyProfessionalism}/100</span>
                                </div>
                                <div className="w-full rounded-full h-2" style={{ backgroundColor: '#dde2ec' }}>
                                  <div
                                    className="h-2 rounded-full"
                                    style={{ width: `${stats.averageSentimentScores.safetyProfessionalism}%`, backgroundColor: '#0c9e64' }}
                                  />
                                </div>
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#636986' }}>Value for Money</span>
                                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#202233' }}>{stats.averageSentimentScores.valueForMoney}/100</span>
                                </div>
                                <div className="w-full rounded-full h-2" style={{ backgroundColor: '#dde2ec' }}>
                                  <div
                                    className="h-2 rounded-full"
                                    style={{ width: `${stats.averageSentimentScores.valueForMoney}%`, backgroundColor: '#1985ff' }}
                                  />
                                </div>
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#636986' }}>Service Quality</span>
                                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#202233' }}>{stats.averageSentimentScores.staffServiceQuality}/100</span>
                                </div>
                                <div className="w-full rounded-full h-2" style={{ backgroundColor: '#dde2ec' }}>
                                  <div
                                    className="h-2 rounded-full"
                                    style={{ width: `${stats.averageSentimentScores.staffServiceQuality}%`, backgroundColor: '#f27f00' }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Per-Pilot Highlights and Concerns */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Positive Highlights */}
                            <div>
                              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#202233', marginBottom: '8px' }}>
                                Top Positive Highlights
                              </h3>
                              {stats.topPositiveHighlights && stats.topPositiveHighlights.length > 0 ? (
                                <div className="space-y-2">
                                  {stats.topPositiveHighlights.slice(0, 5).map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: '#e7f9f1' }}>
                                      <span style={{ fontSize: '12px', color: '#202233' }}>{item.phrase}</span>
                                      <span className="text-white px-2 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: '#0c9e64' }}>{item.count}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p style={{ fontSize: '12px', color: '#8087a0', fontStyle: 'italic' }}>No specific highlights extracted</p>
                              )}
                            </div>

                            {/* Concerns */}
                            <div>
                              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#202233', marginBottom: '8px' }}>
                                Concerns
                              </h3>
                              {stats.topConcerns && stats.topConcerns.length > 0 ? (
                                <div className="space-y-2">
                                  {stats.topConcerns.slice(0, 5).map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: '#ffecec' }}>
                                      <span style={{ fontSize: '12px', color: '#202233' }}>{item.concern}</span>
                                      <span className="text-white px-2 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: '#f13030' }}>{item.count}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p style={{ fontSize: '12px', color: '#8087a0', fontStyle: 'italic' }}>No specific concerns found</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Photo Gallery */}
        {allImages.length > 0 && (
          <div className="bg-white mb-6" style={{
            border: '1px solid #dde2ec',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
            padding: '20px'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#202233', marginBottom: '16px' }}>
              Photo Gallery ({allImages.length})
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {allImages.map((imgUrl, idx) => (
                <div
                  key={idx}
                  className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ border: '1px solid #dde2ec' }}
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
          <div className="bg-white mb-6" style={{
            border: '1px solid #dde2ec',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
            padding: '20px'
          }}>
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#202233' }}>
                Reviews ({filteredReviews.length})
              </h2>

              <select
                value={filterRating}
                onChange={(e) => setFilterRating(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #dde2ec',
                  borderRadius: '6px',
                  color: '#202233',
                  backgroundColor: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 500
                }}
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
                  style={{ border: '1px solid #dde2ec', borderRadius: '8px', padding: '16px' }}
                  className="hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div style={{ fontWeight: 600, color: '#202233' }}>
                        {review.reviewerName}
                      </div>
                      <div style={{ fontSize: '12px', color: '#8087a0' }}>{review.date}</div>
                    </div>
                    <div className="flex items-center">
                      <span className="text-yellow-500 text-lg mr-1">{'⭐'.repeat(review.starRating)}</span>
                      <span style={{ color: '#dde2ec', fontSize: '18px' }}>{'⭐'.repeat(5 - review.starRating)}</span>
                    </div>
                  </div>

                  {review.isTranslated && (
                    <div className="inline-block px-2 py-1 text-xs rounded mb-2" style={{ backgroundColor: '#ebf7ff', color: '#1985ff' }}>
                      Translated{review.originalLanguage ? ` from ${review.originalLanguage}` : ''}
                    </div>
                  )}

                  <p style={{ color: '#636986', marginBottom: '8px', fontSize: '14px' }}>{review.reviewText}</p>

                  {review.imageUrls.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {review.imageUrls.map((imgUrl, idx) => (
                        <img
                          key={idx}
                          src={imgUrl}
                          alt={`Photo ${idx + 1}`}
                          className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-80"
                          style={{ border: '1px solid #dde2ec' }}
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
