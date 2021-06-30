import { Message } from "discord.js";
import { Command } from "../types/DiscordTypes";
import { PlayFromRandom, PlayRandom } from "../utils/soundUtils";
// This will complain if you don't provide the right types for each property
const command: Command = {
    name: "random",
    description: "Plays a random sound, or specific if sent!",
    execute: async (message: Message) => {
        const voiceChannel = message.member.voice.channel;
        const args = message.content.split(" ");
        if (!voiceChannel)
            return message.channel.send(
                "You're not in a voice channel! <:weird:668843974504742912>"
            );
        const permissions = voiceChannel.permissionsFor(message.client.user);
        if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
            return message.channel.send(
                "No permission <:weird:668843974504742912>"
            );
        }
        if (args.length != 0) {
            await PlayFromRandom(voiceChannel, args[1]);
            return;
        } else {
            await PlayRandom(voiceChannel);
        }
    },
};

export = command;
