
const express = require("express");
const mongoose = require("mongoose");

const authMiddleware = require("../middleware/authMiddleware");
const executeCode = require("../services/executionService");

const Execution = require("../models/Execution");
const Project = require("../models/Project");
const File = require("../models/File");

const router = express.Router();

router.post("/", authMiddleware, async (req, res) => {
  const startedAt = Date.now();

  try {
    const {
      code,
      language,
      stdin = "",
      projectId,
      fileId,
    } = req.body;

    if (typeof code !== "string" || !code.trim() || !language) {
      return res.status(400).json({
        message: "Code and language are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        message: "A valid project ID is required for execution history.",
      });
    }

    const project = await Project.findOne({
      _id: projectId,
      owner: req.user.userId,
    });

    if (!project) {
      return res.status(404).json({
        message: "Project not found or access denied.",
      });
    }

    let file = null;

    if (fileId) {
      if (!mongoose.Types.ObjectId.isValid(fileId)) {
        return res.status(400).json({
          message: "Invalid file ID.",
        });
      }

      file = await File.findOne({
        _id: fileId,
        project: project._id,
        owner: req.user.userId,
      });

      if (!file) {
        return res.status(404).json({
          message: "File not found or access denied.",
        });
      }
    }

    const result = await executeCode(code, language, stdin);

    const durationMs = Date.now() - startedAt;

    const execution = await Execution.create({
      owner: req.user.userId,
      project: project._id,
      file: file?._id || null,
      projectName: project.name,
      fileName: file?.name || "Untitled File",
      language: String(language).toLowerCase(),
      code,
      input: stdin,
      output: result.output || "",
      error: result.error || "",
      status: result.success ? "success" : "failed",
      durationMs,
      memoryMb: null,
      executionType: "http",
    });

    return res.status(200).json({
      ...result,
      executionId: execution._id,
      durationMs,
    });
  } catch (error) {
    console.error("Execution error:", error);

    return res.status(500).json({
      message: "Server error while executing code",
    });
  }
});

module.exports = router;
