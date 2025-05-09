import { User } from "../models/User";
import mongoose from "mongoose";

export class UserRepository {
  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<mongoose.Document | null> {
    try {
      return await User.findOne({ username });
    } catch (error) {
      console.error("Error getting user by username:", error);
      throw new Error("Failed to get user by username");
    }
  }
} 