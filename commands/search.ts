import { Message } from "discord.js";
import { Command } from "../types/DiscordTypes";
import { execute } from "../utils/youtubeUtils";
// This will complain if you don't provide the right types for each property
const command: Command = {
    name: "search",
    description: "Search and play a youtube video!",
    execute: async (message: Message) => {
        return execute(message, true);
    },
};

export = command;
