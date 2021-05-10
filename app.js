const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const cors = require("cors");

const app = express();
const db = mongoose.connection;

// https://fathomless-escarpment-61034.herokuapp.com/

app.set("view engine", "ejs");
app.use(cors());
app.use(express.static("./uploads"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(
  session({
    secret: "keep it easy and cool",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

const mongoPath =
  "mongodb+srv://suman-admin:Suman@1996@pickbazar.hjbzp.mongodb.net";

mongoose.connect(`${mongoPath}/pickbazarDB`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
  email: String,
  Password: String,
});

const userProfileSchema = new mongoose.Schema({
  name: String,
  about: String,
  userImg: String,
  date: Date,
  user: userSchema,
});

const typeOfPicSchema = new mongoose.Schema({
  type: String,
  des: String,
});
const Tpo = mongoose.model("Tpo", typeOfPicSchema);
const postSchema = new mongoose.Schema({
  name: String,
  desc: String,
  img: String,
  date: Date,
  schematype: typeOfPicSchema,
  creatUser: userSchema,
});
const Pic = mongoose.model("Pic", postSchema);

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User", userSchema);
const Userprofile = mongoose.model("Userprofile", userProfileSchema);
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function () {
  console.log("Connected!!!!!!!!");
});

let storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      `${req.file.fieldname}-${Date.now()}${path.extname(
        req.file.originalname
      )}`
    );
  },
});

const upload = multer({ storage: storage });

//home page route
app.get("/", (req, res) => {
  res.status(200).json("Welcomme to home page!!!");
});

//getting all post GET request
app.get("/api/posts/", (req, res) => {
  Pic.find({}, (err, items) => {
    if (err) {
      console.log(err);
      res.status(500).send("An error occurred", err);
    } else {
      res.status(200).json({ items: items });
    }
  });
});

//genarating posts POST request
app.post("/api/posts/", upload.single("image"), (req, res, next) => {
  if (req.isAuthenticated()) {
    let obj = {
      name: req.body.name,
      desc: req.body.pesc,
      img: req.body.image,
      creatUser: req.user,
    };
    Pic.create(obj, (err, item) => {
      if (err) {
        res.status(500).json({ err: err });
      } else {
        res.status(200).json({ message: "post created successfully" });
      }
    });
  } else {
    res.status(200).json({ message: "not loged in!!" });
  }
});

app.put("/api/posts/:postId", upload.single("image"), (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(200).json({ message: "not loged in" });
  }
  let id = req.params.postId;
  let crUser;
  Pic.findById(id, (err, post) => {
    crUser = post["creatUser"];
    if (String(crUser) === String(req.user)) {
      let obj = {
        name: req.body.name,
        desc: req.body.pesc,
        img: req.body.image,
        creatUser: req.user,
      };
      Pic.findOneAndUpdate(id, obj, (err, item) => {
        if (err) {
          res.status(500).json({ err: err });
        } else {
          res.status(200).json({ message: "updated successfully", cr: true });
        }
      });
    }
  });
});

app.delete("/api/posts/:postId", function (req, res) {
  if (!req.isAuthenticated()) {
    res.status(200).json({ message: "not loged in" });
  }
  let id = req.params.postId;
  let crUser;
  Pic.findById(id, (err, post) => {
    crUser = post["creatUser"];
    if (String(crUser) === String(req.user)) {
      Pic.deleteOne({ _id: id }, (err) => {
        if (err) res.status(500).json({ message: "some error!" });
        else res.status(200).json({ message: "Successfully! post Deleted." });
      });
    }
  });
});

//sign up or registrations
app.post("/api/registration", upload.single("image"), (req, res) => {
  console.log(req.body.image);

  let Name = req.body.name;
  let Des = req.body.description;
  let Img = req.body.image;

  User.register(
    { username: req.body.username },
    req.body.password,
    (err, user) => {
      if (err) {
        res.status(500).json({ message: "something went wrong!!" });
      } else {
        passport.authenticate("local")(req, res, () => {
          let newUserProfile = {
            name: Name,
            about: Des,
            userImg: Img,
            date: Date.now(),
            user: user,
          };
          Userprofile.create(newUserProfile, (err, item) => {
            if (!err) {
              res
                .status(200)
                .json({ message: "user created successfully!!!!" });
            } else {
              res
                .status(500)
                .json({ message: "error!! \n something went wrong" });
            }
          });
        });
      }
    }
  );
});

//sign in
app.post("/api/signin", (req, res) => {
  const newUser = new User({
    username: req.body.username,
    password: req.body.password,
  });
  req.login(newUser, (err) => {
    if (err) {
      res.status(500).json({ message: "error!! \n something went wrong" });
    } else {
      passport.authenticate("local")(req, res, () => {
        res.status(200).json({ message: "loged in successfully!!!!" });
      });
    }
  });
});

//for log out
app.get("/api/logout", (req, res) => {
  if (req.isAuthenticated()) {
    req.logout();
    res.status(200).json({ message: "created successfully!!!" });
  } else {
    res.status(200).json({ message: "not loged In!!" });
  }
});

//current login user
app.get("/api/currentloginuser", (req, res) => {
  if (req.isAuthenticated()) {
    res.status(200).json({ user: req.user });
  } else {
    res.status(200).json({ user: null });
  }
});
//connect with server
let port = process.env.PORT;
if (port == null || port == "") {
  port = 5000;
}

app.listen(port, (err) => {
  if (err) {
    console.log("some error!!!!!!!!");
  } else {
    console.log(`open to localhost:${port}`);
  }
});
