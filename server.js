const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Determine the root directory
const rootDir = process.env.NODE_ENV === 'production' ? '.' : path.join(__dirname);

// Middleware
app.use(express.static(path.join(rootDir, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(rootDir, 'views/index.html'));
});

app.get('/get-page', (req, res) => {
    res.sendFile(path.join(rootDir, 'views/get-page.html'));
});

app.get('/post-page', (req, res) => {
    res.sendFile(path.join(rootDir, 'views/post-page.html'));
});

app.get('/ajax-forms', (req, res) => {
    res.sendFile(path.join(rootDir, 'views/ajax-forms.html'));
});

// API endpoints
app.get('/api/data', (req, res) => {
    const data = {
        name: 'John Doe',
        title: 'Full Stack Developer',
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