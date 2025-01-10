import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { format } from 'date-fns';

export class Logger {
	static spinner = null;
	static progressBar = null;
	static lastUpdate = Date.now();
	static collectionStats = {
		oldestTweet: null,
		newestTweet: null,
		rateLimitHits: 0,
		resets: 0,
		batchesWithNewTweets: 0,
		totalBatches: 0,
		startTime: Date.now(),
		tweetsPerMinute: 0,
		currentDelay: 0,
		lastResetTime: null
	};

	// Determine if debug logs should be shown based on an environment variable
	static isDebugEnabled = process.env.DEBUG === 'true';

	static startSpinner(text) {
		this.spinner = ora(text).start();
	}

	static stopSpinner(success = true) {
		if (this.spinner) {
			success ? this.spinner.succeed() : this.spinner.fail();
			this.spinner = null;
		}
	}

	static info(msg) {
		console.log(chalk.blue(`ℹ️  ${msg}`));
	}

	static success(msg) {
		console.log(chalk.green(`✅ ${msg}`));
	}

	static warn(msg) {
		console.log(chalk.yellow(`⚠️  ${msg}`));
	}

	static error(msg) {
		console.log(chalk.red(`❌ ${msg}`));
	}

	// Add the debug method
	static debug(msg) {
		if (this.isDebugEnabled) {
			console.log(chalk.gray(`🔍 Debug: ${msg}`));
		}
	}

	static updateCollectionProgress({
		totalCollected,
		newInBatch = 0,
		batchSize = 0,
		oldestTweetDate = null,
		newestTweetDate = null,
		currentDelay = 0,
		isReset = false
	}) {
		const now = Date.now();

		// Update stats
		this.collectionStats.totalBatches++;
		if (newInBatch > 0) this.collectionStats.batchesWithNewTweets++;
		if (isReset) this.collectionStats.resets++;
		this.collectionStats.currentDelay = currentDelay;

		// Update date range
		if (oldestTweetDate) {
			this.collectionStats.oldestTweet = !this.collectionStats.oldestTweet ?
				oldestTweetDate :
				Math.min(this.collectionStats.oldestTweet, oldestTweetDate);
		}
		if (newestTweetDate) {
			this.collectionStats.newestTweet = !this.collectionStats.newestTweet ?
				newestTweetDate :
				Math.max(this.collectionStats.newestTweet, newestTweetDate);
		}

		// Calculate efficiency metrics
		const runningTime = (now - this.collectionStats.startTime) / 1000 / 60; // minutes
		this.collectionStats.tweetsPerMinute = (totalCollected / runningTime).toFixed(1);

		// Only update display every second to avoid spam
		if (now - this.lastUpdate > 1000) {
			this.displayCollectionStatus({
				totalCollected,
				newInBatch,
				batchSize,
				isReset
			});
			this.lastUpdate = now;
		}
	}

	static displayCollectionStatus({ totalCollected, newInBatch, batchSize, isReset }) {
		console.clear(); // Clear console for clean display

		// Display collection header
		console.log(chalk.bold.blue('\n🐦 Twitter Collection Status\n'));

		// Display current activity
		if (isReset) {
			console.log(chalk.yellow('↩️  Resetting collection position...\n'));
		}

		// Create status table
		const table = new Table({
			head: [chalk.white('Metric'), chalk.white('Value')],
			colWidths: [25, 50]
		});

		// Add current status
		table.push(
			['Total Tweets Collected', chalk.green(totalCollected.toLocaleString())],
			['Collection Rate', `${chalk.cyan(this.collectionStats.tweetsPerMinute)} tweets/minute`],
			['Current Delay', `${chalk.yellow(this.collectionStats.currentDelay)}ms`],
			['Batch Efficiency', `${chalk.cyan((this.collectionStats.batchesWithNewTweets / this.collectionStats.totalBatches * 100).toFixed(1))}%`],
			['Position Resets', chalk.yellow(this.collectionStats.resets)],
			['Rate Limit Hits', chalk.red(this.collectionStats.rateLimitHits)]
		);

		// Add date range if we have it
		if (this.collectionStats.oldestTweet) {
			const dateRange = `${format(this.collectionStats.oldestTweet, 'yyyy-MM-dd')} to ${format(this.collectionStats.newestTweet, 'yyyy-MM-dd')}`;
			table.push(['Date Range', chalk.cyan(dateRange)]);
		}

		// Add latest batch info
		table.push(
			['Latest Batch', `${chalk.green(newInBatch)} new / ${chalk.blue(batchSize)} total`]
		);

		console.log(table.toString());

		// Add running time
		const runningTime = Math.floor((Date.now() - this.collectionStats.startTime) / 1000);
		console.log(chalk.dim(`\nRunning for ${Math.floor(runningTime / 60)}m ${runningTime % 60}s`));
	}

	static recordRateLimit() {
		this.collectionStats.rateLimitHits++;
		this.collectionStats.lastResetTime = Date.now();
	}

	static stats(title, data) {
		console.log(chalk.cyan(`\n📊 ${title}:`));
		const table = new Table({
			head: [chalk.white('Parameter'), chalk.white('Value')],
			colWidths: [25, 60],
		});
		Object.entries(data).forEach(([key, value]) => {
			table.push([chalk.white(key), value]);
		});
		console.log(table.toString());
	}

	static reset() {
		this.collectionStats = {
			oldestTweet: null,
			newestTweet: null,
			rateLimitHits: 0,
			resets: 0,
			batchesWithNewTweets: 0,
			totalBatches: 0,
			startTime: Date.now(),
			tweetsPerMinute: 0,
			currentDelay: 0,
			lastResetTime: null
		};
		this.lastUpdate = Date.now();
	}
}

export default Logger;
