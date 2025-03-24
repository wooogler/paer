import axios from "axios";

// 개발/프로덕션 환경에 따라 API 기본 URL 설정
const baseURL = import.meta.env.DEV ? "http://localhost:3000/api" : "/api";

// axios 인스턴스 생성
const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// 요청 인터셉터 설정 (예: 토큰 추가 등)
api.interceptors.request.use(
  (config) => {
    // 여기에서 필요에 따라 토큰 추가 등의 작업 수행
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 설정 (예: 에러 처리 등)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 에러 처리 로직
    if (error.response?.status === 401) {
      // 인증 관련 에러 처리
      console.error("인증 에러");
    }
    return Promise.reject(error);
  }
);

export default api;
