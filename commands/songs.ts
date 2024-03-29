import { Message } from "discord.js";
import * as config from "../bot.config";
import { Command } from "../types/DiscordTypes";
import { QuerySounds } from "../utils/soundUtils";
// This will complain if you don't provide the right types for each property
const command: Command = {
    name: "songs",
    isDisabled: !config.USE_WEIRDCHAMP,
    description: "Gives a list of our sounds!",
    execute: async (message: Message) => {
        const availableSounds = await QuerySounds();
        let string = "**Sounds: " + `(${availableSounds.length})**` + "```";
        availableSounds.forEach((file) => {
            string += `${file.DisplayName}\n`;
        });
        string += "```";
        message.reply(string);
    },
};

export = command;
