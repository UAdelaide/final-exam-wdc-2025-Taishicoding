const express = require('express');
const path = require('path');
// Added for the login function
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
    secret: 'secret_pass', // The secret key for securing cookies
    resave: false, // If session has not been edited, do not save
    saveUninitialized: false, // Do not create new session untill something new stored
    cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
    }
}));


// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '/public')));

// Serving HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
// Protected owner dashboard route
app.get('/owner-dashboard.html', (req,res) => {
  // make sure that user is logged in and is an owner
    if (!req.session.user || req.session.user.role !== 'owner'){
      // If not an owner redirected to login page
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'owner-dashboard.html'));
});
// Protected walker dashboard route
app.get('/walker-dashboard.html', (req,res) => {
  // make sure that user is logged in and is an walker
    if (!req.session.user || req.session.user.role !== 'walker'){
       // If not an walker redirected to login page
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'walker-dashboard.html'));
});

// Login ROute to authenticate users and create new session
app.post('/api/users/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      // ensuring username and password fields both have input
      return res.status(400).json({ error: 'Username and password required' });
    }
    // connecting to the database and conducting search for user
    const db = await mysql.createConnection(dbConfig);
    const [users] = await db.execute(
      'SELECT user_id, username, email, password_hash, role FROM Users WHERE username = ?',
      [username]
    );
    await db.end();
    // Check if user exists within the database, and provudubg errors if false
    if (users.length === 0) {
      return res.status(401).json({ error: "Invalid Username or password" });
    }

    const user = users[0];
    const passwordFromHash = user.password_hash.replace('hashed', '');
 // As the passwords were fake "Hashed" this line is to remove the hashed word of password
 // would replace with Bcrypt in real world scenario
    if (password !== passwordFromHash) {
      return res.status(401).json({ error: "Invalid Username or password" });
    }
 // creating a user session
    req.session.user = {
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      role: user.role
    };
 // sending success response
    res.json({
      message: 'Login successful',
      username: user.username,
      role: user.role,
      user_id: user.user_id
    });

  } catch (error) {
    console.error('Login Error', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// logout
app.post('/api/users/logout', (req, res) => {
  // destryoing the session and logging user out
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Could not log out'});
        }
        res.json({ message: 'logged out succsesfully' });
    });
});
// Dogs owned by user for drop down menu
app.get('/api/dogs/my-dogs', async (req, res) => {
  try {
    // verifying that user is logged in
    if (!req.session.user){
      return res.status(401).json({error: 'Not logged in'});
    }
    // connecting to database
    const db = await mysql.createConnection(dbConfig);
    // get dogs owned by current user, using session user_id to filter further
    const [dogs] = await db.execute(
      'SELECT dog_id, name, size FROM Dogs WHERE owner_id = ?',
      [req.session.user.user_id]
    );
    await db.end();
    // Returning array of users dogs
    res.json(dogs);
  } catch (error){
    res.status(500).json({error: 'Error'});
  }
});
// returning current user if already logged in
app.get('/api/users/session', (req,res) => {
    if (req.session.user){
        res.json({
          // user is logged in
            loggedIn: true,
            user: req.session.user
        });
    } else {
      // user is not logged in
        res.json({ loggedIn: false});
    }
});
// Routes
const walkRoutes = require('./routes/walkRoutes');
const userRoutes = require('./routes/userRoutes');
const { isDeepStrictEqual } = require('util');

app.use('/api/walks', walkRoutes);
app.use('/api/users', userRoutes);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);

});
// Export the app instead of listening here
module.exports = app;