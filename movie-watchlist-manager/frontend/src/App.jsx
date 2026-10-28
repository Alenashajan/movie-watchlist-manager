import { useCallback, useEffect, useState } from 'react';
import { Film, Plus, Search, Clapperboard, Clock3, Star, Trash2, Pencil, Play, RefreshCw, X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const YEAR = new Date().getFullYear();
const GENRES = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller'];
const PLATFORMS = ['Netflix', 'Prime Video', 'Hotstar', 'Theatre', 'Other'];
const EMPTY = { title: '', genre: 'Action', releaseYear: YEAR, runtime: 120, platform: 'Netflix', priority: 3 };
const transitions = { 'To Watch': ['Watching', 'Watched'], 'Watching': ['Watched', 'To Watch'], 'Watched': [] };

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || `Request failed (${response.status})`);
  return body.data;
}

function Stat({ icon: Icon, label, value, detail }) {
  return <div className="stat"><div className="stat-icon"><Icon size={18}/></div><div><p>{label}</p><strong>{value}</strong><small>{detail}</small></div></div>;
}

function MovieCard({ movie, onEdit, onDelete, onStatus }) {
  return <article className="movie-card">
    <div className={`poster poster-${movie.genre.toLowerCase().replace(/[^a-z]/g, '')}`}>
      <div className="poster-top"><span className="movie-code">{movie.movieCode}</span><span className={`status status-${movie.status.toLowerCase().replaceAll(' ', '-')}`}>{movie.status}</span></div>
      <Film size={42} strokeWidth={1.15}/>
      <span className="poster-genre">{movie.genre}</span>
    </div>
    <div className="movie-body">
      <div className="movie-title-row"><h3>{movie.title}</h3><span className="priority">P{movie.priority}</span></div>
      <p className="meta">{movie.releaseYear} <span>·</span> {movie.runtime} min <span>·</span> {movie.platform}</p>
      <div className="movie-footer">
        <div className="rating">{movie.rating ? <><Star size={15} fill="currentColor"/> {movie.rating}/10</> : <span className="no-rating">Not rated</span>}</div>
        <div className="actions">
          <button className="icon-btn" title="Edit movie" onClick={() => onEdit(movie)}><Pencil size={15}/></button>
          {movie.status !== 'Watched' && <select aria-label={`Change status for ${movie.title}`} value={movie.status} onChange={e => onStatus(movie, e.target.value)}><option value={movie.status}>{movie.status}</option>{transitions[movie.status].map(s => <option key={s} value={s}>{s}</option>)}</select>}
          <button className="icon-btn danger" title={movie.status === 'Watching' ? 'Cannot delete while Watching' : 'Delete movie'} disabled={movie.status === 'Watching'} onClick={() => onDelete(movie)}><Trash2 size={15}/></button>
        </div>
      </div>
    </div>
  </article>;
}

function MovieForm({ initial, onClose, onSave, busy, error }) {
  const [form, setForm] = useState(initial || EMPTY);
  const [rating, setRating] = useState(initial?.rating || 8);
  const [formError, setFormError] = useState('');
  const editing = Boolean(initial?._id);
  const set = (key, value) => setForm(old => ({ ...old, [key]: value }));
  const submit = async e => {
    e.preventDefault();
    setFormError('');
    const year = Number(form.releaseYear), runtime = Number(form.runtime), priority = Number(form.priority);
    if (!String(form.title).trim()) return setFormError('Please enter a movie title.');
    if (!Number.isInteger(year) || year < 1950 || year > YEAR) return setFormError(`Release year must be between 1950 and ${YEAR}.`);
    if (!Number.isInteger(runtime) || runtime < 30 || runtime > 300) return setFormError('Runtime must be between 30 and 300 minutes.');
    if (!Number.isInteger(priority) || priority < 1 || priority > 5) return setFormError('Priority must be between 1 and 5.');
    try { await onSave({ ...form, title: form.title.trim(), releaseYear: year, runtime, priority, ...(initial?.status === 'Watched' ? { rating: Number(rating) } : {}) }); }
    catch (err) { setFormError(err.message); }
  };
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><section className="modal">
    <div className="modal-head"><div><span className="eyebrow">{editing ? 'UPDATE YOUR LIBRARY' : 'GROW YOUR LIBRARY'}</span><h2>{editing ? 'Edit movie' : 'Add a movie'}</h2></div><button className="icon-btn" onClick={onClose}><X size={19}/></button></div>
    <form onSubmit={submit}>
      <label className="field full">Movie title<input value={form.title} maxLength="120" onChange={e => set('title', e.target.value)} placeholder="e.g. Interstellar" required /></label>
      <div className="form-grid">
        <label className="field">Genre<select value={form.genre} onChange={e => set('genre', e.target.value)}>{GENRES.map(x => <option key={x}>{x}</option>)}</select></label>
        <label className="field">Release year<input type="number" min="1950" max={YEAR} disabled={editing} value={form.releaseYear} onChange={e => set('releaseYear', e.target.value)} required /></label>
        <label className="field">Runtime (minutes)<input type="number" min="30" max="300" value={form.runtime} onChange={e => set('runtime', e.target.value)} required /></label>
        <label className="field">Streaming platform<select value={form.platform} onChange={e => set('platform', e.target.value)}>{PLATFORMS.map(x => <option key={x}>{x}</option>)}</select></label>
      </div>
      <div className="priority-field"><div><label className="field-label">Watch priority</label><small>5 is your top priority</small></div><div className="priority-picks">{[1,2,3,4,5].map(n => <button type="button" key={n} className={Number(form.priority) === n ? 'picked' : ''} onClick={() => set('priority', n)}>{n}</button>)}</div></div>
      {editing && initial.status === 'Watched' && <label className="field">Rating (1–10)<input type="number" min="1" max="10" value={rating} onChange={e => setRating(e.target.value)} required /></label>}
      {(formError || error) && <div className="error-msg">{formError || error}</div>}
      <div className="modal-actions"><button type="button" className="btn secondary" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : <><Plus size={16}/> Add movie</>}</button></div>
    </form>
  </section></div>;
}

