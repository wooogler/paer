import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import {  createUser } from '../api/userApi';
import { toast } from 'react-hot-toast';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setUserName, setUserId, login } = useAppStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!username.trim()) {
      setError('Please enter a username.');
      setIsLoading(false);
      return;
    }

    try {
      // First try to create or get user
      toast.loading('Processing...');
      const createResponse = await createUser(username);
      
      if (createResponse.success) {
        setUserName(username);
        setUserId(createResponse.userId || '');
        localStorage.setItem('username', username);
        localStorage.setItem('userId', createResponse.userId || '');
        login();
        toast.dismiss();
        toast.success('Login successful!');
        navigate('/');
      } else {
        toast.dismiss();
        setError(createResponse.error || 'Failed to login.');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.dismiss();
      setError('An error occurred during login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Login
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Login'}
            </button>
          </div>
          
          <div className="text-sm text-center">
            <p className="text-gray-600">
              Enter a username to view the user's papers.
            </p>
            <p className="text-gray-500 text-xs mt-2">
              Example: testuser
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login; 