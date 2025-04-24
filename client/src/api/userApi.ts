import { api } from "./paperApi";

interface ApiResponse {
  success: boolean;
  userId?: string;
  error?: string;
}

/**
 * username으로 사용자 ID를 조회하는 함수
 * @param username 조회할 사용자 이름
 * @returns 조회된 사용자 ID를 포함한 응답
 */
export const getUserIdByUsername = async (username: string): Promise<ApiResponse> => {
  try {
    const response = await api.get(`/api/users/username/${username}`);
    return response.data;
  } catch (error) {
    console.error("Error getting user by username:", error);
    throw error;
  }
};

/**
 * 사용자 정보 조회 함수
 * @param userId 조회할 사용자 ID
 * @returns 사용자 정보 객체
 */
export const getUserInfo = async (userId: string) => {
  try {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error("사용자 정보 조회 오류:", error);
    throw error;
  }
};

/**
 * 새 사용자 생성 함수
 * @param username 생성할 사용자 이름
 * @returns 생성된 사용자 ID를 포함한 응답
 */
export const createUser = async (username: string): Promise<ApiResponse> => {
  try {
    const response = await api.post("/api/users", { username });
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
    const response = await api.get(`/api/users/username/${username}`);
    return response.data;
  } catch (error) {
    console.error("Error getting user by username:", error);
    throw error;
  }
};

export const getAllUsers = async () => {
  try {
    const response = await api.get("/api/users");
    return response.data;
  } catch (error) {
    console.error("Error getting all users:", error);
    throw error;
  }
}; 