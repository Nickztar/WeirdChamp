import { Message } from "discord.js";
import { Command } from "../types/DiscordTypes";
import { getS3Files } from "../utils/s3Utils";
import aws from "aws-sdk";
// This will complain if you don't provide the right types for each property
const command: Command = {
    name: "fetch",
    isDisabled: true,
    description: "Update current sounds!",
    execute: async (message: Message) => {
        // const newFiles = await getS3Files();
        // const update: aws.S3.Object[] = [];
        // for (const s3File of newFiles) {
        //     update.push(s3File);
        // }
        // SetS3Files(update);
        message.reply(`Currently ${0} sounds.`);
    },
};

export = command;
