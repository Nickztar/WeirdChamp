import { Message } from "discord.js";
import { Command } from "../types/DiscordTypes";
// This will complain if you don't provide the right types for each property
const command: Command = {
    name: "goodbot",
    description: ":D",
    execute: async (message: Message) => {
        return message.reply("Thank you sir! <:Happy:711247709729718312>");
    },
};

export = command;
