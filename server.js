import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import compression from "compression";

import categoryRoutes from "./server/routes/categories.js";
import listingRoutes from "./server/routes/listings.js";
import statsRoutes from "./server/routes/stats.js";
import userRoutes from "./server/routes/users.js";
import chatRoutes from "./server/routes/chats.js";
import reportRoutes from "./server/routes/reports.js";
import notificationRoutes from "./server/routes/notifications.js";

import { supabase } from "./server/lib/supabase.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  console.log("🚀 Starting server...");

  const app = express();
  const PORT = process.env.PORT || 3000;
  const isProduction = process.env.NODE_ENV === "production";

  // ✅ Global Middleware
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(compression());

  // ✅ Health Check Route
  app.get("/api/health", async (req, res) => {
    let supabaseStatus = "not configured";
    let dbStatus = "unknown";

    try {
      if (supabase) {
        supabaseStatus = "connected";

        const { error } = await supabase
          .from("categories")
          .select("id")
          .limit(1);

        dbStatus = error ? `error: ${error.message}` : "connected";
      }
    } catch (err) {
      dbStatus = `exception: ${err.message}`;
    }

    res.json({
      status: "ok",
      message: "Backend is running!",
      supabase: supabaseStatus,
      database: dbStatus,
    });
  });

  // ✅ API Routes
  app.use("/api/categories", categoryRoutes);
  app.use("/api/listings", listingRoutes);
  app.use("/api/stats", statsRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/chats", chatRoutes);
  app.use("/api/reports", reportRoutes);
  app.use("/api/notifications", notificationRoutes);

  // ✅ Development (Vite)
  if (!isProduction) {
    console.log("⚙️ Running in development mode...");

    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    app.use(vite.middlewares);
  } else {
    // ✅ Production (Serve frontend)
    console.log("🌍 Running in production mode...");

    const distPath = path.resolve(__dirname, "dist");

    app.use(express.static(distPath));

    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // ✅ Global Error Handler
  app.use((err, req, res, next) => {
    console.error("❌ Server Error:", err);

    res.status(500).json({
      error: "Internal Server Error",
      message: err.message,
    });
  });

  // ✅ Start Server
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
}

// ❌ Catch startup crash
startServer().catch((err) => {
  console.error("💥 Failed to start server:", err);
  process.exit(1);
});
