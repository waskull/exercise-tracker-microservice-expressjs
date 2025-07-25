import express from "express";
import cors from "cors"
import sqlite3 from "sqlite3";
import dotenv from "dotenv/config.js";
import { parse } from "dotenv";
const app = express()

app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/index.html');
});

app.get('/api/users', async (req, res) => {
  const db = new sqlite3.Database("./database.db");
  db.serialize(() => {
    db.all(`SELECT * FROM users`, (err, rows) => {
      if (err) console.error(err);
      else { console.log(rows); return res.status(200).json(rows); }
    });
  });
  db.close();
});

app.get('/api/users/:_id/exercises', async (req, res) => {
  const db = new sqlite3.Database("./database.db");
  const id = parseInt(req.params._id);
  db.serialize(() => {
    db.all(`SELECT username,exercises._id, duration, date, description FROM exercises join users on users._id = exercises.user_id where user_id = ${id}`, (err, rows) => {
      if (err) console.error(err);
      else { console.log(rows); return res.status(200).json(rows); }
    });
  });
  db.close();
});

app.get('/api/users/:_id/logs', async (req, res) => {
  const db = new sqlite3.Database("./database.db");
  const id = parseInt(req.params._id);
  db.serialize(() => {
    db.all(`SELECT COUNT(*) as count, duration, description, date, username FROM exercises join users on users._id = exercises.user_id where user_id = ${id}`, (err, rows) => {
      if (err) console.error(err);
      else {
        const username = rows[0].username;
        const count = rows[0].count;
        for (let i = 0; i < rows.length; i++) {
          delete rows[i].username;
          delete rows[i].count;
        }
        return res.status(200).json({ "username": username, "count": count, "id": id, "log": rows });
      }
    });
  });
  db.close();
});

app.post('/api/users', async (req, res) => {
  const username = req.body.username;
  if (!username) return res.status(400).json({ "error": "Nombre de usuario requerido" });
  const db = new sqlite3.Database("./database.db");
  db.serialize(() => {
    db.all('SELECT * FROM users where username = ? lIMIT 1', username, (err, rows) => {
      if (err) { console.error(err); return res.status(400).json({ "error": "El nombre de usuario ya existe" }); }
      if (rows && rows?.length > 0) {
        const result = { "username": rows[0].username, "_id": rows[0]._id };
        db.close();
        return res.status(400).json({ result });
      }
      db.run('INSERT INTO users (username) VALUES (?)', username, function (err, result) {
        if (err) { console.error(err); return res.status(400).json({ "error": err }); }
        else {
          console.log("res: ",result);
          const json = { "username": result[0].username, "_id": result[0]._id };
          db.close();
          return res.status(200).json(json);
        }
      });

    });
  });

});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
