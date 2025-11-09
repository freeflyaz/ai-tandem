import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';

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

export async function POST(request: NextRequest) {
  const { url, maxReviews = 50 } = await request.json();

  if (!url) {
    return NextResponse.json(
      { error: 'Google Maps URL is required' },
      { status: 400 }
    );
  }

  let browser;
  try {
    console.log('Launching browser...');
    browser = await chromium.launch({
      headless: true,
      args: ['--lang=de-DE'] // Request German content
    });

    const context = await browser.newContext({
      locale: 'de-DE',
      timezoneId: 'Europe/Berlin',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    console.log('Navigating to URL:', url);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

    // Wait for reviews to load
    await page.waitForTimeout(3000);

    // Try to click on reviews tab if not already there
    try {
      const reviewsTab = page.locator('button:has-text("Rezensionen"), button:has-text("Reviews")').first();
      if (await reviewsTab.isVisible({ timeout: 2000 })) {
        await reviewsTab.click();
        await page.waitForTimeout(2000);
      }
    } catch (e) {
      console.log('Reviews tab not found or already on reviews');
    }

    // Get business info
    const businessName = await page.locator('h1').first().textContent() || 'Unknown Business';

    // Find the scrollable reviews container
    const reviewsContainer = page.locator('[role="main"]').first();

    console.log('Starting to scroll and collect reviews...');

    const reviews: Review[] = [];
    const seenReviewIds = new Set<string>();
    let scrollAttempts = 0;
    const maxScrollAttempts = 50; // Limit scrolling attempts

    while (reviews.length < maxReviews && scrollAttempts < maxScrollAttempts) {
      // Get all review elements currently visible
      const reviewElements = await page.locator('[data-review-id]').all();

      for (const reviewElement of reviewElements) {
        if (reviews.length >= maxReviews) break;

        try {
          const reviewId = await reviewElement.getAttribute('data-review-id');
          if (!reviewId || seenReviewIds.has(reviewId)) continue;

          seenReviewIds.add(reviewId);

          // Extract reviewer name
          const reviewerName = await reviewElement.locator('[class*="author"]').first().textContent() ||
                              await reviewElement.locator('button').first().textContent() ||
                              'Unknown Reviewer';

          // Extract star rating
          let starRating = 0;
          const ratingElement = await reviewElement.locator('[role="img"][aria-label*="star"], [role="img"][aria-label*="Stern"]').first();
          if (ratingElement) {
            const ariaLabel = await ratingElement.getAttribute('aria-label') || '';
            const match = ariaLabel.match(/(\d+)/);
            if (match) starRating = parseInt(match[1]);
          }

          // Extract date
          const dateElement = await reviewElement.locator('[class*="date"], span:has-text("ago"), span:has-text("vor")').first();
          const date = await dateElement.textContent() || 'Unknown date';

          // Check if review has "See original" / "Original anzeigen" button (indicates translation)
          let isTranslated = false;
          let originalLanguage: string | undefined;

          const originalButton = reviewElement.locator('button:has-text("See original"), button:has-text("Original anzeigen")');
          if (await originalButton.count() > 0) {
            isTranslated = true;
            // Try to click to see original
            try {
              await originalButton.first().click();
              await page.waitForTimeout(1000); // Wait for content to update

              // Try to detect language from button text
              const buttonText = await originalButton.first().textContent() || '';
              if (buttonText.includes('Translated')) {
                const langMatch = buttonText.match(/Translated by Google.*from (\w+)/i);
                if (langMatch) originalLanguage = langMatch[1];
              }
            } catch (e) {
              console.log('Could not click original button');
            }
          }

          // Extract review text
          const reviewTextElement = await reviewElement.locator('[class*="review-text"], [class*="description"], span[jsan]').first();
          let reviewText = await reviewTextElement.textContent() || '';
          reviewText = reviewText.trim();

          // Expand "More" if available
          const moreButton = reviewElement.locator('button:has-text("More"), button:has-text("Mehr")');
          if (await moreButton.count() > 0) {
            try {
              await moreButton.first().click();
              await page.waitForTimeout(500);
              const expandedText = await reviewTextElement.textContent() || '';
              reviewText = expandedText.trim();
            } catch (e) {
              console.log('Could not expand review text');
            }
          }

          // Extract image URLs
          const imageUrls: string[] = [];
          const images = await reviewElement.locator('img[src*="googleusercontent"], img[src*="gstatic"]').all();
          for (const img of images) {
            const src = await img.getAttribute('src');
            if (src && !src.includes('profile') && !src.includes('avatar')) {
              imageUrls.push(src);
            }
          }

          reviews.push({
            id: reviewId,
            reviewerName: reviewerName.trim(),
            starRating,
            date: date.trim(),
            reviewText,
            imageUrls,
            isTranslated,
            originalLanguage,
            scrapedAt: new Date().toISOString()
          });

          console.log(`Collected review ${reviews.length}/${maxReviews}`);

        } catch (e) {
          console.error('Error extracting review:', e);
          continue;
        }
      }

      // Scroll down to load more reviews
      await reviewsContainer.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });

      // Throttle: wait 3-5 seconds between scrolls
      const delay = 3000 + Math.random() * 2000;
      console.log(`Waiting ${Math.round(delay)}ms before next scroll...`);
      await page.waitForTimeout(delay);

      scrollAttempts++;
    }

    console.log(`Scraped ${reviews.length} reviews`);

    // Try to get total review count and average rating
    let totalReviews = reviews.length;
    let averageRating = 0;

    try {
      const ratingText = await page.locator('[role="img"][aria-label*="stars"], [role="img"][aria-label*="Sterne"]').first().getAttribute('aria-label') || '';
      const avgMatch = ratingText.match(/(\d+\.?\d*)\s*star/i);
      if (avgMatch) averageRating = parseFloat(avgMatch[1]);

      const reviewCountText = await page.locator(':text-matches("\\d+\\s*(reviews|Rezensionen)", "i")').first().textContent() || '';
      const countMatch = reviewCountText.match(/(\d+)/);
      if (countMatch) totalReviews = parseInt(countMatch[1]);
    } catch (e) {
      console.log('Could not extract rating/count info');
    }

    const scrapedData: ScrapedData = {
      businessName,
      businessUrl: url,
      totalReviews,
      averageRating,
      scrapedAt: new Date().toISOString(),
      reviews
    };

    // Save to file
    const dataDir = path.join(process.cwd(), 'data');
    const filePath = path.join(dataDir, 'reviews.json');

    await fs.writeFile(filePath, JSON.stringify(scrapedData, null, 2), 'utf-8');
    console.log('Saved to:', filePath);

    await browser.close();

    return NextResponse.json({
      success: true,
      message: `Successfully scraped ${reviews.length} reviews`,
      data: scrapedData
    });

  } catch (error: any) {
    console.error('Scraping error:', error);

    if (browser) {
      await browser.close();
    }

    return NextResponse.json(
      {
        error: 'Failed to scrape reviews',
        details: error.message
      },
      { status: 500 }
    );
  }
}
