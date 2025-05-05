import React from 'react';
import { useNavigate } from 'react-router-dom';

function CoordinatorDashboard() {
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-white relative px-2 sm:px-0">
      <button onClick={handleLogout} className="absolute top-6 right-8 bg-gradient-to-r from-blue-600 to-blue-400 text-white font-bold px-5 py-2 rounded-xl shadow hover:from-blue-700 hover:to-blue-600 transition z-50">Logout</button>
      <div className="bg-white p-4 sm:p-8 rounded-lg shadow-lg max-w-md w-full border border-blue-600 text-center">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">Welcome to your Coordinator Dashboard!</h2>
        {/* Add coordinator-specific content here */}
      </div>
    </div>
  );
}

export default CoordinatorDashboard;
