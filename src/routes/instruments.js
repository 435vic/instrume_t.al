import express from 'express';
import { getDatabase } from '../db.js';
import { adminOnly, fetcher } from '../util.js';
import logger from '../logger.js';

const instruments = express.Router();
const db = getDatabase();

instruments.use(express.urlencoded());

instruments.get('/', async (req, res) => {
    const instrumentCount = (await db.get('SELECT COUNT(*) as cnt FROM instruments')).cnt;
    const totalPages = Math.ceil(instrumentCount / 6);
    const page = req.query.page <= totalPages ? req.query.page : 1;
    // used for rendering the pagination section
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    const instruments = await db.all('SELECT * FROM instruments LIMIT 6 OFFSET ?', [(page-1) * 6]);
    res.render('instruments', {
        user: req.user,
        url: '/instruments',
        instruments, page, pages, totalPages,
        helpers: {
            isCurrentPage: (val) => val == page, 
        },
    });
});

instruments.get('/new', adminOnly, (req, res) => {
    res.render('edit-instrument', { user: req.user, create: true });
});

instruments.post('/new', adminOnly, async (req, res) => {
    logger.info(req.body);
    if (!req.body.name || !req.body.description) {
        return res.render('edit-instrument', {
            error: "Please fill out all required fields.",
            create: true,
            instrument: req.body
        });
    }
    await db.run(
        'INSERT INTO instruments (name, description, origin_date, image_uri) VALUES (?, ?, ?, ?)',
        [req.body.name, req.body.description, req.body.origin_date || null, req.body.image_uri || null]
    );
    res.redirect('/instruments');
});

// Fetches the instrument with the id `:id`, exposes it to handlers as
// `req.item`. Handles invalid or unknown instrument id's automatically
instruments.use('/:id', fetcher('instruments'));

instruments.get('/:id', async (req, res) => {
    const id = req.params.id;
    const instrument = req.item;
    const musicians = await db.all(`
        SELECT
            m.name name,
            m.nationality nationality,
            m.description description,
            musician_id,
            instrument_id
        FROM musician_instruments
        INNER JOIN musicians m
            ON m.id == musician_id
        WHERE instrument_id == ?;
    `, [id]);
    if (!instrument) return res.status(404).end('Not Found :(');
    return res.render('instrument', {
        instrument,
        musicians,
        user: req.user
    });
});

instruments.get('/:id/edit', adminOnly, (req, res) => {
    logger.info(req.item);
    res.render('edit-instrument', {
        instrument: req.item
    });
});

instruments.post('/:id/edit', adminOnly, async (req, res) => {
    const result = await db.run(
        `
            UPDATE instruments
            SET name = ?,
                description = ?,
                origin_date = ?,
                image_uri = ?
            WHERE id = ?
        `,
        [req.body.name, req.body.description, req.body.origin_date || null, req.body.image_uri || null, req.params.id]
    );
    logger.info(result);
    res.redirect(`/instruments/${req.params.id}`);
});


export default instruments;
