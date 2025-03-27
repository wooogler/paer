import axios from "axios";

// 개발 환경과 프로덕션 환경에 따라 API 기본 URL 설정
const isDev =
  import.meta.env.DEV || import.meta.env.VITE_NODE_ENV === "development";
const baseURL =
  import.meta.env.VITE_API_URL ||
  (isDev ? "http://localhost:3000/api" : "/api");

console.log("API Base URL:", baseURL);

// Create axios instance
const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor setup (e.g., token addition)
api.interceptors.request.use(
  (config) => {
    // Add tokens or other operations as needed
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

// Response interceptor setup (e.g., error handling)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Error handling logic
    if (error.response?.status === 401) {
      // Authentication error handling
      console.error("Authentication error");
    }
    return Promise.reject(error);
  }
);

export default api;
