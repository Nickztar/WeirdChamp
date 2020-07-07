const express = require("express");
const fetch = require("node-fetch");

const router = express.Router();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

const redirect = encodeURIComponent(
	"http://localhost:8080/api/discord/callback"
);

router.get("/login", (req, res) => {
	res.redirect(
		`https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${redirect}&response_type=code&scope=identify`
	);
});

router.get("/callback", async (req, res) => {
	if (!req.query.code) throw new Error("NoCodeProvided");
	const code = req.query.code;
	const response = await fetch(`https://discord.com/api/oauth2/token`, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: new URLSearchParams({
			client_id: CLIENT_ID,
			client_secret: CLIENT_SECRET,
			grant_type: "authorization_code",
			code: code,
			redirect_uri: "http://localhost:8080/api/discord/callback",
			scope: "identify",
		}),
	});
	const json = await response.json();
	res.redirect(
		`/api/discord/success/?token=${json.access_token}&refresh=${json.refresh_token}`
	);
});

router.get("/success", async (req, res) => {
	const token = req.query.token;
	const refresh = req.query.refresh;
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
		user_id: json.id,
		username: json.username,
		avatar,
	};
	res.send(client);
});

module.exports = router;
