# Debate Agents


## Twitter scrapper

### Usage

- You can directly call the debate-agent's script `pnpm run generate elonmusk` to scrape an account (defaults to `serrrfirat`), and generate a character feedable to eliza.
- In the frontend, you can use `src/utils/scrapper/generateFromTwitter` which is the same as above, but function-wise.

The result of scrapping and generating will be a file, located under `debate-agent/characters/username.json` (for a given username, obv.). This will store the information so an agent can be created from it.

Similarly to what you do with `pnpm start --character="characters/trump.character.json"`, replace `trump.character` with the chosen username.
