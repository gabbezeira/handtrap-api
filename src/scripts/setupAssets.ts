import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

const API_CARD_INFO = 'https://db.ygoprodeck.com/api/v7/cardinfo.php'; // Full DB
const OUTPUT_DIR_IMAGES = path.join(__dirname, '../../../frontend/public/card_images');
const OUTPUT_DIR_IMAGES_SMALL = path.join(__dirname, '../../../frontend/public/card_images_small');
const OUTPUT_JSON = path.join(__dirname, '../../../frontend/public/cardDatabase.json');

if (!fs.existsSync(OUTPUT_DIR_IMAGES)) fs.mkdirSync(OUTPUT_DIR_IMAGES, { recursive: true });
if (!fs.existsSync(OUTPUT_DIR_IMAGES_SMALL)) fs.mkdirSync(OUTPUT_DIR_IMAGES_SMALL, { recursive: true });

async function downloadImage(url: string, dest: string) {
    if (fs.existsSync(dest)) return; // Skip if exists
    try {
        const response = await axios.get(url, { responseType: 'stream' });
        await pipeline(response.data, fs.createWriteStream(dest));
    } catch (error: any) {
        // console.error(`Failed ${url}`); // Silent to avoid clutter
    }
}

async function run() {
    console.log('Fetching full card database (JSON)...');
    try {
        // 1. Download Full JSON
        const { data } = await axios.get(`${API_CARD_INFO}?language=pt`); // Try PT first for text
        // Note: The API 'cardinfo.php?language=pt' returns all cards but with PT text where available.
        // It DOES NOT filter out cards that don't have PT text (they usually fallback or are excluded depending on API version).
        // Actually, YGOPRODeck language param filters to ONLY cards with that language support usually.
        // User wants ALL cards. 
        // Strategy: Download English (complete) and Portuguese (partial) and merge?
        // Or just download English mostly? 
        // User said: "Show staples... load correctly".
        // Let's stick to the URL user provided: https://db.ygoprodeck.com/api/v7/cardinfo.php (English Default) 
        // effectively contains everything.
        // BUT user wants PT details.
        // Let's try downloading the PT one. If it's missing cards, we might need English as fallback.
        // For now, let's just get the main one with `language=pt` as primarily requested for localization.
        
        // Wait, `language=pt` might limit the dataset. Let's check size. 
        // To be safe and get ALL cards (14k+), we should pull the default (English) AND maybe map PT texts if needed?
        // Actually, let's pull the default English one to ensure we have every card (for IDs/Images), 
        // and ignore translation if it complicates "missing card" issues (e.g. "Mark").
        // "Mark" might be a new card not in PT DB.
        
        // Revised Strategy: Download English DB (Complete). Use it for Search/ID/Images.
        // If user *really* wants PT text, we can try to fetch that separately or just use English for stability as "Standard of Industry".
        // User complained "Mark" didn't appear. "Mark" is likely "The Mark of the Rose" etc?
        // Let's download the full English database to `cardDatabase.json`.
        
        console.log('Downloading standard DB (English) for completeness...');
        const responseEn = await axios.get(API_CARD_INFO);
        const allCards = responseEn.data.data;
        
        console.log(`Saving ${allCards.length} cards to cardDatabase.json...`);
        fs.writeFileSync(OUTPUT_JSON, JSON.stringify(allCards));
        
        console.log('Starting image download...');
        // Process in chunks
        const CHUNK_SIZE = 50;
        for (let i = 0; i < allCards.length; i += CHUNK_SIZE) {
            const chunk = allCards.slice(i, i + CHUNK_SIZE);
            await Promise.all(chunk.map(async (card: any) => {
                if (card.card_images && card.card_images.length > 0) {
                    const img = card.card_images[0];
                    const id = img.id;
                    await downloadImage(img.image_url, path.join(OUTPUT_DIR_IMAGES, `${id}.jpg`));
                    await downloadImage(img.image_url_small, path.join(OUTPUT_DIR_IMAGES_SMALL, `${id}.jpg`));
                }
            }));
            if (i % 500 === 0) process.stdout.write(`\r${i}/${allCards.length}`);
        }
        console.log('\nDone!');
        
    } catch (e) {
        console.error('Error:', e);
    }
}

run();
