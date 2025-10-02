import express from 'express';
import cors from 'cors';
import connectDB from './utils/db.js';
import cookieParser from 'cookie-parser';
import routes from './routes/index.js';

const app = express();
const port = 3010;

connectDB();

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.startsWith("http://localhost")) {
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

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
  console.log("Hello, World!");
});
