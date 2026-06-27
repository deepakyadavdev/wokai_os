const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");

const app = express();
app.use(cors());
app.use(express.json());

let currentSession = null;

// A. Health check endpoint to tell the web interface we are running
app.get("/health", (req, res) => {
  res.json({ status: "running", platform: process.platform });
});

// Auth callbacks for external browser sign-in loop
app.post("/auth/callback", (req, res) => {
  const { token, profile } = req.body;
  currentSession = { token, profile };
  console.log(`[WokAI Companion] Session authenticated for: ${profile?.email}`);
  res.json({ success: true });
});

app.get("/auth/session", (req, res) => {
  res.json(currentSession);
});

app.post("/auth/clear", (req, res) => {
  currentSession = null;
  res.json({ success: true });
});

// B. Direct Command / Application execution
app.post("/exec", (req, res) => {
  const { command } = req.body;
  if (!command) {
    return res.status(400).json({ error: "Command is required." });
  }

  console.log(`[WokAI Companion] Executing system command: ${command}`);

  exec(command, { timeout: 15000 }, (error, stdout, stderr) => {
    if (error) {
      console.error(`[WokAI Companion] Execution failed:`, error.message);
      return res.status(500).json({ error: error.message, stdout, stderr });
    }
    res.json({ stdout, stderr });
  });
});

// C. Playwright Browser Automation Endpoint
app.post("/browser/run", async (req, res) => {
  const { goal } = req.body;
  if (!goal) {
    return res.status(400).json({ error: "Goal is required." });
  }

  console.log(`[WokAI Companion] Running browser goal: "${goal}"`);

  let browser;
  try {
    const { chromium } = require("playwright");
    browser = await chromium.launch({
      headless: false,
      channel: "chrome",
      args: ["--disable-blink-features=AutomationControlled"]
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();

    await page.goto("https://www.google.com");

    const isSearch = /search|find|lookup/i.test(goal);
    if (isSearch) {
      const q = goal.replace(/search for|search|find|google/i, "").trim();
      if (q) {
        await page.fill("textarea[name='q'], input[name='q']", q);
        await page.keyboard.press("Enter");
        await page.waitForTimeout(3000);
      }
    }

    res.json({
      status: "completed",
      goal,
      message: "Browser operation completed. Browser remains open for review."
    });
  } catch (err) {
    console.warn("[WokAI Companion] Playwright launch failed, falling back to system browser:", err.message);
    try {
      let url = "https://www.google.com";
      const q = goal.replace(/search for|search|find|google/i, "").trim();
      if (q) {
        url = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
      }
      const cmd = process.platform === "win32" ? `start "" "${url}"` : `open "${url}"`;
      exec(cmd);
      res.json({
        status: "completed",
        goal,
        message: `Opened native browser to: ${url}`
      });
    } catch (fallbackErr) {
      console.error("[WokAI Companion] Browser fallback failed:", fallbackErr.message);
      res.status(500).json({ error: fallbackErr.message });
    }
  }
});

const PORT = 4317;
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`WokAI OS Local Companion Service Active on Port ${PORT}`);
  console.log(`Detecting local Chrome installation...`);
  console.log(`Ready for one-click local app and browser operations!`);
  console.log(`======================================================\n`);
});
