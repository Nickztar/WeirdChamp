import {
    DMChannel,
    Message,
    NewsChannel,
    TextChannel,
    VoiceChannel,
    VoiceConnection,
} from "discord.js";

export interface Command {
    name: string;
    description: string;
    isDisabled?: boolean;
    // Making `args` optional
    execute: (message: Message, args?: string[]) => any;
}

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

export interface MoveModel {
    guildId: string;
    channels: MoveChannel[];
}

export interface MoveChannel {
    id: string;
    users: string[];
}
