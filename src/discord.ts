import { Client, VoiceChannel } from "discord.js";
import { glob } from "glob"; // included by discord.js
import { promisify } from "util"; // Included by default
import { Command } from "../types/DiscordTypes";
import path from "path";
import dotenv from "dotenv";
import { default as DiscordButton } from "discord-buttons";
import aws from "aws-sdk";
import { getS3Files } from "../utils/s3Utils";
import { PlayFromRandom, PlayRandom } from "../utils/soundUtils";
import { AWS } from "../types/Constants";
dotenv.config();

aws.config.update({
    region: AWS.REGION,
    accessKeyId: process.env.S3_ID as string,
    secretAccessKey: process.env.S3_KEY as string,
});
const s3 = new aws.S3({ apiVersion: AWS.API_VERSION });

// Make `glob` return a promise
const globPromise = promisify(glob);

const commands: Command[] = [];
const client = new Client();
client.login(process.env.DISCORD_KEY);
DiscordButton(client);

//States?
let s3Files: aws.S3.Object[] = [];
let IsReady: boolean = false;
let weirdchampStatus: boolean = true;
const UpdateIsReady = (value: boolean) => {
    IsReady = value;
};

const SetS3Files = (value: aws.S3.Object[]) => {
    s3Files = value;
};

client.once("ready", async () => {
    // Load all JavaScript / TypeScript files so it works properly after compiling
    // Replace `test` with "await globPromise(`${__dirname}/commands/*.{.js,.ts}`)"
    // I just did this to fix SO's syntax highlighting!
    const commandsPath = path.join(__dirname, `../commands/*.ts`);
    const commandFiles = await globPromise(commandsPath);
    const currentFiles = await getS3Files();

    for (const s3File of currentFiles) {
        s3Files.push(s3File);
    }

    for (const file of commandFiles) {
        // I am not sure if this works, you could go for require(file) as well
        const command = (await import(file)) as Command;
        if (commands.find((x) => x.name == command.name)) {
            console.log(
                `Found duplicate in: ${file} with name: ${command.name}\n`
            );
            throw new Error("Duplicate found!");
        }
        commands.push(command);
    }
    client.user
        .setActivity(`${prefix}weirdchamp`)
        .then((presence) =>
            console.log(`Activity set to ${presence.activities[0].name}`)
        )
        .catch(console.error);
    IsReady = true;
    console.log(`Logged in as ${client.user.tag}!`);
});

const prefix = "!";

client.on("message", async (message) => {
    // Prevent the bot from replying to itself or other bots
    if (message.author.bot) return; // Stops replying to own commands
    if (message.channel.type !== "text") return; // Stops crash on PM
    if (message.channel.name == "simcraftbot") return;

    if (weirdchampStatus) {
        const weirdchamp = message.guild.emojis.cache.find(
            (emoji) => emoji.name === "peppoChristmas"
        );
        if (weirdchamp != null) {
            message.react(weirdchamp);
        }
    }

    const [commandName, ...args] = message.content
        .slice(prefix.length)
        .split(/ +/);

    const command = commands.find((c) => c.name === commandName);

    if (command) {
        await command.execute(message, args);
    } else {
        let string = "**My commands are: **```";
        commands.forEach((cmd, i) => {
            string += `${prefix + cmd.name}: ${cmd.description} ${
                i == commands.length - 1 ? "" : "\n"
            }`;
        });
        string += "```";
        message.reply(string);
    }
});

//@ts-ignore
client.on("clickButton", async (button) => {
    const channel = await client.channels.fetch("621035571057524737");
    const isVoice = channel instanceof VoiceChannel;
    if (button.id === "play_random") {
        if (!channel || !isVoice)
            return button.channel.send(
                "You're not in a voice channel! <:weird:668843974504742912>"
            );
        await PlayRandom(channel as VoiceChannel);
        await button.defer();
    } else {
        const channel = await client.channels.fetch("621035571057524737");
        const fileName = button.id.replace("play_", "");
        if (s3Files.find((x) => x.Key.includes(fileName)) && isVoice) {
            await PlayFromRandom(
                channel as VoiceChannel,
                fileName.toLowerCase()
            );
        }
        await button.defer();
    }
});

client.on("voiceStateUpdate", async (oldMember, newMember) => {
    const newUserChannel = newMember.channel;
    const oldUserChannel = oldMember.channel;
    if (newMember.id != process.env.CLIENT_ID && IsReady) {
        if (newUserChannel !== null) {
            if (oldUserChannel != newUserChannel) {
                await PlayRandom(newUserChannel);
            }
        }
    }
});

export {
    DiscordButton,
    s3Files,
    SetS3Files,
    IsReady,
    UpdateIsReady,
    client,
    s3,
};

