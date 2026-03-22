import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import categoryRoutes from "./server/routes/categories";
import listingRoutes from "./server/routes/listings";
import statsRoutes from "./server/routes/stats";
import userRoutes from "./server/routes/users";
import chatRoutes from "./server/routes/chats";
import reportRoutes from "./server/routes/reports";
import notificationRoutes from "./server/routes/notifications";
import reviewRoutes from "./server/routes/reviews";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Middleware
  app.use(express.json());
  
  app.use(cors({
  origin: process.env.FRONTEND_URL,
  }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Server is running!" });
  });

  app.use("/api/categories", categoryRoutes);
  app.use("/api/listings", listingRoutes);
  app.use("/api/stats", statsRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/chats", chatRoutes);
  app.use("/api/reports", reportRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/reviews", reviewRoutes);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production setup
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
