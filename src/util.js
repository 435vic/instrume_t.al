import { getDatabase } from "./db.js";

const db = getDatabase();

export function adminOnly(req, res, next) {
    if (req.user?.username !== 'admin') {
        res.status(403);
        return next(new Error('Unauthorized'));
    }
    next();
}

export function fetcher(table) {
    return async (req, res, next) => {
        const id = parseInt(req.params.id);
        if (Number.isNaN(id)) return res.status(400).end();

        // You might be reeling right now, seeing string interpolation in an SQL query.
        // Here's the thing. The table name is ALWAYS defined server-side,
        // when the fetcher middleware is called from route files. This is why
        // I feel it's acceptable to use templating for this specific instance.
        // The table param is never touched by client-side code or client data.
        const item = await db.get(`SELECT * FROM ${table} WHERE id == ?`, [id]);
        if (!item) return res.status(404).end('Not Found :(');
        req.item = item;
        next();
    };
}

