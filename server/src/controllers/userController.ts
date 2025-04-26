import { FastifyRequest, FastifyReply } from 'fastify';
import { UserService } from '../services/userService';
import { IUser } from '../models/User';
import mongoose from 'mongoose';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  async createUser(request: FastifyRequest<{ Body: { username: string } }>, reply: FastifyReply) {
    try {
      const { username } = request.body;
      
      if (!username) {
        return reply.status(400).send({ 
          success: false, 
          error: 'A username is required.' 
        });
      }

      const user = await this.userService.createUser(username);
      
      if (!user) {
        return reply.status(500).send({ 
          success: false, 
          error: 'Failed to create user.' 
        });
      }

      // mongoose의 _id를 문자열로 변환
      const userId = user._id instanceof mongoose.Types.ObjectId 
        ? user._id.toString() 
        : String(user._id);

      return reply.send({ 
        success: true, 
        userId
      });
    } catch (error) {
      console.error('Error creating user:', error);
      return reply.status(500).send({ 
        success: false, 
        error: 'Server error occurred.' 
      });
    }
  }

  async getUserById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const user = await this.userService.getUserById(id);
      
      if (!user) {
        return reply.status(404).send({ 
          success: false, 
          error: 'User not found.' 
        });
      }

      return reply.send({ 
        success: true, 
        user 
      });
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return reply.status(500).send({ 
        success: false, 
        error: 'Server error occurred.' 
      });
    }
  }

  async getUserByUsername(request: FastifyRequest<{ Params: { username: string } }>, reply: FastifyReply) {
    try {
      const { username } = request.params;
      const user = await this.userService.getUserByUsername(username);
      
      if (!user) {
        return reply.status(404).send({ 
          success: false, 
          error: 'User not found.' 
        });
      }

      return reply.send({ 
        success: true, 
        user 
      });
    } catch (error) {
      console.error('Error getting user by username:', error);
      return reply.status(500).send({ 
        success: false, 
        error: 'Server error occurred.' 
      });
    }
  }

  async getUserIdByUsername(request: FastifyRequest<{ Params: { username: string } }>, reply: FastifyReply) {
    try {
      const { username } = request.params;
      const userId = await this.userService.getUserIdByUsername(username);
      
      if (!userId) {
        return reply.status(404).send({ 
          success: false, 
          error: 'User not found.' 
        });
      }

      return reply.send({ 
        success: true, 
        userId
      });
    } catch (error) {
      console.error('Error getting user ID by username:', error);
      return reply.status(500).send({ 
        success: false, 
        error: 'Server error occurred.' 
      });
    }
  }

  async getAllUsers(request: FastifyRequest, reply: FastifyReply) {
    try {
      const users = await this.userService.getAllUsers();
      
      return reply.send({ 
        success: true, 
        users 
      });
    } catch (error) {
      console.error('Error getting all users:', error);
      return reply.status(500).send({ 
        success: false, 
        error: 'Server error occurred.' 
      });
    }
  }
} 