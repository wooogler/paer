import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { getUserIdByUsername, createUser } from '../api/userApi';
import { toast } from 'react-hot-toast';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setUserName, setUserId } = useAppStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('유저 이름을 입력해주세요.');
      return;
    }

    try {
      // 먼저 유저가 존재하는지 확인
      const userResponse = await getUserIdByUsername(username);
      
      if (userResponse.success) {
        // 유저가 존재하는 경우
        setUserName(username);
        setUserId(userResponse.userId);
        localStorage.setItem('username', username);
        localStorage.setItem('userId', userResponse.userId);
        toast.success('로그인 성공!');
        navigate('/');
      } else {
        // 유저가 존재하지 않는 경우, 새로 생성
        const createResponse = await createUser(username);
        
        if (createResponse.success) {
          setUserName(username);
          setUserId(createResponse.userId);
          localStorage.setItem('username', username);
          localStorage.setItem('userId', createResponse.userId);
          toast.success('새로운 계정이 생성되었습니다!');
          navigate('/');
        } else {
          setError(createResponse.error || '계정 생성에 실패했습니다.');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('로그인 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            로그인
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                유저 이름
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="유저 이름"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              로그인
            </button>
          </div>
          
          <div className="text-sm text-center">
            <p className="text-gray-600">
              사용자 이름을 입력하면 해당 사용자의 논문을 조회합니다.
            </p>
            <p className="text-gray-500 text-xs mt-2">
              예: testuser
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login; 