export default function App() {
  const [movies, setMovies] = useState([]);
  const [stats, setStats] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [genre, setGenre] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [watchNext, setWatchNext] = useState(null);
  const [apiError, setApiError] = useState('');

  const load = useCallback(async () => {
    try {
      setApiError('');
      const query = new URLSearchParams({ page: String(page) });
      if (status) query.set('status', status);
      if (genre) query.set('genre', genre);
      if (search.trim()) query.set('search', search.trim());
      const [list, dashboard] = await Promise.all([request(`/api/movies?${query}`), request('/api/movies/stats')]);
      setMovies(list.movies || []); setPages(Math.max(1, list.totalPages || 1)); setTotal(list.totalMovies || 0); setStats(dashboard);
    } catch (e) { setApiError(e.message); }
  }, [page, status, genre, search]);

  useEffect(() => { load(); }, [load]);

  const save = async data => {
    setBusy(true); setError('');
    try {
      if (data._id) await request(`/api/movies/${data._id}`, { method: 'PUT', body: JSON.stringify(data) });
      else await request('/api/movies', { method: 'POST', body: JSON.stringify(data) });
      setModal(null); setNotice(data._id ? 'Movie updated successfully.' : 'Movie added to your watchlist.'); setPage(1); await load();
    } catch (e) { setError(e.message); throw e; }
    finally { setBusy(false); }
  };

  const updateStatus = async (movie, next) => {
    try {
      let body = { status: next };
      if (next === 'Watched') {
        const raw = window.prompt(`Rate "${movie.title}" from 1 to 10:`, movie.rating || '8');
        if (raw === null) { await load(); return; }
        const rating = Number(raw);
        if (!Number.isInteger(rating) || rating < 1 || rating > 10) { window.alert('Please enter a whole number from 1 to 10.'); await load(); return; }
        body.rating = rating;
      }
      await request(`/api/movies/${movie._id}`, { method: 'PUT', body: JSON.stringify(body) });
      setNotice(`Status changed to ${next}.`); await load();
    } catch (e) { window.alert(e.message); await load(); }
  };

  const deleteMovie = async movie => {
    if (!window.confirm(`Delete "${movie.title}" from your watchlist?`)) return;
    try { await request(`/api/movies/${movie._id}`, { method: 'DELETE' }); setNotice('Movie deleted.'); await load(); }
    catch (e) { window.alert(e.message); }
  };

  const pickNext = async () => {
    setWatchNext(null);
    try { setWatchNext(await request('/api/movies/watch-next')); }
    catch (e) { window.alert(e.message); }
  };

  return <main className="app-shell">
    <header className="topbar"><a className="brand" href="#"><span className="brand-icon"><Clapperboard size={21}/></span><span>reel<span className="brand-accent">list</span><small>YOUR PERSONAL MOVIE TRACKER</small></span></a><div className="top-actions"><span className="library-count"><Film size={15}/>{total} movies</span><button className="btn primary top-add" onClick={() => {setError('');setModal(EMPTY);}}><Plus size={16}/> Add movie</button></div></header>
    <section className="hero"><div className="hero-copy"><span className="eyebrow"><Sparkles size={13}/> YOUR NEXT FAVORITE FILM AWAITS</span><h1>Less scrolling.<br/><em>More watching.</em></h1><p>Keep your watchlist in check, pick your next film, and keep track of the stories worth remembering.</p><button className="btn watch-btn" onClick={pickNext}><Play size={16} fill="currentColor"/> What should I watch next?</button></div><div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="film-art"><Film size={86} strokeWidth={1}/><span>NOW<br/>SHOWING</span></div><div className="floating-tag tag-top">YOUR PERSONAL CINEMA</div><div className="floating-tag tag-bottom">✦ CURATED BY YOU</div></div></section>
    {watchNext && <section className="next-pick"><div className="next-icon"><Play size={20} fill="currentColor"/></div><div><span className="eyebrow">YOUR NEXT PICK</span><h3>{watchNext.title}</h3><p>{watchNext.genre} · {watchNext.runtime} min · Priority {watchNext.priority} · {watchNext.movieCode}</p></div><button className="icon-btn" onClick={() => setWatchNext(null)}><X size={18}/></button></section>}
    {notice && <div className="notice"><span>{notice}</span><button onClick={() => setNotice('')}><X size={15}/></button></div>}
    <section className="stats-grid">
      <Stat icon={Film} label="IN YOUR LIST" value={stats ? Object.values(stats.totalByStatus).reduce((a,b)=>a+b,0) : '—'} detail="Movies collected"/>
      <Stat icon={Clock3} label="HOURS WATCHED" value={stats?.totalHoursWatched ?? '—'} detail="Time well spent"/>
      <Stat icon={Star} label="YOUR AVERAGE" value={stats ? `${Number(stats.averageRating).toFixed(1)}/10` : '—'} detail="Watched movie ratings"/>
      <Stat icon={Clapperboard} label="TOP GENRE" value={stats?.mostWatchedGenre || '—'} detail="Most watched category"/>
    </section>
    <section className="collection">
      <div className="section-heading"><div><span className="eyebrow">THE COLLECTION</span><h2>Your watchlist<span className="heading-dot">.</span></h2><p>All your stories, in one place.</p></div><button className="btn secondary refresh-btn" onClick={load}><RefreshCw size={15}/> Refresh</button></div>
      {stats && <div className="status-summary">{Object.entries(stats.totalByStatus).map(([s,n])=><span key={s}><i className={`dot dot-${s.toLowerCase().replaceAll(' ','-')}`}/>{s}<b>{n}</b></span>)}</div>}
      <div className="filters"><label className="search-box"><Search size={17}/><input value={search} onChange={e => {setSearch(e.target.value);setPage(1);}} placeholder="Search movies…" /></label><select aria-label="Filter by status" value={status} onChange={e => {setStatus(e.target.value);setPage(1);}}><option value="">All statuses</option>{['To Watch','Watching','Watched'].map(x=><option key={x}>{x}</option>)}</select><select aria-label="Filter by genre" value={genre} onChange={e => {setGenre(e.target.value);setPage(1);}}><option value="">All genres</option>{GENRES.map(x=><option key={x}>{x}</option>)}</select></div>
      {apiError ? <div className="empty-state"><Film size={32}/><h3>Couldn't load your movies</h3><p>{apiError}. Check that the backend is running and MongoDB is configured.</p><button className="btn primary" onClick={load}>Try again</button></div> : movies.length ? <div className="movie-grid">{movies.map(movie=><MovieCard key={movie._id} movie={movie} onEdit={m=>{setError('');setModal({...m});}} onDelete={deleteMovie} onStatus={updateStatus}/>)}</div> : <div className="empty-state"><Film size={32}/><h3>Your next movie night starts here</h3><p>Add a movie you’ve been meaning to watch. Your future self will thank you.</p><button className="btn primary" onClick={() => {setError('');setModal(EMPTY);}}><Plus size={16}/> Add your first movie</button></div>}
      <div className="pagination"><span>Page {page} of {pages} <i>·</i> {total} results</span><div><button className="icon-btn" disabled={page<=1} onClick={()=>setPage(p=>p-1)}><ChevronLeft size={18}/></button><button className="icon-btn" disabled={page>=pages} onClick={()=>setPage(p=>p+1)}><ChevronRight size={18}/></button></div></div>
    </section>
    <footer><a className="brand footer-brand" href="#"><span className="brand-icon"><Clapperboard size={17}/></span><span>reel<span className="brand-accent">list</span></span></a><span>Made for movie lovers, one film at a time.</span></footer>
    {modal && <MovieForm key={modal._id || 'new'} initial={modal._id ? modal : null} onClose={() => setModal(null)} onSave={save} busy={busy} error={error}/>}
  </main>;
}
