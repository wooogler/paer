import { User, IUser } from "../models/User";
import mongoose from "mongoose";

export class UserService {
  /**
   * Create or get user
   */
  async createOrGetUser(username: string, email?: string): Promise<IUser> {
    try {
      let user = await User.findOne({ username });

      if (!user) {
        // Create new user
        user = await User.create({
          username,
          email
        });
      }

      return user;
    } catch (error) {
      console.error("Error in createOrGetUser:", error);
      throw new Error("Failed to create or get user");
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<IUser | null> {
    try {
      if (!mongoose.isValidObjectId(id)) {
        throw new Error("Invalid user ID");
      }

      return await User.findById(id);
    } catch (error) {
      console.error("Error in getUserById:", error);
      throw new Error("Failed to get user by ID");
    }
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<IUser | null> {
    try {
      return await User.findOne({ username });
    } catch (error) {
      console.error("Error in getUserByUsername:", error);
      throw new Error("Failed to get user by username");
    }
  }

  /**
   * Get userId by username
   */
  async getUserIdByUsername(username: string): Promise<string | null> {
    try {
      const user = await User.findOne({ username });
      if (!user) {
        return null;
      }
      return (user._id as mongoose.Types.ObjectId).toString();
    } catch (error) {
      console.error("Error getting user ID:", error);
      throw new Error("Failed to get user ID");
    }
  }

  /**
   * Create user
   */
  async createUser(username: string): Promise<IUser | null> {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return existingUser;
      }

      // Create new user
      const newUser = new User({
        username,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await newUser.save();
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  }

  /**
   * Get all users
   */
  async getAllUsers(): Promise<IUser[]> {
    try {
      return await User.find({}, { username: 1, email: 1, _id: 1 });
    } catch (error) {
      console.error("Error in getAllUsers:", error);
      throw new Error("Failed to get all users");
    }
  }
} 