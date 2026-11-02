var express = require("express");
var router = express.Router();
require("dotenv").config();
const axios = require("axios");
const background = process.env.BACKGROUND_COLOR;

// The albums API runs at minReplicas 0, so it may be activating when a
// request arrives. The activator normally holds the request while a replica
// starts, which is why each attempt gets a generous timeout rather than a
// short one; the deadline bounds how long a browser waits across all attempts.
const PER_ATTEMPT_TIMEOUT_MS = Number(process.env.TIMEOUT || 20000);
const DEADLINE_MS = Number(process.env.API_DEADLINE_MS || 45000);
const BASE_DELAY_MS = Number(process.env.API_RETRY_BASE_DELAY_MS || 500);
const MAX_BACKOFF_MS = 4000;

const api = axios.create({
  baseURL: process.env.API_BASE_URL,
  params: {},
  timeout: PER_ATTEMPT_TIMEOUT_MS,
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// A cold start surfaces either as a connection-level failure (no response:
// reset, timeout, aborted activation) or as a 5xx while the API waits on SQL.
// Anything else is a real error and replaying it will not help.
function isRetryable(err) {
  if (err.response) {
    return err.response.status >= 500 || err.response.status === 429;
  }
  return true;
}

// Safe to replay: /albums is a read.
async function getAlbums() {
  const deadline = Date.now() + DEADLINE_MS;
  let attempt = 0;
  let lastErr;

  while (Date.now() < deadline) {
    attempt++;
    const remaining = deadline - Date.now();

    try {
      return await api.get("/albums", {
        timeout: Math.min(PER_ATTEMPT_TIMEOUT_MS, remaining),
      });
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err)) {
        throw err;
      }

      const backoff =
        Math.min(BASE_DELAY_MS * 2 ** (attempt - 1), MAX_BACKOFF_MS) +
        Math.random() * 250;

      // No point sleeping past the deadline just to abandon the attempt.
      if (Date.now() + backoff >= deadline) {
        break;
      }

      const reason = err.code || (err.response && err.response.status);
      console.log(
        `Albums API attempt ${attempt} failed (${reason}); retrying in ${Math.round(
          backoff
        )}ms`
      );
      await sleep(backoff);
    }
  }

  throw lastErr;
}

/* GET home page. */
router.get("/", async function (req, res, next) {
  try {
    console.log("Sending request to backend albums api");
    var data = await getAlbums();
    console.log("Response from backend albums api: ", data.data);
    res.render("index", {
      albums: data.data,
      background_color: background,
    });
  } catch (err) {
    console.log("Error: ", err);
    next(err);
  }
});

module.exports = router;
