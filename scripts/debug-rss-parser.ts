
import Parser from 'rss-parser';

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

const url = 'https://www.youtube.com/feeds/videos.xml?channel_id=UC2D2CMWXMOVWx7giW1n3LIg';

async function main() {
    console.log(`Parsing ${url}...`);
    const feed = await parser.parseURL(url);

    console.log(`Found ${feed.items.length} items.`);

    const item = feed.items[0];
    console.log('First Item Keys:', Object.keys(item));
    console.log('media:group:', JSON.stringify(item['media:group'], null, 2));
    console.log('media:thumbnail:', JSON.stringify(item['media:thumbnail'], null, 2));
    console.log('media:content:', JSON.stringify(item['media:content'], null, 2));
}

main().catch(console.error);
