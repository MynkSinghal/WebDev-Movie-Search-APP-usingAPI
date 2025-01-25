const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const OMDB_API_KEY = process.env.OMDB_API_KEY || 'c9eb1bb2';

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Add security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

app.get('/', (req, res) => {
    res.render('index', { error: null });
});

app.post('/movie', async (req, res) => {
    const movieName = req.body.movieName;
    try {
        const omdbResponse = await axios.get(`https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${movieName}`);
        const movieData = omdbResponse.data;

        if (movieData.Response === 'True') {
            res.render('movie', { movie: movieData });
        } else {
            res.render('index', { error: movieData.Error || 'Movie not found' });
        }
    } catch (error) {
        console.error('API Error:', error.response?.data || error.message);
        res.render('index', { error: 'An error occurred while fetching movie data' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('index', { error: 'Something broke!' });
});

// Handle 404
app.use((req, res) => {
    res.status(404).render('index', { error: 'Page not found' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
