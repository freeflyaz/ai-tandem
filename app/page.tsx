"use client";

import { useState } from "react";
import AuthPage from "@/components/AuthPage";
import ReviewPage from "@/components/ReviewPage";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {!isAuthenticated ? (
        <AuthPage onAuthenticate={() => setIsAuthenticated(true)} />
      ) : (
        <ReviewPage />
      )}
    </main>
  );
}
