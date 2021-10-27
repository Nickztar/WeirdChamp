import { Message } from "discord.js";
import { Command } from "../types/DiscordTypes";
import { SyncS3 } from "../src/syncS3";
import * as config from "../bot.config";
// This will complain if you don't provide the right types for each property
const command: Command = {
    name: "sync",
    isDisabled: !config.USE_WEIRDCHAMP,
    description: "Sync sounds files to db...",
    execute: (message: Message) => {
        if (message.member.id != "223807269891080192")
            return message.reply("Only the god himself can do this... (Nic)");
        SyncS3().then((sounds) => {
            let string = `**Added DB sounds are ${sounds.length}: **\`\`\``;
            sounds.forEach((snd, i) => {
                string += `${snd.key}\n`;
            });
            string += "```";
            return message.reply(string);
        });
    },
};

export = command;
