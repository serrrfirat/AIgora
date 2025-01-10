import { Logger } from './scrapper/twitter/Logger.js';
import { TwitterPipeline } from './scrapper/twitter/TwitterPipeline.js';

export async function scrappeTweets(username: string) {
	const pipeline = new TwitterPipeline(username);
	pipeline.run()

	try {
		if (pipeline.scraper) {
			await pipeline.scraper.logout();
			Logger.success('🔒 Logged out successfully.');
		}
	} catch (error) {
		Logger.error(`❌ Error during cleanup: ${error.message}`);
	}
}
