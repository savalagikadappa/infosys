import React, { useEffect, useState } from 'react';
import Modal from 'react-modal';
import { useNavigate } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const TEMP_PROFILE_IMG = 'https://randomuser.me/api/portraits/men/32.jpg';
const TEMP_SESSION_IMG = '/images/drone.jpg';

function CandidateDashboard() {
  const [availableSessions, setAvailableSessions] = useState([]);
  const [enrolledSessions, setEnrolledSessions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [examAllocations, setExamAllocations] = useState([]);
  const [highlightDates, setHighlightDates] = useState({});
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    profileImg: TEMP_PROFILE_IMG,
    enrolledCount: 0,
    examsUpcoming: 0,
    progress: 0,
  });

  useEffect(() => {
    fetchSessions();
    fetchExams();
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

  const fetchExams = async () => {
    try {
      const res = await fetch('/api/examiner/candidate-exams', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        // Defensive: filter only exams for this candidate (should be redundant, but safe)
        const myEmail = localStorage.getItem('email');
        const filtered = data.filter(exam => !myEmail || !exam.candidate || exam.candidate.email === myEmail);
        setExamAllocations(filtered);
      } else {
        setExamAllocations([]);
      }
    } catch (e) {
      setExamAllocations([]);
    }
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

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const today = new Date(2025, 4, 3); 
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

  // Optimized getNextFourDates function
  function getNextFourDates(dayOfWeek, startDate) {
    const dayMap = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
    const targetDay = dayMap[dayOfWeek];
    if (targetDay === undefined) return [];

    const dates = [];
    const start = new Date(startDate);

    // Calculate the difference to the target day
    const daysToAdd = (targetDay - start.getDay() + 7) % 7;
    start.setDate(start.getDate() + daysToAdd);

    // Collect the next 4 occurrences
    for (let i = 0; i < 4; i++) {
      dates.push(new Date(start));
      start.setDate(start.getDate() + 7);
    }

    return dates;
  }

  // Build a map: date string (YYYY-MM-DD) -> session(s) with at least one enrolled session for candidate
  useEffect(() => {
    const newHighlightDates = {};
    enrolledSessions.forEach(session => {
      if (session.dayOfWeek && session.enrolledStudents) {
        session.enrolledStudents.forEach(student => {
          if (student.enrolledAt) {
            const dates = getNextFourDates(session.dayOfWeek, student.enrolledAt);
            dates.forEach(date => {
              const key = date.toISOString().slice(0, 10);
              if (!newHighlightDates[key]) newHighlightDates[key] = [];
              newHighlightDates[key].push(session);
            });
          }
        });
      }
    });
    setHighlightDates(newHighlightDates);
  }, [enrolledSessions]);

  // Ensure only one modal is open at a time
  const openSessionModal = (session) => {
    setShowModal(false); // close any open modal first
    setTimeout(() => {
      setSelectedSession(session);
      setShowModal(true);
    }, 0);
  };

  // Calendar click handler
  const handleCalendarClick = (date) => {
    const key = date.toLocaleDateString('en-CA');
    if (highlightDates[key]) {
      openSessionModal(highlightDates[key][0]); // Open modal only for valid session dates
    } else {
      console.log('No session on this date:', key);
    }
  };

  // Helper to check if user is enrolled in a session
  const isSessionEnrolled = (session) => {
    return enrolledSessions.some((enrolled) => enrolled._id === session._id);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-blue-50 to-blue-200">
      {/* Sidebar / Topbar for mobile */}
      <div className="md:hidden flex items-center justify-between bg-white shadow px-4 py-3 border-b border-blue-100 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <img src={profile.profileImg} alt="Profile" className="w-10 h-10 rounded-full border-2 border-blue-200 shadow min-w-10" />
          <span className="font-bold text-blue-900">{profile.name}</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-blue-700 focus:outline-none text-2xl">☰</button>
      </div>
      <aside className={`fixed md:relative z-40 top-0 left-0 h-full bg-white shadow-xl border-r border-blue-100 flex flex-col items-center py-8 px-4 min-h-screen transition-transform duration-300 md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:w-[250px] md:min-w-[220px] md:max-w-[260px] md:flex md:static md:translate-x-0`} style={{ position: 'fixed', top: 0, left: 0, height: '100vh', overflow: 'hidden', zIndex: 40 }}>
        <button className="md:hidden absolute top-4 right-4 text-blue-700 text-2xl" onClick={() => setSidebarOpen(false)}>×</button>
        <img src={profile.profileImg} alt="Profile" className="w-20 h-20 rounded-full border-4 border-blue-200 shadow mb-3 min-w-20" />
        <div className="font-bold text-lg text-blue-900 mb-1 text-center break-words">{profile.name}</div>
        <div className="text-blue-500 text-xs mb-8 text-center break-words">{profile.email}</div>
        <nav className="flex flex-col gap-2 w-full mb-8">
          <button onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }} className={`w-full text-left px-5 py-3 rounded-lg font-semibold text-base transition ${activeTab === 'dashboard' ? 'bg-blue-100 text-blue-700 shadow' : 'text-blue-700 hover:bg-blue-50'}`}>Dashboard</button>
          <button onClick={() => { setActiveTab('exams'); setSidebarOpen(false); }} className={`w-full text-left px-5 py-3 rounded-lg font-semibold text-base transition ${activeTab === 'exams' ? 'bg-blue-100 text-blue-700 shadow' : 'text-blue-700 hover:bg-blue-50'}`}>Exams</button>
          <button onClick={() => { setActiveTab('profile'); setSidebarOpen(false); }} className={`w-full text-left px-5 py-3 rounded-lg font-semibold text-base transition ${activeTab === 'profile' ? 'bg-blue-100 text-blue-700 shadow' : 'text-blue-700 hover:bg-blue-50'}`}>Profile</button>
        </nav>
        <button onClick={handleLogout} className="mt-auto mb-8 w-11/12 bg-gradient-to-r from-red-500 to-red-700 text-white font-bold px-4 py-3 rounded-xl shadow hover:from-red-600 hover:to-red-800 transition">Logout</button>
      </aside>
      <div className="flex-1 md:ml-0 flex flex-col items-stretch min-w-[320px] pl-8 md:pl-20 md:ml-[250px]">
        <main className="flex-1 p-0 m-0 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <div className="flex flex-col lg:flex-row w-full m-0 p-0 gap-0 lg:gap-8 items-stretch">
              <div className="w-full lg:w-2/3 min-w-[320px] max-w-full m-0 p-0 flex flex-col">
                <h2 className="text-3xl font-extrabold text-blue-900 mb-6 tracking-tight drop-shadow-lg text-center md:text-left">Training Sessions</h2>
                <section className="mb-8">
                  <h3 className="text-2xl font-bold text-blue-800 mb-4 tracking-wide text-center md:text-left">Enrolled Sessions</h3>
                  <div className="flex flex-col gap-6">
                    {loading ? <div>Loading...</div> : enrolledSessions.length === 0 ? <div className="text-blue-700">No enrolled sessions.</div> : enrolledSessions.map(s => (
                      <div key={s._id} className="group bg-white/90 hover:bg-blue-50 border border-blue-200 rounded-2xl shadow-lg flex flex-col sm:flex-row transition-all duration-200 overflow-hidden min-w-0 min-h-[280px] md:min-h-[340px] max-w-full md:max-w-2xl w-full md:w-[520px]">
                        <div className="w-full sm:w-1/3 flex-shrink-0 flex items-center justify-center p-4">
                          <img src={TEMP_SESSION_IMG} alt="Session" className="w-full h-40 md:h-56 object-cover rounded-xl" style={{maxWidth:'150px'}} />
                        </div>
                        <div className="flex-1 flex flex-col gap-3 p-6 justify-center text-base md:text-lg lg:text-xl">
                          <div className="flex items-center gap-2 mb-1 text-base md:text-lg lg:text-xl">
                            <span className="inline-block w-3 h-3 rounded-full bg-green-400 shadow" title="Online"></span>
                            <span className="font-bold text-blue-600 uppercase tracking-widest">{s.mode === 'online' ? 'Online' : 'Offline'}</span>
                          </div>
                          <div className="font-extrabold text-xl md:text-2xl lg:text-3xl text-blue-900 truncate">{s.title}</div>
                          <div className="text-blue-800 font-medium truncate text-base md:text-lg lg:text-xl">{s.description}</div>
                          <div className="flex flex-wrap gap-2 text-sm md:text-base lg:text-lg text-blue-700 font-semibold">
                            <span>Trainer: <span className="font-bold text-blue-900">{s.createdBy?.email}</span></span>
                            <span>Date: <span className="font-bold text-blue-900">{s.dayOfWeek || 'TBA'}</span></span>
                            <span>Enrolled: <span className="font-bold text-blue-900">{s.enrolledStudents?.length || 0}</span></span>
                          </div>
                          <div className="flex gap-2 mt-auto text-base md:text-lg lg:text-xl">
                            <span className="px-3 py-1 rounded-xl bg-green-100 text-green-900 font-bold text-xs shadow">Enrolled</span>
                            {s.mode === 'offline' && <span className="px-2 py-1 rounded-xl bg-gray-200 text-gray-700 font-bold text-xs">Offline</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
                <section>
                  <h3 className="text-2xl font-bold text-blue-800 mb-4 tracking-wide text-center md:text-left">Available Training Sessions</h3>
                  <div className="flex flex-col gap-6">
                    {loading ? <div>Loading...</div> : availableSessions.length === 0 ? <div className="text-blue-700">No available sessions.</div> : availableSessions.filter(s => !isSessionEnrolled(s)).map(s => (
                      <div key={s._id} className="group bg-white/90 hover:bg-blue-50 border border-blue-200 rounded-2xl shadow-lg flex flex-col sm:flex-row transition-all duration-200 overflow-hidden min-w-0 min-h-[280px] md:min-h-[340px] max-w-full md:max-w-2xl w-full md:w-[520px]">
                        <div className="w-full sm:w-1/3 flex-shrink-0 flex items-center justify-center p-4">
                          <img src={TEMP_SESSION_IMG} alt="Session" className="w-full h-40 md:h-56 object-cover rounded-xl" style={{maxWidth:'150px'}} />
                        </div>
                        <div className="flex-1 flex flex-col gap-3 p-6 justify-center text-base md:text-lg lg:text-xl">
                          <div className="flex items-center gap-2 mb-1 text-base md:text-lg lg:text-xl">
                            <span className="inline-block w-3 h-3 rounded-full bg-green-400 shadow" title="Online"></span>
                            <span className="font-bold text-blue-600 uppercase tracking-widest">{s.mode === 'online' ? 'Online' : 'Offline'}</span>
                          </div>
                          <div className="font-extrabold text-xl md:text-2xl lg:text-3xl text-blue-900 truncate">{s.title}</div>
                          <div className="text-blue-800 font-medium truncate text-base md:text-lg lg:text-xl">{s.description}</div>
                          <div className="flex flex-wrap gap-2 text-sm md:text-base lg:text-lg text-blue-700 font-semibold">
                            <span>Trainer: <span className="font-bold text-blue-900">{s.createdBy?.email}</span></span>
                            <span>Date: <span className="font-bold text-blue-900">{s.dayOfWeek || 'TBA'}</span></span>
                            <span>Enrolled: <span className="font-bold text-blue-900">{s.enrolledStudents?.length || 0}</span></span>
                          </div>
                          <div className="flex gap-2 mt-auto text-base md:text-lg lg:text-xl">
                            <button className="bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold text-xs px-4 py-1 rounded-xl shadow hover:from-blue-700 hover:to-blue-600 transition" onClick={() => handleEnroll(s._id)}>Enroll</button>
                            {s.mode === 'offline' && <span className="px-2 py-1 rounded-xl bg-gray-200 text-gray-700 font-bold text-xs">Offline</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
              {/* Calendar: fixed on right for large screens, at bottom for small screens */}
              <div className="hidden lg:flex flex-col items-center justify-start pt-4 lg:sticky lg:top-0 lg:h-screen min-w-[420px] max-w-[700px]" style={{position:'fixed', right:0, top:0, height:'100vh', zIndex:30}}>
                <div className="bg-white rounded-2xl shadow-xl border border-blue-200 p-8 w-full max-w-2xl min-w-[380px]" style={{ minHeight: 500, maxHeight: 1000, overflowY: 'auto' }}>
                  <div className="text-blue-700 font-extrabold text-2xl mb-4 text-center tracking-wide">My Schedule</div>
                  <div className="calendar-container">
                    <Calendar
                      onClickDay={handleCalendarClick}
                      tileClassName={({ date }) => {
                        // Convert the date to a local date string (YYYY-MM-DD)
                        const key = date.toLocaleDateString('en-CA'); // 'en-CA' ensures YYYY-MM-DD format

                        if (highlightDates[key]) {
                          return 'dark-red-box'; // Apply a specific CSS class for session dates
                        }
                        return null; // No styling for non-highlighted dates
                      }}
                    />
                  </div>
                  <div className="mt-4 text-center text-base text-blue-400">Red = Your enrolled sessions</div>
                </div>
              </div>
              {/* Calendar at bottom for small screens */}
            </div>
          )}
          {/* Calendar at bottom for small screens */}
          {activeTab === 'dashboard' && (
            <div className="flex flex-col lg:hidden items-center justify-start mt-6">
              <div className="bg-white rounded-2xl shadow-xl border border-blue-200 p-6 w-full max-w-md min-w-[220px]" style={{ minHeight: 320, maxHeight: 800, overflowY: 'auto' }}>
                <div className="text-blue-700 font-extrabold text-lg mb-2 text-center tracking-wide">My Schedule</div>
                <div className="calendar-container">
                  <Calendar
                    onClickDay={handleCalendarClick}
                    tileClassName={({ date }) => {
                      // Convert the date to a local date string (YYYY-MM-DD)
                      const key = date.toLocaleDateString('en-CA'); // 'en-CA' ensures YYYY-MM-DD format

                      if (highlightDates[key]) {
                        return 'dark-red-box'; // Apply a specific CSS class for session dates
                      }
                      return null; // No styling for non-highlighted dates
                    }}
                  />
                </div>
                <div className="mt-2 text-center text-xs text-blue-400">Red = Your enrolled sessions</div>
              </div>
            </div>
          )}
          {activeTab === 'exams' && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
              <h2 className="text-3xl font-extrabold text-blue-900 mb-6 tracking-tight drop-shadow-lg">Exams</h2>
              {examAllocations.length === 0 ? (
                <div className="text-blue-700 text-lg font-semibold">No exams for you</div>
              ) : (
                <ul className="text-blue-800 text-lg font-semibold">
                  {examAllocations.map((exam, idx) => (
                    <li key={exam._id || idx}>
                      {exam.date.slice(0, 10)} | Session: {exam.session?.title || 'N/A'} | Examiner: {exam.examiner?.email || 'N/A'}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {activeTab === 'profile' && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
              <div className="bg-white rounded-3xl shadow-xl border border-blue-200 p-10 flex flex-col items-center max-w-md w-full">
                <img src={profile.profileImg} alt="Profile" className="w-28 h-28 rounded-full border-4 border-blue-200 shadow mb-4" />
                <div className="font-bold text-2xl text-blue-900 mb-1">{profile.name}</div>
                <div className="text-blue-500 text-base mb-4">{profile.email}</div>
                <div className="flex flex-col gap-2 w-full mt-2">
                  <div className="flex justify-between text-blue-700 font-semibold text-lg">
                    <span>Courses Enrolled</span>
                    <span>{profile.enrolledCount}</span>
                  </div>
                  <div className="flex justify-between text-blue-700 font-semibold text-lg">
                    <span>Upcoming Exams</span>
                    <span>{profile.examsUpcoming}</span>
                  </div>
                  <div className="flex justify-between text-blue-700 font-semibold text-lg">
                    <span>Overall Progress</span>
                    <span>{profile.progress}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      {/* Modal for session details */}
      <Modal isOpen={!!showModal} onRequestClose={() => setShowModal(false)} ariaHideApp={false}>
        {selectedSession && (
          <div className="flex flex-col gap-3 p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-100 shadow-2xl border-2 border-blue-200 min-w-[320px] max-w-lg mx-auto">
            <div className="text-2xl font-extrabold text-blue-900 mb-1 text-center tracking-tight">{selectedSession.title}</div>
            <div className="flex flex-wrap gap-2 justify-center text-blue-700 font-medium text-base mb-1">
              <span>Day: <span className="font-bold">{selectedSession.dayOfWeek}</span></span>
              <span>| Mode: <span className="font-bold">{selectedSession.mode}</span></span>
              <span>| Trainer: <span className="font-bold">{selectedSession.createdBy?.email}</span></span>
            </div>
            <div className="text-slate-700 text-base leading-relaxed text-center mb-2">{selectedSession.description}</div>
            <button className="mt-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold text-base px-6 py-2 rounded-xl shadow hover:from-blue-700 hover:to-blue-600 transition self-center" onClick={() => setShowModal(false)}>Close</button>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default CandidateDashboard;
