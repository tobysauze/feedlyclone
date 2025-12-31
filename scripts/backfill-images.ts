
import { PrismaClient } from '@prisma/client';
import Parser from 'rss-parser';

const prisma = new PrismaClient();
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
    const feeds = await prisma.feed.findMany();
    console.log(`Found ${feeds.length} feeds to backfill.`);

    for (const feed of feeds) {
        console.log(`Processing ${feed.title} (${feed.url})...`);
        try {
            const parsed = await parser.parseURL(feed.url);
            let updated = 0;

            for (const item of parsed.items) {
                if (!item.link) continue;

                // Extract image logic (duplicate of worker)
                let imageUrl = null;
                if (item['media:content'] && item['media:content']['$'] && item['media:content']['$']['url']) {
                    imageUrl = item['media:content']['$']['url'];
                } else if (item['media:content'] && item['media:content']['url']) {
                    imageUrl = item['media:content']['url'];
                } else if (item['media:thumbnail'] && item['media:thumbnail']['$'] && item['media:thumbnail']['$']['url']) {
                    imageUrl = item['media:thumbnail']['$']['url'];
                } else if (item['media:thumbnail'] && item['media:thumbnail']['url']) {
                    imageUrl = item['media:thumbnail']['url'];
                } else if (item.enclosure && item.enclosure.url && item.enclosure.type?.startsWith('image')) {
                    imageUrl = item.enclosure.url;
                } else if (item.content?.match(/<img[^>]+src="([^">]+)"/)) {
                    const match = item.content?.match(/<img[^>]+src="([^">]+)"/);
                    if (match) imageUrl = match[1];
                }

                if (imageUrl) {
                    // Update if exists via guid or link
                    // GUID logic mimics worker: item.guid || item.link
                    const guid = item.guid || item.link || "";

                    const res = await prisma.article.updateMany({
                        where: {
                            feedId: feed.id,
                            OR: [
                                { guid: guid },
                                { link: item.link }
                            ]
                        },
                        data: {
                            imageUrl: imageUrl
                        }
                    });
                    if (res.count > 0) updated += res.count;
                }
            }
            console.log(`Updated ${updated} articles for ${feed.title}`);

        } catch (e) {
            console.error(`Failed to process ${feed.url}:`, e);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
