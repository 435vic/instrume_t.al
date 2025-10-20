import express from 'express';
import { create } from 'express-handlebars';
import logger from './src/logger.js';
import auth from './src/auth.js';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import { getDatabase } from './src/db.js';
import api from './src/rest.js';
import { adminOnly } from './src/util.js';
import instruments from './src/routes/instruments.js';
import musicians from './src/routes/musicians.js';
import admin from './src/routes/admin.js';

const app = express();
const db = getDatabase();
const handlebars = create({
    helpers: {
        isAdmin: (user) => user?.username == 'admin',
        encodeURI: encodeURIComponent,
        eq: (a, b) => a === b,
        or: (a, b) => a || b,
    },
});

app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');
app.set('views', './views');

app.use(express.json());
app.use(cookieParser());
app.use(auth.withAuth());
app.use('/api/v1', auth.withAuth(), api);
app.use('/instruments', instruments);
app.use('/musicians', musicians);
app.use('/admin', adminOnly, admin);
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

app.get('/profile', (req, res) => {
    res.render('profile', { user: req.user, fullname: `${req.user.fname} ${req.user.lname}`.trim() });
});


app.get('/', (req, res) => {
    res.render('home', { user: req.user} );
});

app.listen(3000);

