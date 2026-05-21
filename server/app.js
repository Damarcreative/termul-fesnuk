const express = require("express");
const cors = require("cors");
const db = require("./database");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/ping", (req, res) => {
    res.json({ status: "ok" });
});

app.get("/check/:type/:value", (req, res) => {
    const { type, value } = req.params;

    let sql;

    if (type === "id") {
        sql = `SELECT * FROM labels WHERE fb_user_id = ? LIMIT 1`;
    } else {
        sql = `SELECT * FROM labels WHERE fb_username = ? LIMIT 1`;
    }

    db.get(sql, [value], (err, row) => {
        if (err) {
            return res.json({
                exists: false
            });
        }

        res.json({
            exists: !!row,
            data: row || null
        });
    });
});

app.post("/check-batch", (req, res) => {
    const { identities } = req.body;
    if (!identities || identities.length === 0) return res.json([]);

    const ids = identities.filter(i => i.type === 'id').map(i => i.value);
    const usernames = identities.filter(i => i.type === 'username').map(i => i.value);

    let conditions = [];
    let params = [];

    if (ids.length > 0) {
        conditions.push(`fb_user_id IN (${ids.map(() => '?').join(',')})`);
        params.push(...ids);
    }

    if (usernames.length > 0) {
        conditions.push(`fb_username IN (${usernames.map(() => '?').join(',')})`);
        params.push(...usernames);
    }

    if (conditions.length === 0) return res.json([]);

    const sql = `SELECT fb_user_id, fb_username FROM labels WHERE ${conditions.join(' OR ')}`;

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json([]);
        res.json(rows);
    });
});

app.post("/save", (req, res) => {
    const {
        fb_user_id,
        fb_username,
        profile_url,
        comment_url,
        comment_text,
        display_name,
        label
    } = req.body;

    const sql = `
    INSERT INTO labels (
      fb_user_id,
      fb_username,
      profile_url,
      comment_url,
      comment_text,
      display_name,
      label
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

    db.run(sql, [
        fb_user_id,
        fb_username,
        profile_url,
        comment_url,
        comment_text,
        display_name,
        label
    ], function (err) {
        if (err) {
            return res.status(500).json({
                success: false,
                error: err.message
            });
        }

        res.json({
            success: true,
            id: this.lastID
        });
    });
});

app.delete("/remove/:type/:value", (req, res) => {
    const { type, value } = req.params;

    let sql;
    if (type === "id") {
        sql = `DELETE FROM labels WHERE fb_user_id = ?`;
    } else {
        sql = `DELETE FROM labels WHERE fb_username = ?`;
    }

    db.run(sql, [value], function (err) {
        if (err) {
            return res.status(500).json({
                success: false,
                error: err.message
            });
        }

        res.json({
            success: true,
            changes: this.changes
        });
    });
});


app.post("/clear", (req, res) => {
    db.run(`DELETE FROM labels`, [], (err) => {
        if (err) {
            return res.status(500).json({
                success: false
            });
        }

        res.json({
            success: true
        });
    });
});

app.get("/all", (req, res) => {
    db.all(`SELECT * FROM labels ORDER BY id DESC`, [], (err, rows) => {
        if (err) {
            return res.status(500).json([]);
        }

        res.json(rows);
    });
});

app.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
});