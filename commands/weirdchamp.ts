import { Message } from "discord.js";
import * as config from "../bot.config";
import { Command } from "../types/DiscordTypes";
// This will complain if you don't provide the right types for each property
const command: Command = {
    name: "weirdchamp",
    isDisabled: !config.USE_WEIRDCHAMP,
    description: "Weirdchamp stuff!",
    execute: async (message: Message) => {
        return message.reply(
            "https://tenor.com/view/weird-champ-weird-champ-pogchamp-pog-gif-13780848"
        );
    },
};

export = command;
