import { Client, Guild, GuildMember, Message, VoiceChannel } from "discord.js";
import yts from "yt-search";
import ytdl from "ytdl-core";
import express from "express";
import cors from "cors";
import { IQueueContruct, IYoutubeSong } from "../types/DiscordTypes";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import aws from "aws-sdk";
import disbut from "discord-buttons";
import { AWS, ExpressConst } from "../types/Constants";
import { asyncFilter } from "../utils/asyncFilter";

const client = new Client();
dotenv.config();
const app = express();
disbut(client);
// const disbut = require("discord-buttons")(client);
const queue = new Map<string, IQueueContruct>();
aws.config.update({
    region: AWS.REGION,
    accessKeyId: process.env.S3_ID,
    secretAccessKey: process.env.S3_KEY,
});
const s3 = new aws.S3({ apiVersion: AWS.API_VERSION });
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
// Statics
const prefix = "!"; // Should be in DB probably, persist though restarts
const regYoutube =
    /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;

//Sound files
let fileMap = new Map();
let fileSet = new Map();
let s3Files = [];
s3.listObjects({ Bucket: AWS.S3_BUCKET }, function (err, data) {
    if (err) throw err;
    data.Contents.forEach(function (file, index) {
        const key = file.Key;
        fileSet.set(key.replace(/(.wav)|(.mp3)/gm, "").toLowerCase(), key);
        fileMap.set(index, key);
        s3Files.push(file);
    });
});

// States
let isReady = true; // Not sure how this is supposed to work for multiple servers?
let weirdchampStatus = true; // Should be in DB probably, persist though restarts

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
    const fileName = req.body.fileName;
    const fileType = req.body.fileType;
    // Set up the payload of what we are sending to the S3 api
    const s3Params = {
        Bucket: AWS.S3_BUCKET,
        Key: fileName,
        Expires: 500,
        ContentType: fileType,
        ACL: "public-read",
    };
    // Make a request to the S3 API to get a signed URL which we can use to upload our file
    s3.getSignedUrl("putObject", s3Params, (err, data) => {
        if (err) {
            console.log(err);
            res.json({ success: false, error: err });
        }
        // Data payload of what we are sending back, the url of the signedRequest and a URL where we can access the content after its saved.
        const returnData = {
            signedRequest: data,
            url: `https://${AWS.S3_BUCKET}.s3.amazonaws.com/${fileName}`,
        };
        // Send it all back
        res.json({ success: true, data: { returnData } });
    });
});

app.get("/api/bot/random/:id", async (req, res) => {
    const { id } = req.params;
    const channel = await client.channels.fetch(id);
    if (channel instanceof VoiceChannel) {
        await playRandom(channel);
        res.send(true);
    } else {
        res.send(false);
    }
});

app.get("/api/bot/fetchSounds", async (req, res) => {
    fileMap = new Map();
    fileSet = new Map();
    s3Files = [];
    getS3Files().then(() => {
        res.send("cool");
    });
});

app.get("/api/bot/specific/", async (req, res) => {
    const id = req.query.id as string;
    const song = req.query.song as string;
    const channel = await client.channels.fetch(id);
    if (channel instanceof VoiceChannel) {
        await playFromRandom(channel, song);
        res.send(true);
    } else {
        res.send(false);
    }
});
app.post("/api/bot/specific/", async (req, res) => {
    const soundID = req.query.soundID as string;
    const channelID = req.query.channelID as string;
    const channel = await client.channels.fetch(channelID);
    if (channel instanceof VoiceChannel) {
        await playFromRandom(
            channel,
            soundID.replace(/(.wav)|(.mp3)/gm, "").toLowerCase()
        );
        res.send(true);
    } else {
        res.send(false);
    }
});

