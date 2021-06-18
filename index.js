const { Client } = require("discord.js");
const yts = require("yt-search");
const ytdl = require("ytdl-core");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const bodyParser = require("body-parser");
const aws = require("aws-sdk");
const client = new Client();
const disbut = require("discord-buttons")(client);
const queue = new Map();
aws.config.update({
    region: "eu-north-1",
    accessKeyId: process.env.S3_ID,
    secretAccessKey: process.env.S3_KEY,
});
const S3_BUCKET = "weirdchamp";
const s3 = new aws.S3({ apiVersion: "2006-03-01" });
var whitelist = [
    "http://localhost:3000",
    "https://weirdchamp-next.vercel.app",
    "https://weirdchamp.wtf",
    "https://www.weirdchamp.wtf",
    "https://dev.weirdchamp.wtf",
    "https://weirdchamp.vercel.app",
    "https://www.weirdchamp.vercel.app",
];
var corsOptions = {
    origin: function (origin, callback) {
        if (whitelist.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error(`Not allowed by CORS. ORIGIN: ${origin}`));
        }
    },
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
// app.use(cors());
//Statics
const prefix = "!"; //Should be in DB probably, persist though restarts
const regYoutube =
    /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;

//Sound files
const fileMap = new Map();
const fileSet = new Map();
const s3Files = [];
s3.listObjects({ Bucket: S3_BUCKET }, function (err, data) {
    if (err) throw err;
    data.Contents.forEach(function (file, index) {
        var key = file.Key;
        fileSet.set(key.replace(/(.wav)|(.mp3)/gm, "").toLowerCase(), key);
        fileMap.set(index, key);
        s3Files.push(file);
    });
});

//States
let isReady = true; //Not sure how this is supposed to work for multiple servers?
let weirdchampStatus = true; //Should be in DB probably, persist though restarts

// Routes
app.use("/api/discord", require("./discord"));

app.get("/api/aws/geturlbykey", async (req, res) => {
    const key = req.query.key;
    const url = getS3Url(key);
    res.send(url);
});

app.get("/api/youtube/mp3", async function (req, res) {
    try {
        const videoUrl = req.query.videoUrl;
        const songInfo = await ytdl.getInfo(videoUrl);
        if (songInfo.videoDetails.lengthSeconds > 5 * 60)
            //No more than 5 minutes...
            res.status(403);
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
        res.status(500);
    }
});

app.post("/api/aws/signedurl", async (req, res) => {
    const fileName = req.body.fileName;
    const fileType = req.body.fileType;
    // Set up the payload of what we are sending to the S3 api
    const s3Params = {
        Bucket: S3_BUCKET,
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
            url: `https://${S3_BUCKET}.s3.amazonaws.com/${fileName}`,
        };
        // Send it all back
        res.json({ success: true, data: { returnData } });
    });
});

app.get("/api/bot/random/:id", async (req, res) => {
    const { id } = req.params;
    const channel = await client.channels.fetch(id);
    await playRandom(channel);
    res.send(true);
});

app.get("/api/bot/fetchSounds", async (req, res) => {
    fileMap = new Map();
    fileSet = new Map();
    s3.listObjects({ Bucket: "weirdchamp" }, function (err, data) {
        if (err) throw err;
        data.Contents.forEach(function (file, index) {
            var key = file.Key;
            fileSet.set(key.replace(".mp3", "").toLowerCase(), key);
            fileMap.set(index, key);
        });
    });
});

app.get("/api/bot/specific/", async (req, res) => {
    const { id, song } = req.query;
    const channel = await client.channels.fetch(id);
    await playFromRandom(channel, song);
    res.send(true);
});
app.post("/api/bot/specific/", async (req, res) => {
    const { soundID, channelID } = req.body;
    const channel = await client.channels.fetch(channelID);
    await playFromRandom(
        channel,
        soundID.replace(/(.wav)|(.mp3)/gm, "").toLowerCase()
    );
    res.send(true);
});

app.get("/api/bot/files", async (req, res) => {
    var fileArr = [...fileSet.keys()];
    fileArr.sort((a, b) => {
        var nameA = a.toLowerCase(),
            nameB = b.toLowerCase();
        if (nameA < nameB)
            //sort string ascending
            return -1;
        if (nameA > nameB) return 1;
        return 0; //default return value (no sorting)
    });
    res.send(s3Files);
});

app.get("/api/bot/guilds", async (req, res) => {
    //Auth user from firebase (?)
    //Get all guilds
    //Get the guilds where guilds.members.contains(user.DiscordID)
    //Return those guilds
    res.send(client.guilds.cache);
});

app.get("/api/bot/channels/:guildId", async (req, res) => {
    const { guildId } = req.params;
    const guild = client.guilds.cache.find((x) => x.id == guildId);
    res.send(guild.channels.cache);
});

const port = process.env.PORT || 3030;

app.listen(port, console.log("API running" + port));
client.login(process.env.DISCORD_KEY);

//When user is ready
client.on("ready", () => {
    client.user
        .setActivity(`${prefix}weirdchamp`)
        .then((presence) =>
            console.log(`Activity set to ${presence.activities[0].name}`)
        )
        .catch(console.error);
    console.log(`Logged in as ${client.user.tag}!`);
});

