import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

const API_URL = 'https://db.ygoprodeck.com/api/v7/cardinfo.php';
// Target: frontend/public/card_images
const OUTPUT_DIR = path.join(__dirname, '../../frontend/public/card_images');
const OUTPUT_SMALL_DIR = path.join(__dirname, '../../frontend/public/card_images_small');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(OUTPUT_SMALL_DIR)) fs.mkdirSync(OUTPUT_SMALL_DIR, { recursive: true });

async function downloadImage(url: string, dest: string) {
    if (fs.existsSync(dest)) return; // Skip if exists
    
    try {
        const response = await axios.get(url, { responseType: 'stream' });
        await pipeline(response.data, fs.createWriteStream(dest));
        process.stdout.write('.');
    } catch (error: any) {
        console.error(`\nFailed to download ${url}: ${error.message}`);
    }
}

async function run() {
    console.log('Fetching card database...');
    try {
        const { data } = await axios.get(API_URL);
        const cards = data.data;
        console.log(`Found ${cards.length} cards. Starting download...`);

        // Process in chunks to avoid overwhelming everything
        const CHUNK_SIZE = 20;
        for (let i = 0; i < cards.length; i += CHUNK_SIZE) {
            const chunk = cards.slice(i, i + CHUNK_SIZE);
            await Promise.all(chunk.map(async (card: any) => {
                if (card.card_images && card.card_images.length > 0) {
                    const img = card.card_images[0];
                    const id = img.id;
                    
                    // High Res
                    await downloadImage(img.image_url, path.join(OUTPUT_DIR, `${id}.jpg`));
                    // Small Res
                    await downloadImage(img.image_url_small, path.join(OUTPUT_SMALL_DIR, `${id}.jpg`));
                }
            }));
            
            if (i % 100 === 0) console.log(`\nProcessed ${i}/${cards.length}`);
        }
        console.log('\nDownload complete!');
    } catch (e) {
        console.error('Error:', e);
    }
}

run();
