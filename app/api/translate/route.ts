import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: "Text is required" },
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

    console.log("Translating review to German...");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

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
              content: "You are a professional translator. Translate the given text to German while maintaining the tone and authenticity. Return ONLY the translated text, nothing else.",
            },
            {
              role: "user",
              content: `Translate this review to German:\n\n${text}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 200,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log("Translation API response status:", response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Translation API error:", errorData);
        return NextResponse.json(
          {
            error: "Failed to translate",
            details: errorData,
          },
          { status: response.status }
        );
      }

      const data = await response.json();
      const translation = data.choices[0]?.message?.content || "";

      return NextResponse.json({ translation });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      console.error("Fetch error:", fetchError);
      throw fetchError;
    }
  } catch (error: any) {
    console.error("Error translating:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
