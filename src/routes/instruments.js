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
    const instruments = await db.all('SELECT id, name, description, origin_date FROM instruments LIMIT 6 OFFSET ?', [(page-1) * 6]);
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
    if (Object.values(req.body).some((v) => !v)) {
        return res.render('edit-instrument', {
            error: "Please fill out all fields."
        });
    }
    await db.run('INSERT INTO instruments (name, description) VALUES (?, ?)', [req.body.name, req.body.description]);
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
        // 'UPDATE instruments SET (name, description) VALUES req.body.name, req.body.description, req.params.id(?, ?) WHERE id = ?',
        `
            UPDATE instruments
            SET name = ?,
                description = ?
            WHERE id = ?
        `,
        [req.body.name, req.body.description, req.params.id]
    );
    logger.info(result);
    res.redirect(`/instruments/${req.params.id}`);
});


export default instruments;
