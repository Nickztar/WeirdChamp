import { Message } from "discord.js";
import { Command } from "../types/DiscordTypes";
import { execute, PlayType } from "../utils/youtubeUtils";
// This will complain if you don't provide the right types for each property
const command: Command = {
    name: "playlist",
    description: "Play songs from a youtube playlist!",
    execute: async (message: Message) => {
        return execute(message, PlayType.Playlist);
    },
};

export = command;
