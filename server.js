import express from 'express';
import { engine } from 'express-handlebars';
import logger from './src/logger.js';
import auth from './src/auth.js';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';

const app = express();

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

app.use('/static', express.static(fileURLToPath(import.meta.resolve('./public'))));
app.use(express.json());
app.use(cookieParser());
app.use(auth.middleware());

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

app.get('/whoami', (req, res) => {
    res.render('whoami', { user: req.user });
});

app.get('/', (req, res) => {
    res.render('home');
});

app.listen(3000);

