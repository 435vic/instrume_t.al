import express from 'express';
import { getDatabase } from '../db.js';
import { fetcher } from '../util.js';
import argon2 from 'argon2';

const admin = express.Router();
const db = getDatabase();

admin.use(express.urlencoded());

admin.get('/users/new', (req, res) => {
    res.render('edit-user', { create: true }); 
});

admin.post('/users/new', async (req, res) => {
    const { username, fname, lname, password, confirm_password } = req.body;
    if (Object.values(req.body).some(v => !v)) {
        return res.render('edit-user', {
            editUser: { username, fname, lname },
            error: 'Please fill out all required fields.'
        });
    }

    if (password !== confirm_password) {
        return res.render('edit-user', {
            editUser: { username, fname, lname }, 
            create: true,
            error: 'Passwords must match.'
        });
    }

    const hashedPassword = await argon2.hash(password);

    await db.run(`
        INSERT INTO users (username, fname, lname, pass) VALUES (?, ?, ?, ?)
    `, [username, fname, lname, hashedPassword]);

    res.redirect('/admin');
});

admin.use('/users/:id', fetcher('users'));

admin.get('/users/:id/delete', (req, res) => {
    res.redirect('/');
});

admin.post('/users/:id/delete', async (req, res) => {
    if (req.body.id == 0) {
        res.status(400);
        return res.redirect('/admin');
    }
    await db.run(`DELETE FROM USERS WHERE id = ?`, [req.params.id]);
    res.redirect('/admin');
});

admin.get('/users/:id/edit', (req, res) => {
    res.render('edit-user', { editUser: req.item });
});

admin.post('/users/:id/edit', async (req, res) => {
    const { username, fname, lname, password, confirm_password } = req.body;
    if (!username || !fname || !lname) {
        return res.render('edit-user', {
            editUser: { username, fname, lname },
            error: 'Please fill out all required fields.'
        });
    }

    if (password !== confirm_password) {
        return res.render('edit-user', {
            editUser: { username, fname, lname }, 
            error: 'Passwords must match.'
        });
    }

    if (password) {
        const hashedPassword = await argon2.hash(password);        
        await db.run(
            'UPDATE users SET username = ?, fname = ?, lname = ?, pass = ? WHERE id = ?',
            [username, fname, lname, hashedPassword, req.params.id]
        );
    } else {
        await db.run(
            'UPDATE users SET username = ?, fname = ?, lname = ? WHERE id = ?',
            [username, fname, lname, req.params.id]
        );
    }

    res.redirect('/admin');
});

admin.get('/', async (req, res) => {
    const users = await db.all('SELECT * FROM users');
    res.render('admin', { user: req.user, users });
});

export default admin;

