const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const multer = require('multer');

const app = express();
app.set('view engine', 'ejs');

// Middleware setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Database connection (ensure your DB has tables: contact_requests, doctors, nurses)
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Trunal@20112006',
    database: 'hospital_db2'
});

db.connect(err => {
    if (err) {
        console.error('Database connection failed: ' + err);
    } else {
        console.log('Connected to MySQL database');
    }
});

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Choose folder based on the field name
    if (file.fieldname === 'doctorImage') {
      cb(null, 'public/uploads/doctors'); // make sure this folder exists
    } else if (file.fieldname === 'nurseImage') {
      cb(null, 'public/uploads/nurses'); // make sure this folder exists
    } else {
      cb(null, 'public/uploads');
    }
  },
  filename: (req, file, cb) => {
    // Create a unique file name using a timestamp and original extension
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

/*------------------------------------------------
  ROUTES
------------------------------------------------*/

// Homepage: Query and display doctors and nurses from DB
app.get('/', (req, res) => {
    const doctorsQuery = "SELECT * FROM doctors";
    const nursesQuery = "SELECT * FROM nurses";

    db.query(doctorsQuery, (err, doctorResults) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Database error fetching doctors");
        }
        db.query(nursesQuery, (err, nurseResults) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Database error fetching nurses");
            }
            res.render('index', { doctors: doctorResults, nurses: nurseResults });
        });
    });
});

// About page
app.get('/about', (req, res) => {
    res.render('about');
});

// Handle contact form submission
app.post('/submit-contact', (req, res) => {
    const { name, email, message } = req.body;
    const sql = "INSERT INTO contact_requests (name, email, message) VALUES (?, ?, ?)";
    db.query(sql, [name, email, message], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Database error");
        }
        res.send("Thank you for contacting us! We'll get back to you soon.");
    });
});

// Admin Login Routes
app.get('/admin-login', (req, res) => {
    res.render('admin-login');
});

app.post('/admin-login', (req, res) => {
    const { username, password } = req.body;
    // Replace with a secure authentication mechanism in production
    if (username === 'admin' && password === 'admin123') {
        req.session.adminLoggedIn = true;
        res.redirect('/admin');
    } else {
        res.send("Invalid credentials");
    }
});

// Admin page: Display doctors, nurses, and contact requests
app.get('/admin', (req, res) => {
    if (!req.session.adminLoggedIn) {
        return res.redirect('/admin-login');
    }
    const doctorsQuery = "SELECT * FROM doctors";
    const nursesQuery = "SELECT * FROM nurses";
    const contactQuery = "SELECT * FROM contact_requests ORDER BY created_at DESC";

    db.query(doctorsQuery, (err, doctorResults) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Database error fetching doctors");
        }
        db.query(nursesQuery, (err, nurseResults) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Database error fetching nurses");
            }
            db.query(contactQuery, (err, contactResults) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send("Database error fetching contact requests");
                }
                res.render('admin', { doctors: doctorResults, nurses: nurseResults, contactRequests: contactResults });
            });
        });
    });
});

// Update availability for a doctor or nurse
app.post('/update-availability', (req, res) => {
    if (!req.session.adminLoggedIn) {
        return res.status(403).send("Unauthorized");
    }
    const { role, id, available } = req.body;
    const isAvailable = available === 'true';
    let updateQuery = "";

    if (role === 'doctor') {
        updateQuery = "UPDATE doctors SET available = ? WHERE id = ?";
    } else if (role === 'nurse') {
        updateQuery = "UPDATE nurses SET available = ? WHERE id = ?";
    }
    db.query(updateQuery, [isAvailable, id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Database error updating availability");
        }
        res.redirect('/admin');
    });
});

// Route to add a new doctor (with image upload)
app.post('/add-doctor', upload.single('doctorImage'), (req, res) => {
    if (!req.session.adminLoggedIn) {
        return res.status(403).send("Unauthorized");
    }
    const { name, bio } = req.body;
    const image = req.file ? req.file.filename : null;
    const sql = "INSERT INTO doctors (name, bio, available, image) VALUES (?, ?, ?, ?)";
    db.query(sql, [name, bio, true, image], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Database error adding doctor");
        }
        res.redirect('/admin');
    });
});

// Route to add a new nurse (with image upload)
app.post('/add-nurse', upload.single('nurseImage'), (req, res) => {
    if (!req.session.adminLoggedIn) {
        return res.status(403).send("Unauthorized");
    }
    const { name } = req.body;
    const image = req.file ? req.file.filename : null;
    const sql = "INSERT INTO nurses (name, available, image) VALUES (?, ?, ?)";
    db.query(sql, [name, true, image], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Database error adding nurse");
        }
        res.redirect('/admin');
    });
});

// Delete a doctor by id
app.get('/delete-doctor/:id', (req, res) => {
    if (!req.session.adminLoggedIn) {
        return res.status(403).send("Unauthorized");
    }
    const doctorId = req.params.id;
    const sql = "DELETE FROM doctors WHERE id = ?";
    db.query(sql, [doctorId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Database error deleting doctor");
        }
        res.redirect('/admin');
    });
});

// Delete a nurse by id
app.get('/delete-nurse/:id', (req, res) => {
    if (!req.session.adminLoggedIn) {
        return res.status(403).send("Unauthorized");
    }
    const nurseId = req.params.id;
    const sql = "DELETE FROM nurses WHERE id = ?";
    db.query(sql, [nurseId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Database error deleting nurse");
        }
        res.redirect('/admin');
    });
});

// Delete a contact request by id
app.get('/delete-contact/:id', (req, res) => {
    if (!req.session.adminLoggedIn) {
        return res.status(403).send("Unauthorized");
    }
    const requestId = req.params.id;
    const sql = "DELETE FROM contact_requests WHERE id = ?";
    db.query(sql, [requestId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Database error deleting contact request");
        }
        res.redirect('/admin');
    });
});

// Admin logout
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send("Error logging out");
        }
        res.redirect('/');
    });
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
