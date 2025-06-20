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
        ((SELECT user_id FROM Users WHERE username = 'carol123'), 'Donko', 'small'),
      `);
      await db.execute(`
        INSERT INTO Users (username, email, password_hash, role) VALUES
        ('alice123', 'alice@example.com', 'hashed123', 'owner'),
        ('bobwalker', 'bob@example.com', 'hashed456', 'walker'),
        ('carol123', 'carol@example.com', 'hashed789', 'owner'),
        ('aiko123', 'sasha@example.com', 'hashed101', 'walker'),
        ('ken123', 'sasha123@example.com', 'hashed102', 'owner')
      `);
    }
  } catch (err) {
    console.error('Error setting up database. Ensure Mysql is running: service mysql start', err);
  }
})();

// Route to return books as JSON
app.get('/', async (req, res) => {
  try {
    const [books] = await db.execute('SELECT * FROM books');
    res.json(books);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

module.exports = app;