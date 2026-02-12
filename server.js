const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static("public"));

const db = new sqlite3.Database("time_logs.db");

// Create table
db.run(`
CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    device TEXT,
    date TEXT,
    time_in TEXT,
    time_out TEXT
)
`);

// Clock In
app.post("/clockin", (req, res) => {
    const { name, device, date, time } = req.body;

    db.run(
        `INSERT INTO logs (name, device, date, time_in)
         VALUES (?, ?, ?, ?)`,
        [name, device, date, time],
        (err) => {
            if (err) return res.status(500).json(err);
            res.json({ message: "Clocked In" });
        }
    );
});

// Clock Out
app.post("/clockout", (req, res) => {
    const { name, device, time } = req.body;

    db.run(
        `UPDATE logs
         SET time_out = ?
         WHERE name = ? AND device = ? AND time_out IS NULL`,
        [time, name, device],
        (err) => {
            if (err) return res.status(500).json(err);
            res.json({ message: "Clocked Out" });
        }
    );
});

// Get Logs
app.get("/logs", (req, res) => {
    db.all("SELECT * FROM logs ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json(err);
        res.json(rows);
    });
});

// Required for Render
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
