const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const { Parser } = require("json2csv");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

const db = new sqlite3.Database("./database.db");

// CREATE TABLE
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

// CLOCK IN
app.post("/clockin", (req, res) => {
    const { name, device, date, time } = req.body;

    db.run(
        "INSERT INTO logs (name, device, date, time_in) VALUES (?, ?, ?, ?)",
        [name, device, date, time],
        function (err) {
            if (err) return res.status(500).json(err);
            res.json({ message: "Clocked In" });
        }
    );
});

// CLOCK OUT
app.post("/clockout", (req, res) => {
    const { name, device, time } = req.body;

    db.run(
        `UPDATE logs 
         SET time_out = ? 
         WHERE id = (
             SELECT id FROM logs 
             WHERE name = ? AND time_out IS NULL 
             ORDER BY id DESC LIMIT 1
         )`,
        [time, name],
        function (err) {
            if (err) return res.status(500).json(err);
            res.json({ message: "Clocked Out" });
        }
    );
});

// GET LOGS
app.get("/logs", (req, res) => {
    db.all("SELECT * FROM logs ORDER BY id DESC", [], (err, rows) => {
        if (err) return res.status(500).json(err);
        res.json(rows);
    });
});

// DELETE RECORD
app.delete("/delete/:id", (req, res) => {
    const id = req.params.id;

    db.run("DELETE FROM logs WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json(err);
        res.json({ message: "Deleted" });
    });
});

// DOWNLOAD CSV
app.get("/download", (req, res) => {
    db.all("SELECT * FROM logs", [], (err, rows) => {
        if (err) return res.status(500).json(err);

        const fields = ["id", "name", "device", "date", "time_in", "time_out"];
        const parser = new Parser({ fields });
        const csv = parser.parse(rows);

        res.header("Content-Type", "text/csv");
        res.attachment("time_records.csv");
        res.send(csv);
    });
});

app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
