import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import Modal from 'react-modal';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

function ExaminerDashboard() {
  const [sessions, setSessions] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchSessions();
    socket.on('session-updated', fetchSessions);
    return () => socket.off('session-updated', fetchSessions);
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    const res = await fetch('/api/sessions/all', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setSessions(data);
    setCalendarEvents(data.map(s => ({
      title: s.title,
      date: s.date,
      color: 'red',
      id: s._id,
      extendedProps: { session: s }
    })));
    setLoading(false);
  };

  const handleEventClick = (info) => {
    setSelectedSession(info.event.extendedProps.session);
    setShowModal(true);
    setRescheduleDate(info.event.startStr);
  };

  const handleReschedule = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/sessions/reschedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ sessionId: selectedSession._id, newDate: rescheduleDate })
    });
    const data = await res.json();
    if (res.ok) {
      setShowModal(false);
      socket.emit('session-updated');
      fetchSessions();
    } else {
      alert(data.message || 'Error rescheduling');
    }
    setLoading(false);
  };

  const handleCheckInOut = async (action) => {
    setLoading(true);
    const res = await fetch('/api/sessions/checkinout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ sessionId: selectedSession._id, action })
    });
    const data = await res.json();
    if (res.ok) {
      setShowModal(false);
      socket.emit('session-updated');
      fetchSessions();
    } else {
      alert(data.message || 'Error');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white p-4">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">Examiner Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <FullCalendar
            plugins={[dayGridPlugin]}
            initialView="dayGridMonth"
            events={calendarEvents}
            eventClick={handleEventClick}
            height={500}
          />
          <div className="mt-2 text-sm">
            <span className="inline-block w-3 h-3 bg-red-500 mr-1"></span>Session
          </div>
        </div>
        <div>
          <h3 className="text-lg font-bold mb-2">All Sessions</h3>
          {loading ? <div>Loading...</div> : sessions.map(s => (
            <div key={s._id} className="border p-4 mb-2 rounded shadow">
              <div className="font-semibold">{s.title}</div>
              <div className="text-sm text-gray-600">{new Date(s.date).toLocaleString()}</div>
              <div className="text-sm">Mode: {s.mode}</div>
              <div className="text-sm">Trainer: {s.createdBy?.email}</div>
              <div className="text-sm">Enrolled: {s.enrolledStudents.length}</div>
              <button className="text-blue-600 underline mt-1" onClick={() => { setSelectedSession(s); setShowModal(true); setRescheduleDate(s.date); }}>Details/Actions</button>
            </div>
          ))}
        </div>
      </div>
      {/* Modal for session details, reschedule, check-in/out */}
      <Modal isOpen={!!showModal} onRequestClose={() => setShowModal(false)} ariaHideApp={false}>
        {selectedSession && (
          <div>
            <h3 className="text-lg font-bold mb-2">Session Details</h3>
            <div>Title: {selectedSession.title}</div>
            <div>Date: {new Date(selectedSession.date).toLocaleString()}</div>
            <div>Mode: {selectedSession.mode}</div>
            <div>Trainer: {selectedSession.createdBy?.email}</div>
            <div>Description: {selectedSession.description}</div>
            <div className="mt-4">
              <form onSubmit={handleReschedule} className="mb-2">
                <label className="block mb-1 font-semibold">Reschedule Date:</label>
                <input type="datetime-local" value={rescheduleDate?.slice(0,16)} onChange={e => setRescheduleDate(e.target.value)} className="border p-2 w-full mb-2" required />
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Reschedule</button>
              </form>
              <div className="flex gap-2">
                <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={() => handleCheckInOut('checkin')}>Check In</button>
                <button className="bg-yellow-600 text-white px-4 py-2 rounded" onClick={() => handleCheckInOut('checkout')}>Check Out</button>
                <button className="bg-gray-300 px-4 py-2 rounded" onClick={() => setShowModal(false)}>Close</button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default ExaminerDashboard;
