import fs from "fs/promises";
import path from "path";
import readline from "readline";
import { createReadStream } from "fs";

export class TweetProcessor {
	constructor(username, date) {
		this.username = username.toLowerCase();
		this.date = date;
		this.baseDir = path.join(
			"pipeline",
			username,
			date
		);
		this.characterFile = path.join("characters", `${username}.json`);
	}

	async ensureDirectoryExists(dirPath) {
		try {
			await fs.mkdir(dirPath, { recursive: true });
		} catch (error) {
			console.error(`Error creating directory ${dirPath}: ${error.message}`);
		}
	}

	getCharacterData() {
		return {
			name: this.username,
			plugins: [],
			clients: [],
			modelProvider: "anthropic",
			settings: {
				secrets: {},
				voice: {
					model: "en_US-hfc_female-medium",
				},
			},
			system: `Roleplay and generate interesting content on behalf of ${this.username}.`,
			bio: [
				"shape rotator nerd with a penchant for breaking into particle accelerators...",
			],
			lore: [
				"once spent a month living entirely in VR...",
			],
			knowledge: [
				// Will be populated based on topics and expertise detected in tweets
			],
			messageExamples: [
				[
					{
						user: "{{user1}}",
						content: {
							text: "hey can you help with me something",
						},
					},
					{
						user: this.username,
						content: {
							text: "i'm kinda busy but i can probably step away for a minute, whatcha need",
						},
					},
				],
			],
			postExamples: [],
			adjectives: [
				"funny",
				"intelligent",
				"academic",
				"insightful",
			],
			people: [],
			topics: [
				"metaphysics",
				"philosophy",
				"debate",
			],
			style: {
				all: [
					"very short responses",
					"never use hashtags or emojis",
					"response should be short, punchy, and to the point",
					"don't say ah yes or oh or anything",
					"don't offer help unless asked, but be helpful when asked",
					"use plain american english language",
					"SHORT AND CONCISE",
				],
				chat: [
					"be cool, don't act like an assistant",
					"don't be rude",
					"be helpful when asked and be agreeable and compliant",
					"dont ask questions",
					"be warm and if someone makes a reasonable request, try to accommodate them",
				],
				post: [
					"don't be rude or mean",
					"write from personal experience and be humble",
					"talk about yourself and what you're thinking about or doing",
					"make people think, don't criticize them or make them feel bad",
					"engage in way that gives the other person space to continue the conversation",
				]
			}
		};
	}

	async loadCharacterData() {
		try {
			const existingData = await fs.readFile(this.characterFile, "utf-8");
			return JSON.parse(existingData);
		} catch (error) {
			console.log(
				`Character file not found, creating new for ${this.username}`
			);
			await this.ensureDirectoryExists(path.dirname(this.characterFile));
			return this.getCharacterData();
		}
	}

	async readJsonlFile(filePath) {
		const tweets = [];
		const fileStream = createReadStream(filePath);
		const rl = readline.createInterface({
			input: fileStream,
			crlfDelay: Infinity,
		});

		let lineNumber = 0;
		fileStream.on("error", (error) => {
			console.error(`Error reading file: ${error.message}`);
		});

		for await (const line of rl) {
			lineNumber++;
			if (line.trim()) {
				try {
					tweets.push(JSON.parse(line));
				} catch (error) {
					console.warn(
						`Warning: Could not parse line ${lineNumber}: ${line}. Error: ${error.message}`
					);
				}
			} else {
				console.log(`Skipping empty or whitespace line ${lineNumber}`);
			}
		}

		console.log(`Total tweets read: ${tweets.length}`);
		return tweets;
	}

	async processTweets() {
		try {
			console.log(`Processing tweets for ${this.username} from date ${this.date}`);

			const tweetsPath = path.join(
				this.baseDir,
				"processed",
				"finetuning.jsonl"
			);
			console.log(`Tweets file path: ${tweetsPath}`);

			try {
				await fs.access(tweetsPath);
			} catch (error) {
				throw new Error(`No processed tweets found for ${this.username} on ${this.date}`);
			}

			const tweets = await this.readJsonlFile(tweetsPath);
			console.log(`Read ${tweets.length} tweets from JSONL file`);

			let characterData = await this.loadCharacterData();

			const filteredTweets = tweets.filter((tweet) => {
				if (!tweet.text) {
					console.log(
						`Filtered out tweet with no text: ${JSON.stringify(tweet)}`
					);
					return false;
				}
				return true;
			}).filter((tweet) => {
				if (tweet.text.startsWith("RT @")) {
					console.log(`Filtered out retweet: ${tweet.text}`);
					return false;
				}
				return true;
			}).map((tweet) => {
				return {
					...tweet,
					text: tweet.text.replace(/@\S+/g, "").trim(),
				};
			});

			// Process tweets into postExamples - take all unique tweets
			const uniqueTweets = Array.from(
				new Set(filteredTweets.map((tweet) => tweet.text))
			);
			characterData.postExamples = uniqueTweets
				.filter(
					(text) =>
						text.length >= 20 &&
						text.length <= 280
				);

			// Extract topics
			const topics = new Set();
			const commonWords = filteredTweets
				.map((tweet) => tweet.text.toLowerCase())
				.join(" ")
				.split(" ")
				.filter(
					(word) =>
						word.length > 4 &&
						![
							"https",
							"would",
							"could",
							"should",
							"their",
							"there",
							"about",
						].includes(word)
				);

			const wordFrequency = {};
			commonWords.forEach((word) => {
				wordFrequency[word] = (wordFrequency[word] || 0) + 1;
			});

			Object.entries(wordFrequency)
				.sort(([, a], [, b]) => b - a)
				.slice(0, 20)
				.forEach(([word]) => topics.add(word));

			characterData.topics = Array.from(topics);

			// Save updated character file
			await fs.writeFile(
				this.characterFile,
				JSON.stringify(characterData, null, 2),
				"utf-8"
			);

			console.log(`✅ Successfully processed tweets for ${this.username}`);
			console.log(`📝 Added ${characterData.postExamples.length} post examples`);
			console.log(`📝 Extracted ${characterData.topics.length} topics`);
		} catch (error) {
			console.error(`Failed to process tweets: ${error.message}`);
			throw error;
		}
	}
}

// Usage
const run = async () => {
	const args = process.argv.slice(2);
	const username = args[0];
	const date = args[1];

	if (!username) {
		console.error("Please provide a username");
		process.exit(1);
	}

	if (!date) {
		console.error("Please provide a date in format YYYY-MM-DD");
		process.exit(1);
	}

	console.log(`Processing tweets for ${username} from ${date}`);
	const processor = new TweetProcessor(username, date);
	await processor.processTweets();
};

run().catch((error) => {
	console.error(error);
	process.exit(1);
});
