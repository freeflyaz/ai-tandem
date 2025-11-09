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

interface PilotStats {
  [pilotName: string]: {
    totalMentions: number;
    ratings: number[];
    averageRating: number;
    reviews: string[];
  };
}

export default function ReviewsDashboard() {
  const [url, setUrl] = useState('');
  const [maxReviews, setMaxReviews] = useState(50);
  const [scraping, setScraping] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);
  const [pilotStats, setPilotStats] = useState<PilotStats | null>(null);
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
        setPilotStats(result.data.pilotStats);
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

  const handleAnalyze = async () => {
    if (!scrapedData) {
      setMessage('No reviews to analyze. Scrape reviews first.');
      return;
    }

    setAnalyzing(true);
    setMessage('Analyzing reviews with AI... This may take a few minutes.');

    try {
      const response = await fetch('/api/analyze-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analyzeAll: false })
      });

      const result = await response.json();

      if (result.success) {
        setMessage(result.message);
        setPilotStats(result.data.pilotStats);
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
            Scrape, analyze, and explore Google Maps reviews
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

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  {pilotStats ? Object.keys(pilotStats).length : 0}
                </div>
                <div className="text-orange-100">Pilots Found</div>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              <p><strong>Business:</strong> {scrapedData.businessName}</p>
              <p><strong>Scraped:</strong> {new Date(scrapedData.scrapedAt).toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* AI Analysis Section */}
        {scrapedData && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              AI Pilot Analysis
            </h2>

            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors mb-6"
            >
              {analyzing ? 'Analyzing...' : 'Analyze New Reviews with AI'}
            </button>

            {pilotStats && Object.keys(pilotStats).length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Pilot Ratings
                </h3>
                {Object.entries(pilotStats)
                  .sort((a, b) => b[1].averageRating - a[1].averageRating)
                  .map(([name, stats]) => (
                    <div
                      key={name}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg"
                    >
                      <div>
                        <div className="font-semibold text-gray-900">{name}</div>
                        <div className="text-sm text-gray-600">
                          {stats.totalMentions} mention{stats.totalMentions !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          {stats.averageRating.toFixed(1)} ⭐
                        </div>
                        <div className="text-xs text-gray-500">
                          {stats.ratings.join(', ')}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
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
