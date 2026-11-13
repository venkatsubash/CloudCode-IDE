
const Docker = require("dockerode");
const { randomUUID } = require("crypto");

const docker = new Docker();

// Maximum interactive execution time: 5 minutes
const EXECUTION_TIMEOUT = 5 * 60 * 1000;

const MAX_SESSIONS_PER_USER = 2;
const MAX_OUTPUT_LENGTH = 1024 * 1024;

const sessions = new Map();

const LANGUAGE_CONFIG = {
  python: {
    image: "python:3.12-slim",
    command: (code) => ["python", "-u", "-B", "-c", code],
    env: [],
  },

  c: {
    image: "gcc:14",
    command: () => [
      "sh",
      "-c",
      `printf '%s' "$CLOUDCODE_SOURCE" | base64 -d > /workspace/main.c &&
       gcc /workspace/main.c -o /workspace/program &&
       exec /workspace/program`,
    ],
  },

  cpp: {
    image: "gcc:14",
    command: () => [
      "sh",
      "-c",
      `printf '%s' "$CLOUDCODE_SOURCE" | base64 -d > /workspace/main.cpp &&
       g++ /workspace/main.cpp -o /workspace/program &&
       exec /workspace/program`,
    ],
  },

  java: {
    image: "eclipse-temurin:21-jdk",
    command: () => [
      "sh",
      "-c",
      `printf '%s' "$CLOUDCODE_SOURCE" | base64 -d > /workspace/Main.java &&
       javac -d /workspace /workspace/Main.java &&
       exec java -cp /workspace Main`,
    ],
  },

  javascript: {
    image: "node:22-alpine",
    command: () => [
      "sh",
      "-c",
      `printf '%s' "$CLOUDCODE_SOURCE" | base64 -d > /workspace/main.js &&
       exec node /workspace/main.js`,
    ],
  },
};

const startExecution = async (
  userId,
  code,
  language,
  onOutput,
  onExit,
  metadata = {}
) => {
  if (!userId || typeof code !== "string" || !code.trim()) {
    throw new Error("User and non-empty code are required");
  }

  language = String(language || "").trim().toLowerCase();

  if (language === "c++") {
    language = "cpp";
  }

  if (language === "js") {
    language = "javascript";
  }

  const config = LANGUAGE_CONFIG[language];

  if (!config) {
    throw new Error(
      "Unsupported language. Supported languages: Python, C, C++, Java and JavaScript."
    );
  }

  const userSessions = [...sessions.values()].filter(
    (session) => session.userId === userId
  );

  if (userSessions.length >= MAX_SESSIONS_PER_USER) {
    throw new Error("Maximum active execution sessions reached");
  }

  const sessionId = randomUUID();

  let container;
  let attachStream;
  let session;

  try {
    const environment = [];

    let command;

    if (language === "python") {
      command = config.command(code);
    } else {
      const sourceBase64 = Buffer.from(code, "utf8").toString("base64");

      environment.push(`CLOUDCODE_SOURCE=${sourceBase64}`);
      command = config.command();
    }

    container = await docker.createContainer({
      Image: config.image,
      Cmd: command,
      Env: environment,

      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,

      OpenStdin: true,
      StdinOnce: false,
      Tty: true,

      HostConfig: {
        AutoRemove: false,
        NetworkMode: "none",

        Memory: 128 * 1024 * 1024,
        MemorySwap: 128 * 1024 * 1024,
        NanoCpus: 500000000,
        PidsLimit: 64,

        CapDrop: ["ALL"],
        SecurityOpt: ["no-new-privileges:true"],

        ReadonlyRootfs: true,

        Tmpfs: {
          "/tmp": "rw,noexec,nosuid,size=16m",
          "/workspace": "rw,exec,nosuid,size=16m",
        },
      },
    });

    // Keep hijack enabled because interactive input depends on it.
    attachStream = await new Promise((resolve, reject) => {
      container.attach(
        {
          stream: true,
          stdin: true,
          stdout: true,
          stderr: true,
          hijack: true,
        },
        (error, stream) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(stream);
        }
      );
    });

    session = {
      sessionId,
      userId,
      container,
      attachStream,
      onExit,

      metadata: {
        projectId: metadata.projectId,
        fileId: metadata.fileId,
        projectName: metadata.projectName || "Untitled Project",
        fileName: metadata.fileName || "Untitled File",
      },

      input: "",
      output: "",
      startedAt: null,
      timeoutId: null,
      finished: false,
      stopReason: null,
    };

    sessions.set(sessionId, session);

    attachStream.on("data", (chunk) => {
      if (session.finished) return;

      const text = chunk.toString("utf8");

      if (session.output.length < MAX_OUTPUT_LENGTH) {
        const remaining = MAX_OUTPUT_LENGTH - session.output.length;

        session.output += text.slice(0, remaining);

        if (text.length > remaining) {
          session.output +=
            "\n[Output truncated: 1 MB limit reached]";
        }
      }

      if (typeof onOutput === "function") {
        onOutput(text);
      }
    });

    attachStream.on("error", (error) => {
      console.error("Docker stream error:", error.message);
    });

    await container.start();

    session.startedAt = Date.now();

    console.log(
      `CONTAINER STARTED: ${sessionId} (${language})`
    );

    session.timeoutId = setTimeout(() => {
      stopExecution(
        userId,
        sessionId,
        `Execution timed out after ${EXECUTION_TIMEOUT / 1000} seconds`
      ).catch((error) => {
        console.error("Execution timeout error:", error.message);
      });
    }, EXECUTION_TIMEOUT);

    container.wait()
      .then((result) => {
        const reason = session.stopReason;

        finishExecution(
          session,
          reason ? -1 : result.StatusCode,
          reason ||
            (result.StatusCode === 0
              ? null
              : "Program exited with an error")
        );
      })
      .catch((error) => {
        const reason = session.stopReason || error.message;
        finishExecution(session, -1, reason);
      });

    return { sessionId };
  } catch (error) {
    if (session) {
      session.finished = true;
      sessions.delete(sessionId);
      clearTimeout(session.timeoutId);
    }

    if (attachStream) {
      attachStream.destroy();
    }

    if (container) {
      try {
        await container.remove({ force: true });
      } catch (_) {}
    }

    throw error;
  }
};

