import { Message } from "discord.js";
import { Command } from "../types/DiscordTypes";
import { execute } from "../utils/youtubeUtils";
// This will complain if you don't provide the right types for each property
const command: Command = {
    name: "play",
    description: "Play youtube url!",
    execute: async (message: Message) => {
        return execute(message, false);
    },
};

export = command;
