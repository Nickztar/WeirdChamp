const { Client } = require("discord.js");
const yts = require("yt-search");
const ytdl = require("ytdl-core");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const aws = require("aws-sdk");

const client = new Client();
const queue = new Map();
aws.config.update({
    region: 'eu-north-1',
    accessKeyId: process.env.S3_ID,
    secretAccessKey: process.env.S3_KEY
});
const s3 = new aws.S3({apiVersion: '2006-03-01'});
var whitelist = [
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
// app.use(cors());
//Statics
const prefix = "!"; //Should be in DB probably, persist though restarts
const regYoutube = /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;

//Sound files
const fileMap = new Map();
const fileSet = new Map();
s3.listObjects({ Bucket: 'weirdchamp' }, function (err, data) {
    if(err)throw err;
    data.Contents.forEach(function(file, index){
        var key = file.Key;
        fileSet.set(key.replace(".mp3", "").toLowerCase(), key);
        fileMap.set(index, key);
    })
});

//States
let isReady = true; //Not sure how this is supposed to work for multiple servers?
let weirdchampStatus = true; //Should be in DB probably, persist though restarts

app.get("/api/bot/random/:id", async (req, res) => {
    const { id } = req.params;
    const channel = await client.channels.fetch(id);
    await playRandom(channel);
    res.send(true);
});

app.get("/api/bot/specific/", async (req, res) => {
    const { id, song } = req.query;
    const channel = await client.channels.fetch(id);
    await playFromRandom(channel, song);
    res.send(true);
});

app.get("/api/bot/files", async (req, res) => {
    res.send([...fileSet.keys()]);
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
        .setActivity("+weirdchamp")
        .then((presence) =>
            console.log(`Activity set to ${presence.activities[0].name}`)
        )
        .catch(console.error);
    console.log(`Logged in as ${client.user.tag}!`);
});

//Various on message commands.

client.on("message", async (msg) => {
    if (msg.author.bot) return; //Stops replying to own commands
    if (msg.channel.type !== "text") return; //Stops crash on PM

    if (msg.content === "<:weird:668843974504742912>") {
        msg.reply(
            "https://tenor.com/view/weird-champ-weird-champ-pogchamp-pog-gif-13780848"
        );
    }
    if (weirdchampStatus) {
        const weirdchamp = msg.guild.emojis.cache.find(
            (emoji) => emoji.name === "weird"
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
    } else if (msg.content.startsWith(`${prefix}goodbot`)) {
        msg.reply("Thank you sir! <:Happy:711247709729718312>");
        return;
    } else if (msg.content.startsWith(`${prefix}songs`)) {
        var string = "**Songs: " + `(${fileSet.size})**` + "```";
        fileSet.forEach((value, key, map) => {
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
        const search = message.content.replace(`${prefix}search `, '');
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
            console.error(error)
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
            const url = getS3Url(key)
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
            const url = getS3Url(key)
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

function getS3Url(key){
    const url = s3.getSignedUrl('getObject', {
        Bucket: 'weirdchamp',
        Key: key,
        Expires: 60
    })
    return url;
}
//Utility functions
function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}
