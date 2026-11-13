
const mongoose = require("mongoose");

const executionSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },

    file: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "File",
      default: null,
    },

    projectName: {
      type: String,
      default: "Untitled Project",
      trim: true,
    },

    fileName: {
      type: String,
      default: "Untitled File",
      trim: true,
    },

    language: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    code: {
      type: String,
      default: "",
    },

    input: {
      type: String,
      default: "",
    },

    output: {
      type: String,
      default: "",
    },

    error: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["success", "failed", "timeout", "stopped"],
      required: true,
    },

    durationMs: {
      type: Number,
      default: 0,
      min: 0,
    },

    memoryMb: {
      type: Number,
      default: null,
      min: 0,
    },

    executionType: {
      type: String,
      enum: ["interactive", "http"],
      default: "interactive",
    },
  },
  {
    timestamps: true,
  }
);

executionSchema.index({ owner: 1, createdAt: -1 });

module.exports = mongoose.model("Execution", executionSchema);
