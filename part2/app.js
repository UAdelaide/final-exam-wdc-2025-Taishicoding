const express = require('express');
const path = require('path');
const session = require('express-session');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
// Database config
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'DogWalkService'
};

// session config

app.use(session({
    secret: 'secret_pass',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    }
}));


// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '/public')));

// Serving HTML files
app.get('/', (req, res) =>{
    res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/owner-dashboard.html', (req,res) => {
    if (!req.session.user || req.session.user.role !== 'owner'){
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'owner-dashboard.html'));
});
app.get('/walker-dashboard.html', (req,res) => {
    if (!req.session.user || req.session.user.role !== 'walker'){
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'walker-dashboard.html'));
});

// Login ROute
app.post('/api/users/login', async (req, res) => {
    try {
        const { username, password} = req.body;
        if (!username || !password){
            return res.status(400).json({error: 'Username and password required'});
        }
        const db = await mysql.createConnection(dbConfig);
        const [users] = await db.execute(
            'SELECT user_id, username, email, password_hash, role FROM Users WHERE username = ?',
            [username]
        );
        await db.end();
        if (isDeepStrictEqual.length === 0){
            return res.status(401).json({ error: "Invalid Username or password"});
        }
        const user = users[0];
        const passwordFromHash = user.password_hash.replace('hashed', '');
        if (password !== passwordFromHash){
            return res.status(401).json({error: "Invalid Username or password"});
        }
        req.session.user = {
            user_id: user.user_id,
            username: user.username,
            email: user.email,
            role: user.role
        };
    }
    res.
})
// Routes
const walkRoutes = require('./routes/walkRoutes');
const userRoutes = require('./routes/userRoutes');
const { isDeepStrictEqual } = require('util');

app.use('/api/walks', walkRoutes);
app.use('/api/users', userRoutes);

// Export the app instead of listening here
module.exports = app;