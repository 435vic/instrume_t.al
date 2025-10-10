import express from 'express';
import { create } from 'express-handlebars';
import logger from './src/logger.js';
import auth from './src/auth.js';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import { getDatabase } from './src/db.js';
import api from './src/rest.js';

const app = express();
const db = getDatabase();
const handlebars = create({
    helpers: {
        isAdmin: (user) => user?.username == 'admin',
        encodeURI: encodeURIComponent,
    },
});

app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');
app.set('views', './views');

app.use(express.json());
app.use(cookieParser());
app.use(auth.withAuth());
app.use('/api/v1', auth.withAuth(), api);
app.use('/static', express.static(fileURLToPath(import.meta.resolve('./public'))));

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    auth.authenticate(username, password).then((user) => {
        if (!user) {
            res.status(403).json({ err: 'auth', message: 'you shall not pass!' });
            return;
        }

        res.cookie('session', user.sessionToken, { httpOnly: true });
        res.json(user);
    }).catch((err) => {
        logger.error(`error in auth: ${err}`);
        res.status(500).end();
    });
});

app.get('/logout', (req, res) => {
    res.clearCookie('session');
    res.redirect('/');
});

app.get('/instruments', async (req, res) => {
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

app.get('/whoami', (req, res) => {
    res.render('whoami', { user: req.user });
});

app.get('/', (req, res) => {
    res.render('home');
});

app.listen(3000);