app.get("/api/bot/files", async (req, res) => {
    const fileArr = [...fileSet.keys()];
    fileArr.sort((a, b) => {
        const nameA = a.toLowerCase(),
            nameB = b.toLowerCase();
        if (nameA < nameB)
            // sort string ascending
            return -1;
        if (nameA > nameB) return 1;
        return 0; // default return value (no sorting)
    });
    res.send(s3Files);
});

app.post("/api/bot/teams", async (req, res) => {
    try {
        const moveModel = req.body;
        await moveModel.channels.forEach(async (channel) => {
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
            await userVoiceStates.forEach(async (uVS) => {
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
    const userId = req.query.DiscordID as string;

    const guilds = await asyncFilter(
        [...client.guilds.cache.values()],
        async (guild: Guild) => {
            const user = await guild.members.fetch(userId);
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
                    const currentVoiceUsers = guild.voiceStates.cache.reduce(
                        (acc, user) => {
                            if (
                                user.channelID == channel.id &&
                                !user.member.user.bot
                            ) {
                                const mappedUser = {
                                    id: user.id,
                                    name: user.member.nickname,
                                    picture: user.member.user.avatarURL(),
                                };
                                acc.push(mappedUser);
                            }
                            return acc;
                        },
                        []
                    );
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
client.login(process.env.DISCORD_KEY);

// When user is ready
client.on("ready", () => {
    client.user
        .setActivity(`${prefix}weirdchamp`)
        .then((presence) =>
            console.log(`Activity set to ${presence.activities[0].name}`)
        )
        .catch(console.error);
    console.log(`Logged in as ${client.user.tag}!`);
});

// Various on message commands.
//@ts-ignore
client.on("clickButton", async (button) => {
    const channel = await client.channels.fetch("621035571057524737");
    const isVoice = channel instanceof VoiceChannel;
    if (button.id === "play_random") {
        if (!channel || !isVoice)
            return button.channel.send(
                "You're not in a voice channel! <:weird:668843974504742912>"
            );
        await playRandom(channel as VoiceChannel);
        await button.defer();
    } else {
        const channel = await client.channels.fetch("621035571057524737");
        const fileName = button.id.replace("play_", "");
        if (fileSet.has(fileName) && isVoice) {
            await playFromRandom(
                channel as VoiceChannel,
                fileName.toLowerCase()
            );
        }
        await button.defer();
    }
});
client.on("message", async (msg) => {
    if (msg.author.bot) return; // Stops replying to own commands
    if (msg.channel.type !== "text") return; // Stops crash on PM
    if (msg.channel.name == "simcraftbot") return;
    if (msg.content === "<:weird:668843974504742912>") {
        msg.reply(
            "https://tenor.com/view/weird-champ-weird-champ-pogchamp-pog-gif-13780848"
        );
    }
    if (weirdchampStatus) {
        const weirdchamp = msg.guild.emojis.cache.find(
            (emoji) => emoji.name === "peppoChristmas"
        );
        if (weirdchamp != null) {
            msg.react(weirdchamp);
        }
    }

    // Commands below
    if (!msg.content.startsWith(prefix)) return;

    const serverQueue = queue.get(msg.guild.id);

    if (msg.content.startsWith(`${prefix}play`)) {
        await execute(msg, serverQueue, false);
        return;
    } else if (msg.content.startsWith(`${prefix}skip`)) {
        skip(msg, serverQueue);
        return;
    } else if (msg.content.startsWith(`${prefix}search`)) {
        await execute(msg, serverQueue, true);
        return;
    } else if (msg.content.startsWith(`${prefix}stop`)) {
        stop(msg, serverQueue);
        return;
    } else if (msg.content.startsWith(`${prefix}weirdchamp`)) {
        msg.reply(
            "https://tenor.com/view/weird-champ-weird-champ-pogchamp-pog-gif-13780848"
        );
        return;
    } else if (msg.content.startsWith(`${prefix}togglewc`)) {
        weirdchampStatus = !weirdchampStatus;
        msg.reply(
            weirdchampStatus
                ? `\nWeirdchamp enabled <:weird:668843974504742912>`
                : `\nWeirdchamp disabled ❌`
        );
        return;
    } else if (msg.content.startsWith(`${prefix}fetch`)) {
        fileMap = new Map();
        fileSet = new Map();
        s3Files = [];
        s3.listObjects({ Bucket: AWS.S3_BUCKET }, function (err, data) {
            if (err) throw err;
            data.Contents.forEach(function (file, index) {
                const key = file.Key;
                fileSet.set(key.replace(".mp3", "").toLowerCase(), key);
                fileMap.set(index, key);
                s3Files.push(file);
            });
        });
    } else if (msg.content.startsWith(`${prefix}goodbot`)) {
        msg.reply("Thank you sir! <:Happy:711247709729718312>");
        return;
    } else if (msg.content.startsWith(`${prefix}songs`)) {
        let string = "**Songs: " + `(${fileSet.size})**` + "```";
        const fileArr = [...fileSet.keys()];
        fileArr.sort((a, b) => {
            const nameA = a.toLowerCase(),
                nameB = b.toLowerCase();
            if (nameA < nameB)
                // sort string ascending
                return -1;
            if (nameA > nameB) return 1;
            return 0; // default return value (no sorting)
        });
        fileArr.forEach((key) => {
            string += `${key}\n`;
        });
        string += "```";
        msg.reply(string);
        return;
    } else if (msg.content.startsWith(`${prefix}commands`)) {
        msg.reply(
            "All my commands are listed here: https://github.com/Nickztar/WeirdChamp/blob/master/readme.md"
        );
        return;
    } else if (msg.content.startsWith(`${prefix}random`)) {
        const voiceChannel = msg.member.voice.channel;
        const args = msg.content.split(" ");
        if (!voiceChannel)
            return msg.channel.send(
                "You're not in a voice channel! <:weird:668843974504742912>"
            );
        const permissions = voiceChannel.permissionsFor(msg.client.user);
        if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
            return msg.channel.send(
                "No permission <:weird:668843974504742912>"
            );
        }
        if (fileSet.has(args[1])) {
            await playFromRandom(voiceChannel, args[1].toLowerCase());
            return;
        } else {
            await playRandom(voiceChannel);
        }
    } else if (msg.content.startsWith(`${prefix}inhouse`)) {
        const voiceChannel = msg.member.voice.channel;
        const args = msg.content.split(" ");
        if (!voiceChannel)
            return msg.channel.send(
                "You're not in a voice channel! <:weird:668843974504742912>"
            );
        const secondChannel = msg.guild.channels.cache.get(
            args[1] || "787071620622581790"
        );

        const channels = [voiceChannel, secondChannel];
        const members = [...voiceChannel.members.values()];
        function shuffleArray(array: Array<GuildMember>) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
        }
        shuffleArray(members);
        let teamNumber = 0;
        const numteams = 2;
        for (let i = 0; i < members.length; i++) {
            const member = members[i];
            await member.voice.setChannel(channels[teamNumber]);
            teamNumber += 1;
            if (teamNumber == numteams) teamNumber = 0;
        }
    } else if (msg.content.startsWith(`${prefix}button`)) {
        const button = new disbut.MessageButton()
            .setStyle("blurple") // default: blurple
            .setLabel("Play sound") // default: NO_LABEL_PROVIDED
            .setID("play_random"); // note: if you use the style "url" you must provide url using .setURL('https://example.com')

        msg.channel.send(
            "Click here to play random sound <:Happy:711247709729718312>",
            {
                //@ts-ignore
                buttons: [button],
            }
        );
    } else if (msg.content.startsWith(`${prefix}megabutton`)) {
        const soundButtons: Array<disbut.MessageButton> = [];
        const fileArr = [...fileSet.keys()];
        fileArr.sort((a, b) => {
            const nameA = a.toLowerCase(),
                nameB = b.toLowerCase();
            if (nameA < nameB)
                // sort string ascending
                return -1;
            if (nameA > nameB) return 1;
            return 0; // default return value (no sorting)
        });
        fileArr.forEach((key) => {
            const button = new disbut.MessageButton()
                .setStyle("blurple") // default: blurple
                .setLabel(key) // default: NO_LABEL_PROVIDED
                .setID(`play_${key}`); // note: if you use the style "url" you must provide url using .setURL('https://example.com')
            soundButtons.push(button);
        });
        let buttonCache: Array<disbut.MessageButton> = [];
        soundButtons.forEach((btn, i) => {
            buttonCache.push(btn);
            if (buttonCache.length == 5 || i == soundButtons.length - 1) {
                msg.channel.send(".", {
                    //@ts-ignore
                    buttons: [...buttonCache],
                });
                buttonCache = [];
            }
        });
    } else {
        msg.channel.send("Not a valid command! <:weird:668843974504742912>");
        return;
    }
});

// React to someone reacting with :Pet:
client.on("messageReactionAdd", async (msgRect) => {
    if (weirdchampStatus) {
        if (msgRect.me) return;
        if (msgRect.emoji.name == "pet") {
            msgRect.message.reply("<:KEKW:652170559047598081>");
        }
        if (msgRect.emoji.name == "weird") {
            if (msgRect.message.content.startsWith(`${prefix}random`)) {
                const voiceChannel = msgRect.message.member.voice.channel;
                if (!voiceChannel)
                    return msgRect.message.channel.send(
                        "You're not in a voice channel! <:weird:668843974504742912>"
                    );
                const permissions = voiceChannel.permissionsFor(
                    msgRect.message.client.user
                );
                if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
                    return msgRect.message.channel.send(
                        "No permission <:weird:668843974504742912>"
                    );
                }
                await playRandom(voiceChannel);
            }
        }
    }
});

// Join when a user joins play random sounds
client.on("voiceStateUpdate", async (oldMember, newMember) => {
    const newUserChannel = newMember.channel;
    const oldUserChannel = oldMember.channel;
    if (newMember.id != process.env.CLIENT_ID && isReady) {
        if (newUserChannel !== null) {
            if (oldUserChannel != newUserChannel) {
                await playRandom(newUserChannel);
            }
        }
    }
});

// Client login
// Youtube functions
async function execute(
    message: Message,
    serverQueue: IQueueContruct,
    find: boolean
) {
    const args = message.content.split(" ");

    const voiceChannel = message.member.voice.channel;
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
    let song;
    if (find) {
        const search = message.content.replace(`${prefix}search `, "");
        const finds = await yts(search.toLowerCase());
        const videos = finds.videos;
        const songInfo = videos[0];
        if (!songInfo) {
            return message.channel.send(
                `Couldn't find ${search} <:weird:668843974504742912>`
            );
        }
        song = {
            title: songInfo.title,
            url: songInfo.url,
        };
    } else {
        if (!args[1].match(regYoutube)) {
            return message.channel.send(
                "This is not valid fucking youtube link! <:weird:668843974504742912>"
            );
        }
        const songInfo = await ytdl.getInfo(args[1]);
        song = {
            title: songInfo.videoDetails.title,
            url: songInfo.videoDetails.video_url,
        };
    }

    if (!serverQueue) {
        const queueContruct: IQueueContruct = {
            textChannel: message.channel,
            voiceChannel,
            connection: null,
            songs: [],
            volume: 2,
            playing: true,
        };
        queue.set(message.guild.id, queueContruct);

        queueContruct.songs.push(song);

        try {
            const connection = await voiceChannel.join();
            queueContruct.connection = connection;
            play(message.guild, queueContruct.songs[0]);
        } catch (err) {
            console.log(err);
            queue.delete(message.guild.id);
            return message.channel.send(err);
        }
    } else {
        serverQueue.songs.push(song);
        return message.channel.send(
            `${song.title} has been added to the queue! <:Happy:711247709729718312>`
        );
    }
}

function skip(message: Message, serverQueue: IQueueContruct) {
    if (!message.member.voice.channel)
        return message.channel.send(
            "Join a voice channel to skip the music! <:pepega:709781824771063879>"
        );
    if (!serverQueue)
        return message.channel.send(
            "No song to skip! <:pepega:709781824771063879>"
        );
    if (!serverQueue.connection.dispatcher) {
        return;
    }
    serverQueue.connection.dispatcher.end();
}

function stop(message: Message, serverQueue: IQueueContruct) {
    if (!message.member.voice.channel)
        return message.channel.send(
            "Join a voice channel to stop the music! <:pepega:709781824771063879>"
        );
    if (!serverQueue)
        return message.channel.send(
            "Something went fucking wrong! <:pepelaugh:699711830523773040>"
        );
    serverQueue.songs = [];
    serverQueue.connection.dispatcher.end();
}

function play(guild: Guild, song: IYoutubeSong) {
    const serverQueue = queue.get(guild.id);
    isReady = false;
    if (!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        isReady = true;
        return;
    }
    if (song.url == null) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        isReady = true;
        return;
    }

    const dispatcher = serverQueue.connection
        .play(ytdl(song.url))
        .on("finish", () => {
            serverQueue.songs.shift();
            isReady = true;
            play(guild, serverQueue.songs[0]);
        })
        .on("error", (error) => {
            console.error(error);
            isReady = true;
        });
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    serverQueue.textChannel.send(
        `Start playing: **${song.title}** <:pog:710437255231176764>`
    );
}

async function playRandom(channel: VoiceChannel) {
    if (isReady) {
        try {
            const connection = await channel.join();
            isReady = false;
            const randNummer = getRandomInt(fileMap.size);
            const key = fileMap.get(randNummer);
            const url = getS3Url(key);
            const dispatcher = connection.play(url, {
                volume: 0.5,
            });
            console.log(`${Date.now()} random:` + key);
            dispatcher.on("finish", () => {
                console.log("Finished playing");
                channel.leave();
                setTimeout(() => (isReady = true), 2000);
            });
            dispatcher.on("error", (error) => console.error(error));
        } catch (err) {
            isReady = true;
            console.log("Something went wrong Ex:" + err);
        }
    }
}
async function playFromRandom(channel: VoiceChannel, song: string) {
    if (isReady) {
        try {
            const connection = await channel.join();
            isReady = false;
            const key = fileSet.get(song);
            const url = getS3Url(key);
            const dispatcher = connection.play(url, {
                volume: 0.5,
            });
            console.log(`${Date.now()} selected:` + key);
            dispatcher.on("finish", () => {
                console.log("Finished playing");
                channel.leave();
                setTimeout(() => (isReady = true), 2000);
            });
            dispatcher.on("error", (error) => console.error(error));
        } catch (err) {
            isReady = true;
            console.log(`${Date.now()} Something went wrong Ex: ` + err);
        }
    }
}

function getS3Url(key: string) {
    const url = s3.getSignedUrl("getObject", {
        Bucket: AWS.S3_BUCKET,
        Key: key,
        Expires: 60,
    });
    return url;
}
// Utility functions
function getRandomInt(max: number) {
    return Math.floor(Math.random() * Math.floor(max));
}

const getS3Files = async () => {
    return new Promise((resolve, reject) => {
        s3.listObjects({ Bucket: AWS.S3_BUCKET }, function (err, data) {
            if (err) reject();
            data.Contents.forEach(function (file, index) {
                let key = file.Key;
                fileSet.set(
                    key.replace(/(.wav)|(.mp3)/gm, "").toLowerCase(),
                    key
                );
                fileMap.set(index, key);
                s3Files.push(file);
            });
            resolve(true);
        });
    });
};
