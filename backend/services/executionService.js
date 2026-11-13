
const Docker = require("dockerode");

const docker = new Docker();

const EXECUTION_TIMEOUT = 10000;

const LANGUAGE_CONFIG = {
  python: {
    image: "python:3.12-slim",
    errorName: "Python",
  },

  c: {
    image: "gcc:14",
    errorName: "C",
  },

  cpp: {
    image: "gcc:14",
    errorName: "C++",
  },

  java: {
    image: "eclipse-temurin:21-jdk",
    errorName: "Java",
  },

  javascript: {
    image: "node:22-alpine",
    errorName: "JavaScript",
  },
};

const executeCode = async (code, language, stdin = "") => {
  let container;
  let timeoutId;

  try {
    // Validate source code
    if (typeof code !== "string" || !code.trim()) {
      return {
        success: false,
        output: "",
        error: "Code cannot be empty",
      };
    }

    // Normalize language
    language = String(language || "").trim().toLowerCase();

    if (language === "c++") {
      language = "cpp";
    }

    if (language === "js") {
      language = "javascript";
    }

    const config = LANGUAGE_CONFIG[language];

    if (!config) {
      return {
        success: false,
        output: "",
        error:
          "Unsupported language. Supported languages: Python, C, C++, Java and JavaScript.",
      };
    }

    // Validate standard input
    if (typeof stdin !== "string") {
      return {
        success: false,
        output: "",
        error: "Input must be a string",
      };
    }

    let command;
    const environment = [];

    // =========================================
    // PYTHON EXECUTION
    // =========================================

    if (language === "python") {
      const codeBase64 = Buffer.from(code, "utf8").toString("base64");
      const stdinBase64 = Buffer.from(stdin, "utf8").toString("base64");

      const runner = `
import base64
import io
import sys

source = base64.b64decode("${codeBase64}").decode("utf-8")
user_input = base64.b64decode("${stdinBase64}").decode("utf-8")

sys.stdin = io.StringIO(user_input)

exec(compile(source, "<cloudcode>", "exec"))
`;

      command = [
        "python",
        "-u",
        "-B",
        "-c",
        runner,
      ];
    }

    // =========================================
    // C EXECUTION
    // =========================================

    else if (language === "c") {
      const sourceBase64 = Buffer.from(code, "utf8").toString("base64");
      const inputBase64 = Buffer.from(stdin, "utf8").toString("base64");

      environment.push(
        `CLOUDCODE_SOURCE=${sourceBase64}`,
        `CLOUDCODE_INPUT=${inputBase64}`
      );

      command = [
        "sh",
        "-c",
        `
        printf '%s' "$CLOUDCODE_SOURCE" | base64 -d > /workspace/main.c &&
        gcc /workspace/main.c -o /workspace/program &&
        printf '%s' "$CLOUDCODE_INPUT" | base64 -d | /workspace/program
        `,
      ];
    }

    // =========================================
    // C++ EXECUTION
    // =========================================

    else if (language === "cpp") {
      const sourceBase64 = Buffer.from(code, "utf8").toString("base64");
      const inputBase64 = Buffer.from(stdin, "utf8").toString("base64");

      environment.push(
        `CLOUDCODE_SOURCE=${sourceBase64}`,
        `CLOUDCODE_INPUT=${inputBase64}`
      );

      command = [
        "sh",
        "-c",
        `
        printf '%s' "$CLOUDCODE_SOURCE" | base64 -d > /workspace/main.cpp &&
        g++ /workspace/main.cpp -o /workspace/program &&
        printf '%s' "$CLOUDCODE_INPUT" | base64 -d | /workspace/program
        `,
      ];
    }

    // =========================================
    // JAVA EXECUTION
    // =========================================

    else if (language === "java") {
      const sourceBase64 = Buffer.from(code, "utf8").toString("base64");
      const inputBase64 = Buffer.from(stdin, "utf8").toString("base64");

      environment.push(
        `CLOUDCODE_SOURCE=${sourceBase64}`,
        `CLOUDCODE_INPUT=${inputBase64}`
      );

      command = [
        "sh",
        "-c",
        `
        printf '%s' "$CLOUDCODE_SOURCE" | base64 -d > /workspace/Main.java &&
        javac -d /workspace /workspace/Main.java &&
        printf '%s' "$CLOUDCODE_INPUT" | base64 -d | java -cp /workspace Main
        `,
      ];
    }

    // =========================================
    // JAVASCRIPT EXECUTION
    // =========================================

    else if (language === "javascript") {
      const sourceBase64 = Buffer.from(code, "utf8").toString("base64");
      const inputBase64 = Buffer.from(stdin, "utf8").toString("base64");

      environment.push(
        `CLOUDCODE_SOURCE=${sourceBase64}`,
        `CLOUDCODE_INPUT=${inputBase64}`
      );

      command = [
        "sh",
        "-c",
        `
        printf '%s' "$CLOUDCODE_SOURCE" | base64 -d > /workspace/main.js &&
        printf '%s' "$CLOUDCODE_INPUT" | base64 -d | node /workspace/main.js
        `,
      ];
    }

    // =========================================
    // CREATE DOCKER CONTAINER
    // =========================================

    container = await docker.createContainer({
      Image: config.image,
      Cmd: command,
      Env: environment,

      AttachStdout: true,
      AttachStderr: true,
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

    await container.start();

    // =========================================
    // EXECUTION TIMEOUT
    // =========================================

    const result = await Promise.race([
      container.wait(),

      new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(
            new Error("Execution timed out after 10 seconds")
          );
        }, EXECUTION_TIMEOUT);
      }),
    ]);

    // =========================================
    // COLLECT OUTPUT
    // =========================================

    const logs = await container.logs({
      stdout: true,
      stderr: true,
    });

    const output = logs.toString("utf8");

    return {
      success: result.StatusCode === 0,
      output,
      error:
        result.StatusCode === 0
          ? null
          : `${config.errorName} execution failed. Check the output for details.`,
    };

  } catch (error) {
    // Handle execution timeout
    if (error.message.includes("timed out")) {
      if (container) {
        try {
          await container.kill();
        } catch (_) {}
      }

      return {
        success: false,
        output: "",
        error: "Execution timed out after 10 seconds",
      };
    }

    console.error("Docker execution error:", error.message);

    return {
      success: false,
      output: "",
      error: error.message,
    };

  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Always remove execution container
    if (container) {
      try {
        await container.remove({ force: true });
      } catch (cleanupError) {
        console.error(
          "Container cleanup error:",
          cleanupError.message
        );
      }
    }
  }
};

module.exports = executeCode;
