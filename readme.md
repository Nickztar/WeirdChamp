# WeirdChamp

## A DiscordJS bot made for my server trolling and enjoyment.

![PauseChamp](/Extra/PauseChamp.png)

## Setup

- Make sure you have [Node](https://nodejs.org/en/) installed.
- Create a discord bot at the [developer portal ](https://discord.com/developers/applications).
- Setup a nice name and add picture. Check out [Extra map](/Extra) for some good ones.
- Download, fork or pull the repo.

![WeirdChamp](/Extra/WeirdChamp.png)

## Installation

- Setup a `.env` file
- Add your bot token and bot ClientId as followed:

```.env
DISCORD_KEY={YOUR BOT KEY HERE}
CLIENT_ID={YOUR BOT ID HERE}
```

- Run the installation command as followed:

```bash
npm install
```

- (Optional) Add some `.mp3` files to [JoinSounds map](/JoinSounds) to play when a user joins the chat.
- Start the bot with **one** following command

```bash
npm run bot
node index.js
nodemon index.js
```

## Bot commands

1. +play `{VALID YOUTUBE URL}` - Joins the channel and plays the youtube video. (sound)
2. +skip - Skip this songs in the queue.
3. +stop - Stops playing, quits and clears the queue
4. +weirdchamp - Replies with blinking weirdchamp
5. +togglewc - Toggles the reacting weirdchamp
6. +goodbot - Thanks you <3
7. +commands - Lists you all the commands
8. +random - Plays a random sound from JoinSounds
9. +random `{NAME}` - Plays a specific random from JoinSounds
10. +songs - Lists all songs available in JoinSounds.
11. +search `{NAME}` - Search youtube and plays the first video found.

## Note

Some things are hardcoded for my ease and this was all made as some kind of joke. Just look through the code and replace what seems to be the issue. Will improve on it when I feel like it.

![WeirdChamp blinking](/Extra/WeirdChampBlink.gif)
