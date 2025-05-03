import React, { useEffect, useState } from 'react';
import Modal from 'react-modal';

function TrainerDashboard() {
  const [sessions, setSessions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', mode: 'online', zoomLink: '', location: '', isLive: false });
  const [loading, setLoading] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const token = localStorage.getItem('token');

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

  // Helper: get next 4 dates for a given dayOfWeek
  function getNextFourDates(dayOfWeek) {
    const dayMap = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
    const targetDay = dayMap[dayOfWeek];
    if (targetDay === undefined) return [];
    const dates = [];
    let date = new Date(2025, 4, 3); // May 3, 2025
    // Find the first occurrence
    while (date.getDay() !== targetDay) {
      date.setDate(date.getDate() + 1);
    }
    // Collect next 4 occurrences
    for (let i = 0; i < 4; i++) {
      dates.push(new Date(date));
      date.setDate(date.getDate() + 7);
    }
    return dates;
  }

  // Build a map: date string (YYYY-MM-DD) -> session(s)
  const highlightDates = {};
  sessions.forEach(session => {
    if (session.dayOfWeek) {
      getNextFourDates(session.dayOfWeek).forEach(date => {
        const key = date.toISOString().slice(0, 10);
        if (!highlightDates[key]) highlightDates[key] = [];
        highlightDates[key].push(session);
      });
    }
  });

  // Calendar click handler
  const handleCalendarClick = (date) => {
    const key = date.toISOString().slice(0, 10);
    if (highlightDates[key]) {
      setSelectedSession(highlightDates[key][0]);
      setShowSessionModal(true);
    }
  };

  // Render a plain calendar for the next 2 months
  const renderCalendar = () => {
    const now = new Date(2025, 4, 3);
    const months = [];
    for (let m = 0; m < 2; m++) {
      const month = new Date(now.getFullYear(), now.getMonth() + m, 1);
      const days = [];
      const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      for (let wd = 0; wd < 7; wd++) {
        days.push(<div key={'wd' + wd} className="text-xs font-bold text-blue-700 text-center mb-1">{weekDays[wd]}</div>);
      }
      for (let b = 0; b < month.getDay(); b++) {
        days.push(<div key={'b' + b}></div>);
      }
      for (let d = 1; d <= 31; d++) {
        const day = new Date(month.getFullYear(), month.getMonth(), d);
        if (day.getMonth() !== month.getMonth()) break;
        const key = day.toISOString().slice(0, 10);
        const isRed = !!highlightDates[key];
        days.push(
          <div
            key={d}
            className={`w-9 h-9 flex items-center justify-center rounded-full font-semibold text-base mb-1 shadow transition-all duration-200 cursor-pointer ${isRed ? 'bg-gradient-to-br from-red-500 to-red-700 text-white ring-2 ring-red-300 scale-105' : 'bg-blue-50 text-blue-700 hover:bg-blue-200'}`}
            onClick={() => isRed && handleCalendarClick(day)}
          >
            {d}
          </div>
        );
      }
      months.push(
        <div key={m} className="mb-4">
          <div className="text-blue-900 font-bold text-center mb-2 text-lg tracking-wide drop-shadow">{month.toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
          <div className="grid grid-cols-7 gap-1">{days}</div>
        </div>
      );
    }
    return months;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-200 flex flex-col">
      <h2 className="text-4xl font-extrabold text-blue-900 mb-8 mt-10 text-center tracking-tight drop-shadow-lg">Trainer Dashboard</h2>
      <div className="flex flex-col md:flex-row gap-10 w-full max-w-5xl mx-auto">
        <div className="flex-1 flex flex-col items-center">
          <button className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-3 rounded-xl font-bold text-lg shadow-lg hover:from-blue-700 hover:to-blue-600 transition-all duration-200 mb-8" onClick={() => setShowModal(true)}>+ Create Session</button>
          {showModal && (
            <Modal isOpen={!!showModal} onRequestClose={() => setShowModal(false)} ariaHideApp={false} style={{
              overlay: { backgroundColor: 'rgba(30, 58, 138, 0.6)', zIndex: 50 },
              content: { borderRadius: '1.5rem', maxWidth: '420px', margin: 'auto', padding: '2.5rem', background: 'white', border: 'none', boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)' }
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
          <div className="w-full mt-8">
            <h3 className="text-2xl font-bold text-blue-800 mb-4 tracking-wide">My Sessions</h3>
            {loading ? <div>Loading...</div> : sessions.length === 0 ? <div className="text-blue-700">No sessions yet.</div> : sessions.map(s => (
              <div key={s._id} className="bg-white border border-blue-100 rounded-2xl shadow p-5 mb-4 flex flex-col gap-1 hover:shadow-xl transition-all duration-200">
                <div className="font-bold text-blue-900 text-xl mb-1">{s.title}</div>
                <div className="text-blue-700 text-sm">Mode: <span className="font-semibold">{s.mode}</span></div>
                <div className="text-blue-700 text-sm">Live: <span className="font-semibold">{s.isLive ? 'Yes' : 'No'}</span></div>
                <div className="text-blue-700 text-sm">Enrolled: <span className="font-semibold">{s.enrolledStudents?.length || 0}</span></div>
                <div className="text-blue-700 text-sm">Day: <span className="font-semibold">{s.dayOfWeek}</span></div>
                <div className="text-blue-700 text-sm">{s.description}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Right: Plain Calendar */}
        <div className="hidden md:flex flex-col items-center justify-start pt-4 sticky top-0 h-screen">
          <div className="bg-white rounded-3xl shadow-2xl border-2 border-blue-200 p-8" style={{ width: 400, minHeight: 400, maxHeight: 650, overflowY: 'auto' }}>
            <div className="text-blue-700 font-extrabold text-xl mb-4 text-center tracking-wide">Calendar</div>
            {renderCalendar()}
          </div>
        </div>
      </div>
      <Modal isOpen={!!showSessionModal} onRequestClose={() => setShowSessionModal(false)} ariaHideApp={false}>
        {selectedSession && (
          <div>
            <h3 className="text-lg font-bold mb-2">Session Details</h3>
            <div>Title: {selectedSession.title}</div>
            <div>Day: {selectedSession.dayOfWeek}</div>
            <div>Mode: {selectedSession.mode}</div>
            <div>Description: {selectedSession.description}</div>
            <div>Live: {selectedSession.isLive ? 'Yes' : 'No'}</div>
            <div>Enrolled: {selectedSession.enrolledStudents?.length || 0}</div>
            <button className="mt-4 bg-gray-300 px-4 py-2 rounded" onClick={() => setShowSessionModal(false)}>Close</button>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default TrainerDashboard;
