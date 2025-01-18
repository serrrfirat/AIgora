import type { Helia } from 'helia'
import { createHelia } from 'helia'
import type { Strings } from '@helia/strings'
import { strings } from '@helia/strings'
import { json } from '@helia/json'
import { TweetProcessor } from '../scrapper/character/GenerateCharacter';
import TwitterPipeline from '../scrapper/twitter/TwitterPipeline.js';

export class CharacterCreateService {
  private ipfs: Helia
  private ipfsStrings: Strings
  private ipfsJson: any

  constructor() {
    this.initializeIPFS()
  }

  private async initializeIPFS() {
    this.ipfs = await createHelia()
    this.ipfsStrings = strings(this.ipfs)
    this.ipfsJson = json(this.ipfs)
  }

  private async uploadToIPFS(metadata: any): Promise<string> {
    const metadataString = JSON.stringify(metadata)
    const cid = await this.ipfsJson.add(metadataString)
    return `ipfs://${cid.toString()}`
  }

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

      // Prepare metadata
      const metadata = {
        name: characterData.name,
        description: characterData.bio.join(' '),
        image: process.env.DEFAULT_GLADIATOR_IMAGE || '', // You should have a default image URL
        attributes: {
          lore: characterData.lore,
          knowledge: characterData.knowledge,
          topics: characterData.topics,
          adjectives: characterData.adjectives,
          style: characterData.style,
          system: characterData.system,
          messageExamples: characterData.messageExamples,
          postExamples: characterData.postExamples
        }
      };

      // Upload to IPFS
      console.log('Uploading to IPFS...');
      const ipfsHash = await this.uploadToIPFS(metadata);
      console.log('IPFS upload complete:', ipfsHash);
      
      return {
        success: true,
        data: {
          ...characterData,
          ipfsUrl: ipfsHash
        }
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
