import { Client } from "discord.js";
import { glob } from "glob"; // included by discord.js
import { promisify } from "util"; // Included by default
import { Command } from "../types/DiscordTypes";
import path from "path";
import dotenv from "dotenv";
dotenv.config({ encoding: "UTF-8" });
// Make `glob` return a promise
const globPromise = promisify(glob);

const commands: Command[] = [];
const client = new Client();
client.login(process.env.DISCORD_KEY);

client.once("ready", async () => {
    // Load all JavaScript / TypeScript files so it works properly after compiling
    // Replace `test` with "await globPromise(`${__dirname}/commands/*.{.js,.ts}`)"
    // I just did this to fix SO's syntax highlighting!
    const commandsPath = path.join(__dirname, `../commands/*.ts`);
    const commandFiles = await globPromise(commandsPath);

    for (const file of commandFiles) {
        // I am not sure if this works, you could go for require(file) as well
        const command = (await import(file)) as Command;
        commands.push(command);
    }
});

const prefix = "!";

client.on("message", (message) => {
    // Prevent the bot from replying to itself or other bots
    if (message.author.bot) {
        return;
    }

    const [commandName, ...args] = message.content
        .slice(prefix.length)
        .split(/ +/);

    const command = commands.find((c) => c.name === commandName);

    if (command) {
        command.execute(message, args);
    }
});
