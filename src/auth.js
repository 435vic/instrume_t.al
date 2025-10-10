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
        const result = await this.db.get('SELECT id,pass,username FROM users WHERE username == (?)', [username]);
        
        if (!result) return null;
        if (await argon2.verify(result.pass, password)) {
            const token = await this.generateToken();
            
            this.db.run(`
                INSERT INTO sessions (user_id, secret, valid_till)
                VALUES (?, ?, datetime('now', '+24 hours'))
            `, [result.id, token]);

            return {
                username,
                sessionToken: token,
            };
        }

        return null;
    }

    withAuth() {
        return async (req, res, next) => {
            const session = req.cookies.session;
            if (!session) return next();
             
            // logger.info(`session ${session}`);
            const user = await this.db.get(`
                SELECT u.*
                FROM users u
                INNER JOIN sessions s ON s.user_id = u.id
                WHERE s.secret == (?) AND s.valid_till > datetime('now')
            `, [session]);
            if (!user) return next();

            logger.info(`session found for ${user.username}`);

            req.user = {
                username: user.username,
            };
            next();
        }
    }
}

const auth = new AuthManager(getDatabase());

export default auth;

