"use client";

import { useState } from "react";

export default function ReviewPage() {
  const [loading, setLoading] = useState(false);
  const [generatedReview, setGeneratedReview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [germanReview, setGermanReview] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setGermanReview(null);

    try {
      const response = await fetch("/api/generate-review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error("Failed to generate review");
      }

      const data = await response.json();

      if (data.error) {
        // Show detailed error from API
        const errorMsg = data.details
          ? `${data.error}: ${data.details}`
          : data.message || data.error;
        setError(errorMsg);
        console.error("API Error:", data);
      } else {
        setGeneratedReview(data.review);
      }
    } catch (err: any) {
      const errorMessage = err.message || "Failed to generate review. Please try again.";
      setError(errorMessage);
      console.error("Request error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (generatedReview) {
      await navigator.clipboard.writeText(generatedReview);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTranslate = async () => {
    if (!generatedReview) return;

    setTranslating(true);
    setError(null);

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: generatedReview }),
      });

      if (!response.ok) {
        throw new Error("Failed to translate review");
      }

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setGermanReview(data.translation);
      }
    } catch (err: any) {
      setError(err.message || "Failed to translate. Please try again.");
      console.error("Translation error:", err);
    } finally {
      setTranslating(false);
    }
  };

  const handleStartOver = () => {
    setGeneratedReview(null);
    setError(null);
    setCopied(false);
    setGermanReview(null);
  };

  if (generatedReview) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Your Review is Ready!
            </h2>
            <p className="text-gray-600 text-sm">
              Alpentandem.de - Tandem Paragliding
            </p>
          </div>

          <div className="bg-white rounded-xl border-2 border-gray-200 p-6 shadow-sm">
            <p className="text-gray-800 leading-relaxed">{generatedReview}</p>
          </div>

          {germanReview && (
            <div className="bg-blue-50 rounded-xl border-2 border-blue-200 p-6 shadow-sm">
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-lg">🇩🇪</span>
                <span className="text-sm font-semibold text-blue-900">German Translation</span>
              </div>
              <p className="text-gray-800 leading-relaxed">{germanReview}</p>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleCopy}
              className="w-full rounded-lg bg-blue-600 px-4 py-4 text-lg font-semibold text-white hover:bg-blue-700 active:bg-blue-800 transition-colors flex items-center justify-center space-x-2"
            >
              {copied ? (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <span>Copy Review</span>
                </>
              )}
            </button>

            {!germanReview && (
              <button
                onClick={handleTranslate}
                disabled={translating}
                className={`w-full rounded-lg px-4 py-3 text-base font-semibold transition-colors flex items-center justify-center space-x-2 ${
                  translating
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-green-600 text-white hover:bg-green-700 active:bg-green-800"
                }`}
              >
                {translating ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
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
                    <span>Translating...</span>
                  </>
                ) : (
                  <>
                    <span>🇩🇪</span>
                    <span>Translate to German</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleStartOver}
              className="w-full rounded-lg bg-gray-100 px-4 py-3 text-base font-medium text-gray-700 hover:bg-gray-200 active:bg-gray-300 transition-colors"
            >
              Create Another Review
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="text-6xl mb-4">🪂</div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">
            AI Review Writer
          </h1>
          <p className="text-gray-600">
            Generate authentic reviews for Alpentandem.de
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className={`w-full rounded-lg px-6 py-5 text-xl font-semibold text-white transition-colors flex items-center justify-center space-x-2 ${
            loading
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
          }`}
        >
          {loading ? (
            <>
              <svg
                className="animate-spin h-6 w-6 text-white"
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
              <span>Generating Review...</span>
            </>
          ) : (
            <span>Generate Review</span>
          )}
        </button>
      </div>
    </div>
  );
}
