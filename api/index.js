const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const app = require('../backend/server');

// Export the Express app as a Vercel serverless function
module.exports = app;

