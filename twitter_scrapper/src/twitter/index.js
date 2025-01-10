import dotenv from 'dotenv';
dotenv.config();

import TwitterPipeline from './TwitterPipeline.js';
import Logger from './Logger.js';

process.on('unhandledRejection', (error) => {
	Logger.error(`❌ Unhandled promise rejection: ${error.message}`);
	process.exit(1);
});

process.on('uncaughtException', (error) => {
	Logger.error(`❌ Uncaught exception: ${error.message}`);
	process.exit(1);
});

const args = process.argv.slice(2);
const username = args[0] || 'serrrfirat';

const pipeline = new TwitterPipeline(username);

const cleanup = async () => {
	Logger.warn('\n🛑 Received termination signal. Cleaning up...');
	try {
		if (pipeline.scraper) {
			await pipeline.scraper.logout();
			Logger.success('🔒 Logged out successfully.');
		}
	} catch (error) {
		Logger.error(`❌ Error during cleanup: ${error.message}`);
	}
	process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

pipeline.run().catch(() => process.exit(1));
