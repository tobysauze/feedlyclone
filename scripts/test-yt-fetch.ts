
import axios from 'axios';

const url = 'https://www.youtube.com/@hubermanlab'; // Root URL

async function testParam() {
    try {
        console.log(`Fetching ${url}...`);
        const res = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const html = res.data;

        // Look for channelId
        const channelIdMatch = html.match(/<meta itemprop="channelId" content="([^"]+)"/);
        const rssMatch = html.match(/title="RSS" href="([^"]+)"/);

        console.log('Channel ID found:', channelIdMatch ? channelIdMatch[1] : 'No');
        console.log('RSS Link found:', rssMatch ? rssMatch[1] : 'No');

    } catch (e) {
        console.error('Error fetching:', e.message);
    }
}

testParam();
