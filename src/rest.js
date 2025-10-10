import express from 'express';
import { getDatabase } from './db.js';

const api = express.Router();
const db = getDatabase();

function adminOnly(req, res, next) {
    if (req.user?.username !== 'admin') {
        res.status(403);
        next(new Error('Unauthorized'));
    } else {
        next();
    }
}

api.delete('/instruments/:id', adminOnly, async (req, res) => {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) {
        res.status(400).end();
        return;
    }
    const result = await db.run('DELETE FROM instruments WHERE id == ?', [id]);
    if (result.changes == 0) {
        res.status(404).end();
        return;
    }
    res.status(200).end();
});

export default api;

