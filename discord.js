const express = require("express");
const fetch = require("node-fetch");
const btoa = require("btoa");
const router = express.Router();
const { URLSearchParams } = require("url");
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const redirectUrl = "http://localhost:3030/api/discord/callback";
const redirect = encodeURIComponent(redirectUrl);

router.get("/login", (req, res) => {
    res.send(
        `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${redirect}&response_type=code&scope=identify`
    );
});

router.get("/callback", async (req, res) => {
    if (!req.query.code) throw new Error("NoCodeProvided");
    const code = req.query.code;
    const creds = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", redirectUrl);
    const response = await fetch(
        `https://discordapp.com/api/oauth2/token?grant_type="authorization_code"`,
        {
            method: "POST",
            headers: {
                Authorization: `Basic ${creds}`,
            },
            body: params,
        }
    );
    const json = await response.json();
    res.redirect(
        `/api/discord/success?token=${json.access_token}&refresh=${json.refresh_token}&expires=${json.expires_in}`
    );
    // res.send(`/?token=${json.access_token}`);
});

router.get("/refresh", async (req, res) => {
    const refresh = req.query.refresh;
    const creds = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
    const params = new URLSearchParams();
    params.append("grant_type", "refresh_token");
    params.append("refresh_token", refresh);
    params.append("redirect_uri", redirectUrl);
    const response = await fetch(
        `https://discordapp.com/api/oauth2/token?grant_type="authorization_code"`,
        {
            method: "POST",
            headers: {
                Authorization: `Basic ${creds}`,
            },
            body: params,
        }
    );
    const json = await response.json();
    res.redirect(
        `/api/discord/success?token=${json.access_token}&refresh=${json.refresh_token}&expires=${json.expires_in}`
    );
});

router.get("/success", async (req, res) => {
    const token = req.query.token;
    const refresh = req.query.refresh;
    const expires_in = req.query.expires;
    const response = await fetch(`http://discordapp.com/api/users/@me`, {
        method: "GET",
        headers: {
            Authorization: "Bearer " + token,
        },
    });
    const json = await response.json();
    const avatar = `https://cdn.discordapp.com/avatars/${json.id}/${json.avatar}.jpg`;
    const client = {
        token,
        refresh,
        expires_in,
        user_id: json.id,
        username: json.username,
        avatar,
    };
    res.send(client);
});

module.exports = router;
