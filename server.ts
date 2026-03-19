import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import categoryRoutes from "./server/routes/categories";
import listingRoutes from "./server/routes/listings";
import statsRoutes from "./server/routes/stats";
import userRoutes from "./server/routes/users";
import chatRoutes from "./server/routes/chats";
import reportRoutes from "./server/routes/reports";
import notificationRoutes from "./server/routes/notifications";
import { supabase } from "./server/lib/supabase";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  console.log("Starting server...");
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // API Routes
  app.get("/api/health", async (req, res) => {
    const supabaseStatus = supabase ? "connected" : "not configured";
    let dbStatus = "unknown";
    
    if (supabase) {
      try {
        const { error } = await supabase.from('categories').select('id').limit(1);
        dbStatus = error ? `error: ${error.message}` : "connected";
      } catch (err) {
        dbStatus = `exception: ${err instanceof Error ? err.message : String(err)}`;
      }
    }

    res.json({ 
      status: "ok", 
      message: "Backend is running!",
      supabase: supabaseStatus,
      database: dbStatus
    });
  });

  // Category Routes
  app.use("/api/categories", categoryRoutes);

  // Listing Routes
  app.use("/api/listings", listingRoutes);

  // Stats Routes
  app.use("/api/stats", statsRoutes);

  // User Routes
  app.use("/api/users", userRoutes);

  // Chat Routes
  app.use("/api/chats", chatRoutes);

  // Report Routes
  app.use("/api/reports", reportRoutes);

  // Notification Routes
  app.use("/api/notifications", notificationRoutes);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
