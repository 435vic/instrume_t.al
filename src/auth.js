import logger from './logger.js'
import { getDatabase } from './db.js' 
import { randomBytes } from 'node:crypto'
import argon2 from 'argon2';

class AuthManager {
    constructor(db) {
        this.db = db;
    }

    async generateToken() {
        return new Promise((resolve, reject) => {
            randomBytes(32, (err, buf) => {
                if (err) reject(err);
                else resolve(buf.toString('hex'));
            });
        });
    }

    async authenticate(username, password) {
        const result = await new Promise((resolve, reject) => {
            this.db.get('SELECT id,pass,username FROM users WHERE username == (?)', [username], (err, res) => {
                if (err) {
                    reject(err);
                }
                resolve(res);
            });
        });
        
        if (!result) return null;
        
        if (await argon2.verify(result.pass, password)) {
            const token = await this.generateToken();
            
            db.run(`
                INSERT INTO sessions (user_id, secret, valid_till)
                VALUES (?, ?, datetime('now', '+24 hours'))
            `, [token, result.id]);

            return {
                username,
                sessionToken: token,
            };
        }

        return null;
    }
}

const auth = new AuthManager(getDatabase());

export default auth;

