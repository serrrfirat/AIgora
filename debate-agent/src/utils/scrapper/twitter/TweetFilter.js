import inquirer from 'inquirer';
import { parseISO, isValid } from 'date-fns';
import Table from 'cli-table3';
import chalk from 'chalk';
import Logger from './Logger.js';

class TweetFilter {
	constructor() {
		this.options = {};
	}

	async promptCollectionMode() {
		const { mode } = await inquirer.prompt([
			{
				type: 'list',
				name: 'mode',
				message: 'How would you like to collect tweets?',
				choices: [
					{
						name: '📥 Get all tweets (fastest, includes everything)',
						value: 'all',
					},
					{
						name: '🎯 Custom collection (filter by type, date, engagement, etc)',
						value: 'custom',
					},
				],
			},
		]);

		if (mode === 'all') {
			this.options = {
				tweetTypes: ['original', 'replies', 'quotes', 'retweets'],
				contentTypes: ['text', 'images', 'videos', 'links'],
				filterByEngagement: false,
				filterByDate: false,
				excludeKeywords: false,
			};

			Logger.info('\nCollection Configuration:');
			const configTable = new Table({
				head: [chalk.white('Parameter'), chalk.white('Value')],
				colWidths: [25, 60],
			});
			configTable.push(
				['Mode', chalk.green('Complete Collection')],
				[
					'Includes',
					[
						'✓ Original tweets',
						'✓ Replies to others',
						'✓ Quote tweets',
						'✓ Retweets',
						'✓ Text-only tweets',
						'✓ Tweets with media (images/videos)',
						'✓ Tweets with links',
					].join('\n'),
				],
				['Filtering', chalk.blue('None - collecting everything')]
			);
			console.log(configTable.toString());

			const { confirm } = await inquirer.prompt([
				{
					type: 'confirm',
					name: 'confirm',
					message: 'Would you like to proceed with collecting everything?',
					default: true,
				},
			]);

			if (!confirm) {
				return this.promptCollectionMode();
			}

			Logger.info(
				`Selected Tweet Types: ${this.options.tweetTypes.join(', ')}`
			);
			Logger.info(
				`Selected Content Types: ${this.options.contentTypes.join(', ')}`
			);

			return this.options;
		}

		return this.promptCustomOptions();
	}

