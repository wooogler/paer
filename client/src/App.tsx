import React, { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Editor from "./components/Editor";
import Layout from "./components/Layout";
import Login from "./components/Login";
import { useAppStore } from "./store/useAppStore";

function App() {
  const { userName, setUserName, setUserId } = useAppStore();

  // 로컬 스토리지에서 사용자 정보 불러오기
  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    const storedUserId = localStorage.getItem('userId');
    
    if (storedUsername && storedUserId) {
      setUserName(storedUsername);
      setUserId(storedUserId);
    }
  }, [setUserName, setUserId]);

  return (
    <div className="h-screen w-screen bg-gray-50">
      <Router>
        <Routes>
          <Route 
            path="/login" 
            element={userName ? <Navigate to="/" /> : <Login />} 
          />
          <Route 
            path="/" 
            element={
              userName ? (
                <Layout>
                  <Editor userName={userName} />
                </Layout>
              ) : (
                <Navigate to="/login" />
              )
            } 
          />
        </Routes>
      </Router>
      <Toaster 
        position="bottom-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
          },
        }}
      />
    </div>
  );
}

export default App;
