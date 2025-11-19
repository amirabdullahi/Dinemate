import express from 'express';
import cors from 'cors';
import connectDB from './utils/db.js';
import cookieParser from 'cookie-parser';
import routes from './routes/index.js';

const app = express();
const port = process.env.PORT || 3010;

connectDB();

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests from Vercel domains and localhost
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
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());


app.get('/', (_, res) => {
  res.send('<h1>Hello, World!</h1>');
});

app.use('/api', routes);

// For local development
if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });
}

// Export for Vercel
export default app;
