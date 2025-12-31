import { Worker, Job } from 'bullmq';
import Parser from 'rss-parser';
import OpenAI from 'openai';
import { prisma } from '@feedly-clone/db';
import dotenv from 'dotenv';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { YoutubeTranscript } from 'youtube-transcript';


dotenv.config();

const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
};

const parser = new Parser({
    customFields: {
        item: [
            ['media:content', 'media:content'],
            ['media:thumbnail', 'media:thumbnail'],
            ['media:group', 'media:group'],
            ['enclosure', 'enclosure'],
        ]
    }
});

interface CrawlJobData {
    feedId: string;
    url: string;
}

const worker = new Worker<CrawlJobData>(
    'feed-queue',
    async (job: Job<CrawlJobData>) => {
        const { feedId, url } = job.data;
        console.log(`Processing feed: ${url} (ID: ${feedId})`);

        try {
            // 1. Fetch the feed
            // TODO: Implement conditional GET using ETag from DB
            const feed = await parser.parseURL(url);

            console.log(`Fetched ${feed.items.length} items from ${feed.title}`);

            // 2. Save articles
            for (const itemObj of feed.items) {
                const item = itemObj as any;
                if (!item.title || !item.link || !item.isoDate) continue;

                // Extract image
                let imageUrl = null;

                // Check media:group (YouTube) or nested media:thumbnail
                if (item['media:group']) {
                    console.log('Found media:group for:', item.title);
                    console.log('Keys in media:group:', Object.keys(item['media:group']));
                    if (item['media:group']['media:thumbnail']) {
                        const thumb = item['media:group']['media:thumbnail'];
                        console.log('Found thumbnail:', JSON.stringify(thumb));
                        // It might be an array or single object. YouTube sends an array, [0] is usually high res
                        if (Array.isArray(thumb)) {
                            imageUrl = thumb[0]['$']?.url || thumb[0]?.url;
                        } else {
                            imageUrl = thumb['$']?.url || thumb?.url;
                        }
                    }
                }

                // Check direct media:content
                else if (item['media:content'] && item['media:content']['$'] && item['media:content']['$']['url']) {
                    imageUrl = item['media:content']['$']['url'];
                } else if (item['media:content'] && item['media:content']['url']) {
                    imageUrl = item['media:content']['url'];
                }
                // Check direct media:thumbnail
                else if (item['media:thumbnail'] && item['media:thumbnail']['$'] && item['media:thumbnail']['$']['url']) {
                    imageUrl = item['media:thumbnail']['$']['url'];
                } else if (item['media:thumbnail'] && item['media:thumbnail']['url']) {
                    imageUrl = item['media:thumbnail']['url'];
                }
                // Check enclosure
                else if (item.enclosure && item.enclosure.url && item.enclosure.type?.startsWith('image')) {
                    imageUrl = item.enclosure.url;
                }
                // Check content for first img tag (simple regex)
                else if (item.content) {
                    const imgMatch = item.content.match(/<img[^>]+src="([^">]+)"/);
                    if (imgMatch) {
                        imageUrl = imgMatch[1];
                    }
                }

                // --- NEW: Full Content / Transcript Extraction ---
                let fullContent = item.content || item.contentSnippet || "";

                // YouTube: Prefer media:description as baseline content
                if (item['media:group'] && item['media:group']['media:description']) {
                    const desc = item['media:group']['media:description'];
                    fullContent = Array.isArray(desc) ? desc.join('\n') : desc;
                }

                try {
                    // Strategy 1: YouTube Transcript
                    if (item['media:group'] || item.link?.includes('youtube.com') || item.link?.includes('youtu.be')) {
                        const videoIdMatch = item.link?.match(/(?:v=|youtu\.be\/|\/embed\/|\/v\/|\/shorts\/|watch\?v=|&v=)([^#&?]*).*/);
                        const videoId = videoIdMatch?.[1];

                        if (videoId) {
                            console.log(`Attempting to fetch transcript for YouTube video: ${videoId}`);
                            try {
                                const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
                                if (transcriptItems && transcriptItems.length > 0) {
                                    // Format transcript nicely
                                    fullContent = `<h3>Video Transcript</h3>` +
                                        transcriptItems.map(t => `<p><small>${Math.floor(t.offset / 60)}:${Math.floor(t.offset % 60).toString().padStart(2, '0')}</small> ${t.text}</p>`).join('');
                                    console.log(`Fetched transcript for ${videoId} (${transcriptItems.length} lines)`);
                                }
                            } catch (err) {
                                console.warn(`Could not fetch transcript for ${videoId} (might be disabled or auto-generated only):`, err);
                                // Fallback to description
                                fullContent = item['media:group']?.['media:description'] || item.contentSnippet || "";
                            }
                        }
                    }
                    // Strategy 2: Full Article Scraping (Readability)
                    else if (item.link) {
                        console.log(`Scraping full article content: ${item.link}`);
                        try {
                            const res = await fetch(item.link, {
                                headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FeedlyAI/1.0;)' }
                            });
                            // Handle text response correctly
                            const html = await res.text();

                            if (html) {
                                const doc = new JSDOM(html, { url: item.link });
                                const reader = new Readability(doc.window.document);
                                const articleData = reader.parse();

                                if (articleData && articleData.content) {
                                    fullContent = articleData.content;
                                    console.log(`Successfully scraped content for: ${item.title}`);
                                } else {
                                    console.log(`Readability failed to parse content for: ${item.title}`);
                                }
                            }
                        } catch (scrapeErr) {
                            console.error(`Failed to scrape article ${item.link}:`, scrapeErr);
                        }
                    }
                } catch (generalErr) {
                    console.error("Error in content extraction pipeline:", generalErr);
                }

                // Ensure fullContent is a string (rss-parser sometimes returns arrays for description)
                if (Array.isArray(fullContent)) {
                    fullContent = fullContent.join('\n');
                }

                const article = await prisma.article.upsert({
                    where: {
                        feedId_guid: {
                            feedId: feedId,
                            guid: item.guid || item.link || ""
                        }
                    },
                    create: {
                        title: item.title,
                        content: fullContent,
                        link: item.link || "",
                        guid: item.guid || item.link || "",
                        pubDate: item.isoDate ? new Date(item.isoDate) : new Date(),
                        feedId: feedId,
                        imageUrl: imageUrl
                    },
                    update: {
                        imageUrl: imageUrl, // Update image if found later
                        // Optionally update content if we didn't have it before? 
                        // For now let's only update if the existing content is empty or short, 
                        // OR if we want to force refresh. Let's force refresh for now to apply this feature to existing items if re-crawled.
                        content: fullContent
                    }
                });

                // Generate AI Summary if missing
                if (!article.aiSummary && process.env.OPENROUTER_API_KEY) {
                    try {
                        console.log(`Generating summary for: ${article.title}`);
                        const openai = new OpenAI({
                            baseURL: "https://openrouter.ai/api/v1",
                            apiKey: process.env.OPENROUTER_API_KEY,
                        });

                        const textToSummarize = fullContent.replace(/<[^>]+>/g, ' ').substring(0, 3000); // Strip HTML for AI, limit length

                        const completion = await openai.chat.completions.create({
                            model: "openai/gpt-3.5-turbo", // Use a cheap/fast model, OpenRouter maps this
                            messages: [
                                { role: "system", content: "You are a helpful assistant. Summarize the following content in 2-3 concise sentences." },
                                { role: "user", content: `Title: ${article.title}\n\nContent: ${textToSummarize}` }
                            ],
                        });

                        const summary = completion.choices[0].message.content;
                        if (summary) {
                            await prisma.article.update({
                                where: { id: article.id },
                                data: { aiSummary: summary }
                            });
                            console.log(`Summary generated for ${article.id}`);
                        }
                    } catch (aiError) {
                        console.error("Failed to generate summary:", aiError);
                    }
                }
            }

            // 3. Update Feed Metadata
            await prisma.feed.update({
                where: { id: feedId },
                data: {
                    lastCrawledAt: new Date(),
                    errorCount: 0,
                    title: feed.title || undefined,
                    description: feed.description || undefined,
                    siteUrl: feed.link || undefined,
                }
            });

        } catch (error) {
            console.error(`Failed to crawl feed ${url}:`, error);
            await prisma.feed.update({
                where: { id: feedId },
                data: {
                    errorCount: { increment: 1 }
                }
            });
            throw error;
        }
    },
    { connection }
);

worker.on('completed', (job) => {
    console.log(`Job ${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
    console.log(`Job ${job?.id} has failed with ${err.message}`);
});

console.log("Worker started...");
