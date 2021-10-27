import { Message } from "discord.js";
import { Command } from "../types/DiscordTypes";
import { DiscordButton } from "../src/discord";
import { QuerySounds } from "../utils/soundUtils";
import * as config from "../bot.config";
// This will complain if you don't provide the right types for each property
const command: Command = {
    name: "megabutton",
    isDisabled: !config.USE_WEIRDCHAMP,
    description: "Send all sounds as buttons!",
    execute: async (message: Message) => {
        const soundButtons: Array<DiscordButton.MessageButton> = [];
        const fileArr = await QuerySounds();
        fileArr.sort((a, b) => {
            const nameA = a.DisplayName.toLowerCase();
            const nameB = b.DisplayName.toLowerCase();
            if (nameA < nameB)
                // sort string ascending
                return -1;
            if (nameA > nameB) return 1;
            return 0; // default return value (no sorting)
        });
        fileArr.forEach((file) => {
            const button = new DiscordButton.MessageButton()
                .setStyle("blurple") // default: blurple
                .setLabel(file.DisplayName) // default: NO_LABEL_PROVIDED
                .setID(`play_${file.key}`); // note: if you use the style "url" you must provide url using .setURL('https://example.com')
            soundButtons.push(button);
        });
        let buttonCache: Array<DiscordButton.MessageButton> = [];
        soundButtons.forEach((btn, i) => {
            buttonCache.push(btn);
            if (buttonCache.length == 5 || i == soundButtons.length - 1) {
                message.channel.send(".", {
                    //@ts-ignore
                    buttons: [...buttonCache],
                });
                buttonCache = [];
            }
        });
    },
};

export = command;
