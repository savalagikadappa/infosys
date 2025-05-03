import React, { useEffect, useState } from 'react';
import Modal from 'react-modal';

function CandidateDashboard() {
  const [availableSessions, setAvailableSessions] = useState([]);
  const [enrolledSessions, setEnrolledSessions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    const [availRes, enrolledRes] = await Promise.all([
      fetch('/api/sessions/available', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/sessions/enrolled', { headers: { Authorization: `Bearer ${token}` } })
    ]);
    const avail = await availRes.json();
    const enrolled = await enrolledRes.json();
    setAvailableSessions(avail);
    setEnrolledSessions(enrolled);
    setLoading(false);
  };

  const handleEnroll = async (sessionId) => {
    setLoading(true);
    const res = await fetch(`/api/sessions/enroll/${sessionId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      setShowModal(false);
      fetchSessions();
    } else {
      alert(data.message || 'Error enrolling');
    }
    setLoading(false);
  };

  // Custom calendar: highlight next 4 weeks in red
  const today = new Date(2025, 4, 3); // May 3, 2025
  const calendarWeeks = [];
  for (let i = 0; i < 4; i++) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + i * 7 - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    calendarWeeks.push({ start: new Date(weekStart), end: new Date(weekEnd) });
  }
  const isInNextFourWeeks = (date) => {
    for (const week of calendarWeeks) {
      if (date >= week.start && date <= week.end) return true;
    }
    return false;
  };

  // Helper: get next 4 dates for a given dayOfWeek
  function getNextFourDates(dayOfWeek) {
    const dayMap = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
    const targetDay = dayMap[dayOfWeek];
    if (targetDay === undefined) return [];
    const dates = [];
    let date = new Date(2025, 4, 3); // May 3, 2025
    let count = 0;
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
  enrolledSessions.forEach(session => {
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
      setSelectedSession(highlightDates[key][0]); // Show first session (or show all in modal if needed)
      setShowModal(true);
    }
  };

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
      <h2 className="text-4xl font-extrabold text-blue-900 mb-8 mt-10 text-center tracking-tight drop-shadow-lg">Candidate Dashboard</h2>
      <div className="flex flex-1 gap-10 px-10 pb-10">
        {/* Left: Enrolled and Available Sessions */}
        <div className="w-full md:w-1/2 max-w-xl overflow-y-auto">
          <div className="mb-10">
            <h3 className="text-2xl font-bold text-blue-800 mb-4 tracking-wide">Enrolled Sessions</h3>
            {loading ? <div>Loading...</div> : enrolledSessions.length === 0 ? <div className="text-blue-700">No enrolled sessions.</div> : enrolledSessions.map(s => (
              <div key={s._id} className="bg-gradient-to-r from-blue-100 to-blue-200 border border-blue-200 rounded-2xl shadow-lg p-5 mb-4 flex flex-col gap-1 hover:shadow-2xl transition-all duration-200">
                <div className="font-bold text-blue-900 text-xl mb-1">{s.title}</div>
                <div className="text-blue-700 text-sm">Mode: <span className="font-semibold">{s.mode}</span></div>
                <div className="text-blue-700 text-sm">Live: <span className="font-semibold">{s.isLive ? 'Yes' : 'No'}</span></div>
                <div className="text-blue-700 text-sm">Trainer: {s.createdBy?.email}</div>
                <div className="text-blue-700 text-sm">{s.description}</div>
              </div>
            ))}
          </div>
          <div className="mb-10">
            <h3 className="text-2xl font-bold text-blue-800 mb-4 tracking-wide">Available Sessions</h3>
            {loading ? <div>Loading...</div> : availableSessions.length === 0 ? <div className="text-blue-700">No available sessions.</div> : availableSessions.map(s => (
              <div key={s._id} className="bg-white border border-blue-100 rounded-2xl shadow p-5 mb-4 flex flex-col gap-1 hover:shadow-xl transition-all duration-200">
                <div className="font-bold text-blue-900 text-xl mb-1">{s.title}</div>
                <div className="text-blue-700 text-sm">Mode: <span className="font-semibold">{s.mode}</span></div>
                <div className="text-blue-700 text-sm">Live: <span className="font-semibold">{s.isLive ? 'Yes' : 'No'}</span></div>
                <div className="text-blue-700 text-sm">Trainer: {s.createdBy?.email}</div>
                <div className="text-blue-700 text-sm">{s.description}</div>
                <button className="bg-blue-600 text-white px-3 py-1 rounded mt-2 font-semibold hover:bg-blue-700 transition" onClick={() => handleEnroll(s._id)}>Enroll</button>
              </div>
            ))}
          </div>
        </div>
        {/* Right: Fixed Cool Calendar */}
        <div className="hidden md:flex flex-col items-center justify-start w-1/2 pt-4 sticky top-0 h-screen">
          <div className="bg-white rounded-3xl shadow-2xl border-2 border-blue-200 p-8" style={{ width: 400, minHeight: 400, maxHeight: 650, overflowY: 'auto' }}>
            <div className="text-blue-700 font-extrabold text-xl mb-4 text-center tracking-wide">Upcoming 4 Weeks Highlighted</div>
            {renderCalendar()}
            <div className="mt-2 text-center text-xs text-blue-400">Red = Next 4 weeks</div>
          </div>
        </div>
      </div>
      {/* Modal for session details */}
      <Modal isOpen={!!showModal} onRequestClose={() => setShowModal(false)} ariaHideApp={false}>
        {selectedSession && (
          <div>
            <h3 className="text-lg font-bold mb-2">Session Details</h3>
            <div>Title: {selectedSession.title}</div>
            <div>Day: {selectedSession.dayOfWeek}</div>
            <div>Mode: {selectedSession.mode}</div>
            <div>Trainer: {selectedSession.createdBy?.email}</div>
            <div>Description: {selectedSession.description}</div>
            <button className="mt-4 bg-gray-300 px-4 py-2 rounded" onClick={() => setShowModal(false)}>Close</button>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default CandidateDashboard;
