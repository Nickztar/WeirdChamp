import { Message } from "discord.js";
import { s3Files, SetS3Files } from "../src/discord";
import { Command } from "../types/DiscordTypes";
import { getS3Files } from "../utils/s3Utils";
import aws from "aws-sdk";
// This will complain if you don't provide the right types for each property
const command: Command = {
    name: "fetch",
    description: "Update current sounds!",
    execute: async (message: Message) => {
        const newFiles = await getS3Files();
        const update: aws.S3.Object[] = [];
        for (const s3File of newFiles) {
            update.push(s3File);
        }
        SetS3Files(update);
        message.reply(`Currently ${update.length} sounds.`);
    },
};

export = command;
