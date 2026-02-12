const express = require("express");
const sqlite3 = require("sqlite3").verbose();
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
    date TEXT,
    time_in TEXT,
    time_out TEXT
)
`);

// CLOCK IN
app.post("/clockin", (req, res) => {
    const { name, date, time } = req.body;

    db.run(
        "INSERT INTO logs (name, date, time_in) VALUES (?, ?, ?)",
        [name, date, time],
        function (err) {
            if (err) return res.status(500).json(err);
            res.json({ message: "Clocked In" });
        }
    );
});

// CLOCK OUT
app.post("/clockout", (req, res) => {
    const { name, time } = req.body;

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

// DELETE
app.delete("/delete/:id", (req, res) => {
    db.run("DELETE FROM logs WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json(err);
        res.json({ message: "Deleted" });
    });
});

// DOWNLOAD CSV (12hr format + computed hours)
app.get("/download", (req, res) => {
    db.all("SELECT * FROM logs", [], (err, rows) => {
        if (err) return res.status(500).json(err);

        let csv = "ID,Name,Date,Time In,Time Out,Total Hours,Late\n";

        rows.forEach(row => {

            let totalHours = 0;
            let late = "No";

            if (row.time_in && row.time_out) {
                const inTime = new Date(`1970-01-01T${row.time_in}:00`);
                const outTime = new Date(`1970-01-01T${row.time_out}:00`);
                totalHours = ((outTime - inTime) / (1000 * 60 * 60)).toFixed(2);
            }

            if (row.time_in && row.time_in > "08:00") {
                late = "Yes";
            }

            function to12Hour(time) {
                if (!time) return "";
                let [hours, minutes] = time.split(":");
                hours = parseInt(hours);
                const ampm = hours >= 12 ? "PM" : "AM";
                hours = hours % 12;
                hours = hours ? hours : 12;
                return `${hours}:${minutes} ${ampm}`;
            }

            csv += `${row.id},${row.name},${row.date},${to12Hour(row.time_in)},${to12Hour(row.time_out)},${totalHours},${late}\n`;
        });

        res.header("Content-Type", "text/csv");
        res.attachment("time_records.csv");
        res.send(csv);
    });
});

app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