	async promptCustomOptions() {
		Logger.info('Configure Custom Tweet Collection');

		const answers = await inquirer.prompt([
			{
				type: 'checkbox',
				name: 'tweetTypes',
				message: 'What types of tweets would you like to collect?',
				choices: [
					{ name: 'Original tweets', value: 'original', checked: true },
					{ name: 'Replies to others', value: 'replies', checked: true },
					{ name: 'Quote tweets', value: 'quotes', checked: true },
					{ name: 'Retweets', value: 'retweets', checked: true },
				],
				validate: (input) =>
					input.length > 0 || 'Please select at least one tweet type.',
			},
			{
				type: 'checkbox',
				name: 'contentTypes',
				message: 'What content types would you like to include?',
				choices: [
					{ name: 'Text-only tweets', value: 'text', checked: true },
					{ name: 'Tweets with images', value: 'images', checked: true },
					{ name: 'Tweets with videos', value: 'videos', checked: true },
					{ name: 'Tweets with links', value: 'links', checked: true },
				],
				validate: (input) =>
					input.length > 0 || 'Please select at least one content type.',
			},
			{
				type: 'confirm',
				name: 'filterByEngagement',
				message: 'Would you like to filter by minimum engagement?',
				default: false,
			},
			{
				type: 'number',
				name: 'minLikes',
				message: 'Minimum number of likes:',
				default: 0,
				when: (answers) => answers.filterByEngagement,
				validate: (value) =>
					value >= 0 ? true : 'Please enter a positive number',
			},
			{
				type: 'number',
				name: 'minRetweets',
				message: 'Minimum number of retweets:',
				default: 0,
				when: (answers) => answers.filterByEngagement,
				validate: (value) =>
					value >= 0 ? true : 'Please enter a positive number',
			},
			{
				type: 'confirm',
				name: 'filterByDate',
				message: 'Would you like to filter by date range?',
				default: false,
			},
			{
				type: 'input',
				name: 'startDate',
				message: 'Start date (YYYY-MM-DD):',
				when: (answers) => answers.filterByDate,
				validate: (value) => {
					const date = parseISO(value);
					return isValid(date) ? true : 'Please enter a valid date';
				},
			},
			{
				type: 'input',
				name: 'endDate',
				message: 'End date (YYYY-MM-DD):',
				when: (answers) => answers.filterByDate,
				validate: (value) => {
					const date = parseISO(value);
					return isValid(date) ? true : 'Please enter a valid date';
				},
			},
			{
				type: 'confirm',
				name: 'excludeKeywords',
				message:
					'Would you like to exclude tweets containing specific keywords?',
				default: false,
			},
			{
				type: 'input',
				name: 'keywordsToExclude',
				message: 'Enter keywords to exclude (comma-separated):',
				when: (answers) => answers.excludeKeywords,
				filter: (input) =>
					input
						.split(',')
						.map((k) => k.trim())
						.filter((k) => k),
			},
		]);

		this.options = answers;

		Logger.info(`Selected Tweet Types: ${this.options.tweetTypes.join(', ')}`);
		Logger.info(
			`Selected Content Types: ${this.options.contentTypes.join(', ')}`
		);

		Logger.info('\nCollection Configuration:');
		const configTable = new Table({
			head: [chalk.white('Parameter'), chalk.white('Value')],
			colWidths: [25, 60],
		});

		configTable.push(
			['Tweet Types', answers.tweetTypes.join(', ')],
			['Content Types', answers.contentTypes.join(', ')]
		);

		if (answers.filterByEngagement) {
			configTable.push(
				['Min. Likes', answers.minLikes],
				['Min. Retweets', answers.minRetweets]
			);
		}

		if (answers.filterByDate) {
			configTable.push([
				'Date Range',
				`${answers.startDate} to ${answers.endDate}`,
			]);
		}

		if (answers.excludeKeywords) {
			configTable.push([
				'Excluded Keywords',
				answers.keywordsToExclude.join(', '),
			]);
		}

		console.log(configTable.toString());

		const { confirmed } = await inquirer.prompt([
			{
				type: 'confirm',
				name: 'confirmed',
				message: 'Would you like to proceed with this configuration?',
				default: true,
			},
		]);

		if (!confirmed) {
			Logger.info('Restarting configuration...');
			return this.promptCustomOptions();
		}

		return this.options;
	}

	shouldIncludeTweet(tweet) {
		if (
			this.options.tweetTypes?.length === 4 &&
			this.options.contentTypes?.length === 4 &&
			!this.options.filterByEngagement &&
			!this.options.filterByDate &&
			!this.options.excludeKeywords
		) {
			return true;
		}

		if (!this.options.tweetTypes.includes('retweets') && tweet.isRetweet) {
			return false;
		}

		if (!this.options.tweetTypes.includes('replies') && tweet.isReply) {
			return false;
		}
		if (!this.options.tweetTypes.includes('quotes') && tweet.quotedTweet) {
			return false;
		}
		if (
			!this.options.tweetTypes.includes('original') &&
			!tweet.isReply &&
			!tweet.quotedTweet &&
			!tweet.isRetweet
		) {
			return false;
		}

		const hasImage = tweet.photos && tweet.photos.length > 0;
		const hasVideo = tweet.videos && tweet.videos.length > 0;
		const hasLinks = tweet.urls && tweet.urls.length > 0;

		if (!this.options.contentTypes.includes('images') && hasImage) return false;
		if (!this.options.contentTypes.includes('videos') && hasVideo) return false;
		if (!this.options.contentTypes.includes('links') && hasLinks) return false;
		if (
			!this.options.contentTypes.includes('text') &&
			!hasImage &&
			!hasVideo &&
			!hasLinks
		)
			return false;

		if (this.options.filterByEngagement) {
			if (tweet.likes < this.options.minLikes) return false;
			if (tweet.retweetCount < this.options.minRetweets) return false;
		}

		if (this.options.filterByDate) {
			const tweetDate = new Date(tweet.timestamp);
			const startDate = new Date(this.options.startDate);
			const endDate = new Date(this.options.endDate);
			if (tweetDate < startDate || tweetDate > endDate) return false;
		}

		if (
			this.options.excludeKeywords &&
			this.options.keywordsToExclude.some((keyword) =>
				tweet.text.toLowerCase().includes(keyword.toLowerCase())
			)
		) {
			return false;
		}

		return true;
	}
}

export default TweetFilter;
