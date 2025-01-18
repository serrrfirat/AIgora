import express from 'express';
import { CharacterCreateService } from '../services/character-create';

const router = express.Router();
const characterService = new CharacterCreateService();

// POST /api/character/generate
// Generate a character from Twitter handle
router.post('/generate', async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Twitter username is required' });
    }

    const result = await characterService.generateCharacterFromTwitter(username);
    
    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json(result.data);
  } catch (error) {
    console.error('Error in character generation route:', error);
    res.status(500).json({ error: 'Failed to generate character' });
  }
});

export default router; 