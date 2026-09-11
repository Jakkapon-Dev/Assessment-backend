import mongoose from "mongoose";
import dns from "node:dns";

// Fix Windows Node.js SRV resolution issue with MongoDB Atlas
dns.setServers(["8.8.8.8", "1.1.1.1"]);

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is not set in the environment!");
  }

  await mongoose.connect(uri);

  console.log("MongoDB connected 🟢");
}