//Various on message commands.
client.on("clickButton", async (button) => {
    if (button.id === "play_random") {
        const channel = await client.channels.fetch("621035571057524737");
        if (!channel)
            return button.channel.send(
                "You're not in a voice channel! <:weird:668843974504742912>"
            );
        await playRandom(channel);
        await button.defer();
    } else {
        const channel = await client.channels.fetch("621035571057524737");
        var fileName = button.id.replace("play_", "");
        if (fileSet.has(fileName)) {
            await playFromRandom(channel, fileName.toLowerCase());
        }
        await button.defer();
    }
});
client.on("message", async (msg) => {
    if (msg.author.bot) return; //Stops replying to own commands
    if (msg.channel.type !== "text") return; //Stops crash on PM
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

    //Commands below
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
        s3.listObjects({ Bucket: "weirdchamp" }, function (err, data) {
            if (err) throw err;
            data.Contents.forEach(function (file, index) {
                var key = file.Key;
                fileSet.set(key.replace(".mp3", "").toLowerCase(), key);
                fileMap.set(index, key);
                s3Files.push(file);
            });
        });
    } else if (msg.content.startsWith(`${prefix}goodbot`)) {
        msg.reply("Thank you sir! <:Happy:711247709729718312>");
        return;
    } else if (msg.content.startsWith(`${prefix}songs`)) {
        var string = "**Songs: " + `(${fileSet.size})**` + "```";
        var fileArr = [...fileSet.keys()];
        fileArr.sort((a, b) => {
            var nameA = a.toLowerCase(),
                nameB = b.toLowerCase();
            if (nameA < nameB)
                //sort string ascending
                return -1;
            if (nameA > nameB) return 1;
            return 0; //default return value (no sorting)
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
        function shuffleArray(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
        }
        shuffleArray(members);
        let teamNumber = 0;
        let numteams = 2;
        for (let i = 0; i < members.length; i++) {
            let member = members[i];
            await member.voice.setChannel(channels[teamNumber]);
            teamNumber += 1;
            if (teamNumber == numteams) teamNumber = 0;
        }
    } else if (msg.content.startsWith(`${prefix}button`)) {
        let button = new disbut.MessageButton()
            .setStyle("blurple") //default: blurple
            .setLabel("Play sound") //default: NO_LABEL_PROVIDED
            .setID("play_random"); //note: if you use the style "url" you must provide url using .setURL('https://example.com')

        msg.channel.send(
            "Click here to play random sound <:Happy:711247709729718312>",
            {
                buttons: [button],
            }
        );
    } else if (msg.content.startsWith(`${prefix}megabutton`)) {
        const soundButtons = [];
        var fileArr = [...fileSet.keys()];
        fileArr.sort((a, b) => {
            var nameA = a.toLowerCase(),
                nameB = b.toLowerCase();
            if (nameA < nameB)
                //sort string ascending
                return -1;
            if (nameA > nameB) return 1;
            return 0; //default return value (no sorting)
        });
        fileArr.forEach((key) => {
            let button = new disbut.MessageButton()
                .setStyle("blurple") //default: blurple
                .setLabel(key) //default: NO_LABEL_PROVIDED
                .setID(`play_${key}`); //note: if you use the style "url" you must provide url using .setURL('https://example.com')
            soundButtons.push(button);
        });
        let buttonCache = [];
        soundButtons.forEach((btn, i) => {
            buttonCache.push(btn);
            if (buttonCache.length == 5 || i == soundButtons.length - 1) {
                msg.channel.send(".", {
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

//React to someone reacting with :Pet:
client.on("messageReactionAdd", async (msgRect) => {
    if (weirdchampStatus) {
        if (msgRect.me) return;
        if (msgRect.emoji.name == "pet") {
            msgRect.message.reply("<:KEKW:652170559047598081>");
        }
        if (msgRect._emoji.name == "weird") {
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

//Join when a user joins play random sounds
client.on("voiceStateUpdate", async (oldMember, newMember) => {
    let newUserChannel = newMember.channel;
    let oldUserChannel = oldMember.channel;
    if (newMember.id != process.env.CLIENT_ID && isReady) {
        if (newUserChannel !== null) {
            if (oldUserChannel != newUserChannel) {
                await playRandom(newUserChannel);
            }
        }
    }
});

//Client login
//Youtube functions
async function execute(message, serverQueue, find) {
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
            title: songInfo.videoDetails.title,
            url: songInfo.videoDetails.video_url,
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
        const queueContruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 2,
            playing: true,
        };
        queue.set(message.guild.id, queueContruct);

        queueContruct.songs.push(song);

        try {
            var connection = await voiceChannel.join();
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

function skip(message, serverQueue) {
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

function stop(message, serverQueue) {
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

function play(guild, song) {
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

async function playRandom(channel) {
    if (isReady) {
        try {
            const connection = await channel.join();
            isReady = false;
            const randNummer = getRandomInt(fileMap.size);
            var key = fileMap.get(randNummer);
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
async function playFromRandom(channel, song) {
    if (isReady) {
        try {
            const connection = await channel.join();
            isReady = false;
            var key = fileSet.get(song);
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

function getS3Url(key) {
    const url = s3.getSignedUrl("getObject", {
        Bucket: "weirdchamp",
        Key: key,
        Expires: 60,
    });
    return url;
}
//Utility functions
function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}
