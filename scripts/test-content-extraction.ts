
import { YoutubeTranscript } from 'youtube-transcript';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

async function testYouTube() {
    const videoId = 'dQw4w9WgXcQ'; // Rick Roll (Known to have captions)
    console.log(`Testing YouTube Transcript for ${videoId}...`);

    // Test 1: Default
    try {
        console.log('Attempt 1: Default config');
        const transcript = await YoutubeTranscript.fetchTranscript(videoId);
        console.log(`Success! Found ${transcript.length} lines.`);
    } catch (e) {
        console.error('Attempt 1 failed:', e.message);
    }

    // Test 2: explicit english
    try {
        console.log('Attempt 2: { lang: "en" }');
        const transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
        console.log(`Success! Found ${transcript.length} lines.`);
        console.log('First line:', transcript[0].text);
    } catch (e) {
        console.error('Attempt 2 failed:', e.message);
    }
}

async function testArticle() {
    const url = 'https://example.com';
    console.log(`Testing Readability for ${url}...`);
    try {
        const res = await fetch(url);
        const html = await res.text();
        const doc = new JSDOM(html, { url });
        const reader = new Readability(doc.window.document);
        const article = reader.parse();
        console.log('Success! Title:', article?.title);
        console.log('Content Start:', article?.content?.substring(0, 100));
    } catch (e) {
        console.error('Readability failed:', e);
    }
}

async function main() {
    await testYouTube();
    console.log('---');
    await testArticle();
}

main();