//     if (msg.content.startsWith(`${prefix}togglewc`)) {
//         weirdchampStatus = !weirdchampStatus;
//         msg.reply(
//             weirdchampStatus
//                 ? `\nWeirdchamp enabled <:weird:668843974504742912>`
//                 : `\nWeirdchamp disabled ❌`
//         );
//         return;
//     }else
// if (msg.content.startsWith(`${prefix}fetch`)) {
//     fileMap = new Map();
//     fileSet = new Map();
//     s3Files = [];
//     const currentFiles = await getS3Files();
//     currentFiles.forEach((file, index) => {
//         const key = file.Key;
//         fileSet.set(key.replace(/(.wav)|(.mp3)/gm, "").toLowerCase(), key);
//         fileMap.set(index, key);
//         s3Files.push(file);
//     });
// } else if (msg.content.startsWith(`${prefix}goodbot`)) {
//     msg.reply("Thank you sir! <:Happy:711247709729718312>");
//     return;
// } else if (msg.content.startsWith(`${prefix}songs`)) {
//     let string = "**Songs: " + `(${fileSet.size})**` + "```";
//     const fileArr = [...fileSet.keys()];
//     fileArr.sort((a, b) => {
//         const nameA = a.toLowerCase(),
//             nameB = b.toLowerCase();
//         if (nameA < nameB)
//             // sort string ascending
//             return -1;
//         if (nameA > nameB) return 1;
//         return 0; // default return value (no sorting)
//     });
//     fileArr.forEach((key) => {
//         string += `${key}\n`;
//     });
//     string += "```";
//     msg.reply(string);
//     return;
// } else if (msg.content.startsWith(`${prefix}commands`)) {
//     msg.reply(
//         "All my commands are listed here: https://github.com/Nickztar/WeirdChamp/blob/master/readme.md"
//     );
//     return;
// } else
//  if (msg.content.startsWith(`${prefix}random`)) {
//     const voiceChannel = msg.member.voice.channel;
//     const args = msg.content.split(" ");
//     if (!voiceChannel)
//         return msg.channel.send(
//             "You're not in a voice channel! <:weird:668843974504742912>"
//         );
//     const permissions = voiceChannel.permissionsFor(msg.client.user);
//     if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
//         return msg.channel.send(
//             "No permission <:weird:668843974504742912>"
//         );
//     }
//     if (fileSet.has(args[1])) {
//         await playFromRandom(voiceChannel, args[1].toLowerCase());
//         return;
//     } else {
//         await playRandom(voiceChannel);
//     }
// } else if (msg.content.startsWith(`${prefix}inhouse`)) {
//     const voiceChannel = msg.member.voice.channel;
//     const args = msg.content.split(" ");
//     if (!voiceChannel)
//         return msg.channel.send(
//             "You're not in a voice channel! <:weird:668843974504742912>"
//         );
//     const secondChannel = msg.guild.channels.cache.get(
//         args[1] || "787071620622581790"
//     );

//     const channels = [voiceChannel, secondChannel];
//     const members = [...voiceChannel.members.values()];
//     function shuffleArray(array: Array<GuildMember>) {
//         for (let i = array.length - 1; i > 0; i--) {
//             const j = Math.floor(Math.random() * (i + 1));
//             [array[i], array[j]] = [array[j], array[i]];
//         }
//     }
//     shuffleArray(members);
//     let teamNumber = 0;
//     const numteams = 2;
//     for (let i = 0; i < members.length; i++) {
//         const member = members[i];
//         await member.voice.setChannel(channels[teamNumber]);
//         teamNumber += 1;
//         if (teamNumber == numteams) teamNumber = 0;
//     }
// } else if (msg.content.startsWith(`${prefix}button`)) {
//     const button = new disbut.MessageButton()
//         .setStyle("blurple") // default: blurple
//         .setLabel("Play sound") // default: NO_LABEL_PROVIDED
//         .setID("play_random"); // note: if you use the style "url" you must provide url using .setURL('https://example.com')

//     msg.channel.send(
//         "Click here to play random sound <:Happy:711247709729718312>",
//         {
//             //@ts-ignore
//             buttons: [button],
//         }
//     );
// } else if (msg.content.startsWith(`${prefix}megabutton`)) {
//     const soundButtons: Array<disbut.MessageButton> = [];
//     const fileArr = [...fileSet.keys()];
//     fileArr.sort((a, b) => {
//         const nameA = a.toLowerCase(),
//             nameB = b.toLowerCase();
//         if (nameA < nameB)
//             // sort string ascending
//             return -1;
//         if (nameA > nameB) return 1;
//         return 0; // default return value (no sorting)
//     });
//     fileArr.forEach((key) => {
//         const button = new disbut.MessageButton()
//             .setStyle("blurple") // default: blurple
//             .setLabel(key) // default: NO_LABEL_PROVIDED
//             .setID(`play_${key}`); // note: if you use the style "url" you must provide url using .setURL('https://example.com')
//         soundButtons.push(button);
//     });
//     let buttonCache: Array<disbut.MessageButton> = [];
//     soundButtons.forEach((btn, i) => {
//         buttonCache.push(btn);
//         if (buttonCache.length == 5 || i == soundButtons.length - 1) {
//             msg.channel.send(".", {
//                 //@ts-ignore
//                 buttons: [...buttonCache],
//             });
//             buttonCache = [];
//         }
//     });
// } else {
//     msg.channel.send("Not a valid command! <:weird:668843974504742912>");
//     return;
// }
