import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import categoryRoutes from "./src/routes/categories";
import listingRoutes from "./src/routes/listings";
import statsRoutes from "./src/routes/stats";
import userRoutes from "./src/routes/users";
import chatRoutes from "./src/routes/chats";
import reportRoutes from "./src/routes/reports";
import notificationRoutes from "./src/routes/notifications";
import reviewRoutes from "./src/routes/reviews";
import { supabase } from "./src/lib/supabase";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  console.log("Starting backend server...");
  const app = express();
  const PORT = Number(process.env.PORT) || 3001;

  // Middleware
  app.use(cors({
    origin: ["http://localhost:3000", "https://*.vercel.app"], // Allow local dev and Vercel
    credentials: true
  }));
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

  // Review Routes
  app.use("/api/reviews", reviewRoutes);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[BACKEND] Server running on port ${PORT}`);
    console.log(`[BACKEND] Health check: http://localhost:${PORT}/api/health`);
  });
}

startServer().catch(err => {
  console.error("Failed to start backend server:", err);
  process.exit(1);
});
