const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const cookieParser = require("cookie-parser");
dotenv.config();

const app = express();

app.use(cookieParser());

app.use(cors({
  origin: "https://jobhaven.netlify.app",
  credentials: true,
}));

const User = require("./models/user.js");
const Job = require("./models/addjob.js");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("./public"));

// APIs-
app.get("/health", (req, res) => {
  res.json({ message: "all right" });
});

app.post("/api/signup", async (req, res) => {
  try {
    const { firstName, lastName, email, password, recruiter } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    // console.log(req.body);

    let user = await User.findOne({ email });
    if (user) {
      res.json({ message: "User already exists" });
    } else {
      const newUser = new User({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        recruiter: req.body.recruiter === "on" ,
      });
      await newUser.save();
      res.redirect(302, "https://jobhaven.netlify.app");
      console.log("User Created Successfully");
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "An error occurred", error });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user) {
      const passwordMatched = await bcrypt.compare(password, user.password);
      if (passwordMatched) {
        const jwToken = jwt.sign(user.toJSON(), process.env.JWT_SECRET, {
          expiresIn: 6000,
        });
        res.cookie("jwt", jwToken, { httpOnly: true });
        // console.log(jwToken);
        res.redirect(302, "https://jobhaven.netlify.app/jobfinder");
        return;
      } else {
        res.json({
          status: "FAIL",
          message: "Incorrect password",
        });
      }
    } else {
      res.json({
        status: "FAIL",
        message: "User does not exist",
      });
    }
  } catch (error) {
    console.log(error);
    res.json({
      status: "FAIL",
      message: "Something went wrong",
      error,
    });
  }
});

const isAuthenticated = (req, res, next) => {
  const token = req.cookies.jwt;

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.sendStatus(403);
    }

    req.user = user;
    // console.log(req.user);

    next();
  });
};

const isRecruiter = (req, res, next) => {
  // console.log(req.user.recruiter)
  if (req.user.recruiter) {
    next();
  } else {
    res.json({
      status: "FAIL",
      message: "You're not allowed to access this page",
    });
  }
};

app.post("/api/jobpost", isAuthenticated, isRecruiter, async (req, res) => {
  try {
    const newJob = new Job(req.body);
    await newJob.save();
    res.status(201).json({ message: "Job listing created successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error creating job listing", error });
  }
});

app.get("/api/isloggedin", isAuthenticated, (req, res) => {
  // Check if the user is logged in and include the user's firstName in the response
  const isLoggedIn = true; 
  if (isLoggedIn) {
    res.json({ isLoggedIn: true, firstName: req.user.firstName });
  } else {
    res.json({ isLoggedIn: false });
  }
});


app.get("/api/isrecruiter", isAuthenticated, isRecruiter, async (req, res) => {
  try {
    res.json({ isRecruiter: true });
  } catch (error) {
    res.status(500).json({ message: "user not logged in", error });
  }
});

app.post("/api/logout", (req, res) => {
  // Clear the JWT token from cookies by setting an expired token
  res.cookie("jwt", "", { expires: new Date(0) });

  res.status(200).json({ message: "Logged out successfully" });
});


app.get("/api/joblist", async (req, res) => {
  const selectedSkills = req.query.selectedSkills;

  const selectedSkillsArray = selectedSkills ? selectedSkills.split(",") : [];

  const query =
    selectedSkillsArray.length > 0
      ? {
          $or: selectedSkillsArray.map((skill) => ({
            skillsRequired: { $regex: new RegExp(skill, "i") },
          })),
        }
      : {};

  Job.find(query)
    .then((jobs) => res.json(jobs))
    .catch((err) => res.json(err));
});

app.get("/api/jobdetails/:jobId", async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const job = await Job.findById(jobId).exec();

    if (!job) {
      res.status(404).json({ message: "Job not found" });
    } else {
      res.json(job);
    }
  } catch (error) {
    res.status(500).json({ message: "An error occurred", error });
  }
});

app.get("/api/editjob/:jobId", (req, res) => {
  const jobId = req.params.jobId;

  Job.findById(jobId, (err, job) => {
    if (err) {
      res.status(404).json({ message: "Job not found" });
    } else {
      res.json(job);
    }
  });
});

// Error Handler-
app.use((req, res, next) => {
  const err = new Error("Route not found");
  err.status = 404;
  next(err);
});

app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.send({
    error: {
      status: err.status || 500,
      message: err.message,
    },
  });
});

app.listen(process.env.PORT, () => {
  mongoose
    .connect(process.env.MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() =>
      console.log(`Server running on http://localhost:${process.env.PORT}`)
    )
    .catch((error) => console.error(error));
});
