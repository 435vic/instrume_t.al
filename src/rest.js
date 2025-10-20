import express from 'express';
import { getDatabase } from './db.js';
import { adminOnly } from './util.js';

const api = express.Router();
const db = getDatabase();

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

