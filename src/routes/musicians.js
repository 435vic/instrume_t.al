import express from 'express';
import { getDatabase } from '../db.js';
import { adminOnly, fetcher } from '../util.js';
import logger from '../logger.js';

const musicians = express.Router();
const db = getDatabase();

musicians.use(express.urlencoded());

musicians.get('/', async (req, res) => {
    const musicianCount = (await db.get('SELECT COUNT(*) as cnt FROM musicians')).cnt;
    const totalPages = Math.ceil(musicianCount / 10);
    const page = req.query.page <= totalPages ? req.query.page : 1;
    // used for rendering the pagination section
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

    // Get musicians with their instruments
    const musiciansRaw = await db.all('SELECT id, name, nationality, description FROM musicians LIMIT 10 OFFSET ?', [(page-1) * 10]);

    // Fetch instruments for each musician
    const musiciansWithInstruments = await Promise.all(
        musiciansRaw.map(async (musician) => {
            const instruments = await db.all(`
                SELECT i.name
                FROM musician_instruments mi
                INNER JOIN instruments i ON i.id = mi.instrument_id
                WHERE mi.musician_id = ?
            `, [musician.id]);

            return {
                ...musician,
                instruments: instruments.map(i => i.name)
            };
        })
    );

    res.render('musicians', {
        user: req.user,
        url: '/musicians',
        musicians: musiciansWithInstruments,
        page,
        pages,
        totalPages,
        helpers: {
            isCurrentPage: (val) => val == page,
        },
    });
});

// Fetches the musician with the id `:id`, exposes it to handlers as
// `req.item`. Handles invalid or unknown musician id's automatically
musicians.use('/:id', fetcher('musicians'));

musicians.get('/:id', async (req, res) => {
    const id = req.params.id;
    const musician = req.item;

    // Get all instruments this musician plays
    const instruments = await db.all(`
        SELECT
            i.id id,
            i.name name,
            i.description description,
            i.origin_date origin_date
        FROM musician_instruments mi
        INNER JOIN instruments i
            ON i.id = mi.instrument_id
        WHERE mi.musician_id = ?;
    `, [id]);

    if (!musician) return res.status(404).end('Not Found :(');

    return res.render('musician', {
        musician,
        instruments,
        user: req.user
    });
});

export default musicians;
