import React from 'react';

function CoordinatorDashboard() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full border border-blue-600 text-center">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">Welcome to your Coordinator Dashboard!</h2>
        {/* Add coordinator-specific content here */}
      </div>
    </div>
  );
}

export default CoordinatorDashboard;
