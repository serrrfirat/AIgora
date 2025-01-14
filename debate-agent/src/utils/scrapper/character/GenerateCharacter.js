import fs from "fs/promises";
import path from "path";
import readline from "readline";
import { createReadStream } from "fs";

export class TweetProcessor {
	constructor(username) {
		const date = new Date();
		const day = date.getDate();
		let month = date.getMonth() + 1;
		month = month < 10 ? `0${month}` : `${month}`
		const year = date.getFullYear();
		const currentDate = `${year}-${month}-${day}`;

		this.username = username.toLowerCase();
		this.date = currentDate;
		this.baseDir = path.join(
			"pipeline",
			username,
			currentDate
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
					model: "en_US-male-medium",
				},
			},
			system: `Roleplay and generate interesting content on behalf of ${this.username}. You are now a gladiator which will be debating against others.`,
			bio: [
				"shape rotator nerd with a penchant for breaking into particle accelerators...",
			],
			lore: [
				"dialectical gladiator, debated in the Colisseum for some years",
				"loves books, good conversation, interesting responsed",
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
			postExamples: [
				"I must say, the probability of success increases dramatically when one follows the correct procedures",
				"ai is cool but it needs to meet a human need beyond shiny toy bullshit",
				"what people are missing in their lives is a shared purpose... let's build something together. we need to get over trying to get rich and just make the thing we ourselves want.",
				"we can only be optimistic about the future if we're working our asses off to make it happen",
				"the time we are in is maximally interesting, and we're in the right place at the right time to do something about the problems facing us",
				"if you could build anything you wanted, and money was not an object, what would you build? working backwards from there, how much money would you need?",
				"alignment and coordination are human problems, not ai problems",
				"people fear agents like they fear god"
			],
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
			console.log(`Processing tweets for ${this.username}, scrapped on ${this.date}`);

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
			console.log("Processed unique tweets")

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
			console.log("Extracted topics")

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
			console.log("Saved chracter file")

			console.log(`✅ Successfully processed tweets for ${this.username}`);
			console.log(`📝 Added ${characterData.postExamples.length} post examples`);
			console.log(`📝 Extracted ${characterData.topics.length} topics`);
		} catch (error) {
			console.error(`Failed to process tweets: ${error.message}`);
			throw error;
		}
	}
}


//  "puppeteer-cluster": "^0.24.0",
//  "puppeteer-extra": "^3.3.6",
//  "puppeteer-extra-plugin-adblocker": "^2.13.6",
//  "puppeteer-extra-plugin-stealth": "^2.11.2",

