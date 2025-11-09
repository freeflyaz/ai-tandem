"use client";

import { useState } from "react";
import Link from "next/link";
import AuthPage from "@/components/AuthPage";
import ReviewPage from "@/components/ReviewPage";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {!isAuthenticated ? (
        <AuthPage onAuthenticate={() => setIsAuthenticated(true)} />
      ) : (
        <div>
          {/* Navigation */}
          <div className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-4xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">AI Tandem Tools</h2>
                <div className="flex gap-2">
                  <Link
                    href="/reviews"
                    className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 transition-colors"
                  >
                    ⭐ Reviews Dashboard
                  </Link>
                  <Link
                    href="/weather"
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                  >
                    🪂 Weather Forecast
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <ReviewPage />
        </div>
      )}
    </main>
  );
}
