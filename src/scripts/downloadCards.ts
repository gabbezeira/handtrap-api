import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

const API_URL = 'https://db.ygoprodeck.com/api/v7/cardinfo.php';
const OUTPUT_PATH = path.join(__dirname, '../../../frontend/public/cardDatabase.json');

// Ensure directory exists
const ensureDirectory = async (filePath: string) => {
    const dir = path.dirname(filePath);
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir, { recursive: true });
    }
};

const downloadCards = async () => {
    console.log('Downloading card database in Portuguese...');
    try {
        const response = await axios.get(`${API_URL}?language=pt`);
        
        // The API returns { data: [...] }
        if (response.data && response.data.data) {
            await ensureDirectory(OUTPUT_PATH);
            
            // Format the JSON nicely for inspection if needed, though it increases size
            await fs.writeFile(OUTPUT_PATH, JSON.stringify(response.data.data, null, 2));
            console.log(`Successfully downloaded ${response.data.data.length} cards to ${OUTPUT_PATH}`);
            
            // Log a sample to verify language
            const sample = response.data.data.find((c: any) => c.id === 46986414); // Dark Magician
            if (sample) {
                console.log('Sample Card (Dark Magician):');
                console.log('Name:', sample.name);
                console.log('Desc:', sample.desc);
            }
        } else {
            console.error('Invalid API response structure');
        }
    } catch (error: any) {
        console.error('Error downloading cards:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
};

downloadCards();
