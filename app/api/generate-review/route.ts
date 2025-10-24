import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    await request.json();

    const apiKey = process.env.AI_SECRET_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    // Large list of specific topics to praise
    const topics = [
      "the pilot's professionalism and expertise",
      "how friendly and welcoming the crew was",
      "the breathtaking Alpine views during the flight",
      "the smooth takeoff and landing",
      "feeling completely safe throughout",
      "the pilot's clear communication",
      "the amazing photo opportunities",
      "how easy the booking process was",
      "the perfect weather conditions",
      "the adrenaline rush of the experience",
      "the peaceful gliding moments",
      "how well the equipment was maintained",
      "the pilot's knowledge of the area",
      "the stunning mountain scenery",
      "how comfortable the harness was",
      "the thorough safety briefing",
      "the pilot's fun personality",
      "the beautiful landing spot",
      "watching birds fly alongside us",
      "the incredible sense of freedom",
      "how the pilot made me feel at ease",
      "the spectacular sunset/sunrise views",
      "the professional photo/video service",
      "how affordable the experience was",
      "the convenient meeting point location",
      "the pilot's patience with nervous flyers",
      "flying over the picturesque valleys",
      "the exhilarating turns and maneuvers",
      "how family-friendly the experience was",
      "the clear blue sky above the Alps",
    ];

    // Randomly select 1-2 topics
    const shuffled = topics.sort(() => Math.random() - 0.5);
    const numTopics = Math.random() > 0.5 ? 1 : 2;
    const selectedTopics = shuffled.slice(0, numTopics);
    const focus = selectedTopics.join(" and ");

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
          model: "grok-4-latest",
          messages: [
            {
              role: "system",
              content: `You are a helpful assistant that writes authentic, enthusiastic reviews for Alpentandem.de, a tandem paragliding experience company in the Alps. Write reviews that sound genuine and personal, highlighting specific positive aspects while maintaining credibility.`,
            },
            {
              role: "user",
              content: `Write a very short, authentic Google review (ONLY 1-2 sentences, no more!) for a tandem paragliding experience with Alpentandem.de. Focus specifically on praising ${focus}. Make it sound personal and genuine, like a real customer wrote it. Keep it brief and natural - don't use overly formal language. Just 1-2 sentences!`,
            },
          ],
          temperature: 1.3,
          max_tokens: 80,
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
