import { TweetProcessor } from './scrapper/character/GenerateCharacter.js';
import { Logger } from './scrapper/twitter/Logger.js';
import { TwitterPipeline } from './scrapper/twitter/TwitterPipeline.js';

/**
 * Processes tweets from a given account, starting from a give date.
 */
export async function scrappeTweets(username: string, date: string = "2024-09-01") {
	const pipeline = new TwitterPipeline(username);
	pipeline.run()

	try {
		if (pipeline.scraper) {
			await pipeline.scraper.logout();
			Logger.success('🔒 Logged out successfully.');
		}
	} catch (error) {
		Logger.error(`❌ Error during scrapper cleanup: ${error.message}`);
	}

	const processor = new TweetProcessor(username, date);
	await processor.processTweets();
}
