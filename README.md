# Business Card Website

A simple business card website demonstrating various HTTP request handling methods including regular GET/POST requests and AJAX implementations.

## Features

- Home page with business card information
- GET request demonstration page
- POST request demonstration page
- AJAX forms page with both GET and POST implementations
- Timestamp display on all pages and form submissions

## Prerequisites

- Node.js (v14 or higher)
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

## Deployment on Render.com

1. Create an account on [Render.com](https://render.com)

2. From your Render dashboard:
   - Click "New +" button
   - Select "Web Service"
   - Connect your GitHub repository
   - Configure the deployment:
     - Name: business-card-website
     - Environment: Node
     - Build Command: `npm install && npm run build`
     - Start Command: `cd build && node server.js`
     - Select the free plan
   - Click "Create Web Service"

3. Your site will be automatically deployed and available at the provided Render URL

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

