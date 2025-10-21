// @ts-check
import prompts from 'prompts';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const DB_PATH = path.join(import.meta.dirname, '../database/database.sqlite');
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

/**
 * Fetches images from Unsplash API
 * @param {string} query - Search query
 * @param {number} perPage - Number of images to fetch
 * @returns {Promise<Array<{url: string, description: string, photographer: string}>>}
 */
async function searchUnsplash(query, perPage = 5) {
    if (!UNSPLASH_ACCESS_KEY) {
        throw new Error('UNSPLASH_ACCESS_KEY not found in environment variables. Please add it to your .env file.');
    }

    try {
        const response = await fetch(
            `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}`,
            {
                headers: {
                    'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Unsplash API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        return data.results.map(photo => ({
            url: photo.urls.regular,
            description: photo.description || photo.alt_description || '',
            photographer: photo.user.name,
            photographerUrl: photo.user.links.html
        }));
    } catch (error) {
        console.error(`Error fetching images from Unsplash for "${query}":`, error.message);
        return [];
    }
}

/**
 * Main function to add images to instruments
 */
async function main() {
    if (!UNSPLASH_ACCESS_KEY) {
        console.error('\n❌ ERROR: UNSPLASH_ACCESS_KEY not found in environment variables.');
        console.log('\nTo use this script:');
        console.log('1. Go to https://unsplash.com/developers');
        console.log('2. Create a new application');
        console.log('3. Copy your Access Key');
        console.log('4. Add it to your .env file: UNSPLASH_ACCESS_KEY=your_key_here\n');
        return;
    }

    const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });

    console.log('Unsplash Image Finder for Instruments\n');
    console.log('This tool will help you find and add images for instruments using Unsplash.\n');

    await processInstruments(db);

    await db.close();
    console.log('\nDone! All images have been added.');
}

/**
 * Process instruments without images
 */
async function processInstruments(db) {
    const instruments = await db.all(
        'SELECT id, name FROM instruments WHERE image_uri IS NULL OR image_uri = ""'
    );

    if (instruments.length === 0) {
        console.log('\n✓ All instruments already have images!');
        return;
    }

    console.log(`\n📷 Found ${instruments.length} instruments without images.\n`);

    for (const instrument of instruments) {
        console.log(`\n🎵 Searching Unsplash for: ${instrument.name}`);
        console.log('─'.repeat(50));

        const searchQuery = `${instrument.name}`;
        const images = await searchUnsplash(searchQuery, 10);

        if (images.length === 0) {
            console.log('❌ No images found. Skipping...');
            continue;
        }

        // Show options to user
        const choices = images.map((img, idx) => ({
            title: `Option ${idx + 1}: ${img.description || 'No description'} (by ${img.photographer})`,
            description: img.url.substring(0, 80) + '...',
            value: img
        }));

        choices.push({ title: 'Skip this one', value: null });

        const { selectedImage } = await prompts({
            type: 'select',
            name: 'selectedImage',
            message: `Select an image for ${instrument.name}:`,
            choices: choices
        });

        if (selectedImage === undefined) {
            console.log('\n⚠️  Selection cancelled. Exiting...');
            return;
        }

        if (selectedImage) {
            await db.run(
                'UPDATE instruments SET image_uri = ? WHERE id = ?',
                [selectedImage.url, instrument.id]
            );
            console.log(`✓ Image saved for ${instrument.name}`);
            console.log(`  Photo by ${selectedImage.photographer} on Unsplash`);
        } else {
            console.log(`⊘ Skipped ${instrument.name}`);
        }
    }
}

main().catch(console.error);
