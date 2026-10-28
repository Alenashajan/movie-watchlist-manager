import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import Movie, { GENRES, PLATFORMS, STATUSES } from './models/Movie.js';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const currentYear = new Date().getFullYear();
const reply = (res, status, success, message, data = null) =>
  res.status(status).json({ success, message, data });

app.get('/api/health', (_req, res) => reply(res, 200, true, 'API is running', { status: 'ok' }));

function validateMovie(body, editing = false) {
  const errors = [];
  if (!editing || body.title !== undefined) {
    if (!String(body.title || '').trim()) errors.push('Title is required.');
  }
  if (!editing || body.genre !== undefined) {
    if (!GENRES.includes(body.genre)) errors.push('Choose a valid genre.');
  }
  if (!editing || body.releaseYear !== undefined) {
    const year = Number(body.releaseYear);
    if (!Number.isInteger(year) || year < 1950 || year > currentYear) errors.push(`Release year must be from 1950 to ${currentYear}.`);
  }
  if (!editing || body.runtime !== undefined) {
    const runtime = Number(body.runtime);
    if (!Number.isInteger(runtime) || runtime < 30 || runtime > 300) errors.push('Runtime must be between 30 and 300 minutes.');
  }
  if (!editing || body.platform !== undefined) {
    if (!PLATFORMS.includes(body.platform)) errors.push('Choose a valid platform.');
  }
  if (!editing || body.priority !== undefined) {
    const p = Number(body.priority);
    if (!Number.isInteger(p) || p < 1 || p > 5) errors.push('Priority must be from 1 to 5.');
  }
  return errors;
}

app.get('/api/movies/stats', async (_req, res, next) => {
  try {
    const movies = await Movie.find().lean();
    const statusCounts = Object.fromEntries(STATUSES.map(s => [s, movies.filter(m => m.status === s).length]));
    const watched = movies.filter(m => m.status === 'Watched');
    const totalRuntime = watched.reduce((sum, m) => sum + m.runtime, 0);
    const ratings = watched.filter(m => Number.isFinite(m.rating)).map(m => m.rating);
    const genreCounts = {};
    watched.forEach(m => genreCounts[m.genre] = (genreCounts[m.genre] || 0) + 1);
    const topGenre = Object.entries(genreCounts).sort((a,b) => b[1] - a[1])[0]?.[0] || '—';
    reply(res, 200, true, 'Statistics loaded', {
      totalByStatus: statusCounts,
      totalHoursWatched: Math.round(totalRuntime / 60 * 10) / 10,
      averageRating: ratings.length ? Math.round(ratings.reduce((a,b) => a+b, 0) / ratings.length * 10) / 10 : 0,
      mostWatchedGenre: topGenre
    });
  } catch (e) { next(e); }
});

app.get('/api/movies/watch-next', async (_req, res, next) => {
  try {
    const movie = await Movie.findOne({ status: 'To Watch' }).sort({ priority: -1, runtime: 1, createdAt: 1 });
    if (!movie) return reply(res, 404, false, 'No movies are waiting to be watched.', null);
    reply(res, 200, true, 'Your next movie', movie);
  } catch (e) { next(e); }
});

app.get('/api/movies', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
    const filter = {};
    if (req.query.status && STATUSES.includes(req.query.status)) filter.status = req.query.status;
    if (req.query.genre && GENRES.includes(req.query.genre)) filter.genre = req.query.genre;
    if (req.query.search) filter.title = { $regex: String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    const totalMovies = await Movie.countDocuments(filter);
    const totalPages = Math.ceil(totalMovies / 6);
    const movies = await Movie.find(filter).sort({ status: 1, priority: -1, runtime: 1, createdAt: -1 }).skip((page - 1) * 6).limit(6);
    reply(res, 200, true, 'Movies fetched successfully', { movies, totalMovies, totalPages, currentPage: page });
  } catch (e) { next(e); }
});

