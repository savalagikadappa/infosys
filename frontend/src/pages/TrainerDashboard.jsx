import React, { useEffect, useState, useRef } from 'react';
import Modal from 'react-modal';
import { useNavigate } from 'react-router-dom';
import { TEMP_SESSION_IMG } from '../constants';
import CalendarComponent from '../components/CalendarComponent';

function TrainerDashboard() {
  const [sessions, setSessions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', mode: 'online', zoomLink: '', location: '', isLive: false });
  const [loading, setLoading] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showEnrolledModal, setShowEnrolledModal] = useState(false);
  const [enrolledList, setEnrolledList] = useState([]);
  const [highlightDates, setHighlightDates] = useState({});
  const highlightDatesRef = useRef({});
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    const newHighlightDates = {};
    sessions.forEach(session => {
      if (session.dayOfWeek && session.enrolledStudents) {
        session.enrolledStudents.forEach(student => {
          if (student.enrolledAt) {
            const dates = getNextFourDates(session.dayOfWeek, student.enrolledAt);
            dates.forEach(date => {
              const key = date.toLocaleDateString('en-CA');
              if (!newHighlightDates[key]) newHighlightDates[key] = [];
              newHighlightDates[key].push(session);
            });
          }
        });
      }
    });

    // Update state and ref
    highlightDatesRef.current = newHighlightDates;
    setHighlightDates((prev) => ({ ...prev, ...newHighlightDates }));
  }, [sessions]);

  useEffect(() => {
    const fetchHighlightDates = async () => {
      try {
        const res = await fetch('/api/sessions/highlight-dates', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const newHighlightDates = {};

        if (Array.isArray(data)) {
          data.forEach((session) => {
            if (Array.isArray(session.nextSessionDates)) {
              session.nextSessionDates.forEach((date) => {
                const key = new Date(date).toLocaleDateString('en-CA');
                if (!newHighlightDates[key]) newHighlightDates[key] = [];
                newHighlightDates[key].push(session);
              });
            }
          });
        } else {
          console.error('Unexpected data format:', data);
        }

        // Update state and ref
        highlightDatesRef.current = newHighlightDates;
        setHighlightDates((prev) => ({ ...prev, ...newHighlightDates }));
      } catch (error) {
        console.error('Error fetching highlight dates:', error);
      }
    };

    fetchHighlightDates();
  }, [token]);

  const fetchSessions = async () => {
    setLoading(true);
    const res = await fetch('/api/sessions/my-sessions', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setSessions(data);
    setLoading(false);
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setLoading(true);
    const body = { ...form };
    if (form.mode === 'online') delete body.location;
    if (form.mode === 'offline') delete body.zoomLink;
    const res = await fetch('/api/sessions/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body)
    });
    if (res.ok) {
      setShowModal(false);
      setForm({ title: '', description: '', mode: 'online', zoomLink: '', location: '', isLive: false });
      fetchSessions();
    } else {
      const data = await res.json();
      alert(data.message || 'Error creating session');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const handleDeleteSession = async (sessionId) => {
    if (window.confirm('Are you sure you want to delete this session?')) {
      setLoading(true);
      try {
        const res = await fetch(`/api/sessions/${sessionId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          alert('Session deleted successfully');
          fetchSessions();
        } else {
          alert('Failed to delete session');
        }
      } catch (error) {
        console.error('Error deleting session:', error);
        alert('An error occurred while deleting the session');
      } finally {
        setLoading(false);
      }
    }
  };

  // Remove modal open/close race condition
  const openSessionModal = (session) => {
    setSelectedSession(session);
    setShowModal(true);
  };

  const renderSessionCard = (session) => (
    <div
      key={session._id}
      className="bg-white rounded-lg shadow-md p-4 sm:p-6 md:p-8 flex flex-col gap-4 w-full max-w-full h-auto text-left mx-auto relative z-10 shadow-blue-500/90 shadow-lg"
    >
      <img
        src={TEMP_SESSION_IMG}
        alt="Session"
        className="w-32 h-32 object-cover rounded-md"
      />
      <div className="flex flex-col flex-1 text-left pl-0 sm:pl-4 md:pl-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
          <h2 className="text-sm sm:text-base md:text-lg font-bold text-gray-800">{session.title}</h2>
          {session.isLive ? (
            <span className="bg-green-200 text-green-900 text-xs sm:text-sm md:text-base font-semibold mt-2 md:mt-0 mr-0 md:mr-2 px-2 md:px-3 py-1 rounded">Live</span>
          ) : (
            <span className="bg-gray-200 text-gray-900 text-xs sm:text-sm md:text-base font-semibold mt-2 md:mt-0 mr-0 md:mr-2 px-2 md:px-3 py-1 rounded">Not Live</span>
          )}
        </div>
        <p className="mt-2 sm:mt-3 md:mt-4 text-xs sm:text-sm md:text-base text-gray-800">{session.description}</p>
        <div className="mt-3 sm:mt-4 md:mt-5">
          <p className="text-gray-800 text-xs sm:text-sm md:text-base flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 sm:w-4 md:w-5 h-3 sm:h-4 md:h-5 mr-2">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17.93A8.59 8.59 0 0110 18c-.08 0-.16 0-.24 0a8.59 8.59 0 01-2.93-.07A8.05 8.05 0 005 17v1a1 1 0 001 1h8a1 1 0 001-1v-1a8.05 8.05 0 00-.07-.07z" />
            </svg>
            Trainer: You
          </p>
          <p className="text-gray-800 text-xs sm:text-sm md:text-base flex items-center mt-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 sm:w-4 md:w-5 h-3 sm:h-4 md:h-5 mr-2">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
            {session.dayOfWeek || 'TBA'}
          </p>
          <p className="text-gray-800 text-xs sm:text-sm md:text-base flex items-center mt-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 sm:w-4 md:w-5 h-3 sm:h-4 md:h-5 mr-2">
              <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
            </svg>
            {session.enrolledStudents?.length || 0} students enrolled
          </p>
        </div>
        <hr className="mt-4 sm:mt-5 md:mt-6 border-gray-400" />
        <span className="text-gray-700 text-xs sm:text-sm md:text-base">Created: {new Date(session.createdAt).toLocaleDateString()}</span>
        <button
          onClick={() => handleDeleteSession(session._id)}
          className="mt-2 bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 transition"
        >
          Delete Session
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-200 flex flex-col">
      {/* Header Section */}
      <header className="flex justify-between items-center p-6 bg-blue-600 text-white fixed top-0 left-0 w-full z-50">
        <h1 className="text-2xl font-bold">Trainer Dashboard</h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 px-4 py-2 rounded text-white hover:bg-red-600"
        >
          Logout
        </button>
      </header>

      {/* Main Content Section */}
      <main className="flex flex-1 flex-col md:flex-row mt-24">
        {/* Left Column: Sessions */}
        <section className="flex-1 p-6">
          <button
            className="w-full bg-blue-500 text-white py-2 rounded mb-4 hover:bg-blue-600"
            onClick={() => setShowModal(true)}
          >
            + Create Session
          </button>
          {showModal && (
            <Modal
              isOpen={!!showModal}
              onRequestClose={() => setShowModal(false)}
              ariaHideApp={false}
              style={{
                overlay: { backgroundColor: 'rgba(30, 58, 138, 0.6)', zIndex: 50 },
                content: {
                  borderRadius: '1.5rem',
                  maxWidth: '480px',
                  margin: 'auto',
                  padding: '2.5rem',
                  background: 'white',
                  border: 'none',
                  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
                }
              }}
            >
              {/* Modal Content */}
              <form onSubmit={handleCreateSession} className="space-y-5">
                <h3 className="text-2xl font-bold text-blue-800 mb-2">Create Session</h3>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  placeholder="Title"
                  required
                  className="border-b-2 border-blue-200 focus:border-blue-600 outline-none w-full py-2 px-1 bg-transparent text-blue-900 text-lg transition"
                />
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  placeholder="Description"
                  className="border-b-2 border-blue-200 focus:border-blue-600 outline-none w-full py-2 px-1 bg-transparent text-blue-900 text-base transition"
                />
                <select
                  name="mode"
                  value={form.mode}
                  onChange={handleFormChange}
                  className="border-b-2 border-blue-200 focus:border-blue-600 outline-none w-full py-2 px-1 bg-transparent text-blue-900 text-base transition"
                >
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                </select>
                {form.mode === 'online' && (
                  <input
                    name="zoomLink"
                    value={form.zoomLink}
                    onChange={handleFormChange}
                    placeholder="Zoom Link"
                    className="border-b-2 border-blue-200 focus:border-blue-600 outline-none w-full py-2 px-1 bg-transparent text-blue-900 text-base transition"
                  />
                )}
                {form.mode === 'offline' && (
                  <input
                    name="location"
                    value={form.location}
                    onChange={handleFormChange}
                    placeholder="Location"
                    className="border-b-2 border-blue-200 focus:border-blue-600 outline-none w-full py-2 px-1 bg-transparent text-blue-900 text-base transition"
                  />
                )}
                <select
                  name="dayOfWeek"
                  value={form.dayOfWeek || ''}
                  onChange={handleFormChange}
                  required
                  className="border-b-2 border-blue-200 focus:border-blue-600 outline-none w-full py-2 px-1 bg-transparent text-blue-900 text-base transition"
                >
                  <option value="" disabled>Select Day of Week</option>
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                </select>
                <label className="flex items-center gap-2 text-blue-800">
                  <input
                    type="checkbox"
                    name="isLive"
                    checked={form.isLive}
                    onChange={e => setForm({ ...form, isLive: e.target.checked })}
                  />
                  Is Live
                </label>
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-3 rounded-xl font-bold text-lg shadow-lg hover:from-blue-700 hover:to-blue-600 transition-all duration-200"
                >
                  Create
                </button>
              </form>
            </Modal>
          )}
          <div className="w-full mt-4 space-y-6">
            <h3 className="text-2xl font-bold text-blue-800 mb-6 tracking-wide">My Sessions</h3>
            {loading ? (
              <div>Loading...</div>
            ) : sessions.length === 0 ? (
              <div className="text-blue-700">No sessions yet.</div>
            ) : (
              sessions.map((session) => renderSessionCard(session))
            )}
          </div>
        </section>

        {/* Right Column: Calendar */}
        <aside className="w-full md:w-1/3 p-6 bg-blue-100 flex flex-col items-stretch">
          <CalendarComponent
            highlightDates={highlightDates}
            onDateClick={(date) => {
              const key = date.toLocaleDateString('en-CA');
              if (highlightDates[key]) {
                alert(`Sessions on ${key}:
` + highlightDates[key].map(s => s.title).join(', '));
              } else {
                alert('No sessions on this date.');
              }
            }}
          />
        </aside>
      </main>
    </div>
  );
}

export default TrainerDashboard;

function getNextFourDates(dayOfWeek, enrolledAt) {
  const dates = [];
  const startDate = new Date(enrolledAt);
  const dayIndex = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(dayOfWeek);

  // Find the first occurrence of the selected day of the week
  startDate.setDate(startDate.getDate() + (dayIndex + 7 - startDate.getDay()) % 7);

  for (let i = 0; i < 4; i++) {
    const nextDate = new Date(startDate);
    nextDate.setDate(startDate.getDate() + i * 7); // Add weeks
    dates.push(nextDate);
  }

  return dates;
}
