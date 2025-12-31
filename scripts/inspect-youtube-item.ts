
import Parser from 'rss-parser';

const parser = new Parser({
    customFields: {
        item: [
            ['media:group', 'media:group'],
            ['media:description', 'media:description'],
            ['content:encoded', 'contentEncoded']
        ]
    }
});

async function main() {
    const url = 'https://www.youtube.com/feeds/videos.xml?channel_id=UC2D2CMWXMOVWx7giW1n3LIg'; // Huberman
    console.log(`Fetching ${url}...`);
    const feed = await parser.parseURL(url);

    if (feed.items.length > 0) {
        const item = feed.items[0];
        console.log('--- RSS Item Structure ---');
        console.log('Title:', item.title);
        console.log('Content:', item.content);
        console.log('ContentSnippet:', item.contentSnippet);
        console.log('Media Group:', JSON.stringify(item['media:group'], null, 2));
    }
}

main();
