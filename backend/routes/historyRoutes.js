
const express = require("express");
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/authMiddleware");
const Execution = require("../models/Execution");

const router = express.Router();

// Get execution history for the authenticated user.
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        message: "Invalid user session.",
      });
    }

    const executions = await Execution.find({ owner: userId })
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    const history = executions.map((run) => ({
      id: run._id.toString(),
      project: run.projectName,
      projectId: run.project?.toString() || null,
      fileId: run.file?.toString() || null,
      fileName: run.fileName,
      lang: run.language,
      status: run.status,
      timeMs: run.durationMs,
      memoryMb: run.memoryMb,
      at: run.createdAt,
      code: run.code,
      input: run.input,
      output: run.output,
      error: run.error,
      executionType: run.executionType,
    }));

    return res.status(200).json({
      success: true,
      count: history.length,
      executions: history,
    });
  } catch (error) {
    console.error("History retrieval error:", error);

    return res.status(500).json({
      message: "Unable to retrieve execution history.",
    });
  }
});

module.exports = router;
