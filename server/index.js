const express = require("express");
const serverless = require("serverless-http");
require("dotenv").config();
const request = require("request");

const querystring = require("querystring");

const app = express();
const router = express.Router();


const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
console.log(CLIENT_ID)

router.get("/", (req, res) => {
  return res.send("hola express");
});

const generateRandomString = (length) => {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

const stateKey = "spotify_auth_state";

router.get("/login", (req, res) => {
  const state = generateRandomString(16);
  res.cookie(stateKey, state);

  const scope = ["user-read-private", "user-read-email", "user-top-read"].join(
    " "
  );

  const queryParams = querystring.stringify({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    state: state,
    scope: scope,
  });
  return res.redirect(`https://accounts.spotify.com/authorize?${queryParams}`);
});

router.get("/callback", (req, res) => {
  const code = req.query.code || null;

  const authOptions = {
    url: "https://accounts.spotify.com/api/token",
    form: {
      code: code,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    },
    headers: {
      Authorization: `Basic ${new Buffer.from(
        `${CLIENT_ID}:${CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    json: true,
  };

  request.post(authOptions, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      const access_token = body.access_token;
      const refresh_token = body.refresh_token;
      const expires_in = body.expires_in;

      const queryParams = querystring.stringify({
        access_token,
        refresh_token,
        expires_in,
      });
      res.redirect(`http://localhost:3000/?${queryParams}`);
    } else {
      res.redirect(`/.netlify/functions/index?${querystring.stringify({ error: "invalid_token" })}`);
    }
  });
});

router.get("/refresh_token", (req, res) => {
  const { refresh_token } = req.query;

  const authOptions = {
    url: "https://accounts.spotify.com/api/token",
    form: {
      refresh_token: refresh_token,
      grant_type: "refresh_token",
    },
    headers: {
      Authorization: `Basic ${new Buffer.from(
        `${CLIENT_ID}:${CLIENT_SECRET}`
      ).toString("base64")}`,
    },
    json: true,
  };

  request.post(authOptions, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      const access_token = body.access_token;
      res.json(body);
    }
  });
});



app.use(`/.netlify/functions/index`, router);

module.exports = app;
module.exports.handler = serverless(app);

