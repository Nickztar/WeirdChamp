import { Message } from "discord.js";
import { Command } from "../types/DiscordTypes";
import { DiscordButton } from "../src/discord";
import * as config from "../bot.config";
// This will complain if you don't provide the right types for each property
const command: Command = {
    name: "button",
    description: "Gives you a button to click for a random sound!",
    isDisabled: !config.USE_WEIRDCHAMP,
    execute: (message: Message) => {
        const button = new DiscordButton.MessageButton()
            .setStyle("blurple") // default: blurple
            .setLabel("Play sound") // default: NO_LABEL_PROVIDED
            .setID("play_random"); // note: if you use the style "url" you must provide url using .setURL('https://example.com')

        message.channel.send(
            "Click here to play random sound <:Happy:711247709729718312>",
            {
                //@ts-ignore
                buttons: [button],
            }
        );
    },
};

export = command;
