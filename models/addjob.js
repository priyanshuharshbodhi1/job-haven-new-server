const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: true,
  },
  logoURL: { type: String, required: true },

  jobPosition: {
    type: String,
    required: true,
  },
  monthlySalary: {
    type: Number,
    required: true,
  },
  jobType: {
    type: String,
    enum: ["full-time", "part-time", "contract"],
  },
  remoteOffice: {
    type: String,
    enum: ["remote", "office", "hybrid"],
  },
  location: String,
  jobDescription: {
    type: String,
    required: true,
  },
  companyDescription: {
    type: String,
    required: true,
  },
  skillsRequired: {
    type: String,
    required: true,
  },
  additionalInfo: String,
});

module.exports = mongoose.model("Job", jobSchema);
