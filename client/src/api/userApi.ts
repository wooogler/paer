import { api } from "./paperApi";

interface ApiResponse {
  success: boolean;
  userId?: string;
  error?: string;
}

/**
 * Function to get user ID by username
 * @param username Username to look up
 * @returns Response containing the found user ID
 */
export const getUserIdByUsername = async (username: string): Promise<ApiResponse> => {
  try {
    const response = await api.get(`/users/id/${username}`);
    console.log("getUserIdByUsername response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error getting user by username:", error);
    throw error;
  }
};

/**
 * Function to get user information
 * @param userId User ID to look up
 * @returns User information object
 */
export const getUserInfo = async (userId: string) => {
  try {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching user information:", error);
    throw error;
  }
};

/**
 * Function to create a new user
 * @param username Username to create
 * @returns Response containing the created user ID
 */
export const createUser = async (username: string): Promise<ApiResponse> => {
  try {
    const response = await api.post("/users", { username });
    return response.data;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

export const createOrGetUser = async (username: string, email: string) => {
  try {
    const response = await api.post("/users", { username, email });
    return response.data;
  } catch (error) {
    console.error("Error creating/getting user:", error);
    throw error;
  }
};

export const getUserByUsername = async (username: string) => {
  try {
    const response = await api.get(`/users/username/${username}`);
    return response.data;
  } catch (error) {
    console.error("Error getting user by username:", error);
    throw error;
  }
};

export const getAllUsers = async () => {
  try {
    const response = await api.get("/users");
    return response.data;
  } catch (error) {
    console.error("Error getting all users:", error);
    throw error;
  }
}; 