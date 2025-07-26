import express from "express";
import cors from "cors"
import sqlite3 from "sqlite3";
import { neon } from "@neondatabase/serverless";
const app = express();
import dotenv from "dotenv";
dotenv.config();

app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/index.html');
});

app.get('/api/users', async (req, res) => {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    const response = await sql`select username, CAST(id AS varchar) as _id from public.users`;
    return res.status(200).json(response) || res.json([]);
  }
  catch (err) { console.log(err); return res.status(500).json({ "error": err }); }
});

app.get('/api/users/:_id/exercises', async (req, res) => {
  try {
    const id = parseInt(req.params._id);
    const sql = neon(`${process.env.DATABASE_URL}`);
    const response = await sql`select username,public.exercises._id, duration, date, description from public.exercises join public.users on public.users.id = public.exercises.user_id where public.exercises.user_id = ${id}`;
    return res.status(200).json(response);
  } catch (err) { console.log(err); return res.status(500).json({ "error": err }); }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const from = req.query.from || new Date(0).toISOString().substring(0, 10);
    const to = req.query.to || new Date(Date.now()).toISOString().substring(0, 10);
    const limit = Number(req.query.limit) || 1000;
    console.log(from, to, limit);
    const id = parseInt(req.params._id);
    const sql = neon(`${process.env.DATABASE_URL}`);
    const response = await sql`select public.users.username,public.exercises._id, public.exercises.duration, public.exercises.date, public.exercises.description from public.exercises join public.users on public.users.id = public.exercises.user_id where public.exercises.user_id = ${id} and public.exercises.date >= ${from} and public.exercises.date <= ${to} limit ${limit}`;
    console.log(response);
    const username = response[0]?.username;
    for (let i = 0; i < response?.length; i++) {
      delete response[i]?.username;
      response[i].date = new Date(response[i].date).toDateString();
    }
    return res.status(200).json({ username: username, count: response?.length || 0, _id: String(id), log: response });
  } catch (err) { console.log(err); return res.status(500).json({ "error": err }); }
});

app.post('/api/users', async (req, res) => {
  const username = req.body.username;
  if (!username) return res.status(400).json({ "error": "Nombre de usuario requerido" });
  const sql = neon(`${process.env.DATABASE_URL}`);
  const userExists = await sql`select username, id from public.users where username = ${username}`;
  if (userExists.length > 0) return res.status(400).json({ _id: String(userExists[0].id), username: userExists[0].username });
  const result = await sql`insert into public.users (username) values (${username}) returning id, username`;
  return res.status(200).json({ username: username, _id: result[0].id });
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  const id = parseInt(req.params._id, 10);
  const description = req.body.description;
  let date = req.body.date;
  const duration = parseInt(req.body.duration, 10);
  if (!date) date = new Date().toDateString();
  if (!id) return res.status(400).json({ "error": "Nombre de usuario requerido" });
  if (!duration) return res.status(400).json({ "error": "Duración requerida" });
  if (!description) return res.status(400).json({ "error": "Descripción requerida" });
  const sql = neon(`${process.env.DATABASE_URL}`);
  const userExists = await sql`select id, username from public.users where id = ${id}`;
  if (userExists.length === 0) return res.status(400).json({ error: "El usuario no existe" });
  const result = await sql`insert into public.exercises (user_id, duration, date, description) values (${id}, ${duration}, ${date}, ${description}) returning _id, user_id, duration, date, description`;
  console.log(result);
  result.username = userExists[0].username;
  return res.status(200).json({ username: userExists[0].username, description: result[0].description, duration: result[0].duration, date: result[0].date, _id: String(result[0].user_id), });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
