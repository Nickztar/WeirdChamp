import { VoiceChannel } from "discord.js";
import { client, IsReady, s3Files, UpdateIsReady } from "../src/discord";
import { getS3Url } from "./s3Utils";
import { getRandomInt } from "./generalUtils";

export async function PlayRandom(channel: VoiceChannel) {
    if (IsReady) {
        try {
            const connection = await channel.join();
            UpdateIsReady(false);
            const randNummer = getRandomInt(s3Files.length - 1);
            const file = s3Files[randNummer];
            const url = getS3Url(file.Key);
            await client.user.setActivity(`${file.Key}`);
            const dispatcher = connection.play(url, {
                volume: 0.5,
            });
            console.log(`${Date.now()} random:` + file.Key);
            dispatcher.on("finish", async () => {
                console.log("Finished playing");
                channel.leave();
                setTimeout(async () => {
                    await client.user.setActivity(`!WeirdChamp`);
                    UpdateIsReady(true);
                }, 2000);
            });
            dispatcher.on("error", async (error) => {
                console.error(error);
                await client.user.setActivity(`!WeirdChamp`);
            });
        } catch (err) {
            UpdateIsReady(true);
            await client.user.setActivity(`!WeirdChamp`);
            console.log("Something went wrong Ex:" + err);
        }
    }
}
export async function PlayFromRandom(channel: VoiceChannel, song: string) {
    if (IsReady) {
        try {
            UpdateIsReady(false);
            const file = s3Files.find((x) =>
                x.Key.toLowerCase().includes(song)
            );
            if (file == undefined)
                throw Error("Could not find song with that name...");
            const connection = await channel.join();
            const url = getS3Url(file.Key);
            await client.user.setActivity(`${file.Key}`);
            const dispatcher = connection.play(url, {
                volume: 0.5,
            });
            console.log(`${Date.now()} selected:` + file);
            dispatcher.on("finish", async () => {
                console.log("Finished playing");
                channel.leave();
                setTimeout(async () => {
                    await client.user.setActivity(`!WeirdChamp`);
                    UpdateIsReady(true);
                }, 2000);
            });
            dispatcher.on("error", async (error) => {
                console.error(error);
                await client.user.setActivity(`!WeirdChamp`);
            });
        } catch (err) {
            UpdateIsReady(true);
            await client.user.setActivity(`!WeirdChamp`);
            console.log(`${Date.now()} Something went wrong Ex: ` + err);
        }
    }
}
