import React, { useEffect, useState } from 'react';
import Modal from 'react-modal';
import { useNavigate } from 'react-router-dom';

function ExaminerDashboard() {
  const [calendarData, setCalendarData] = useState({ availability: [], allocations: [], sessions: [] });
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [examDetails, setExamDetails] = useState([]);
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  useEffect(() => {
    fetchCalendarData();
  }, []);

  const fetchCalendarData = async () => {
    setLoading(true);
    const res = await fetch('/api/examiner/calendar', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setCalendarData(data);
    setLoading(false);
  };

  // Examiner marks availability
  const handleDayClick = async (dateStr) => {
    setSelectedDate(dateStr);
    setShowModal(true);
    // Fetch exam details for this date
    const res = await fetch(`/api/examiner/exams-by-date?date=${dateStr}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      setExamDetails(data);
    } else {
      setExamDetails([]);
    }
  };

  // Allocate exam on selected date
  const handleAllocateExam = async () => {
    setLoading(true);
    await fetch('/api/examiner/allocate-exam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ date: selectedDate })
    });
    setShowModal(false);
    fetchCalendarData();
    setLoading(false);
  };

  // Calendar rendering logic
  const today = new Date(2025, 4, 5); // May 5, 2025
  const months = [];
  for (let m = 0; m < 2; m++) {
    const month = new Date(today.getFullYear(), today.getMonth() + m, 1);
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
      // Color logic
      const isAvailable = calendarData.availability?.some(dt => dt.slice(0, 10) === key);
      const hasExam = calendarData.allocations?.some(a => a.date.slice(0, 10) === key);
      const hasTraining = calendarData.sessions?.some(s => s.enrolledStudents?.length && getSessionDates(s).includes(key));
      let bg = 'bg-blue-50 text-blue-700 hover:bg-blue-200';
      if (hasExam && hasTraining) bg = 'bg-gradient-to-r from-green-500 to-red-500 text-white';
      else if (hasExam) bg = 'bg-green-500 text-white';
      else if (hasTraining) bg = 'bg-red-500 text-white';
      else if (isAvailable) bg = 'bg-yellow-200 text-blue-900';
      days.push(
        <div
          key={d}
          className={`w-9 h-9 flex items-center justify-center rounded-full font-semibold text-base mb-1 shadow transition-all duration-200 cursor-pointer ${bg}`}
          onClick={() => handleDayClick(key)}
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

  // Helper: get all session dates for all candidates (4 weeks from their enrolledAt)
  function getSessionDates(session) {
    const dayMap = { 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5 };
    const targetDay = dayMap[session.dayOfWeek];
    if (targetDay === undefined || !session.enrolledStudents) return [];
    const allDates = [];
    session.enrolledStudents.forEach(es => {
      if (!es.enrolledAt) return;
      let baseDate = new Date(es.enrolledAt);
      let date = new Date(baseDate);
      while (date.getDay() !== targetDay) {
        date.setDate(date.getDate() + 1);
      }
      for (let i = 0; i < 4; i++) {
        allDates.push(new Date(date).toISOString().slice(0, 10));
        date.setDate(date.getDate() + 7);
      }
    });
    return allDates;
  }

  // Modal details for selected day
  const getDayDetails = (dateStr) => {
    const training = calendarData.sessions?.filter(s => getSessionDates(s).includes(dateStr));
    const exams = calendarData.allocations?.filter(a => a.date.slice(0, 10) === dateStr);
    return { training, exams };
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-white relative">
      <button
        onClick={handleLogout}
        className="absolute top-6 right-8 bg-gradient-to-r from-blue-600 to-blue-400 text-white font-bold px-5 py-2 rounded-xl shadow hover:from-blue-700 hover:to-blue-600 transition z-50"
      >
        Logout
      </button>
      <div className="w-full flex flex-col items-center pt-24">
        <h2 className="text-3xl font-bold text-gray-800 mb-8">Examiner Dashboard</h2>
        <div className="bg-white rounded-2xl shadow-xl border border-blue-200 p-8 w-full max-w-2xl min-w-[380px]" style={{ minHeight: 500, maxHeight: 1000, overflowY: 'auto' }}>
          <div className="text-blue-700 font-extrabold text-2xl mb-4 text-center tracking-wide">My Calendar</div>
          {months}
          <div className="mt-4 text-center text-base text-blue-400">Green = Exam, Red = Training, Both = Green/Red, Yellow = Available</div>
        </div>
      </div>
      <Modal isOpen={!!showModal} onRequestClose={() => setShowModal(false)} ariaHideApp={false}>
        {selectedDate && (
          <div className="flex flex-col gap-3 p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-100 shadow-2xl border-2 border-blue-200 min-w-[320px] max-w-lg mx-auto">
            <div className="text-2xl font-extrabold text-blue-900 mb-1 text-center tracking-tight">Details for {selectedDate}</div>
            {(() => {
              const { training } = getDayDetails(selectedDate);
              return <>
                <div className="font-bold text-blue-800">Training Sessions:</div>
                {training?.length ? training.map((s, i) => <div key={i} className="text-blue-700">{s.title} ({s.enrolledStudents?.map(e => e.email).join(', ')})</div>) : <div className="text-blue-400">None</div>}
                <div className="font-bold text-green-800 mt-2">Exams:</div>
                {examDetails.length ? examDetails.map((e, i) => (
                  <div key={i} className="text-green-700">
                    Candidate: {e.candidate?.email} <br/>
                    Session: {e.session?.title || 'N/A'} <br/>
                    Examiner: {e.examiner?.email}
                  </div>
                )) : <div className="text-blue-400">None</div>}
              </>;
            })()}
            <button className="mt-4 bg-gradient-to-r from-green-600 to-green-500 text-white font-bold text-base px-6 py-2 rounded-xl shadow hover:from-green-700 hover:to-green-600 transition self-center" onClick={handleAllocateExam} disabled={loading}>Allocate Exam Here</button>
            <button className="mt-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold text-base px-6 py-2 rounded-xl shadow hover:from-blue-700 hover:to-blue-600 transition self-center" onClick={() => setShowModal(false)}>Close</button>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default ExaminerDashboard;
