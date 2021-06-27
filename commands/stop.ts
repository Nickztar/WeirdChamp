import { Message } from "discord.js";
import { Command } from "../types/DiscordTypes";
import { stop } from "../utils/youtubeUtils";
// This will complain if you don't provide the right types for each property
const command: Command = {
    name: "stop",
    description: "Stop current queue!",
    execute: async (message: Message) => {
        return stop(message);
    },
};

export = command;
