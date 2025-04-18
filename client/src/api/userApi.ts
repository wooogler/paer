import api from "../services/api";
import axios from 'axios';

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
    const response = await api.get(`/users/id/${username}`);
    if (!response.data || !response.data.success || !response.data.userId) {
      return {
        success: false,
        error: "사용자를 찾을 수 없습니다."
      };
    }
    return {
      success: true,
      userId: response.data.userId
    };
  } catch (error) {
    console.error("사용자 조회 오류:", error);
    return {
      success: false,
      error: "사용자를 찾을 수 없습니다."
    };
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
    const response = await api.post('/users', { username });
    if (!response.data || !response.data.success || !response.data.userId) {
      return {
        success: false,
        error: '사용자 생성에 실패했습니다.'
      };
    }
    return {
      success: true,
      userId: response.data.userId
    };
  } catch (error) {
    console.error("사용자 생성 오류:", error);
    return {
      success: false,
      error: '사용자 생성에 실패했습니다.'
    };
  }
}; 