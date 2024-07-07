import cors from "cors";
import dayjs from "dayjs";
import dotenv from "dotenv";
import express, { Express, Request, Response } from "express";
import mongoose, { Schema, model } from "mongoose";
import { LogsFilters } from "./types";

dotenv.config();
const app: Express = express();
const port = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI ?? "");

const userSchema = new Schema(
  {
    username: {
      type: String,
    },
  },
  { versionKey: false }
);

const exerciseSchema = new Schema(
  {
    username: {
      type: String,
    },
    ownerId: {
      type: String,
    },
    description: {
      type: String,
    },
    duration: {
      type: Number,
    },
    date: {
      type: String,
    },
  },
  { versionKey: false }
);

let User = model("user", userSchema);
let Exercise = model("exercise", exerciseSchema);

app.use(cors({ optionsSuccessStatus: 200 })); // some legacy browsers choke on 204

app.use(express.static("public"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_, res: Response) => {
  res.sendFile(__dirname + "/views/index.html");
});

app
  .post("/api/users", async (req: Request, res: Response) => {
    if (!req.body.username) {
      return res.json({ error: "Invalid username" });
    }
    const createdUser = await User.create({ username: req.body.username });
    return res.json(createdUser);
  })
  .get("/api/users", async (_, res: Response) => {
    const allUsers = await User.find({});
    return res.send(allUsers);
  });

app.post("/api/users/:_id/exercises", async (req: Request, res: Response) => {
  const exerciseOwner = await User.findOne({ _id: req.params._id });
  if (!exerciseOwner) {
    return res.json({ error: "No user found with provided id." });
  }
  const parsedDate = !req.body.date ? new Date() : new Date(req.body.date);
  const createdExercise = await Exercise.create({
    ...exerciseOwner,
    ...req.body,
    ownerId: exerciseOwner.id,
    date: parsedDate.toISOString(),
  });
  const { _id, ownerId, date, ...rest } = createdExercise.toObject();
  return res.json({
    ...exerciseOwner.toObject(),
    date: parsedDate.toDateString(),
    ...rest,
  });
});

app.get("/api/users/:_id/logs", async (req: Request, res: Response) => {
  const user = await User.findOne({ _id: req.params._id });
  if (!user) {
    return res.json({ error: "No user found with provided id." });
  }

  // query filters
  const filters: LogsFilters = {
    ownerId: user.id,
  };

  // add from filter if present
  if (req.query.from) {
    filters.date = {
      ...filters.date,
      $gte: dayjs(req.query.from as string).format(),
    };
  }

  // add to filter if present
  if (req.query.to) {
    filters.date = {
      ...filters.date,
      $lte: dayjs(req.query.to as string).format(),
    };
  }

  const userExercisesQuery = Exercise.find(filters);

  if (req.query.limit) {
    userExercisesQuery.limit(parseInt(req.query.limit as string));
  }

  const [userExercisesCount, userExercises] = await Promise.all([
    Exercise.countDocuments({ ownerId: user.id }),
    userExercisesQuery,
  ]);

  const userLog = userExercises.map(({ description, duration, date }) => ({
    description,
    duration,
    date: (date ? new Date(date) : new Date()).toDateString(),
  }));

  return res.json({
    ...user.toObject(),
    count: userExercisesCount,
    log: userLog,
  });
});

app.get("/api/reset", async (req: Request, res: Response) => {
  await User.deleteMany({});
  await Exercise.deleteMany({});
  res.json({ reset: "reset" });
});

app.listen(port, () => {
  console.log("Your app is listening on port " + port);
});
