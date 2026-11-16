
require("dotenv").config();

const dns = require("dns");
dns.setServers(["8.8.8.8"]);

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");

const socketAuthMiddleware = require("./middleware/socketAuthMiddleware");

const {
  startExecution,
  sendInput,
  stopExecution,
} = require("./services/interactiveExecutionService");

const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const fileRoutes = require("./routes/fileRoutes");
const executionRoutes = require("./routes/executionRoutes");
const historyRoutes = require("./routes/historyRoutes");
const Execution = require("./models/Execution");
const Project = require("./models/Project");
const File = require("./models/File");

// Initialize Express and HTTP server
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const allowedOrigins = (
  process.env.CLIENT_ORIGINS || "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim());

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Origin not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
};

const io = new Server(server, {
  cors: corsOptions,
});
// Socket authentication
io.use(socketAuthMiddleware);

// Socket.IO events

io.on("connection", (socket) => {
  console.log("Authenticated socket connected:", socket.user.userId);

  socket.on("execution:start", async (data = {}) => {
    try {
      const { code, language, projectId, fileId } = data;

      const result = await startExecution(
        socket.user.userId,
        code,
        language,
        (output) => {
          socket.emit("execution:output", output);
        },
        async (execution) => {
          try {
            // Verify that the project belongs to this user.
            if (!mongoose.Types.ObjectId.isValid(execution.projectId)) {
              throw new Error("Invalid project ID");
            }

            const project = await Project.findOne({
              _id: execution.projectId,
              owner: socket.user.userId,
            });

            if (!project) {
              throw new Error("Project not found or access denied");
            }

            // Verify the file belongs to the same project and user.
            let file = null;

            if (execution.fileId) {
              if (!mongoose.Types.ObjectId.isValid(execution.fileId)) {
                throw new Error("Invalid file ID");
              }

              file = await File.findOne({
                _id: execution.fileId,
                project: project._id,
                owner: socket.user.userId,
              });

              if (!file) {
                throw new Error("File not found or access denied");
              }
            }

            const savedExecution = await Execution.create({
              owner: socket.user.userId,
              project: project._id,
              file: file?._id || null,
              projectName: project.name,
              fileName: file?.name || execution.fileName,
              language,
              code,
              input: execution.input || "",
              output: execution.output || "",
              error: execution.error || "",
              status: execution.status,
              durationMs: execution.durationMs || 0,
              memoryMb: null,
              executionType: "interactive",
            });

            console.log(
              "Execution saved to history:",
              savedExecution._id.toString()
            );
          } catch (saveError) {
            console.error(
              "Failed to save execution history:",
              saveError.message
            );
          }

          socket.emit("execution:exit", {
            ...execution,
          });
        },
        {
          projectId,
          fileId,
          fileName: data.fileName,
          projectName: data.projectName,
        }
      );

      socket.emit("execution:started", result);
    } catch (error) {
      console.error("Execution start error:", error.message);
      socket.emit("execution:error", {
        message: error.message,
      });
    }
  });

  socket.on("execution:input", (data = {}) => {
    try {
      sendInput(
        socket.user.userId,
        data.sessionId,
        data.input
      );
    } catch (error) {
      socket.emit("execution:error", {
        message: error.message,
      });
    }
  });

  socket.on("execution:stop", (data = {}) => {
    stopExecution(
      socket.user.userId,
      data.sessionId
    );
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.user.userId);
  });
});


// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: "2mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/execute", executionRoutes);
app.use("/api/history", historyRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "CloudCode backend is running",
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "disconnected",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

// Start server only after MongoDB connects
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from .env");
    }

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log("MongoDB connected successfully");

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(
      "Backend startup failed:",
      error.message
    );

    process.exit(1);
  }
};

startServer();
