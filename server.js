import express from 'express';
import { engine } from 'express-handlebars';
import { getDatabase } from './src/db.js';
import logger from './src/logger.js';
import auth from './src/auth.js';

const app = express();

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');
app.use(express.urlencoded());
// app.use(express.json());

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const result = await auth.authenticate(username, password);
    // logger.info(result);
    if (!result) res.json({ err: 'auth', message: 'you shall not pass' });
    res.json(result);
});

app.get('/', (req, res) => {
    res.render('home');
});


app.listen(3000);

