import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { CoordinatorService } from './services/coordinator';

const app = express();
const port = process.env.PORT || 3003;

// Enable CORS
app.use(cors());
app.use(express.json());

const coordinator = new CoordinatorService();

// Initialize coordinator service
coordinator.initialize().catch(console.error);

// Add chat endpoint
app.get('/api/chat/:marketId', async (req, res) => {
  try {
    const marketId = BigInt(req.params.marketId);
    const messages = await coordinator.getChatMessages(marketId);
    res.json(messages);
  } catch (error) {
    console.error('Error getting chat messages:', error);
    res.status(500).json({ error: 'Failed to get chat messages' });
  }
});

app.listen(port, () => {
  console.log(`Coordinator service listening at http://localhost:${port}`);
});

// Handle cleanup on shutdown
process.on('SIGTERM', async () => {
  await coordinator.cleanup();
  process.exit(0);
}); 