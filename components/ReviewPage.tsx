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
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (selectedOption) {
      setSubmitted(true);
      // Here you would typically send the data to your backend
      console.log("Selected:", selectedOption);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Thank You!
          </h2>
          <p className="text-gray-600">
            Your feedback has been submitted successfully.
          </p>
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

        <div className="pt-4">
          <button
            onClick={handleSubmit}
            disabled={!selectedOption}
            className={`w-full rounded-lg px-4 py-4 text-lg font-semibold text-white transition-colors ${
              selectedOption
                ? "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
                : "bg-gray-300 cursor-not-allowed"
            }`}
          >
            Submit Review
          </button>
        </div>
      </div>
    </div>
  );
}
