import { Message } from "discord.js";
import { Command } from "../types/DiscordTypes";
import { skip } from "../utils/youtubeUtils";
// This will complain if you don't provide the right types for each property
const command: Command = {
    name: "skip",
    description: "Skip current youtube video!",
    execute: async (message: Message) => {
        return skip(message);
    },
};

export = command;
