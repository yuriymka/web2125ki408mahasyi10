const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/index.html'));
});

app.get('/get-page', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/get-page.html'));
});

app.get('/post-page', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/post-page.html'));
});

app.get('/ajax-forms', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/ajax-forms.html'));
});

// API endpoints
app.get('/api/data', (req, res) => {
    const data = {
        name: 'Mahas Yurii',
        title: 'Computer Engineer',
        timestamp: new Date().toISOString()
    };
    res.json(data);
});

app.post('/api/data', (req, res) => {
    const receivedData = req.body;
    const responseData = {
        ...receivedData,
        timestamp: new Date().toISOString()
    };
    res.json(responseData);
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});