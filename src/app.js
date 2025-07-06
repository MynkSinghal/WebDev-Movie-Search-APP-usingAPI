require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const TMDB_API_KEY = process.env.TMDB_API_KEY; // Your API key as fallback
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Add security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Helper function to make TMDB API requests
async function tmdbRequest(endpoint, params = {}) {
    try {
        const url = `${TMDB_BASE_URL}${endpoint}`;
        
        // Use Read Access Token if available, otherwise use API key
        const accessToken = process.env.TMDB_ACCESS_TOKEN;
        
        const config = {
            headers: {},
            params: {}
        };
        
        if (accessToken) {
            // Use Bearer token authentication (preferred method)
            config.headers['Authorization'] = `Bearer ${accessToken}`;
            config.params = params;
        } else {
            // Fallback to API key method
            config.params = {
                api_key: TMDB_API_KEY,
                ...params
            };
        }
        
        const response = await axios.get(url, config);
        return response.data;
    } catch (error) {
        console.error('TMDB API Error:', error.response?.data || error.message);
        throw error;
    }
}

app.get('/', async (req, res) => {
    try {
        // Get trending and popular movies for the homepage
        const trendingMovies = await tmdbRequest('/trending/movie/day');
        const popularMovies = await tmdbRequest('/movie/popular');
        
        res.render('index', { 
            error: null, 
            trending: trendingMovies.results.slice(0, 8),
            popular: popularMovies.results.slice(0, 8),
            imageBaseUrl: TMDB_IMAGE_BASE_URL
        });
    } catch (error) {
        console.error('Error fetching homepage data:', error);
        res.render('index', { 
            error: null, 
            trending: [],
            popular: [],
            imageBaseUrl: TMDB_IMAGE_BASE_URL
        });
    }
});

app.post('/search', async (req, res) => {
    const movieName = req.body.movieName;
    if (!movieName || movieName.trim() === '') {
        return res.render('index', { 
            error: 'Please enter a movie name',
            trending: [],
            popular: [],
            imageBaseUrl: TMDB_IMAGE_BASE_URL
        });
    }

    try {
        const searchResults = await tmdbRequest('/search/movie', {
            query: movieName.trim(),
            include_adult: false
        });

        if (searchResults.results && searchResults.results.length > 0) {
            res.render('movie', { 
                movies: searchResults.results,
                searchQuery: movieName,
                totalResults: searchResults.total_results,
                imageBaseUrl: TMDB_IMAGE_BASE_URL,
                error: null
            });
        } else {
            res.render('index', { 
                error: `No movies found for "${movieName}"`,
                trending: [],
                popular: [],
                imageBaseUrl: TMDB_IMAGE_BASE_URL
            });
        }
    } catch (error) {
        console.error('Search Error:', error.response?.data || error.message);
        res.render('index', { 
            error: 'An error occurred while searching for movies',
            trending: [],
            popular: [],
            imageBaseUrl: TMDB_IMAGE_BASE_URL
        });
    }
});

app.get('/movie/:id', async (req, res) => {
    const movieId = req.params.id;
    
    try {
        // Get movie details, credits, and videos
        const [movieDetails, credits, videos, similar] = await Promise.all([
            tmdbRequest(`/movie/${movieId}`),
            tmdbRequest(`/movie/${movieId}/credits`),
            tmdbRequest(`/movie/${movieId}/videos`),
            tmdbRequest(`/movie/${movieId}/similar`)
        ]);

        res.render('movieDetail', {
            movie: movieDetails,
            cast: credits.cast.slice(0, 10), // Top 10 cast members
            crew: credits.crew.filter(person => 
                ['Director', 'Producer', 'Writer', 'Screenplay'].includes(person.job)
            ),
            videos: videos.results.filter(video => 
                video.type === 'Trailer' && video.site === 'YouTube'
            ).slice(0, 3),
            similar: similar.results.slice(0, 6),
            imageBaseUrl: TMDB_IMAGE_BASE_URL,
            error: null
        });
    } catch (error) {
        console.error('Movie Detail Error:', error.response?.data || error.message);
        res.render('index', { 
            error: 'Movie not found or an error occurred',
            trending: [],
            popular: [],
            imageBaseUrl: TMDB_IMAGE_BASE_URL
        });
    }
});

// API endpoint for search suggestions (for autocomplete)
app.get('/api/search/:query', async (req, res) => {
    try {
        const searchResults = await tmdbRequest('/search/movie', {
            query: req.params.query,
            include_adult: false
        });
        
        res.json({
            results: searchResults.results.slice(0, 5).map(movie => ({
                id: movie.id,
                title: movie.title,
                year: movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A',
                poster: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : null
            }))
        });
    } catch (error) {
        res.status(500).json({ error: 'Search failed' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('index', { 
        error: 'Something broke!',
        trending: [],
        popular: [],
        imageBaseUrl: TMDB_IMAGE_BASE_URL
    });
});

// Handle 404
app.use((req, res) => {
    res.status(404).render('index', { 
        error: 'Page not found',
        trending: [],
        popular: [],
        imageBaseUrl: TMDB_IMAGE_BASE_URL
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('Note: Please set your TMDB_API_KEY environment variable');
    console.log('Get your API key from: https://www.themoviedb.org/settings/api');
});

module.exports = app;
