import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

export interface User {
  id: string;
  username: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

export const createOrGetUser = async (username: string, email?: string): Promise<User> => {
  const response = await axios.post(`${API_URL}/users`, { username, email });
  return response.data;
};

export const getUser = async (id: string): Promise<User> => {
  const response = await axios.get(`${API_URL}/users/${id}`);
  return response.data;
};

export const getUserByUsername = async (username: string): Promise<User> => {
  const response = await axios.get(`${API_URL}/users/username/${username}`);
  return response.data;
}; 