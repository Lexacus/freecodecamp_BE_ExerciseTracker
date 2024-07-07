import dotenv from "dotenv";
import cors from "cors";
import express, { Request, Response, Express } from "express";
import mongoose, { Schema, model } from "mongoose";
import { isValidUrl } from "./utils";

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
    date: parsedDate.toDateString(),
  });
  const { _id, ownerId, ...rest } = createdExercise.toObject();
  return res.json({
    ...exerciseOwner.toObject(),
    ...rest,
  });
});

app.get("/api/users/:_id/logs", async (req: Request, res: Response) => {
  const user = await User.findOne({ _id: req.params._id });
  if (!user) {
    return res.json({ error: "No user found with provided id." });
  }
  const userExercises = await Exercise.find({ ownerId: user.id });
  const userLog = userExercises.map(({ description, duration, date }) => ({
    description,
    duration,
    date,
  }));
  return res.json({
    ...user.toObject(),
    count: userExercises.length,
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
