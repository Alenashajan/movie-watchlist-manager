import mongoose from 'mongoose';

export const GENRES = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller'];
export const PLATFORMS = ['Netflix', 'Prime Video', 'Hotstar', 'Theatre', 'Other'];
export const STATUSES = ['To Watch', 'Watching', 'Watched'];

const movieSchema = new mongoose.Schema({
  movieCode: { type: String, required: true, unique: true, immutable: true },
  title: { type: String, required: true, trim: true },
  genre: { type: String, required: true, enum: GENRES },
  releaseYear: { type: Number, required: true, min: 1950, immutable: true },
  runtime: { type: Number, required: true, min: 30, max: 300 },
  platform: { type: String, required: true, enum: PLATFORMS },
  priority: { type: Number, required: true, min: 1, max: 5 },
  status: { type: String, enum: STATUSES, default: 'To Watch', required: true },
  rating: { type: Number, min: 1, max: 10, default: null },
  watchedDate: { type: Date, default: null }
}, { timestamps: true });

movieSchema.index({ title: 1, releaseYear: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
export default mongoose.model('Movie', movieSchema);
