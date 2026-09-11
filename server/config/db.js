import mongoose from "mongoose";
import dns from "node:dns";

// Fix Windows Node.js SRV resolution issue with MongoDB Atlas
dns.setServers(["8.8.8.8", "1.1.1.1"]);

let isConnected = false;

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn("⚠️ MONGODB_URI is not set. Operating in in-memory mode.");
    return false;
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    isConnected = true;
    console.log("MongoDB connected successfully 🟢");
    return true;
  } catch (err) {
    console.warn("⚠️ MongoDB connection failed:", err.message);
    console.warn("ℹ️ Falling back to in-memory storage.");
    isConnected = false;
    return false;
  }
}

export function isDbConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

