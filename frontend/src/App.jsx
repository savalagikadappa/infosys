import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Auth from './pages/Auth.jsx';
import CandidateDashboard from './pages/CandidateDashboard.jsx';
import TrainerDashboard from './pages/TrainerDashboard.jsx';
import CoordinatorDashboard from './pages/CoordinatorDashboard.jsx';
import ExaminerDashboard from './pages/ExaminerDashboard.jsx';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Auth />} />
        <Route path="/candidate-dashboard" element={<CandidateDashboard />} />
        <Route path="/trainer-dashboard" element={<TrainerDashboard />} />
        <Route path="/coordinator-dashboard" element={<CoordinatorDashboard />} />
        <Route path="/examiner-dashboard" element={<ExaminerDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
