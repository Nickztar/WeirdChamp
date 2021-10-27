import dotenv from "dotenv";
dotenv.config(); //This has to be done as the first thing before any imports

import { Client, VoiceChannel } from "discord.js";
import { glob } from "glob"; // included by discord.js
import { promisify } from "util"; // Included by default
import { Command } from "../types/DiscordTypes";
import path from "path";
import { default as DiscordButton } from "discord-buttons";
import aws from "aws-sdk";
import { PlayFromRandom, PlayRandom } from "../utils/soundUtils";
import { AWS } from "../types/Constants";
import * as config from "../bot.config";
let s3: aws.S3 | null;
if (config.USE_AWS) {
    aws.config.update({
        region: AWS.REGION,
        accessKeyId: config.S3_ID as string,
        secretAccessKey: config.S3_KEY as string,
    });
    s3 = new aws.S3({ apiVersion: AWS.API_VERSION });
}

// Make `glob` return a promise
const globPromise = promisify(glob);

const commands: Command[] = [];
const client = new Client();
client.login(config.DISCORD_KEY);
DiscordButton(client);

//States?
let IsReady: boolean = false;
const UpdateIsReady = (value: boolean) => {
    IsReady = value;
};

client.once("ready", async () => {
    // Load all JavaScript / TypeScript files so it works properly after compiling
    const commandsPath = path.join(__dirname, `../commands/*.ts`);
    const commandFiles = await globPromise(commandsPath);

    for (const file of commandFiles) {
        // I am not sure if this works, you could go for require(file) as well
        const command = (await import(file)) as Command;
        if (commands.find((x) => x.name == command.name)) {
            console.log(
                `Found duplicate in: ${file} with name: ${command.name}\n`
            );
            throw new Error("Duplicate found!");
        }
        if (!command.isDisabled) commands.push(command);
    }
    client.user
        .setActivity(`${config.PREFIX}${config.PRESENCE}`)
        .then((presence) =>
            console.log(`Activity set to ${presence.activities[0].name}`)
        )
        .catch(console.error);
    IsReady = true;
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on("message", async (message) => {
    // Prevent the bot from replying to itself or other bots
    if (message.author.bot) return; // Stops replying to own commands
    if (message.channel.type !== "text") return; // Stops crash on PM

    if (config.USE_WEIRDCHAMP) {
        const weirdchamp = message.guild.emojis.cache.find(
            (emoji) => emoji.name === "pepehehe"
        );
        if (weirdchamp != null) {
            message.react(weirdchamp);
        }
    }

    const [commandName, ...args] = message.content
        .slice(config.PREFIX.length)
        .split(/ +/);

    const command = commands.find((c) => c.name === commandName);

    if (command) {
        await command.execute(message, args);
    } else if (message.content.startsWith(config.PREFIX)) {
        let string = "**My commands are: **```";
        commands.forEach((cmd, i) => {
            string += `${config.PREFIX + cmd.name}: ${cmd.description} ${
                i == commands.length - 1 ? "" : "\n"
            }`;
        });
        string += "```";
        message.reply(string);
    }
});

if (!config.USE_WEIRDCHAMP) {
    //@ts-ignore
    client.on("clickButton", async (button) => {
        const channel = await client.channels.fetch("621035571057524737");
        const isVoice = channel instanceof VoiceChannel;
        if (button.id === "play_random") {
            if (!channel || !isVoice)
                return button.channel.send(
                    "You're not in a voice channel! <:weird:668843974504742912>"
                );
            await PlayRandom(channel as VoiceChannel);
            await button.defer();
        } else {
            const channel = await client.channels.fetch("621035571057524737");
            const fileName = button.id.replace("play_", "");
            if (isVoice) {
                await PlayFromRandom(channel as VoiceChannel, fileName);
            }
            await button.defer();
        }
    });

    client.on("voiceStateUpdate", async (oldMember, newMember) => {
        const newUserChannel = newMember.channel;
        const oldUserChannel = oldMember.channel;
        if (newMember.id != config.CLIENT_ID && IsReady) {
            if (newUserChannel !== null) {
                if (oldUserChannel != newUserChannel) {
                    await PlayRandom(newUserChannel);
                }
            }
        }
    });
}

export { DiscordButton, IsReady, UpdateIsReady, client, s3 };
