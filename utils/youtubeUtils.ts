import { Message, Guild } from "discord.js";
import yts from "yt-search";
import ytdl from "ytdl-core";
import { IQueueContruct, IYoutubeSong } from "../types/DiscordTypes";
import { prefix, regYoutube } from "../types/Constants";

const queue = new Map<string, IQueueContruct>();

export async function execute(
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

export function skip(message: Message, serverQueue: IQueueContruct) {
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

export function stop(message: Message, serverQueue: IQueueContruct) {
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

export function play(guild: Guild, song: IYoutubeSong) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
    }
    if (song.url == null) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
    }

    const dispatcher = serverQueue.connection
        .play(ytdl(song.url))
        .on("finish", () => {
            serverQueue.songs.shift();
            play(guild, serverQueue.songs[0]);
        })
        .on("error", (error) => {
            console.error(error);
        });
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    serverQueue.textChannel.send(
        `Start playing: **${song.title}** <:pog:710437255231176764>`
    );
}
