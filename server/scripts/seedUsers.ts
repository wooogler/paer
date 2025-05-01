import mongoose from "mongoose";
import { User } from "../src/models/User";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: "../../.env" });

const seedUsers = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/paer";
    await mongoose.connect(mongoURI);
    console.log("Connected to MongoDB");

    // Predefined users
    const users = [
      { username: "Muhammad Danish"},
      { username: "Zeel Desai"},
      { username: "Adithya Harish"},
      { username: "Matthew Brenningmeyer"},
      { username: "Kirk"},
      { username: "Yoseph"},
      { username: "Tyler Buxton"},
      { username: "Shuvam"},
      { username: "Shilong Zong"},
      { username: "Yuhang"},
      { username: "Amal Alamri"},
      { username: "PeiQing Guo"},
      { username: "Khoulood"},
      { username: "Sangwook Lee"},
      { username: "Nayan Chawla"},
      { username: "Gayatri Milind Bhatambarekar"},
      { username: "Rodney Okyere"},
      { username: "David Barron"},
      { username: "Jaehoon Pyon"},
      { username: "Yi Zeng"},
      { username: "Eugenia Rho"},
    ];

    // Insert users into the database
    await User.insertMany(users);
    console.log("Users inserted successfully");

    // Close the connection
    await mongoose.connection.close();
    console.log("MongoDB connection closed");
  } catch (error) {
    console.error("Error seeding users:", error);
    process.exit(1);
  }
};

seedUsers();