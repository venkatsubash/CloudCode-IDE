
const express = require("express");
const mongoose = require("mongoose");

const File = require("../models/File");
const Project = require("../models/Project");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// 50 MB storage quota per user
const STORAGE_LIMIT = 50 * 1024 * 1024;

// --------------------------------------------------
// STORAGE HELPERS
// --------------------------------------------------

const getStorageInfo = (usedBytes) => ({
  usedBytes,
  quotaBytes: STORAGE_LIMIT,
  remainingBytes: Math.max(0, STORAGE_LIMIT - usedBytes),
  usedMB: Number((usedBytes / (1024 * 1024)).toFixed(2)),
  quotaMB: 50,
  remainingMB: Number(
    (Math.max(0, STORAGE_LIMIT - usedBytes) / (1024 * 1024)).toFixed(2)
  ),
  percentageUsed: Number(((usedBytes / STORAGE_LIMIT) * 100).toFixed(2)),
});

// Calculate existing file storage for migration of older user records
const calculateUserStorageUsage = async (userId) => {
  const files = await File.find({ owner: userId })
    .select("content")
    .lean();

  return files.reduce(
    (total, file) =>
      total + Buffer.byteLength(file.content || "", "utf8"),
    0
  );
};

// Initialize storage counter for users created before this feature
const ensureStorageCounter = async (userId) => {
  const user = await User.collection.findOne(
    { _id: new mongoose.Types.ObjectId(userId) },
    { projection: { storageUsedBytes: 1 } }
  );

  if (!user) {
    throw new Error("User not found");
  }

  // Existing counter is already initialized
  if (typeof user.storageUsedBytes === "number") {
    return user.storageUsedBytes;
  }

  // Calculate storage from existing files
  const existingUsage = await calculateUserStorageUsage(userId);

  // Only one concurrent request can initialize the counter
  await User.collection.updateOne(
    {
      _id: new mongoose.Types.ObjectId(userId),
      storageUsedBytes: { $exists: false },
    },
    {
      $set: { storageUsedBytes: existingUsage },
    }
  );

  // Read the final initialized value
  const updatedUser = await User.collection.findOne(
    { _id: new mongoose.Types.ObjectId(userId) },
    { projection: { storageUsedBytes: 1 } }
  );

  if (!updatedUser) {
    throw new Error("Unable to initialize user storage");
  }

  return updatedUser.storageUsedBytes;
};

const getCurrentStorageUsage = async (userId) => {
  const user = await User.findById(userId).select("storageUsedBytes").lean();

  if (!user) {
    throw new Error("User not found");
  }

  return user.storageUsedBytes || 0;
};

// Atomically reserve or release storage bytes.
// Positive delta = reserve storage.
// Negative delta = release storage.
const updateStorageCounter = async (userId, delta, session) => {
  if (delta === 0) {
    return true;
  }

  let filter;

  if (delta > 0) {
    filter = {
      _id: userId,
      storageUsedBytes: {
        $lte: STORAGE_LIMIT - delta,
      },
    };
  } else {
    filter = {
      _id: userId,
      storageUsedBytes: {
        $gte: -delta,
      },
    };
  }

  const result = await User.updateOne(
    filter,
    {
      $inc: { storageUsedBytes: delta },
    },
    { session }
  );

  return result.modifiedCount === 1;
};

const getQuotaError = (message = "Storage quota exceeded. Your limit is 50 MB.") => {
  const error = new Error(message);
  error.code = "STORAGE_QUOTA_EXCEEDED";
  error.status = 413;
  return error;
};

// --------------------------------------------------
// GET CURRENT USER STORAGE USAGE
// --------------------------------------------------

router.get("/storage/usage", authMiddleware, async (req, res) => {
  try {
    await ensureStorageCounter(req.user.userId);

    const usedBytes = await getCurrentStorageUsage(req.user.userId);

    res.json({
      message: "Storage usage fetched successfully",
      storage: getStorageInfo(usedBytes),
    });
  } catch (error) {
    console.error("Storage usage error:", error);

    res.status(500).json({
      message: "Server error while fetching storage usage",
    });
  }
});

// --------------------------------------------------
// CREATE FILE
// --------------------------------------------------

router.post("/", authMiddleware, async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { name, content, language, projectId } = req.body;

    if (!name || !language || !projectId) {
      return res.status(400).json({
        message: "File name, language and project ID are required",
      });
    }

    if (typeof name !== "string" || typeof language !== "string") {
      return res.status(400).json({
        message: "File name and language must be strings",
      });
    }

    if (content !== undefined && typeof content !== "string") {
      return res.status(400).json({
        message: "File content must be a string",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        message: "Invalid project ID",
      });
    }

    const fileContent = content ?? "";
    const newFileBytes = Buffer.byteLength(fileContent, "utf8");

    await ensureStorageCounter(req.user.userId);

    let createdFile;
    let updatedUsage;

    await session.withTransaction(async () => {
      const project = await Project.findOne({
        _id: projectId,
        owner: req.user.userId,
      }).session(session);

      if (!project) {
        const error = new Error("Project not found");
        error.status = 404;
        throw error;
      }

      const reserved = await updateStorageCounter(
        req.user.userId,
        newFileBytes,
        session
      );

      if (!reserved) {
        throw getQuotaError();
      }

      const files = await File.create(
        [
          {
            name,
            content: fileContent,
            language,
            project: projectId,
            owner: req.user.userId,
          },
        ],
        { session }
      );

      createdFile = files[0];

      const user = await User.findById(req.user.userId)
        .select("storageUsedBytes")
        .session(session);

      updatedUsage = user.storageUsedBytes;
    });

    res.status(201).json({
      message: "File created successfully",
      file: createdFile,
      storage: getStorageInfo(updatedUsage),
    });
  } catch (error) {
    console.error("File creation error:", error);

    if (error.code === "STORAGE_QUOTA_EXCEEDED") {
      const usedBytes = await getCurrentStorageUsage(req.user.userId);

      return res.status(413).json({
        message: error.message,
        code: error.code,
        storage: getStorageInfo(usedBytes),
        requiredBytes: Buffer.byteLength(req.body.content || "", "utf8"),
      });
    }

    if (error.status === 404) {
      return res.status(404).json({ message: error.message });
    }

    res.status(500).json({
      message: "Server error while creating file",
    });
  } finally {
    await session.endSession();
  }
});

