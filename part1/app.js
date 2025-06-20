var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mysql = require('mysql2/promise');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

let db;

(async () => {
  try {
    // Connect to MySQL without specifying a database
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '' // Set your MySQL root password
    });

    // Create the database if it doesn't exist
    await connection.query('CREATE DATABASE IF NOT EXISTS DogWalkService');
    await connection.end();

    // Now connect to the created database
    db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'DogWalkService'
    });

    // Create a table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS books (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255),
        author VARCHAR(255)
      )
    `);

    // Insert data if table is empty
    const [rows] = await db.execute('SELECT COUNT(*) AS count FROM Users');
    if (rows[0].count === 0) {
      await db.execute(`
        INSERT INTO Users (username, email, password_hash, role) VALUES
        ('alice123', 'alice@example.com', 'hashed123', 'owner'),
        ('bobwalker', 'bob@example.com', 'hashed456', 'walker'),
        ('carol123', 'carol@example.com', 'hashed789', 'owner'),
        ('aiko123', 'sasha@example.com', 'hashed101', 'walker'),
        ('ken123', 'sasha123@example.com', 'hashed102', 'owner')
      `);
      await db.execute(`
         INSERT INTO Dogs (owner_id, name, size) VALUES
        ((SELECT user_id FROM Users WHERE username = 'alice123'), 'Max', 'medium'),
        ((SELECT user_id FROM Users WHERE username = 'carol123'), 'Bella', 'small'),
        ((SELECT user_id FROM Users WHERE username = 'carol123'), 'Donko', 'small'),
        ((SELECT user_id FROM Users WHERE username = 'ken123'), 'Sakura', 'medium'),
        ((SELECT user_id FROM Users WHERE username = 'ken123'), 'Sasha', 'large')
      `);
      await db.execute(`
         INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status) VALUES
        ((SELECT dog_id FROM Dogs WHERE name = 'Max' AND owner_id = (SELECT user_id FROM Users WHERE username = 'alice123')),
        '2025-06-10 08:00:00', 30, 'Parklands', 'open'),
        ((SELECT dog_id FROM Dogs WHERE name = 'Bella' AND owner_id = (SELECT user_id FROM Users WHERE username = 'carol123')),
        '2025-06-10 09:30:00', 45, 'Beachside Ave', 'accepted'),
        ((SELECT dog_id FROM Dogs WHERE name = 'Donko' AND owner_id = (SELECT user_id FROM Users WHERE username = 'carol123')),
        '2025-06-11 09:30:00', 45, 'Largs Bay', 'open'),
        ((SELECT dog_id FROM Dogs WHERE name = 'Sakura' AND owner_id = (SELECT user_id FROM Users WHERE username = 'ken123')),
        '2025-06-12 09:30:00', 45, 'Semaphore', 'cancelled'),
        ((SELECT dog_id FROM Dogs WHERE name = 'Sasha' AND owner_id = (SELECT user_id FROM Users WHERE username = 'ken123')),
        '2025-06-13 09:30:00', 45, 'North Haven', 'completed')
      `);
      await db.execute(`
        INSERT INTO WalkApplications (request_id, walker_id, status) VALUES
        ((SELECT request_id FROM WalkRequests WHERE dog_id = (SELECT dog_id FROM Dogs Where name = 'Bella')), (SELECT user_id FROM Users WHERE username = 'bobwalker'),'accepted'),
        ((SELECT request_id FROM WalkRequests WHERE dog_id = (SELECT dog_id FROM Dogs Where name = 'Sasha')), (SELECT user_id FROM Users WHERE username = 'aiko123'),'accepted')
      `);
      await db.execute(`
        INSERT INTO WalkRatings (request_id, walker_id, owner_id, rating, comments) VALUES
        ((SELECT request_id FROM WalkRequests WHERE dog_id = (SELECT dog_id FROM Dogs Where name = 'Bella')), (SELECT user_id FROM Users WHERE username = 'bobwalker'),(SELECT user_id FROM Users WHERE username = 'carol123'),5,'Good Job'),
        ((SELECT request_id FROM WalkRequests WHERE dog_id = (SELECT dog_id FROM Dogs Where name = 'Sasha')), (SELECT user_id FROM Users WHERE username = 'aiko123'),(SELECT user_id FROM Users WHERE username = 'ken123'),5,'Great Job!')
      `);
    }
  } catch (err) {
    console.error('Error setting up database. Ensure Mysql is running: service mysql start', err);
  }
})();

// Route to return Dogs size, and owner info
app.get('/api/dogs', async (req, res) => {
  try {
    const [dogs] = await db.execute('SELECT d.name as dog_name, d.size, u.username as owner_username, FROM Dogs d JOIN Users u ON d.owner_id = u.user_id ORDER BY d.name');
    res.json(dogs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dogs' });
  }
});
// Route to return all walk requests
app.get('/api/walkrequests/open', async (req, res) => {
  try {
    const [requests] = await db.execute('SELECT wr.request_id, d.name as dog_name, wr.requested_time, wr.duration_minutes, wr.location, u.username as owner_username FROM WalkRequests wr JOIN Dogs d ON wr.dog_id = d.dog_id JOIN Users u ON d.owner_id = u.user_id WHERE wr.status = "open" ORDER BY wr.requested_time');
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch open walk requests' });
  }
});
// Route to return walker summary w ratings and finished walks
app.get('/api/walkers/summary', async (req, res) => {
  try {
    const [walkers] = await db.execute('SELECT * FROM books');
    const formattedWalkers = walkers.map(walker => ({
        walker_username: walker.walker_username,
        total_ratings: parseInt(walker.total_ratings),
        average_rating: walker.average_rating ? parseFloat(walker.average_rating) : null,
        completed

    }));
    res.json(formattedWalkers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

module.exports = app;