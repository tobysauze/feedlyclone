
import Parser from 'rss-parser';

const parser = new Parser({
    customFields: {
        item: [
            ['media:content', 'media:content'],
            ['media:thumbnail', 'media:thumbnail'],
            ['enclosure', 'enclosure'],
        ]
    }
});

async function main() {
    const url = 'http://feeds.bbci.co.uk/news/rss.xml';
    console.log(`Crawling ${url}...`);

    try {
        const feed = await parser.parseURL(url);
        console.log(`Found ${feed.items.length} items`);

        feed.items.slice(0, 3).forEach(item => {
            console.log(`\nTitle: ${item.title}`);
            console.log(`Link: ${item.link}`);
            // Log all keys to see what we have
            console.log('Keys:', Object.keys(item));
            if (item['media:thumbnail']) console.log('Thumbnail:', item['media:thumbnail']);
            if (item['media:content']) console.log('MediaContent:', item['media:content']);

            // Logic check
            let imageUrl = null;
            if (item['media:content'] && item['media:content']['$'] && item['media:content']['$']['url']) {
                imageUrl = item['media:content']['$']['url'];
            }
            else if (item['media:thumbnail'] && item['media:thumbnail']['$'] && item['media:thumbnail']['$']['url']) {
                imageUrl = item['media:thumbnail']['$']['url'];
            }
            else if (item['media:thumbnail'] && item['media:thumbnail']['url']) {
                imageUrl = item['media:thumbnail']['url'];
            }

            console.log('EXTRACTED IMAGE:', imageUrl);
        });

    } catch (e) {
        console.error(e);
    }
}

main();
