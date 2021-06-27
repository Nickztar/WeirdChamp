import { Message } from "discord.js";
import { Command } from "../types/DiscordTypes";
import { DiscordButton, s3Files } from "../src/discord";
// This will complain if you don't provide the right types for each property
const command: Command = {
    name: "megabutton",
    description: "Send all sounds as buttons!",
    execute: (message: Message) => {
        const soundButtons: Array<DiscordButton.MessageButton> = [];
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
            const button = new DiscordButton.MessageButton()
                .setStyle("blurple") // default: blurple
                .setLabel(file.Key.replace(/(.wav)|(.mp3)/gm, "")) // default: NO_LABEL_PROVIDED
                .setID(`play_${file.Key.replace(/(.wav)|(.mp3)/gm, "")}`); // note: if you use the style "url" you must provide url using .setURL('https://example.com')
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
