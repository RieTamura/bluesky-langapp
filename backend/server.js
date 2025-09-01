// server.js
const express = require("express");
const path = require("path");
const app = express();
const PORT = 3000;

// Middleware for parsing JSON
app.use(express.json());

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, "../frontend")));

// API routes will be added here in future tasks
app.use("/api", (req, res) => {
  res.status(404).json({ error: "API endpoint not implemented yet" });
});

// Serve the main HTML file for all non-API routes (SPA routing)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Frontend available at http://localhost:${PORT}`);
});
