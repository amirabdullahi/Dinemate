import app from '../../backend/server.js';

// Catch-all API route for Vercel
export default (req, res) => {
  return app(req, res);
};