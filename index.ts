import dotenv from "dotenv";
import cors from "cors";
import express, { Request, Response, Express } from "express";
import mongoose, { Schema, model } from "mongoose";
import { isValidUrl } from "./utils";

dotenv.config();
const app: Express = express();
const port = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI ?? "");

const urlSchema = new Schema({
  original_url: {
    type: String,
  },
  short_url: {
    type: Number,
  },
});

let urlInfo = model("urlInfo", urlSchema);

app.use(cors({ optionsSuccessStatus: 200 })); // some legacy browsers choke on 204

app.use(express.static("public"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req: Request, res: Response) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/shorturl", async (req: Request, res: Response) => {
  if (!isValidUrl(req.body.url)) {
    res.json({ error: "invalid url" });
  }
  const urlToFind = await urlInfo
    .findOne({ original_url: req.body.url })
    .select({ original_url: 1, short_url: 1 });
  if (!urlToFind) {
    const docNumber = await urlInfo.countDocuments();
    const newUrl = await urlInfo.create({
      original_url: req.body.url,
      short_url: docNumber,
    });
    return res.json({
      original_url: newUrl.toObject().original_url,
      short_url: newUrl.toObject().short_url,
    });
  }
  res.json({
    original_url: urlToFind.toObject().original_url,
    short_url: urlToFind.toObject().short_url,
  });
});

app.get("/api/shorturl/:shortUrl", async (req: Request, res: Response) => {
  const urlToFind = await urlInfo.findOne({ short_url: req.params.shortUrl });
  if (!urlToFind) {
    return res.json({ notFound: "short url not found" });
  }
  const urlToRedirect = urlToFind.toObject().original_url;
  if (!urlToRedirect) {
    return res.json({ notValid: "recovered url is not valid" });
  }
  res.redirect(urlToRedirect);
});

app.get("/api/reset", async (req: Request, res: Response) => {
  await urlInfo.deleteMany({});
  res.json({ reset: "reset" });
});

app.listen(port, () => {
  console.log("Your app is listening on port " + port);
});
