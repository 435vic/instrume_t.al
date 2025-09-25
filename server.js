import express from 'express';
import { engine } from 'express-handlebars';
import { getDatabase } from './src/db.js';

const app = express();
const db = getDatabase();

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

app.get('/', (req, res) => {
    res.render('home');
});

app.get('/test', (req, res) => {
    db.get("SELECT 'SQLITE3'", (err, data) => {
        if (err) {
            console.error(err);
        } else {
            // data = { "'SQLITE3'": "SQLITE3" }
            res.render('test', { test_value: Object.values(data)[0] });
        }
    });
    // res.render('test');
});

app.listen(3000);

