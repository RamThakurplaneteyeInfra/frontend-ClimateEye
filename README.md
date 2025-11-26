# SKY EYE - Environmental Monitoring Dashboard

A modern environmental monitoring dashboard with dark theme and teal accents.

## Features

- **Login System**: Secure authentication with admin credentials
- **Date Range Selector**: Dynamic date range selection (default: one week before today to today)
- **Modern UI**: Dark theme with teal accents matching ANDROMEDA style
- **Responsive Design**: Clean and intuitive interface

## Login Credentials

- **Username**: `admin`
- **Password**: `skyeye2025`

## Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

## Running the Application

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Project Structure

```
frontend/
├── public/
│   └── asset/
│       └── login.gif          # Login background image
├── src/
│   ├── components/
│   │   ├── Login.jsx          # Login page component
│   │   ├── Login.css          # Login styles
│   │   ├── Dashboard.jsx     # Main dashboard component
│   │   └── Dashboard.css     # Dashboard styles
│   ├── context/
│   │   └── AuthContext.jsx   # Authentication context
│   ├── App.jsx               # Main app component
│   ├── App.css               # App styles
│   ├── main.jsx              # Entry point
│   └── index.css             # Global styles
├── index.html
├── package.json
└── vite.config.js
```

## Date Range Features

- **Start Date**: Defaults to one week before today
- **End Date**: Defaults to today
- **Constraints**: 
  - End date cannot exceed today
  - Start date cannot be after end date
  - Dates automatically update daily

## Color Scheme

- **Primary Background**: `#0a0e27` (Dark blue)
- **Secondary Background**: `#1a1f3a` (Lighter dark blue)
- **Accent Color**: `#14b8a6` (Teal)
- **Text**: White with varying opacity levels

## Notes

- The "Register New User" button is static (non-functional) as requested
- Backend integration will be implemented later
- KML drawing functionality will be added based on the provided guide
