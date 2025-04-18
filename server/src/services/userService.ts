import { User, IUser } from "../models/User";
import mongoose from "mongoose";

export class UserService {
  /**
   * 사용자 생성 또는 조회
   */
  async createOrGetUser(username: string, email?: string): Promise<IUser> {
    try {
      let user = await User.findOne({ username });

      if (!user) {
        // 새 사용자 생성
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
   * ID로 사용자 조회
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
   * 사용자명으로 사용자 조회
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
   * username으로 userId 조회
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
   * 사용자 생성
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
} 