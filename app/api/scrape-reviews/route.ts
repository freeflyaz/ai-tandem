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

    // Wait for page to load
    await page.waitForTimeout(2000);

    console.log('Page title:', await page.title());
    console.log('Page URL:', page.url());

    // Handle Google consent page if it appears
    if (page.url().includes('consent.google.com')) {
      console.log('Detected consent page, accepting...');

      try {
        // Try multiple consent button selectors
        const consentButtons = [
          'button:has-text("Alle akzeptieren")',
          'button:has-text("Accept all")',
          'button:has-text("Ich stimme zu")',
          'button:has-text("I agree")',
          'form:has-text("Alle akzeptieren") button',
          'form:has-text("Accept all") button'
        ];

        let clicked = false;
        for (const selector of consentButtons) {
          try {
            const button = page.locator(selector).first();
            if (await button.isVisible({ timeout: 2000 })) {
              console.log(`Clicking consent button: ${selector}`);
              await button.click();
              clicked = true;
              break;
            }
          } catch (e) {
            // Try next selector
          }
        }

        if (!clicked) {
          console.log('Could not find consent button, trying to continue anyway...');
        } else {
          // Wait for navigation to Google Maps
          await page.waitForURL('**/maps/**', { timeout: 30000 });
          console.log('Successfully navigated to Google Maps');
        }
      } catch (e) {
        console.error('Error handling consent page:', e);
      }
    }

    // Wait for reviews to load
    await page.waitForTimeout(3000);

    console.log('Final page URL:', page.url());

    // Take a screenshot for debugging - use tall viewport to see more content
    await page.setViewportSize({ width: 414, height: 6000 }); // Very tall viewport for better vertical view
    const screenshotPath = path.join(process.cwd(), 'data', 'debug-screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('Screenshot saved to:', screenshotPath);

    // CRITICAL: Click "Weitere Rezensionen" to open full reviews panel
    console.log('Looking for "Weitere Rezensionen" button...');
    try {
      const moreReviewsSelectors = [
        'button:has-text("Weitere Rezensionen")',
        'a:has-text("Weitere Rezensionen")',
        'button:has-text("More reviews")',
        'a:has-text("More reviews")',
        'button:has-text("Rezensionen")',
        '[role="button"]:has-text("Rezensionen")'
      ];

      let clicked = false;
      for (const selector of moreReviewsSelectors) {
        try {
          const button = page.locator(selector);
          const count = await button.count();
          console.log(`  Checking selector "${selector}": ${count} elements`);

          if (count > 0) {
            const text = await button.first().textContent({ timeout: 2000 });
            console.log(`  Button text: "${text}"`);

            if (await button.first().isVisible({ timeout: 2000 })) {
              console.log(`  ✓ Clicking "Weitere Rezensionen" button!`);
              await button.first().click();
              clicked = true;

              // Wait for reviews panel to open
              await page.waitForTimeout(3000);

              // Take screenshot after clicking
              const afterClickPath = path.join(process.cwd(), 'data', 'debug-after-click.png');
              await page.screenshot({ path: afterClickPath, fullPage: true });
              console.log('  After-click screenshot saved');
              break;
            }
          }
        } catch (e: any) {
          console.log(`  Selector "${selector}" failed: ${e.message}`);
        }
      }

      if (!clicked) {
        console.log('  ⚠ Could not find "Weitere Rezensionen" button - will scrape preview reviews only');
      }
    } catch (e) {
      console.log('Error clicking reviews button:', e);
    }

    // Get business info - use a more flexible selector with timeout
    let businessName = 'Unknown Business';
    try {
      businessName = await page.locator('h1').first().textContent({ timeout: 5000 }) || 'Unknown Business';
      console.log('Business name:', businessName);
    } catch (e) {
      console.log('Could not find h1, trying alternative selectors');
      // Try alternative selectors for business name
      const altNameSelectors = ['[role="heading"]', 'header h1', 'div[role="main"] h1'];
      for (const selector of altNameSelectors) {
        try {
          const name = await page.locator(selector).first().textContent({ timeout: 2000 });
          if (name) {
            businessName = name;
            console.log('Found business name with selector', selector, ':', businessName);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
    }

    // Debug: Check what selectors exist
    console.log('Looking for review elements...');

    // Try alternative selectors - Google Maps uses different attributes
    const altSelectors = [
      '[data-review-id]',
      'div[jsaction*="review"]',
      'div[data-review-id]',
      'div[jslog*="impression"]',  // Google uses jslog for tracking
      '[aria-label*="stars"]',
      'div.jftiEf',  // Common Google Maps review class (may change)
      'div[data-attrid-class]'
    ];

    let bestSelector = '[data-review-id]';
    let maxCount = 0;

    for (const selector of altSelectors) {
      const count = await page.locator(selector).count();
      console.log(`Selector "${selector}":`, count, 'elements');
      if (count > maxCount) {
        maxCount = count;
        bestSelector = selector;
      }
    }

    console.log('Best selector found:', bestSelector, 'with', maxCount, 'elements');

    // Dump HTML from first review element to inspect structure
    if (maxCount > 0) {
      console.log('Inspecting first review element HTML...');
      const firstReview = page.locator(bestSelector).first();
      const reviewHTML = await firstReview.innerHTML();
      console.log('First review HTML (first 1000 chars):', reviewHTML.substring(0, 1000));

      // Also save to file for easier inspection
      const htmlPath = path.join(process.cwd(), 'data', 'review-element.html');
      await fs.writeFile(htmlPath, reviewHTML, 'utf-8');
      console.log('Full review HTML saved to:', htmlPath);
    }

    // Find the scrollable reviews container
    const reviewsContainer = page.locator('[role="main"]').first();

    console.log('Starting to scroll and collect reviews...');

    const reviews: Review[] = [];
    const seenReviewIds = new Set<string>();
    let scrollAttempts = 0;
    const maxScrollAttempts = 50; // Limit scrolling attempts

    while (reviews.length < maxReviews && scrollAttempts < maxScrollAttempts) {
      // Get count of review elements
      const reviewElementsCount = await page.locator('[data-review-id]').count();
      console.log(`Scroll attempt ${scrollAttempts + 1}: Found ${reviewElementsCount} total review elements in DOM, already collected ${reviews.length}`);

      let newReviewsInThisScroll = 0;

      // Iterate by index to avoid stale element issues
      for (let i = 0; i < reviewElementsCount; i++) {
        if (reviews.length >= maxReviews) break;

        // Get fresh element each time by index
        const reviewElement = page.locator('[data-review-id]').nth(i);

        // Try to get review ID with short timeout - skip if stale
        let reviewId: string | null = null;
        try {
          reviewId = await reviewElement.getAttribute('data-review-id', { timeout: 1000 });
        } catch (e) {
          // Element is stale or not accessible, skip it silently
          continue;
        }

        if (!reviewId || seenReviewIds.has(reviewId)) {
          continue;
        }

        try {
          newReviewsInThisScroll++;
          seenReviewIds.add(reviewId);

          // EXTRACT IMAGES FIRST (before clicking anything that might break the DOM)
          console.log('  Extracting images...');
          const imageUrls: string[] = [];
          try {
            // More stable: button with data-photo-index attribute (not relying on random class)
            const imageButtons = await reviewElement.locator('button[data-photo-index][data-review-id]').all();
            console.log(`    Found ${imageButtons.length} image buttons`);

            for (const btn of imageButtons) {
              const style = await btn.getAttribute('style', { timeout: 1000 });
              if (style) {
                // Extract URL from background-image: url("...") or url(&quot;...&quot;)
                let match = style.match(/url\("(.+?)"\)/);
                if (!match) {
                  match = style.match(/url\(&quot;(.+?)&quot;\)/);
                }
                if (match && match[1]) {
                  imageUrls.push(match[1]);
                }
              }
            }
          } catch (e) {
            console.log('  Error extracting images:', e);
          }
          console.log(`  Images: ${imageUrls.length}`);

          // Extract reviewer name
          let reviewerName = 'Unknown Reviewer';
          try {
            const nameElement = reviewElement.locator('button[jsaction*="reviewerLink"] div').first();
            if (await nameElement.count() > 0) {
              reviewerName = await nameElement.textContent({ timeout: 1000 }) || 'Unknown Reviewer';
              reviewerName = reviewerName.split('\n')[0].trim();
            }
          } catch (e) {
            // Use default
          }

          // Extract star rating
          let starRating = 0;
          try {
            const ratingElement = reviewElement.locator('[role="img"][aria-label*="star"], [role="img"][aria-label*="Stern"]').first();
            if (await ratingElement.count() > 0) {
              const ariaLabel = await ratingElement.getAttribute('aria-label', { timeout: 1000 }) || '';
              const match = ariaLabel.match(/(\d+)/);
              if (match) starRating = parseInt(match[1]);
            }
          } catch (e) {
            // Default to 0
          }

          // Extract date
          let date = 'Unknown date';
          try {
            const dateElement = reviewElement.locator('[class*="date"], span:has-text("ago"), span:has-text("vor")').first();
            date = await dateElement.textContent({ timeout: 1000 }) || 'Unknown date';
          } catch (e) {
            // Use default
          }

          // Check for translation
          let isTranslated = false;
          let originalLanguage: string | undefined;
          try {
            const originalButton = reviewElement.locator('button:has-text("See original"), button:has-text("Original anzeigen")');
            if (await originalButton.count() > 0) {
              isTranslated = true;
            }
          } catch (e) {
            // Not translated
          }

          // Extract review text - expand if needed
          let reviewText = '';
          try {
            // Try to expand first
            const moreButton = reviewElement.locator('button[jsaction*="expandReview"]');
            if (await moreButton.count() > 0) {
              await moreButton.first().click({ timeout: 1000 });
              await page.waitForTimeout(300); // Quick wait for expansion
            }
          } catch (e) {
            // No expansion needed
          }

          try {
            const reviewTextElement = reviewElement.locator(`div[id="${reviewId}"][lang]`).first();
            if (await reviewTextElement.count() > 0) {
              reviewText = await reviewTextElement.textContent({ timeout: 1000 }) || '';
              reviewText = reviewText.trim().replace(/\s*Mehr\s*$/, '').trim();
            }
          } catch (e) {
            // No text
          }

          console.log(`  ${reviewerName} | ${starRating}★ | ${date} | ${reviewText.substring(0, 30)}... | ${imageUrls.length} imgs`);

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

        } catch (e: any) {
          console.log(`  Skipped review ${reviewId}: ${e.message}`);
          continue;
        }
      }

      console.log(`Collected ${newReviewsInThisScroll} new reviews in this scroll`);

      // If we didn't find any new reviews, we've probably reached the end
      if (newReviewsInThisScroll === 0 && scrollAttempts > 0) {
        console.log('No new reviews found, reached the end');
        break;
      }

      // Only scroll and wait if we need more reviews
      if (reviews.length < maxReviews) {
        console.log(`Need more reviews (${reviews.length}/${maxReviews}), scrolling...`);

        // Try to find and scroll the reviews feed container
        try {
          // Scroll the main container multiple times to load more
          await reviewsContainer.evaluate((el) => {
            el.scrollTop = el.scrollHeight;
          });
          await page.waitForTimeout(500);

          // Scroll again for good measure
          await reviewsContainer.evaluate((el) => {
            el.scrollTop = el.scrollHeight;
          });
        } catch (e) {
          console.log('Could not scroll container');
        }

        // Wait for new reviews to load
        await page.waitForTimeout(2000);
      }

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
