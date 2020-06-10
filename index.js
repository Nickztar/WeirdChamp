const {
  Client
} = require('discord.js');
require('dotenv').config();
const client = new Client();
const fs = require('fs');
const path = require('path');
const fileMap = new Map();
const files = fs.readdirSync('JoinSounds');
files.forEach((file, index) => {
  const fileName = path.join('Joinsounds', file);
  fileMap.set(index, fileName);
})

let isReady = true;
let weirdchampStatus = true;
client.on('ready', () => {
  client.user.setActivity('!weirdchamp')
    .then(presence => console.log(`Activity set to ${presence.activities[0].name}`))
    .catch(console.error);
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
  if (msg.content === '!weirdchamp') {
    msg.reply('https://tenor.com/view/weird-champ-weird-champ-pogchamp-pog-gif-13780848');
  }
  if (msg.content === '!togglewc') {
    weirdchampStatus = !weirdchampStatus;
    msg.reply(weirdchampStatus ? `\nWeirdchamp enabled <:weird:668843974504742912>` : `\nWeirdchamp disabled ❌`);
  }
  if (msg.content === '!goodbot') {
    msg.reply('Thank you sir!');
  }
  if (msg.content === '<:weird:668843974504742912>') {
    msg.reply('https://tenor.com/view/weird-champ-weird-champ-pogchamp-pog-gif-13780848');
  }
  if (weirdchampStatus) {
    const weirdchamp = msg.guild.emojis.cache.find(emoji => emoji.name === 'weird');
    if (weirdchamp != null) {
      msg.react(weirdchamp);
    }
  }
});

client.on('messageReactionAdd', msgRect => {
  if (weirdchampStatus) {
    if (msgRect.emoji.name == 'pet') {
      msgRect.message.reply('<:KEKW:652170559047598081>')
    }
  }
})

client.on('voiceStateUpdate', async (oldMember, newMember) => {
  let newUserChannel = newMember.channel;
  let oldUserChannel = oldMember.channel;
  if (newMember.id != 708326969460392037 && isReady) {
    if (newUserChannel !== null) {
      if (oldUserChannel != newUserChannel) {
        const connection = await newUserChannel.join();
        const randNummer = getRandomInt(fileMap.size);
        const dispatcher = connection.play(fileMap.get(randNummer), {
          volume: 0.2,

        })
        console.log(fileMap.get(randNummer))
        dispatcher.on("finish", () => {
          console.log("Finished playing")
          newUserChannel.leave()
          isReady = false;
          setTimeout(() => isReady = true, 2000);
        })
        dispatcher.on("error", error => console.error(error));
      }
    }
  }
});

client.login(process.env.DISCORD_KEY);

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}