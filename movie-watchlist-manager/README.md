# Movie Watchlist Manager (MERN)

A starter MERN application for a Movie Watchlist Manager practical.

## Requirements
- Node.js 20+
- MongoDB Atlas test database
- Git

## 1. Configure the backend
Open a terminal in `backend/` and run:
```bash
npm install
```
Copy `.env.example` to `.env` and add your **test** MongoDB Atlas URI:
```bash
cp .env.example .env
```
Run:
```bash
npm run dev
```
The backend runs on `http://localhost:5000`.

## 2. Configure the frontend
Open a second terminal in `frontend/`:
```bash
npm install
npm run dev
```
Open the URL printed by Vite (usually `http://localhost:5173`).

## API endpoints
- `GET /api/health` — check server
- `GET /api/movies` — list/search/filter/paginate movies
- `POST /api/movies` — add a movie
- `GET /api/movies/stats` — dashboard statistics
- `GET /api/movies/watch-next` — recommended next movie
- `GET /api/movies/:id` — get one movie
- `PUT /api/movies/:id` — edit details or update status/rating
- `DELETE /api/movies/:id` — delete a movie

List query parameters: `status`, `genre`, `search`, `page`. Six movies are returned per page.

## Important
- Never commit real passwords, personal credentials, or a production database URI.
- If your exam instructions require `.env` to be present in GitHub, use only a disposable test database and dummy credentials. Prefer submitting `.env.example` unless the evaluator explicitly requires a real `.env`.
- The auto-generated movie code is created by the backend. For exam-level simultaneous requests, use a dedicated counter collection/atomic update in production; this starter uses a simple query-based sequence and is intended as a learning baseline.
- Add two screenshots of your running app to this README before submission.
## Features

- Add movies with title, genre, year, runtime, platform and priority.
- Track movies as To Watch, Watching or Watched.
- Rate watched movies from 1 to 10.
- Search and filter movies.
- View watchlist statistics.
- Find the next movie to watch.
- Edit and delete movies according to status rules.

## Technologies Used

- MongoDB Atlas
- Express.js
- React
- Node.js

## Installation

### Backend
cd backend
npm install
npm start

### Frontend
cd frontend
npm install
npm run dev