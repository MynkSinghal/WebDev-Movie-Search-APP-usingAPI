const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const OMDB_API_KEY = 'c9eb1bb2';

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Homepage route
app.get('/', (req, res) => {
    res.render('index', { error: null });
});

// Movie search route
app.post('/movie', async (req, res) => {
    const movieName = req.body.movieName;
    try {
        // Fetch movie details from OMDB
        const omdbResponse = await axios.get(`https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${encodeURIComponent(movieName)}`);
        const movieData = omdbResponse.data;

        if (movieData.Response === 'True') {
            res.render('movie', { movie: movieData });
        } else {
            res.render('index', { error: 'Movie not found' });
        }
    } catch (error) {
        res.render('index', { error: 'An error occurred' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
