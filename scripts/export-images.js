// @ts-check
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs/promises';

const DB_PATH = path.join(import.meta.dirname, '../database/database.sqlite');
const JSON_PATH = path.join(import.meta.dirname, '../data/instruments.json');

/**
 * Export image URIs from database back to JSON file
 */
async function exportImages() {
    const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });

    // Read current JSON file
    const jsonData = JSON.parse(await fs.readFile(JSON_PATH, 'utf-8'));

    // Get all instruments with images from database
    const instrumentsFromDb = await db.all(
        'SELECT id, name, image_uri FROM instruments WHERE image_uri IS NOT NULL AND image_uri != ""'
    );

    // Create a map of name -> image_uri
    const imageMap = new Map();
    instrumentsFromDb.forEach(inst => {
        imageMap.set(inst.name, inst.image_uri);
    });

    // Update JSON data with image URIs
    let updateCount = 0;
    jsonData.forEach(instrument => {
        if (imageMap.has(instrument.name)) {
            instrument.image_uri = imageMap.get(instrument.name);
            updateCount++;
        }
    });

    // Write updated JSON back to file
    await fs.writeFile(JSON_PATH, JSON.stringify(jsonData, null, 2), 'utf-8');

    await db.close();

    console.log(`✓ Successfully exported ${updateCount} image URIs to ${JSON_PATH}`);
}

exportImages().catch(console.error);
