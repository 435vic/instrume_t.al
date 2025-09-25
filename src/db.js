// @ts-check
import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';

const DB_LOCATION = process.env.DB_LOCATION || path.join(import.meta.dirname, '../.db/');
const DB_PATH = path.join(DB_LOCATION, 'database.sqlite'); 

if (!fs.existsSync(DB_LOCATION)) {
    fs.mkdirSync(DB_LOCATION);
}

const database = new sqlite3.Database(DB_PATH);
console.log(`db opened at ${DB_PATH}`);

/** @param {sqlite3.Database} db */
function init(db) {
    db.serialize(() => {
        // tables go here
    });
}

export function getDatabase() {
    return database;
}


