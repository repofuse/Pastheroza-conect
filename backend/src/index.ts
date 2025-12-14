import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Placeholder routes
app.get('/api/repos', (req, res) => {
  res.json({ repos: [] });
});

app.post('/api/repos', (req, res) => {
  res.json({ message: 'Not implemented yet' });
});

app.post('/api/analyze', (req, res) => {
  res.json({ message: 'Not implemented yet' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