app.post('/api/movies', async (req, res, next) => {
  try {
    const errors = validateMovie(req.body);
    if (errors.length) return reply(res, 400, false, errors.join(' '));
    const title = String(req.body.title).trim();
    const releaseYear = Number(req.body.releaseYear);
    const duplicate = await Movie.findOne({ title: { $regex: `^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }, releaseYear });
    if (duplicate) return reply(res, 409, false, 'A movie with this title and release year already exists.');
    const last = await Movie.findOne({ releaseYear }).sort({ movieCode: -1 }).select('movieCode');
    const sequence = last ? Number(last.movieCode.split('-').at(-1)) + 1 : 1;
    const movieCode = `MV-${releaseYear}-${String(sequence).padStart(3, '0')}`;
    const movie = await Movie.create({
      movieCode, title, genre: req.body.genre, releaseYear,
      runtime: Number(req.body.runtime), platform: req.body.platform,
      priority: Number(req.body.priority), status: 'To Watch'
    });
    reply(res, 201, true, 'Movie added successfully', movie);
  } catch (e) {
    if (e.code === 11000) return reply(res, 409, false, 'A movie with this title and release year already exists.');
    next(e);
  }
});

app.get('/api/movies/:id', async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return reply(res, 404, false, 'Movie not found.');
    reply(res, 200, true, 'Movie loaded', movie);
  } catch (e) { next(e); }
});

app.put('/api/movies/:id', async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return reply(res, 404, false, 'Movie not found.');
    const body = req.body;
    if ('movieCode' in body || 'releaseYear' in body) return reply(res, 400, false, 'Movie Code and Release Year cannot be edited.');
    const hasStatus = Object.prototype.hasOwnProperty.call(body, 'status');
    const hasRating = Object.prototype.hasOwnProperty.call(body, 'rating');
    if (hasStatus) {
      const allowed = {
        'To Watch': ['Watching', 'Watched'],
        'Watching': ['Watched', 'To Watch'],
        'Watched': []
      };
      if (!allowed[movie.status].includes(body.status)) return reply(res, 400, false, `Invalid status transition: ${movie.status} cannot change to ${body.status}.`);
      if (body.status === 'Watched') {
        const rating = Number(body.rating);
        if (!Number.isInteger(rating) || rating < 1 || rating > 10) return reply(res, 400, false, 'A rating from 1 to 10 is required when marking a movie Watched.');
        movie.rating = rating;
        movie.watchedDate = new Date();
      } else {
        if (hasRating && body.rating !== null && body.rating !== '') return reply(res, 400, false, 'A rating is allowed only for Watched movies.');
        movie.rating = null;
        movie.watchedDate = null;
      }
      movie.status = body.status;
    } else if (hasRating) {
      if (movie.status !== 'Watched') return reply(res, 400, false, 'A rating is allowed only for Watched movies.');
      const rating = Number(body.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 10) return reply(res, 400, false, 'Rating must be from 1 to 10.');
      movie.rating = rating;
    }
    const errors = validateMovie(body, true);
    if (errors.length) return reply(res, 400, false, errors.join(' '));
    for (const key of ['title', 'genre', 'runtime', 'platform', 'priority']) {
      if (body[key] !== undefined) movie[key] = key === 'title' ? String(body[key]).trim() : (['runtime','priority'].includes(key) ? Number(body[key]) : body[key]);
    }
    await movie.save();
    reply(res, 200, true, 'Movie updated successfully', movie);
  } catch (e) {
    if (e.code === 11000) return reply(res, 409, false, 'A movie with this title and release year already exists.');
    next(e);
  }
});

app.delete('/api/movies/:id', async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return reply(res, 404, false, 'Movie not found.');
    if (movie.status === 'Watching') return reply(res, 400, false, 'Movies currently being watched cannot be deleted.');
    await movie.deleteOne();
    reply(res, 200, true, 'Movie deleted successfully', movie);
  } catch (e) { next(e); }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.name === 'ValidationError' || err.name === 'CastError') return reply(res, 400, false, err.message);
  reply(res, 500, false, 'Internal server error.');
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
