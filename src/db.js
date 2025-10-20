// @ts-check
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs';
import path from 'path';
import logger from './logger.js';
import { readFile } from 'fs/promises';
import { Database } from 'sqlite';

const DB_LOCATION = process.env.DB_LOCATION || path.join(import.meta.dirname, '../database/');
const DB_PATH = path.join(DB_LOCATION, 'database.sqlite'); 

if (!fs.existsSync(DB_LOCATION)) {
    fs.mkdirSync(DB_LOCATION);
}

const database = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
});
const driver = database.getDatabaseInstance();
logger.info(`db opened at ${DB_PATH}`);

/**
  * @function init Initialize tables on the database.
  * @param {sqlite3.Database} db The Database object.
  */
async function init(db) {
    const instrument_data = JSON.parse(await readFile(path.join(import.meta.dirname, '../data/instruments.json'), 'utf-8'));
    const musician_data = JSON.parse(await readFile(path.join(import.meta.dirname, '../data/musicians.json'), 'utf-8'));

    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            fname TEXT,
            lname TEXT,
            pass TEXT NOT NULL, -- argon2id hashing algorithm (salting is already included, it's part of the string)
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            secret TEXT UNIQUE NOT NULL,
            valid_till DATETIME
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS instruments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            origin_date TEXT,
            image_uri TEXT -- might not even be used honestly
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS musicians (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            nationality TEXT NOT NULL,
            description TEXT NOT NULL,
            UNIQUE(name, nationality)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS musician_instruments (
            musician_id INTEGER NOT NULL,
            instrument_id INTEGER NOT NULL,
            PRIMARY KEY (musician_id, instrument_id),
            FOREIGN KEY (musician_id) REFERENCES musicians(id) ON DELETE CASCADE,
            FOREIGN KEY (instrument_id) REFERENCES instruments(id) ON DELETE CASCADE
        )`);

        db.run(`INSERT INTO users(id, username, fname, lname, pass) VALUES (
            0, -- admin id is hardcoded on purpose
            'admin',
            'Jerôme',
            'Landre',
            '$argon2id$v=19$m=65536,t=3,p=4$WFF2TjMc4ve3mdXvjp0c2A$nl5w/OWg6Q4+pGkXUn83UxMQyN759r3gszOW0cvWzAc'
        )`);

        // Insert instruments
        instrument_data.forEach((instrument) => {
            db.run(
                `INSERT INTO instruments(name, description, origin_date) VALUES (?, ?, ?)`,
                [instrument.name, instrument.description, instrument.origin_date]
            );
        });

        // Build instrument name to ID mapping after instruments are inserted
        db.all(`SELECT id, name FROM instruments`, [], (err, instruments) => {
            if (err) {
                logger.error('Failed to fetch instruments for mapping', err);
                return;
            }

            const instrumentMap = new Map();
            instruments.forEach(inst => {
                instrumentMap.set(inst.name, inst.id);
            });

            // Deduplicate musicians by name and nationality
            const seenMusicians = new Set();
            const uniqueMusicians = [];

            musician_data.forEach(musician => {
                const key = `${musician.name}|${musician.nationality}`;
                if (!seenMusicians.has(key)) {
                    seenMusicians.add(key);
                    uniqueMusicians.push(musician);
                }
            });

            // Insert musicians and their instrument relationships
            uniqueMusicians.forEach(musician => {
                db.run(
                    `INSERT OR IGNORE INTO musicians(name, nationality, description) VALUES (?, ?, ?)`,
                    [musician.name, musician.nationality, musician.description],
                    function(err) {
                        if (err) {
                            logger.error(`Failed to insert musician ${musician.name}`, err);
                            return;
                        }

                        const musicianId = this.lastID;

                        // Map instrument names to IDs and filter out non-existent instruments
                        if (musician.instruments && Array.isArray(musician.instruments)) {
                            musician.instruments.forEach(instrumentName => {
                                const instrumentId = instrumentMap.get(instrumentName);
                                if (instrumentId) {
                                    db.run(
                                        `INSERT OR IGNORE INTO musician_instruments(musician_id, instrument_id) VALUES (?, ?)`,
                                        [musicianId, instrumentId],
                                        (err) => {
                                            if (err) {
                                                logger.error(`Failed to link ${musician.name} to ${instrumentName}`, err);
                                            }
                                        }
                                    );
                                } else {
                                    logger.warn(`Instrument "${instrumentName}" not found for musician ${musician.name}, skipping`);
                                }
                            });
                        }
                    }
                );
            });
        });
    });
}

let shouldInit = false;

try {
    const admin = await database.get('SELECT id FROM users WHERE id == 0');
    shouldInit = admin === undefined;
} catch (err) {
    shouldInit = true;
}

if (shouldInit) {
    logger.warn('Database seems uninitialized, seeding with values...');
    init(driver);
}

export function getDatabase() {
    return database;
}


