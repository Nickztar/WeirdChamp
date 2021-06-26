import { Message } from "discord.js";
import { Command } from "../types/DiscordTypes";
// This will complain if you don't provide the right types for each property
const command: Command = {
    name: "ping",
    description: "Ping!",
    execute: (message: Message, args: string[]) => {
        message.channel.send("Pong");
    },
};

export = command;
