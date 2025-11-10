"use client";

import { useState } from "react";
import Link from "next/link";
import AuthPage from "@/components/AuthPage";
import ReviewPage from "@/components/ReviewPage";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#f5f7fb' }}>
      {!isAuthenticated ? (
        <AuthPage onAuthenticate={() => setIsAuthenticated(true)} />
      ) : (
        <div>
          {/* Navigation */}
          <div className="bg-white" style={{
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
            borderBottom: '1px solid #dde2ec'
          }}>
            <div className="max-w-4xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#202233' }}>AI Tandem Tools</h2>
                <div className="flex gap-2">
                  <Link
                    href="/reviews"
                    className="text-sm font-semibold text-white transition-colors"
                    style={{
                      backgroundColor: '#4a6cf7',
                      padding: '8px 14px',
                      borderRadius: '6px'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#384fd4')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#4a6cf7')}
                  >
                    ⭐ Reviews Dashboard
                  </Link>
                  <Link
                    href="/weather"
                    className="text-sm font-semibold transition-colors"
                    style={{
                      backgroundColor: '#ffffff',
                      color: '#202233',
                      padding: '8px 14px',
                      borderRadius: '6px',
                      border: '1px solid #dde2ec'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f5f7fb')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
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
