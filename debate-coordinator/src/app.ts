import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { CoordinatorService } from './services/coordinator';
import characterRoutes from './routes/character';

const app = express();
const port = process.env.PORT || 3003;

// Enable CORS
app.use(cors());
app.use(express.json());

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Register routes
app.use('/api/character', characterRoutes);

const coordinator = new CoordinatorService();

coordinator.initialize().catch(console.error);

app.get('/api/chat/:marketId', async (req, res) => {
  try {
    console.log("[Coordinator] Received request for chat messages, marketId:", req.params.marketId);
    const marketId = BigInt(req.params.marketId);
    console.log("[Coordinator] Converting to BigInt:", marketId.toString());
    const messages = await coordinator.getChatMessages(marketId);
    console.log("[Coordinator] Retrieved messages:", messages.length);
    res.json(messages);
  } catch (error) {
    console.error('[Coordinator] Error getting chat messages:', error);
    res.status(500).json({ error: 'Failed to get chat messages' });
  }
});

app.listen(port, () => {
  console.log(`[${new Date().toISOString()}] Coordinator service listening at http://localhost:${port}`);
  console.log('Environment:', {
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV,
    CORS_ENABLED: true
  });
});

// Handle cleanup on shutdown
process.on('SIGTERM', async () => {
  await coordinator.cleanup();
  process.exit(0);
}); 
