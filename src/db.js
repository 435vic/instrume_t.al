// @ts-check
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs';
import path from 'path';
import logger from './logger.js';
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
function init(db) {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            pass TEXT NOT NULL, -- argon2id hashing algorithm (salting is already included, it's part of the string)
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            secret TEXT UNIQUE NOT NULL,
            valid_till DATETIME
        )`);

        db.run(`INSERT INTO users(id, username, pass) VALUES (
            0, -- admin id is hardcoded on purpose
            'admin',
            '$argon2id$v=19$m=65536,t=3,p=4$WFF2TjMc4ve3mdXvjp0c2A$nl5w/OWg6Q4+pGkXUn83UxMQyN759r3gszOW0cvWzAc'
        )`);
    });
}

/**
  * @function seed Add initial values to database
  * @param {sqlite3.Database} db the database to seed
  * @throws {Error} if the database is not empty
  */
function seed(db) {
    db.serialize(() => {
        // Admin user, credentials specified by course requirements
        db.run(`INSERT INTO users(id, username, pass) VALUES (
            0, -- admin id is hardcoded on purpose
            'admin',
            '$argon2id$v=19$m=65536,t=3,p=4$WFF2TjMc4ve3mdXvjp0c2A$nl5w/OWg6Q4+pGkXUn83UxMQyN759r3gszOW0cvWzAc'
        )`);
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


