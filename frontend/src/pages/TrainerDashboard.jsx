import React, { useEffect, useState } from 'react';
import Modal from 'react-modal';
import { useNavigate } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const TEMP_SESSION_IMG = '/images/drone.jpg';

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
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  useEffect(() => {
    fetchSessions();
  }, []);

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

  // Robust getNextFourDates: always starts from the later of today or startDate, works for all years/months
  function getNextFourDates(dayOfWeek, startDate) {
    const dayMap = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
    const targetDay = dayMap[dayOfWeek];
    if (targetDay === undefined) return [];

    // Use the later of today or startDate
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const base = new Date(startDate);
    base.setHours(0, 0, 0, 0);
    let date = base > today ? new Date(base) : new Date(today);

    // Find the first occurrence of the target day on or after base date
    const dayDiff = (targetDay - date.getDay() + 7) % 7;
    if (dayDiff > 0) {
      date.setDate(date.getDate() + dayDiff);
    }

    // Collect the next 4 occurrences
    const dates = [];
    for (let i = 0; i < 4; i++) {
      dates.push(new Date(date));
      date.setDate(date.getDate() + 7);
    }
    return dates;
  }

  // Use local date string (YYYY-MM-DD) for highlightDates keys and calendar
  useEffect(() => {
    const newHighlightDates = {};
    sessions.forEach(session => {
      if (session.dayOfWeek && session.enrolledStudents) {
        session.enrolledStudents.forEach(student => {
          if (student.enrolledAt) {
            const dates = getNextFourDates(session.dayOfWeek, student.enrolledAt);
            dates.forEach(date => {
              const key = date.toLocaleDateString('en-CA'); // Use local date string
              if (!newHighlightDates[key]) newHighlightDates[key] = [];
              newHighlightDates[key].push(session);
            });
          }
        });
      }
    });
    setHighlightDates(newHighlightDates);
  }, [sessions]);

  // Add debugging logs to verify highlightDates and tileClassName behavior
  useEffect(() => {
    console.log('Highlight Dates:', highlightDates);
  }, [highlightDates]);

  // Calendar click handler
  const handleCalendarClick = (date) => {
    const key = date.toLocaleDateString('en-CA'); // Use local date string
    if (highlightDates[key]) {
      setSelectedSession(highlightDates[key][0]);
      setShowSessionModal(true);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  // Remove session handler
  const handleRemoveSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to remove this session?')) return;
    setLoading(true);
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      fetchSessions();
    } else {
      const data = await res.json();
      alert(data.message || 'Error deleting session');
    }
    setLoading(false);
  };

  // Remove modal open/close race condition
  const openSessionModal = (session) => {
    setSelectedSession(session);
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-200 flex flex-col">
      <div className="flex flex-col md:flex-row w-full h-full">
        {/* Left: Main Content */}
        <div className="flex-1 flex flex-col px-8 py-10">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-4xl font-extrabold text-blue-900 tracking-tight drop-shadow-lg">Trainer Dashboard</h2>
            <button onClick={handleLogout} className="bg-gradient-to-r from-blue-600 to-blue-400 text-white font-bold px-6 py-3 rounded-xl shadow hover:from-blue-700 hover:to-blue-600 transition text-lg">Logout</button>
          </div>
          <button className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-4 rounded-2xl font-bold text-2xl shadow-lg hover:from-blue-700 hover:to-blue-600 transition-all duration-200 mb-10" onClick={() => setShowModal(true)}>+ Create Session</button>
          {showModal && (
            <Modal isOpen={!!showModal} onRequestClose={() => setShowModal(false)} ariaHideApp={false} style={{
              overlay: { backgroundColor: 'rgba(30, 58, 138, 0.6)', zIndex: 50 },
              content: { borderRadius: '1.5rem', maxWidth: '480px', margin: 'auto', padding: '2.5rem', background: 'white', border: 'none', boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)' }
            }}>
              <form onSubmit={handleCreateSession} className="space-y-5">
                <h3 className="text-2xl font-bold text-blue-800 mb-2">Create Session</h3>
                <input name="title" value={form.title} onChange={handleFormChange} placeholder="Title" required className="border-b-2 border-blue-200 focus:border-blue-600 outline-none w-full py-2 px-1 bg-transparent text-blue-900 text-lg transition" />
                <textarea name="description" value={form.description} onChange={handleFormChange} placeholder="Description" className="border-b-2 border-blue-200 focus:border-blue-600 outline-none w-full py-2 px-1 bg-transparent text-blue-900 text-base transition" />
                <select name="mode" value={form.mode} onChange={handleFormChange} className="border-b-2 border-blue-200 focus:border-blue-600 outline-none w-full py-2 px-1 bg-transparent text-blue-900 text-base transition">
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                </select>
                {form.mode === 'online' && <input name="zoomLink" value={form.zoomLink} onChange={handleFormChange} placeholder="Zoom Link" className="border-b-2 border-blue-200 focus:border-blue-600 outline-none w-full py-2 px-1 bg-transparent text-blue-900 text-base transition" />}
                {form.mode === 'offline' && <input name="location" value={form.location} onChange={handleFormChange} placeholder="Location" className="border-b-2 border-blue-200 focus:border-blue-600 outline-none w-full py-2 px-1 bg-transparent text-blue-900 text-base transition" />}
                <select name="dayOfWeek" value={form.dayOfWeek || ''} onChange={handleFormChange} required className="border-b-2 border-blue-200 focus:border-blue-600 outline-none w-full py-2 px-1 bg-transparent text-blue-900 text-base transition">
                  <option value="" disabled>Select Day of Week</option>
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                </select>
                <label className="flex items-center gap-2 text-blue-800"><input type="checkbox" name="isLive" checked={form.isLive} onChange={e => setForm({ ...form, isLive: e.target.checked })} /> Is Live</label>
                <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-3 rounded-xl font-bold text-lg shadow-lg hover:from-blue-700 hover:to-blue-600 transition-all duration-200">Create</button>
              </form>
            </Modal>
          )}
          <div className="w-full mt-4">
            <h3 className="text-2xl font-bold text-blue-800 mb-6 tracking-wide">My Sessions</h3>
            {loading ? <div>Loading...</div> : sessions.length === 0 ? <div className="text-blue-700">No sessions yet.</div> : sessions.map(s => (
              <div key={s._id} className="bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl md:rounded-3xl shadow-2xl border-2 md:border-4 border-blue-300 flex flex-col sm:flex-row overflow-hidden hover:shadow-3xl transition-all min-w-0 max-w-full w-full mb-8 p-3 md:p-10 gap-3 md:gap-10">
                <img src={TEMP_SESSION_IMG} alt="Session" className="w-full sm:w-32 md:w-[220px] lg:w-[320px] h-32 md:h-48 lg:h-72 object-cover rounded-xl md:rounded-2xl shadow-lg border-2 border-blue-200 flex-shrink-0" />
                <div className="flex flex-col gap-6 flex-1 justify-center">
                  <div className="flex items-center gap-6 mb-2">
                    <span className={`inline-block w-5 h-5 rounded-full ${s.mode === 'online' ? 'bg-green-400' : 'bg-gray-400'} shadow`} title={s.mode}></span>
                    <span className="text-xl font-bold text-blue-600 uppercase tracking-widest">{s.mode === 'online' ? 'Online' : 'Offline'}</span>
                    {s.isLive && <span className="ml-6 px-6 py-2 bg-blue-200 text-blue-900 text-xl rounded-full font-extrabold shadow">Live</span>}
                  </div>
                  <div className="font-extrabold text-4xl text-blue-900 mb-2 drop-shadow-lg">{s.title}</div>
                  <div className="text-blue-800 text-xl mb-2 font-medium">{s.description}</div>
                  <div className="flex flex-wrap gap-10 text-xl text-blue-700 mb-2 font-semibold">
                    <span>Trainer: <span className="font-bold text-blue-900">You</span></span>
                    <span>Date: <span className="font-bold text-blue-900">{s.dayOfWeek || 'TBA'}</span></span>
                    <span>Enrolled: <button type="button" className="font-bold underline text-blue-800 hover:text-blue-600 focus:outline-none" onClick={() => { setEnrolledList(s.enrolledStudents || []); setShowEnrolledModal(true); }}>{s.enrolledStudents?.length || 0}</button></span>
                  </div>
                  <div className="flex gap-6 mt-auto">
                    {s.isLive ? (
                      <span className="px-8 py-3 rounded-xl bg-green-200 text-green-900 font-extrabold text-xl shadow">Live</span>
                    ) : (
                      <span className="px-8 py-3 rounded-xl bg-gray-100 text-gray-700 font-extrabold text-xl shadow">Not Live</span>
                    )}
                    {s.mode === 'offline' && <span className="px-6 py-3 rounded-xl bg-gray-200 text-gray-700 font-bold text-xl">Offline</span>}
                    <button
                      className="ml-auto bg-gradient-to-r from-red-500 to-red-700 text-white font-extrabold text-xl px-8 py-3 rounded-xl shadow hover:from-red-600 hover:to-red-800 transition"
                      onClick={() => handleRemoveSession(s._id)}
                      disabled={loading}
                    >
                      {loading ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Right: Calendar */}
        <div className="hidden md:flex flex-col items-center justify-start pt-10 pr-10 w-[440px]">
          <div className="bg-white rounded-3xl shadow-2xl border-2 border-blue-200 p-10 w-full" style={{ minHeight: 400, maxHeight: 700, overflowY: 'auto' }}>
            <div className="text-blue-700 font-extrabold text-2xl mb-6 text-center tracking-wide">Calendar</div>
            <div className="calendar-container">
              <Calendar
                onClickDay={handleCalendarClick}
                tileClassName={({ date }) => {
                  const key = date.toLocaleDateString('en-CA'); // Use local date string
                  if (highlightDates[key]) {
                    return 'dark-red-box'; // Apply the CSS class for highlighted dates
                  }
                  return null; // No styling for non-highlighted dates
                }}
              />
            </div>
          </div>
        </div>
      </div>
      <Modal isOpen={!!showSessionModal} onRequestClose={() => setShowSessionModal(false)} ariaHideApp={false}>
        {selectedSession && (
          <div className="flex flex-col gap-3 p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-100 shadow-2xl border-2 border-blue-200 min-w-[320px] max-w-lg mx-auto">
            <div className="text-2xl font-extrabold text-blue-900 mb-1 text-center tracking-tight">{selectedSession.title}</div>
            <div className="flex flex-wrap gap-2 justify-center text-blue-700 font-medium text-base mb-1">
              <span>Day: <span className="font-bold">{selectedSession.dayOfWeek}</span></span>
              <span>| Mode: <span className="font-bold">{selectedSession.mode}</span></span>
              <span>| Live: <span className="font-bold">{selectedSession.isLive ? 'Yes' : 'No'}</span></span>
              <span>| Enrolled: <span className="font-bold">{selectedSession.enrolledStudents?.length || 0}</span></span>
            </div>
            <div className="text-slate-700 text-base leading-relaxed text-center mb-2">{selectedSession.description}</div>
            <button className="mt-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold text-base px-6 py-2 rounded-xl shadow hover:from-blue-700 hover:to-blue-600 transition self-center" onClick={() => setShowSessionModal(false)}>Close</button>
          </div>
        )}
      </Modal>
      {/* Enrolled students modal */}
      <Modal isOpen={showEnrolledModal} onRequestClose={() => setShowEnrolledModal(false)} ariaHideApp={false}>
        <div className="flex flex-col gap-3 p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-100 shadow-2xl border-2 border-blue-200 min-w-[320px] max-w-lg mx-auto">
          <div className="text-xl font-bold text-blue-900 mb-2 text-center">Enrolled Students</div>
          {enrolledList.length === 0 ? (
            <div className="text-blue-700 text-center">No students enrolled.</div>
          ) : (
            <ul className="list-disc list-inside text-blue-800">
              {enrolledList.map((stu, idx) => (
                <li key={stu._id || idx}>{stu.email}</li>
              ))}
            </ul>
          )}
          <button className="mt-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold text-base px-6 py-2 rounded-xl shadow hover:from-blue-700 hover:to-blue-600 transition self-center" onClick={() => setShowEnrolledModal(false)}>Close</button>
        </div>
      </Modal>
    </div>
  );
}

export default TrainerDashboard;
