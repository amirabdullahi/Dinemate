import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import routes from '../backend/routes/index.js';
import connectDB from '../backend/utils/db.js';

const app = express();

// Connect to database
connectDB();

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3010',
      'http://localhost:41841',
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
      process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null
    ].filter(Boolean);
    
    if (!origin || allowedOrigins.some(allowed => origin.startsWith(allowed)) || origin.startsWith("http://localhost") || origin.includes('vercel.app')) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now
    }
  },
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());

// Routes
app.get('/', (_, res) => {
  res.send('<h1>Dinemate API is running!</h1>');
});

app.use('/api', routes);

// Export for Vercel
export default app;