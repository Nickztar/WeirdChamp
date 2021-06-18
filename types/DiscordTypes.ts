import {
    DMChannel,
    NewsChannel,
    TextChannel,
    VoiceChannel,
    VoiceConnection,
} from "discord.js";

export interface IQueueContruct {
    textChannel: TextChannel | DMChannel | NewsChannel;
    voiceChannel: VoiceChannel;
    connection: VoiceConnection;
    songs: IYoutubeSong[];
    volume: number;
    playing: boolean;
}

export interface IYoutubeSong {
    title: string;
    url: string;
}
