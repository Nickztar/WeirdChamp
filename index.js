const {
  Client
} = require('discord.js');
const ytdl = require('ytdl-core');
require('dotenv').config();
const client = new Client();
const fs = require('fs');
const path = require('path');
const queue = new Map();

//Statics
const prefix = '+';
const regYoutube = /^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;

//Sound files
const fileMap = new Map();
const files = fs.readdirSync('JoinSounds');
files.forEach((file, index) => {
  const fileName = path.join('Joinsounds', file);
  fileMap.set(index, fileName);
})

//States
let isReady = true;
let weirdchampStatus = true;

//When user is ready
client.on('ready', () => {
  client.user.setActivity('+weirdchamp')
    .then(presence => console.log(`Activity set to ${presence.activities[0].name}`))
    .catch(console.error);
  console.log(`Logged in as ${client.user.tag}!`);
});


//Various on message commands.

client.on('message', async msg => {
  if (msg.author.bot) return;

  if (msg.content === '<:weird:668843974504742912>') {
    msg.reply('https://tenor.com/view/weird-champ-weird-champ-pogchamp-pog-gif-13780848');
  }
  if (weirdchampStatus) {
    const weirdchamp = msg.guild.emojis.cache.find(emoji => emoji.name === 'weird');
    if (weirdchamp != null) {
      msg.react(weirdchamp);
    }
  }

  //Commands below
  if (!msg.content.startsWith(prefix)) return;

  const serverQueue = queue.get(msg.guild.id);

  if (msg.content.startsWith(`${prefix}play`)) {
    execute(msg, serverQueue);
    return;
  } else if (msg.content.startsWith(`${prefix}skip`)) {
    skip(msg, serverQueue);
    return;
  } else if (msg.content.startsWith(`${prefix}stop`)) {
    stop(msg, serverQueue);
    return;
  } else if (msg.content.startsWith(`${prefix}weirdchamp`)) {
    msg.reply('https://tenor.com/view/weird-champ-weird-champ-pogchamp-pog-gif-13780848');
  } else if (msg.content.startsWith(`${prefix}togglewc`)) {
    weirdchampStatus = !weirdchampStatus;
    msg.reply(weirdchampStatus ? `\nWeirdchamp enabled <:weird:668843974504742912>` : `\nWeirdchamp disabled ❌`);
  } else if (msg.content.startsWith(`${prefix}goodbot`)) {
    msg.reply('Thank you sir! <:Happy:711247709729718312>');
  } else if (msg.content.startsWith(`${prefix}commands`)) {
    msg.reply('All my commands are listed here: https://github.com/Nickztar/WeirdChamp/blob/master/readme.md');
  } else if (msg.content.startsWith(`${prefix}random`)) {
    const voiceChannel = msg.member.voice.channel;
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
    await playRandom(voiceChannel);
  } else {
    msg.channel.send("Not a valid command! <:weird:668843974504742912>");
  }
});

//React to someone reacting with :Pet:
client.on('messageReactionAdd', msgRect => {
  if (weirdchampStatus) {
    if (msgRect.emoji.name == 'pet') {
      msgRect.message.reply('<:KEKW:652170559047598081>')
    }
  }
})

//Join when a user joins play random sounds
client.on('voiceStateUpdate', async (oldMember, newMember) => {
  let newUserChannel = newMember.channel;
  let oldUserChannel = oldMember.channel;
  if (newMember.id != process.env.CLIENT_ID && isReady) {
    if (newUserChannel !== null) {
      if (oldUserChannel != newUserChannel) {
        await playRandom(newUserChannel)
      }
    }
  }
});

//Client login
client.login(process.env.DISCORD_KEY);

//Youtube functions
async function execute(message, serverQueue) {
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
  if (!args[1].match(regYoutube)) {
    return message.channel.send(
      "This is not valid fucking youtube link! <:weird:668843974504742912>"
    );
  }
  const songInfo = await ytdl.getInfo(args[1]);
  const song = {
    title: songInfo.title,
    url: songInfo.video_url
  };

  if (!serverQueue) {
    const queueContruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true
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
    return message.channel.send(`${song.title} has been added to the queue! <:Happy:711247709729718312>`);
  }
}

function skip(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "Join a voice channel to skip the music! <:pepega:709781824771063879>"
    );
  if (!serverQueue)
    return message.channel.send("No song to skip! <:pepega:709781824771063879>");
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

  if (!song.url.match(regYoutube)) {
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
    .on("error", error => console.error(error));
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
  serverQueue.textChannel.send(`Start playing: **${song.title}** <:pog:710437255231176764>`);
}

async function playRandom(channel) {
  const connection = await channel.join();
  const randNummer = getRandomInt(fileMap.size);
  const dispatcher = connection.play(fileMap.get(randNummer), {
    volume: 0.5,

  })
  console.log(fileMap.get(randNummer))
  dispatcher.on("finish", () => {
    console.log("Finished playing")
    channel.leave()
    isReady = false;
    setTimeout(() => isReady = true, 2000);
  })
  dispatcher.on("error", error => console.error(error));
}
//Utility functions
function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}