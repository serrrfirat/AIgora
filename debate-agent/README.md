# Debate Agents


## Twitter scrapper

### Usage

- You can directly call the debate-agent's script `pnpm run twitter` to scrape an account.
- You can import `src/utils/scrapper/scrapeTweets` function to scrape an account.

When scrapping, only tweets from a given date will be taken into account.

The result of scrapping will be a file. This will store the information so an agent can be created from it.

## Utils

There are utils to load character files directly into `eliza`, like load character.
