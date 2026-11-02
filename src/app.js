var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

var indexRouter = require("./routes/index");

// How long to tell a browser to wait before retrying a cold-start failure.
const RETRY_AFTER_SECONDS = Number(process.env.API_RETRY_AFTER_SECONDS || 10);

var app = express();

app.set("env", process.env.NODE_ENV);

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = process.env.NODE_ENV === "development" ? err : {};

  if (err.status === 404) {
    res.status(404).render("error", {
      title: "The path " + req.path + " does not exist on this site",
      error: err,
      message: err.message,
      color: "yellow",
    });
  } else if (err.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    res.status(403).render("error", {
      title:
        "Server responded with an error when trying to access " +
        err.config.url,
      error: err,
      message: err.message,
      color: "red",
    });
  } else if (err.request) {
    // The request was made but no response was received. While the albums API
    // scales up from zero this is usually transient, so point the browser at a
    // retry instead of leaving the user on a dead end. The full error is
    // already on the console for diagnosis.
    res.set("Retry-After", String(RETRY_AFTER_SECONDS));
    res.status(503).render("error", {
      title: "Starting up, one moment",
      error: err,
      message:
        "The albums service is still waking up. This page refreshes automatically.",
      color: "yellow",
      background_color: process.env.BACKGROUND_COLOR,
      retry_after: RETRY_AFTER_SECONDS,
    });
  } else {
    // Something happened in setting up the request that triggered an Error
    res.status(500).render("error", {
      title: "An unexpected error occurred",
      error: err,
      message: err.message,
      color: "red",
    });
  }
});

module.exports = app;
