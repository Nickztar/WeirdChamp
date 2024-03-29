import { getS3Files } from "../utils/s3Utils";
import dbConnect from "./../utils/dbConnect";
import { sha256 } from "./../utils/hash";
import Sound, { SoundType } from "../models/sounds";
import dbDisconnect from "./../utils/dbDisconnect";
import * as config from "../bot.config";

export async function SyncS3() {
    if (!config.USE_AWS) return;
    await dbConnect();

    const s3Files = await getS3Files();
    const addedSounds = [];
    for (const file of s3Files) {
        const existingFile: SoundType = await Sound.findOne({ key: file.Key });
        if (existingFile) {
            existingFile.LastModified = file.LastModified;
            await existingFile.save();
            continue;
        }
        const displayName = file.Key.replace(/(.wav)|(.mp3)/gm, "").replace(
            /_/gm,
            " "
        );

        let newSound: SoundType = new Sound({
            CreatedBy: "223807269891080192", //Dont really know who uploaded these, just default to me
            DisplayName: displayName,
            key: file.Key,
            Size: file.Size,
            NameHash: sha256(displayName),
            LastModified: file.LastModified,
        });

        const sound = await newSound.save();
        addedSounds.push(sound);
    }
    await dbDisconnect();
    return addedSounds;
}
