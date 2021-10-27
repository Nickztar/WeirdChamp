module.exports = {
    DISCORD_KEY: process.env.DISCORD_KEY,
    CLIENT_ID: process.env.CLIENT_ID,
    CLIENT_SECRET: process.env.CLIENT_SECRET,
    S3_ID: process.env.S3_ID,
    S3_KEY: process.env.S3_KEY,
    MONGODB_URI: process.env.MONGODB_URI,
    PORT: process.env.PORT || "3030",
    //Bot specific stuff
    USE_AWS: false,
    USE_WEIRDCHAMP: false,
    PRESENCE: "commands",
    PREFIX: "!",
};
