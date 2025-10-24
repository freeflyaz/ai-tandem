import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { selection } = await request.json();

    if (!selection) {
      return NextResponse.json(
        { error: "Selection is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.AI_SECRET_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    // Map selection to review focus
    const focusMap: Record<string, string> = {
      pilots: "the professional and friendly pilots who guided the experience",
      booking: "the easy and convenient booking system",
      flight: "the comfortable and smooth flight experience itself",
    };

    const focus = focusMap[selection] || "the overall experience";

    // Call Grok API (xAI)
    console.log("Attempting to call Grok API...");
    console.log("Using API endpoint: https://api.x.ai/v1/chat/completions");
    console.log("Selection focus:", focus);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "grok-beta",
          messages: [
            {
              role: "system",
              content: `You are a helpful assistant that writes authentic, enthusiastic reviews for Alpentandem.de, a tandem paragliding experience company in the Alps. Write reviews that sound genuine and personal, highlighting specific positive aspects while maintaining credibility.`,
            },
            {
              role: "user",
              content: `Write a short, authentic Google review (2-3 sentences) for a tandem paragliding experience with Alpentandem.de. Focus specifically on praising ${focus}. Make it sound personal and genuine, like a real customer wrote it. Don't use overly formal language.`,
            },
          ],
          temperature: 0.8,
          max_tokens: 150,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log("Grok API response status:", response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Grok API error response:", errorData);
        return NextResponse.json(
          {
            error: "Failed to generate review",
            details: errorData,
            status: response.status
          },
          { status: response.status }
        );
      }

      const data = await response.json();
      console.log("Grok API response received successfully");
      const reviewText = data.choices[0]?.message?.content || "";

      return NextResponse.json({ review: reviewText });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      console.error("Fetch error details:", {
        message: fetchError.message,
        cause: fetchError.cause,
        code: fetchError.code,
      });
      throw fetchError; // Re-throw to be caught by outer catch
    }
  } catch (error: any) {
    console.error("Error generating review:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message,
        details: error.cause?.message || "Network error - unable to reach Grok API"
      },
      { status: 500 }
    );
  }
}
