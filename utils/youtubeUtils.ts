import { Message, Guild, VoiceChannel } from "discord.js";
import yts from "yt-search";
import ytdl from "ytdl-core";
import { IQueueContruct, IYoutubeSong } from "../types/DiscordTypes";
import { regYoutube } from "../types/Constants";
import ytpl from "ytpl";
import * as config from "../bot.config";

const queue = new Map<string, IQueueContruct>();
export enum PlayType {
    Play,
    Search,
    Playlist,
}
export async function execute(message: Message, type: PlayType) {
    const args = message.content.split(" ");
    const serverQueue = queue.get(message.guild.id);
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel)
        return message.channel.send("You're not in a voice channel!");
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return message.channel.send("No permission");
    }

    if (type == PlayType.Playlist) {
        return executePlaylist(args, serverQueue, voiceChannel, message);
    }

    let song: IYoutubeSong;
    if (type == PlayType.Search) {
        const search = message.content.replace(`${config.PREFIX}search `, "");
        const finds = await yts(search.toLowerCase());
        const videos = finds.videos;
        const songInfo = videos[0];
        if (!songInfo) {
            return message.channel.send(`Couldn't find ${search}`);
        }
        song = {
            title: songInfo.title,
            url: songInfo.url,
        };
    } else {
        if (!args[1].match(regYoutube)) {
            return message.channel.send(
                "This is not valid fucking youtube link!"
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
            `${song.title} has been added to the queue!`
        );
    }
}

async function executePlaylist(
    args: string[],
    serverQueue: IQueueContruct,
    voiceChannel: VoiceChannel,
    message: Message
) {
    const playlist = args[1];
    const isUrl = playlist.includes("http");
    let playlistId = "";
    if (isUrl) {
        const fetchedId = await ytpl.getPlaylistID(playlist);
        playlistId = fetchedId;
    } else {
        const valid = ytpl.validateID(playlist);
        if (!valid) {
            return message.channel.send(
                "This is not valid fucking youtube playlist ID!"
            );
        }
        playlistId = playlist;
    }
    let newMessage = await message.channel.send(
        "Starting to process playlist..."
    );
    //fetch playlist from id
    const playlistInfo = await ytpl(playlistId, { pages: 1 });
    newMessage = await newMessage.edit(
        `Finished processing ${playlistInfo.title}`
    );
    const videos = playlistInfo.items;
    const songs: IYoutubeSong[] = [];
    for (const video of videos) {
        songs.push({
            title: video.title,
            url: video.url,
        });
    }
    if (serverQueue) {
        serverQueue.continuation = playlistInfo.continuation;
        serverQueue.songs = [...serverQueue.songs, ...songs];
        return message.channel.send(`Added ${songs.length} songs to queue!`);
    } else {
        const queueContruct: IQueueContruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: songs,
            volume: 5,
            playing: true,
            continuation: playlistInfo.continuation,
        };
        queue.set(message.guild.id, queueContruct);
        try {
            const connection = await voiceChannel.join();
            queueContruct.connection = connection;
            play(message.guild, queueContruct.songs[0]);
        } catch (err) {
            console.log(err);
            queue.delete(message.guild.id);
            return message.channel.send(err);
        }
        return message.channel.send(`Added ${songs.length} songs to queue!`);
    }
}

export function skip(message: Message) {
    try {
        const serverQueue = queue.get(message.guild.id);
        if (!message.member.voice.channel)
            return message.channel.send(
                "Join a voice channel to skip the music!"
            );
        if (!serverQueue) return message.channel.send("No song to skip!");
        if (!serverQueue.connection.dispatcher) {
            return;
        }
        serverQueue.connection.dispatcher.end();
    } catch (err) {
        console.log(err);
        return message.channel.send("Something went wrong");
    }
}

export function stop(message: Message) {
    try {
        const serverQueue = queue.get(message.guild.id);
        if (!message.member.voice.channel)
            return message.channel.send(
                "Join a voice channel to stop the music!"
            );
        if (!serverQueue)
            return message.channel.send("Something went fucking wrong!");
        serverQueue.songs = [];
        serverQueue.connection.dispatcher.end();
    } catch (err) {
        console.log(err);
        return message.channel.send("Something went wrong");
    }
}

export function play(guild: Guild, song: IYoutubeSong) {
    if (!queue.has(guild.id)) return;
    const serverQueue = queue.get(guild.id);
    try {
        //We ran out of songs in queue but we have continuation from playlist
        if (!song && serverQueue.continuation) {
            continuePlaylist(serverQueue);
            return;
        }
        //Ran out and there is no continuation
        if (!song) {
            serverQueue.voiceChannel.leave();
            queue.delete(guild.id);
            return;
        }
        //Not valid song, check the next one if its valid?
        if (song.url == null) {
            serverQueue.songs.shift();
            play(guild, serverQueue.songs[0]);
            return;
        }

        const dispatcher = serverQueue.connection
            .play(
                ytdl(song.url, { filter: "audioonly", quality: "highestaudio" })
            )
            .on("finish", () => {
                serverQueue.songs.shift();
                play(guild, serverQueue.songs[0]);
            })
            .on("error", (error) => {
                //Something went wrong, handle this somehow?
                console.error(error);
                serverQueue.songs.shift();
                play(guild, serverQueue.songs[0]);
            });
        dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
        serverQueue.textChannel.send(`Start playing: **${song.title}**`);
    } catch (err) {
        console.log(err);
        if (!song && serverQueue.continuation) {
            continuePlaylist(serverQueue);
            return;
        }
        //Ran out and there is no continuation
        if (!song) {
            serverQueue.voiceChannel.leave();
            queue.delete(guild.id);
            return;
        }
    }
}

async function continuePlaylist(serverQueue: IQueueContruct) {
    const continuationRes = await ytpl.continueReq(serverQueue.continuation);
    const videos = continuationRes.items;
    const songs: IYoutubeSong[] = [];
    for (const video of videos) {
        const songInfo = await ytdl.getInfo(video.url);
        songs.push({
            title: songInfo.videoDetails.title,
            url: songInfo.videoDetails.video_url,
        });
    }
    serverQueue.continuation = continuationRes.continuation;
    serverQueue.songs = [...songs, ...serverQueue.songs];

    play(serverQueue.voiceChannel.guild, serverQueue.songs[0]);

    return serverQueue.textChannel.send(
        `Ran out of songs, fetched ${songs.length} new songs to queue!`
    );
}
