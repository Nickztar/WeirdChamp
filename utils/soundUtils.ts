import { VoiceChannel } from "discord.js";
import { client, IsReady, UpdateIsReady } from "../src/discord";
import { getS3Url } from "./s3Utils";
import dbConnect from "./dbConnect";
import Sound, { SoundType } from "../models/sounds";
import dbDisconnect from "./dbDisconnect";

export async function PlayRandom(channel: VoiceChannel) {
    if (IsReady) {
        try {
            await dbConnect();
            UpdateIsReady(false);
            const data = await Sound.aggregate<SoundType>([
                { $sample: { size: 1 } },
            ]);
            if (!data) throw Error("Failed to get random...");
            const file = data[0];
            const connection = await channel.join();
            const url = getS3Url(file.key);
            await client.user.setActivity(`${file.key}`);
            const dispatcher = connection.play(url, {
                volume: 0.5,
            });
            console.log(`${Date.now()} random:` + file.key);
            dispatcher.on("finish", async () => {
                console.log("Finished playing");
                channel.leave();
                await dbDisconnect();
                setTimeout(async () => {
                    await client.user.setActivity(`!WeirdChamp`);
                    UpdateIsReady(true);
                }, 2000);
            });
            dispatcher.on("error", async (error) => {
                console.error(error);
                await dbDisconnect();
                await client.user.setActivity(`!WeirdChamp`);
            });
        } catch (err) {
            UpdateIsReady(true);
            await dbDisconnect();
            await client.user.setActivity(`!WeirdChamp`);
            console.log("Something went wrong Ex:" + err);
        }
    }
}
export async function PlayFromRandom(channel: VoiceChannel, song: string) {
    if (IsReady) {
        try {
            await dbConnect();
            UpdateIsReady(false);
            const regex = new RegExp(song, "i");
            const file: SoundType = await Sound.findOne({
                key: { $regex: regex },
            });
            if (file == null)
                throw Error("Could not find song with that name...");
            const connection = await channel.join();
            const url = getS3Url(file.key);
            await client.user.setActivity(`${file.key}`);
            const dispatcher = connection.play(url, {
                volume: 0.5,
            });
            console.log(`${Date.now()} selected:` + file.key);
            dispatcher.on("finish", async () => {
                console.log("Finished playing");
                channel.leave();
                await dbDisconnect();
                setTimeout(async () => {
                    await client.user.setActivity(`!WeirdChamp`);
                    UpdateIsReady(true);
                }, 2000);
            });
            dispatcher.on("error", async (error) => {
                console.error(error);
                await dbDisconnect();
                await client.user.setActivity(`!WeirdChamp`);
            });
        } catch (err) {
            UpdateIsReady(true);
            await dbDisconnect();
            await client.user.setActivity(`!WeirdChamp`);
            console.log(`${Date.now()} Something went wrong Ex: ` + err);
        }
    }
}

export async function QuerySounds() {
    await dbConnect();
    const availableSounds: SoundType[] = await Sound.find({});
    availableSounds.sort((a, b) => {
        const nameA = a.DisplayName.toLowerCase();
        const nameB = b.DisplayName.toLowerCase();
        if (nameA < nameB)
            // sort string ascending
            return -1;
        if (nameA > nameB) return 1;
        return 0; // default return value (no sorting)
    });
    await dbDisconnect();
    return availableSounds;
}
