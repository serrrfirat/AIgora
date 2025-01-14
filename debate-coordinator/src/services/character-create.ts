import { TweetProcessor } from '../scrapper/character/GenerateCharacter';
import TwitterPipeline from '../scrapper/twitter/TwitterPipeline.js';

export class CharacterCreateService {
  async generateCharacterFromTwitter(username: string): Promise<any> {
    try {

      // Process tweets and update character data
      const pipeline = new TwitterPipeline(username);
      const analytics = await pipeline.run().catch((e) => console.error(e));

      const processor = new TweetProcessor(username)        
      // Process tweets and update character data
      await processor.processTweets();
      
      // Load the final character data
      const characterData = await processor.loadCharacterData();
      
      return {
        success: true,
        data: characterData
      };
    } catch (error) {
      console.error('Error generating character:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
