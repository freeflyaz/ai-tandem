"use client";

import { useState } from "react";

const reviewOptions = [
  {
    id: "pilots",
    title: "The Pilots",
    description: "Professional and friendly crew",
    icon: "✈️",
  },
  {
    id: "booking",
    title: "The Booking System",
    description: "Easy and convenient booking process",
    icon: "📱",
  },
  {
    id: "flight",
    title: "The Flight Itself",
    description: "Comfortable and smooth experience",
    icon: "🛫",
  },
];

export default function ReviewPage() {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatedReview, setGeneratedReview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async () => {
    if (!selectedOption) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ selection: selectedOption }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate review");
      }

      const data = await response.json();
      setGeneratedReview(data.review);
    } catch (err) {
      setError("Failed to generate review. Please try again.");
      console.error(err);
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

  const handleStartOver = () => {
    setSelectedOption(null);
    setGeneratedReview(null);
    setError(null);
    setCopied(false);
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
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">
            AI Review Writer
          </h1>
          <p className="text-gray-600">
            What did you like the most?
          </p>
        </div>

        <div className="mt-8 space-y-4">
          {reviewOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setSelectedOption(option.id)}
              className={`w-full text-left rounded-xl border-2 p-6 transition-all ${
                selectedOption === option.id
                  ? "border-blue-600 bg-blue-50 shadow-md"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
              }`}
            >
              <div className="flex items-start space-x-4">
                <div className="text-4xl flex-shrink-0">{option.icon}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {option.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {option.description}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedOption === option.id
                        ? "border-blue-600 bg-blue-600"
                        : "border-gray-300"
                    }`}
                  >
                    {selectedOption === option.id && (
                      <svg
                        className="w-4 h-4 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="pt-4">
          <button
            onClick={handleSubmit}
            disabled={!selectedOption || loading}
            className={`w-full rounded-lg px-4 py-4 text-lg font-semibold text-white transition-colors flex items-center justify-center space-x-2 ${
              selectedOption && !loading
                ? "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
                : "bg-gray-300 cursor-not-allowed"
            }`}
          >
            {loading ? (
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
                <span>Generating Review...</span>
              </>
            ) : (
              <span>Generate Review</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
