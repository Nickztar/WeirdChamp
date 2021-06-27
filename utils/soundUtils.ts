import { VoiceChannel } from "discord.js";
import { IsReady, s3Files, UpdateIsReady } from "../src/discord";
import { getS3Url } from "./s3Utils";
import { getRandomInt } from "./generalUtils";

export async function PlayRandom(channel: VoiceChannel) {
    if (IsReady) {
        try {
            const connection = await channel.join();
            UpdateIsReady(false);
            const randNummer = getRandomInt(s3Files.length - 1);
            const key = s3Files[randNummer];
            const url = getS3Url(key.Key);
            const dispatcher = connection.play(url, {
                volume: 0.5,
            });
            console.log(`${Date.now()} random:` + key);
            dispatcher.on("finish", () => {
                console.log("Finished playing");
                channel.leave();
                setTimeout(() => UpdateIsReady(true), 2000);
            });
            dispatcher.on("error", (error) => console.error(error));
        } catch (err) {
            UpdateIsReady(true);
            console.log("Something went wrong Ex:" + err);
        }
    }
}
export async function PlayFromRandom(channel: VoiceChannel, song: string) {
    if (IsReady) {
        try {
            const connection = await channel.join();
            UpdateIsReady(false);
            const file = s3Files.find((x) => x.Key.includes(song));
            const url = getS3Url(file.Key);
            const dispatcher = connection.play(url, {
                volume: 0.5,
            });
            console.log(`${Date.now()} selected:` + file);
            dispatcher.on("finish", () => {
                console.log("Finished playing");
                channel.leave();
                setTimeout(() => UpdateIsReady(true), 2000);
            });
            dispatcher.on("error", (error) => console.error(error));
        } catch (err) {
            UpdateIsReady(true);
            console.log(`${Date.now()} Something went wrong Ex: ` + err);
        }
    }
}
