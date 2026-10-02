const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./backend/config/db');
const { seedDefaultData } = require('./backend/config/seedData');
const apiRoutes = require('./backend/routes/apiRoutes');

const app = express();
const PORT = process.env.PORT || 8000;

// Connect MongoDB Database & Seed Default Career Paths / Opportunities
connectDB().then(() => {
  seedDefaultData();
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api', apiRoutes);

// Static Asset Serving
app.use(express.static(path.join(__dirname), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }
  }
}));

// Root Route fallback
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Fallback route for all non-API requests
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` ◈ KRICS MERN STACK SERVER ACTIVE ON PORT ${PORT} `);
  console.log(` Web Portal:  http://localhost:${PORT}/`);
  console.log(` MongoDB API: http://localhost:${PORT}/api/dashboard`);
  console.log(`====================================================`);
});
