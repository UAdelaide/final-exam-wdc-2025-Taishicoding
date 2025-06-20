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

// Routes
const walkRoutes = require('./routes/walkRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/api/walks', walkRoutes);
app.use('/api/users', userRoutes);

// Export the app instead of listening here
module.exports = app;