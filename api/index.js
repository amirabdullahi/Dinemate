import app from '../backend/server.js';

// For Vercel serverless functions
export default (req, res) => {
  return app(req, res);
};