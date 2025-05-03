import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Auth from './pages/Auth.jsx';
import CandidateDashboard from './pages/CandidateDashboard.jsx';
import TrainerDashboard from './pages/TrainerDashboard.jsx';
import ExaminerDashboard from './pages/ExaminerDashboard.jsx';
import CoordinatorDashboard from './pages/CoordinatorDashboard.jsx';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Auth />} />
        <Route path="/candidate-dashboard" element={<CandidateDashboard />} />
        <Route path="/trainer-dashboard" element={<TrainerDashboard />} />
        <Route path="/examiner-dashboard" element={<ExaminerDashboard />} />
        <Route path="/coordinator-dashboard" element={<CoordinatorDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
