import { Message } from "discord.js";
import { Command } from "../types/DiscordTypes";
import { s3Files } from "../src/discord";
// This will complain if you don't provide the right types for each property
const command: Command = {
    name: "songs",
    description: "Gives a list of our sounds!",
    execute: (message: Message) => {
        let string = "**Sounds: " + `(${s3Files.length})**` + "```";
        const fileArr = [...s3Files];
        fileArr.sort((a, b) => {
            const nameA = a.Key.toLowerCase();
            const nameB = b.Key.toLowerCase();
            if (nameA < nameB)
                // sort string ascending
                return -1;
            if (nameA > nameB) return 1;
            return 0; // default return value (no sorting)
        });
        fileArr.forEach((file) => {
            string += `${file.Key.replace(/(.wav)|(.mp3)/gm, "")}\n`;
        });
        string += "```";
        message.reply(string);
    },
};

export = command;
