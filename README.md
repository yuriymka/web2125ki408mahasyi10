# Business Card Website with Authentication

A business card website with secure authentication including password hashing and Google Authenticator 2FA.

## Features

- User registration and login
- Password hashing using bcrypt
- Two-factor authentication using Google Authenticator
- Session management
- Protected routes requiring authentication
- Business card information display
- GET and POST request demonstrations
- AJAX form handling

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)
- Google Authenticator app (for 2FA)

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

## Authentication Flow

1. Register a new account at `/register`
2. Set up 2FA by scanning the QR code with Google Authenticator
3. Login with your credentials and 2FA token at `/login`

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
     - Start Command: `cd build && NODE_ENV=production node server.js`
     - Select the free plan
   - Click "Create Web Service"

3. Add the following environment variables in Render:
   - SESSION_SECRET: [generate a random string]

## Security Features

- Passwords are hashed using bcrypt
- Two-factor authentication using TOTP (Time-based One-Time Password)
- Secure session management
- Protected routes requiring authentication
- HTTPS enforcement in production

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