const sendInput = (userId, sessionId, input) => {
  const session = sessions.get(sessionId);

  if (!session || session.userId !== userId || session.finished) {
    throw new Error("Execution session not found");
  }

  if (typeof input !== "string" || input.length > 10000) {
    throw new Error("Invalid input");
  }

  if (!session.attachStream || !session.attachStream.writable) {
    throw new Error("Execution input stream is closed");
  }

  session.input += input;
  session.attachStream.write(input);
};

const finishExecution = async (session, exitCode, error) => {
  if (session.finished) return;

  session.finished = true;

  clearTimeout(session.timeoutId);
  sessions.delete(session.sessionId);

  const durationMs = session.startedAt
    ? Math.max(0, Date.now() - session.startedAt)
    : 0;

  const errorMessage = error ? String(error) : "";

  let status = "success";

  if (exitCode !== 0) {
    if (errorMessage.toLowerCase().includes("timed out")) {
      status = "timeout";
    } else if (errorMessage === "Execution stopped") {
      status = "stopped";
    } else {
      status = "failed";
    }
  }

  try {
    session.attachStream.destroy();
  } catch (_) {}

  try {
    await session.container.remove({ force: true });
  } catch (cleanupError) {
    console.error(
      "Container cleanup error:",
      cleanupError.message
    );
  }

  if (typeof session.onExit === "function") {
    try {
      await session.onExit({
        sessionId: session.sessionId,
        exitCode,
        status,
        error: errorMessage,
        input: session.input,
        output: session.output,
        durationMs,
        ...session.metadata,
      });
    } catch (callbackError) {
      console.error(
        "Execution completion callback error:",
        callbackError.message
      );
    }
  }

  console.log("SESSION FINISHED:", session.sessionId, status);
};

const stopExecution = async (
  userId,
  sessionId,
  reason = "Execution stopped"
) => {
  const session = sessions.get(sessionId);

  if (!session || session.userId !== userId || session.finished) {
    return;
  }

  session.stopReason = reason;

  try {
    await session.container.kill();
  } catch (_) {}

  await finishExecution(session, -1, reason);
};

module.exports = {
  startExecution,
  sendInput,
  stopExecution,
};