// --------------------------------------------------
// GET ALL FILES IN A PROJECT
// --------------------------------------------------

router.get("/project/:projectId", authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        message: "Invalid project ID",
      });
    }

    const project = await Project.findOne({
      _id: projectId,
      owner: req.user.userId,
    });

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const files = await File.find({
      project: projectId,
      owner: req.user.userId,
    }).sort({ createdAt: 1 });

    res.json({ files });
  } catch (error) {
    console.error("Fetch files error:", error);

    res.status(500).json({
      message: "Server error while fetching files",
    });
  }
});

// --------------------------------------------------
// UPDATE FILE
// --------------------------------------------------

router.put("/:fileId", authMiddleware, async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { fileId } = req.params;
    const { name, content, language } = req.body;

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({
        message: "Invalid file ID",
      });
    }

    if (
      name !== undefined &&
      (typeof name !== "string" || !name.trim())
    ) {
      return res.status(400).json({
        message: "File name must be a non-empty string",
      });
    }

    if (language !== undefined && typeof language !== "string") {
      return res.status(400).json({
        message: "Language must be a string",
      });
    }

    if (content !== undefined && typeof content !== "string") {
      return res.status(400).json({
        message: "File content must be a string",
      });
    }

    await ensureStorageCounter(req.user.userId);

    let updatedFile;
    let updatedUsage;

    await session.withTransaction(async () => {
      const file = await File.findOne({
        _id: fileId,
        owner: req.user.userId,
      }).session(session);

      if (!file) {
        const error = new Error("File not found");
        error.status = 404;
        throw error;
      }

      const oldFileBytes = Buffer.byteLength(file.content || "", "utf8");

      const newFileBytes =
        content !== undefined
          ? Buffer.byteLength(content, "utf8")
          : oldFileBytes;

      const storageDelta = newFileBytes - oldFileBytes;

      const updated = await updateStorageCounter(
        req.user.userId,
        storageDelta,
        session
      );

      if (!updated) {
        throw getQuotaError();
      }

      if (name !== undefined) {
        file.name = name.trim();
      }

      if (content !== undefined) {
        file.content = content;
      }

      if (language !== undefined) {
        file.language = language;
      }

      await file.save({ session });

      updatedFile = file;

      const user = await User.findById(req.user.userId)
        .select("storageUsedBytes")
        .session(session);

      updatedUsage = user.storageUsedBytes;
    });

    res.json({
      message: "File updated successfully",
      file: updatedFile,
      storage: getStorageInfo(updatedUsage),
    });
  } catch (error) {
    console.error("File update error:", error);

    if (error.code === "STORAGE_QUOTA_EXCEEDED") {
      const usedBytes = await getCurrentStorageUsage(req.user.userId);

      return res.status(413).json({
        message: error.message,
        code: error.code,
        storage: getStorageInfo(usedBytes),
        requiredBytes: Buffer.byteLength(req.body.content || "", "utf8"),
      });
    }

    if (error.status === 404) {
      return res.status(404).json({ message: error.message });
    }

    res.status(500).json({
      message: "Server error while updating file",
    });
  } finally {
    await session.endSession();
  }
});

// --------------------------------------------------
// DELETE FILE
// --------------------------------------------------

router.delete("/:fileId", authMiddleware, async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { fileId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({
        message: "Invalid file ID",
      });
    }

    await ensureStorageCounter(req.user.userId);

    let updatedUsage;

    await session.withTransaction(async () => {
      const file = await File.findOne({
        _id: fileId,
        owner: req.user.userId,
      }).session(session);

      if (!file) {
        const error = new Error("File not found");
        error.status = 404;
        throw error;
      }

      const fileBytes = Buffer.byteLength(file.content || "", "utf8");

      const deleted = await File.deleteOne(
        {
          _id: fileId,
          owner: req.user.userId,
        },
        { session }
      );

      if (deleted.deletedCount !== 1) {
        throw new Error("Unable to delete file");
      }

      const released = await updateStorageCounter(
        req.user.userId,
        -fileBytes,
        session
      );

      if (!released) {
        throw new Error("Unable to update storage counter");
      }

      const user = await User.findById(req.user.userId)
        .select("storageUsedBytes")
        .session(session);

      updatedUsage = user.storageUsedBytes;
    });

    res.json({
      message: "File deleted successfully",
      storage: getStorageInfo(updatedUsage),
    });
  } catch (error) {
    console.error("File deletion error:", error);

    if (error.status === 404) {
      return res.status(404).json({ message: error.message });
    }

    res.status(500).json({
      message: "Server error while deleting file",
    });
  } finally {
    await session.endSession();
  }
});

module.exports = router;
