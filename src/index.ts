import { Guild, VoiceChannel } from "discord.js";
import ytdl from "ytdl-core";
import express from "express";
import cors from "cors";
import { MoveModel } from "../types/DiscordTypes";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import aws from "aws-sdk";
import { AWS, ExpressConst } from "../types/Constants";
import { asyncFilter } from "../utils/asyncFilter";
import { getS3Url, getS3Files, getSignedPost } from "../utils/s3Utils";
import { client } from "./discord";
import { PlayFromRandom, PlayRandom, QuerySounds } from "../utils/soundUtils";

// const client = new Client();
dotenv.config({ encoding: "UTF-8" });
const app = express();
// disbut(client);

// const s3 = new aws.S3({ apiVersion: AWS.API_VERSION });
app.use(
    cors({
        origin(origin, callback) {
            if (ExpressConst.WHITELIST.indexOf(origin) !== -1 || !origin) {
                callback(null, true);
            } else {
                callback(new Error(`Not allowed by CORS. ORIGIN: ${origin}`));
            }
        },
    })
);
app.use(bodyParser.json());
// app.use(cors());

// Routes
app.get("/api/aws/geturlbykey", async (req, res) => {
    const key = req.query.key as string;
    const url = getS3Url(key);
    res.send(url);
});

app.get("/api/youtube/mp3", async function (req, res) {
    try {
        const videoUrl = req.query.videoUrl as string;
        const songInfo = await ytdl.getInfo(videoUrl);
        if (parseInt(songInfo.videoDetails.lengthSeconds) > 5 * 60)
            // No more than 5 minutes...
            res.status(403).send("too long");
        else {
            const videoReadableStream = ytdl(songInfo.videoDetails.video_url, {
                filter: "audioonly",
            });
            res.setHeader("Content-Type", "audio/mpeg; charset=utf-8");
            res.setHeader(
                "Content-Disposition",
                'attachment; filename="file.mp3"'
            );
            const stream = videoReadableStream.pipe(res);

            stream.on("finish", function () {
                res.end();
            });
        }
    } catch (err) {
        console.log(err);
        res.status(500).send(err);
    }
});

app.post("/api/aws/signedurl", async (req, res) => {
    const fileName = req.body.fileName as string;
    const fileType = req.body.fileType as string;
    // Set up the payload of what we are sending to the S3 api
    const s3Params = {
        Bucket: AWS.S3_BUCKET,
        Key: fileName,
        Expires: 500,
        ContentType: fileType,
        ACL: "public-read",
    };
    // Make a request to the S3 API to get a signed URL which we can use to upload our file
    const { success, Error, data } = await getSignedPost(s3Params);
    if (!success) {
        res.json({ success: false, error: Error });
    } else {
        res.json({ success: true, data: { data } });
    }
});

app.get("/api/bot/random/:id", async (req, res) => {
    const { id } = req.params;
    const channel = await client.channels.fetch(id);
    if (channel instanceof VoiceChannel) {
        await PlayRandom(channel);
        res.send(true);
    } else {
        res.send(false);
    }
});

app.get("/api/bot/fetchSounds", async (req, res) => {
    // const newFiles = await getS3Files();
    // const update: aws.S3.Object[] = [];
    // for (const s3File of newFiles) {
    //     update.push(s3File);
    // }
    // SetS3Files(update);
    res.send(true);
});

app.get("/api/bot/specific/", async (req, res) => {
    const id = req.query.id as string;
    const song = req.query.song as string;
    const channel = await client.channels.fetch(id);
    if (channel instanceof VoiceChannel) {
        await PlayFromRandom(channel, song);
        res.send(true);
    } else {
        res.send(false);
    }
});
app.post("/api/bot/specific/", async (req, res) => {
    const soundID = req.body.soundID as string;
    const channelID = req.body.channelID as string;
    const channel = await client.channels.fetch(channelID);
    if (channel instanceof VoiceChannel) {
        await PlayFromRandom(
            channel,
            soundID.replace(/(.wav)|(.mp3)/gm, "").toLowerCase()
        );
        res.send(true);
    } else {
        res.send(false);
    }
});

app.get("/api/bot/files", async (req, res) => {
    res.send(await QuerySounds());
});

app.post("/api/bot/teams", async (req, res) => {
    try {
        const moveModel = req.body as MoveModel;
        moveModel.channels.forEach(async (channel) => {
            const guild = client.guilds.cache.find(
                (g) => g.id == moveModel.guildId
            );
            const targetChannel = guild.channels.cache.find(
                (c) => c.id == channel.id
            );
            const userVoiceStates = channel.users.map((user) => {
                return guild.voiceStates.cache.find(
                    (vs) => vs.member.id == user
                );
            });
            userVoiceStates.forEach(async (uVS) => {
                if (uVS != null && uVS.channelID != targetChannel.id)
                    await uVS.setChannel(targetChannel);
            });
        });
        res.status(200).send(true);
    } catch (ex) {
        console.log(ex);
        res.status(500);
    }
});

app.get("/api/bot/guilds", async (req, res) => {
    try {
        const userId = req.query.DiscordID as string;

        const guilds = await asyncFilter(
            [...client.guilds.cache.values()],
            async (guild: Guild) => {
                const user = await guild.members
                    .fetch({
                        user: userId,
                        cache: true,
                    })
                    .catch(() => {
                        return null;
                    });
                return user != null;
            }
        );

        const mappedGuilds = guilds.map((guild) => {
            return {
                id: guild.id,
                name: guild.name,
                icon: guild.iconURL(),
                channels: guild.channels.cache.reduce((filtered, channel) => {
                    if (
                        channel.type == "voice" &&
                        channel.id != guild.afkChannelID
                    ) {
                        const currentVoiceUsers =
                            guild.voiceStates.cache.reduce((acc, user) => {
                                if (
                                    user.channelID == channel.id &&
                                    !user.member.user.bot
                                ) {
                                    const mappedUser = {
                                        id: user.id,
                                        name:
                                            user.member.nickname ??
                                            user.member.displayName,
                                        picture: user.member.user.avatarURL(),
                                    };
                                    acc.push(mappedUser);
                                }
                                return acc;
                            }, []);
                        const mappedChannel = {
                            id: channel.id,
                            name: channel.name,
                            currentUsers: currentVoiceUsers,
                        };
                        filtered.push(mappedChannel);
                    }
                    return filtered;
                }, []),
            };
        });
        res.send(mappedGuilds);
    } catch (err) {
        console.log(err);
        res.send([]);
    }
});

app.get("/api/bot/users/:guildId/:channelId", async (req, res) => {
    const { channelId, guildId } = req.params;
    const guild = client.guilds.cache.find((g) => g.id == guildId);
    const currentVoiceUsers = guild.voiceStates.cache.filter(
        (k) => k.channelID == channelId
    );
    const mappedUsers = currentVoiceUsers.map((user) => {
        return {
            id: user.id,
            name: user.member.nickname,
            picture: user.member.user.avatarURL(),
        };
    });
    res.status(200).json(mappedUsers);
});

const port = process.env.PORT || 3030;

app.listen(port, () => console.log("API running" + port));
