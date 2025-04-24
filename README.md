# Business Card Website

A simple business card website demonstrating various HTTP request handling methods including regular GET/POST requests and AJAX implementations.

## Features

- Home page with business card information
- GET request demonstration page
- POST request demonstration page
- AJAX forms page with both GET and POST implementations
- Timestamp display on all pages and form submissions

## Prerequisites

- Node.js (v12 or higher)
- npm (Node Package Manager)

## Installation

1. Clone this repository:
```bash
git clone <repository-url>
```

2. Install dependencies:
```bash
npm install
```

## Running Locally

1. Start the server:
```bash
npm start
```

2. Open your browser and navigate to `http://localhost:3000`

## Deployment Instructions

### Deploying to Heroku

1. Create a Heroku account if you don't have one
2. Install Heroku CLI
3. Login to Heroku:
```bash
heroku login
```

4. Create a new Heroku app:
```bash
heroku create your-app-name
```

5. Deploy your application:
```bash
git push heroku main
```

### Deploying to Other Platforms

The application can be deployed to any platform that supports Node.js applications. Make sure to:

1. Set the `PORT` environment variable if required by your hosting platform
2. Install dependencies using `npm install`
3. Start the application using `npm start`

## Live Demo

[Link to deployed site will be added after deployment]

## Project Structure

project/
├── public/ # Static files
│ ├── css/ # Stylesheets
│ └── js/ # Client-side JavaScript
├── views/ # HTML templates
├── server.js # Main server file
├── package.json # Project configuration
└── README.md # Documentation
```

