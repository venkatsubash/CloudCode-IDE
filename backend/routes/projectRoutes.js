const express = require("express");
const Project = require("../models/Project");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Test route
router.get("/test", (req, res) => {
  res.json({
    message: "Project routes are working",
  });
});

// Create project
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, description, language } = req.body;

    // Check required fields
    if (!name || !language) {
      return res.status(400).json({
        message: "Project name and language are required",
      });
    }

    // Create project
    const project = await Project.create({
      name,
      description,
      language,
      owner: req.user.userId,
    });

    res.status(201).json({
      message: "Project created successfully",
      project,
    });
  } catch (error) {
    console.error("Project creation error:", error.message);

    res.status(500).json({
      message: "Server error while creating project",
    });
  }
});

// Get user's projects
router.get("/", authMiddleware, async (req, res) => {
  try {
    const projects = await Project.find({
      owner: req.user.userId,
    }).sort({ createdAt: -1 });

    res.json({
      projects,
    });
  } catch (error) {
    console.error("Fetch projects error:", error.message);

    res.status(500).json({
      message: "Server error while fetching projects",
    });
  }
});

module.exports = router;