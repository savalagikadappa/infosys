import React, { useEffect, useState } from 'react';
import Modal from 'react-modal';
import { useNavigate } from 'react-router-dom';
import CalendarComponent from '../components/CalendarComponent';
import { getNextFourDates } from '../utils/dateHelpers';
import { TEMP_PROFILE_IMG, TEMP_SESSION_IMG } from '../constants';
import { FaUserCircle, FaChalkboardTeacher, FaCalendarAlt, FaSignOutAlt, FaBars } from 'react-icons/fa';

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
    name: localStorage.getItem('name') || 'John Doe',
    email: localStorage.getItem('email') || 'john.doe@example.com',
    profileImg: TEMP_PROFILE_IMG,
    enrolledCount: 0,
    examsUpcoming: 0,
    progress: 0,
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [popupData, setPopupData] = useState(null);

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

  useEffect(() => {
    const newHighlightDates = {};
    enrolledSessions.forEach(session => {
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
    setHighlightDates(newHighlightDates);
  }, [enrolledSessions]);

  const openSessionModal = (session) => {
    setShowModal(false);
    setTimeout(() => {
      setSelectedSession(session);
      setShowModal(true);
    }, 0);
  };

  const handleCalendarClick = (date) => {
    const key = date.toLocaleDateString('en-CA');
    if (highlightDates[key]) {
      setPopupData({
        date: key,
        sessions: highlightDates[key],
      });
    } else {
      console.log('No session on this date:', key);
    }
  };

  const closePopup = () => {
    setPopupData(null);
  };

  const isSessionEnrolled = (session) => {
    return enrolledSessions.some((enrolled) => enrolled._id === session._id);
  };

  const renderSessionCard = (session, isEnrolled) => (
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
          {isEnrolled ? (
            <span className="bg-green-200 text-green-900 text-xs sm:text-sm md:text-base font-semibold mt-2 md:mt-0 mr-0 md:mr-2 px-2 md:px-3 py-1 rounded">Enrolled</span>
          ) : (
            <button
              className="bg-blue-300 text-blue-900 font-bold px-3 sm:px-4 md:px-5 py-1 sm:py-2 md:py-3 rounded-lg shadow-lg hover:bg-blue-400 transition"
              onClick={() => handleEnroll(session._id)}
            >
              Enroll
            </button>
          )}
        </div>
        <p className="mt-2 sm:mt-3 md:mt-4 text-xs sm:text-sm md:text-base text-gray-800">{session.description}</p>
        <div className="mt-3 sm:mt-4 md:mt-5">
          <p className="text-gray-800 text-xs sm:text-sm md:text-base flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 sm:w-4 md:w-5 h-3 sm:h-4 md:h-5 mr-2">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17.93A8.59 8.59 0 0110 18c-.08 0-.16 0-.24 0a8.59 8.59 0 01-2.93-.07A8.05 8.05 0 005 17v1a1 1 0 001 1h8a1 1 0 001-1v-1a8.05 8.05 0 00-.07-.07z" />
            </svg>
            Instructor: {session.createdBy?.email}
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
      </div>
    </div>
  );

  useEffect(() => {
    setProfile((prevProfile) => ({
      ...prevProfile,
      enrolledCount: enrolledSessions.length,
    }));
  }, [enrolledSessions]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white font-sans">
      {/* Hamburger Menu for Sidebar (Below 1100px) */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 bg-blue-500 text-white p-2 rounded-full shadow-lg"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <FaBars size={24} />
      </button>

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full bg-gradient-to-b from-blue-100 via-blue-50 to-white shadow-2xl border-r border-blue-300 flex flex-col items-center py-10 px-6 w-[260px] z-40 transition-transform transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        <img src={profile.profileImg} alt="Profile" className="w-24 h-24 rounded-full border-4 border-blue-300 shadow-lg mb-4" />
        <div className="font-extrabold text-2xl text-blue-800 mb-1 text-center font-serif tracking-wide">{profile.name}</div>
        <div className="text-blue-600 text-sm mb-10 text-center font-medium">{profile.email}</div>
        <nav className="flex flex-col gap-4 w-full mb-10">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full text-left px-6 py-3 rounded-2xl font-bold text-lg transition tracking-wide flex items-center gap-3 ${activeTab === 'dashboard' ? 'bg-white text-blue-800 shadow-lg' : 'text-blue-600 hover:bg-blue-100 hover:shadow-md'}`}><FaChalkboardTeacher /> Dashboard</button>
          <button onClick={() => setActiveTab('exams')} className={`w-full text-left px-6 py-3 rounded-2xl font-bold text-lg transition tracking-wide flex items-center gap-3 ${activeTab === 'exams' ? 'bg-white text-blue-800 shadow-lg' : 'text-blue-600 hover:bg-blue-100 hover:shadow-md'}`}><FaCalendarAlt /> Exams</button>
          <button onClick={() => setActiveTab('profile')} className={`w-full text-left px-6 py-3 rounded-2xl font-bold text-lg transition tracking-wide flex items-center gap-3 ${activeTab === 'profile' ? 'bg-white text-blue-800 shadow-lg' : 'text-blue-600 hover:bg-blue-100 hover:shadow-md'}`}><FaUserCircle /> Profile</button>
        </nav>
        <button onClick={handleLogout} className="mt-auto mb-8 w-11/12 bg-white text-blue-800 font-bold px-6 py-3 rounded-2xl shadow-lg hover:bg-blue-100 hover:shadow-xl transition tracking-wide flex items-center justify-center gap-3"><FaSignOutAlt /> Logout</button>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 sm:px-6 md:px-8 overflow-y-auto md:ml-[260px]">
        {activeTab === 'dashboard' && (
          <div>
            <h2 className="text-3xl font-extrabold text-blue-900 mb-6 tracking-tight text-center font-serif">Training Sessions</h2>
            <section className="mb-8">
              <h3 className="text-2xl font-bold text-blue-800 mb-4 tracking-wide text-center font-serif">Enrolled Sessions</h3>
              <div className="flex flex-col gap-4">
                {loading ? <div>Loading...</div> : enrolledSessions.length === 0 ? <div className="text-blue-700">No enrolled sessions.</div> : enrolledSessions.map((session) => renderSessionCard(session, true))}
              </div>
            </section>
            <section>
              <h3 className="text-2xl font-bold text-blue-800 mb-4 tracking-wide text-center font-serif">Available Training Sessions</h3>
              <div className="flex flex-col gap-4">
                {loading ? <div>Loading...</div> : availableSessions.length === 0 ? <div className="text-blue-700">No available sessions.</div> : availableSessions.filter((s) => !isSessionEnrolled(s)).map((session) => renderSessionCard(session, false))}
              </div>
            </section>
          </div>
        )}
        {activeTab === 'exams' && (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] py-14">
            <h2 className="text-4xl font-extrabold text-blue-900 mb-10 tracking-tight font-serif">Exams</h2>
            {examAllocations.length === 0 ? (
              <div className="text-blue-700 text-xl font-semibold">No exams for you</div>
            ) : (
              <ul className="text-blue-800 text-xl font-semibold bg-blue-50 rounded-2xl p-8 w-full max-w-2xl shadow border border-blue-100">
                {examAllocations.map((exam, idx) => (
                  <li key={exam._id || idx} className="mb-3">
                    {exam.date.slice(0, 10)} | Session: {exam.session?.title || 'N/A'} | Examiner: {exam.examiner?.email || 'N/A'}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {activeTab === 'profile' && (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] py-14">
            <div className="bg-blue-50 rounded-3xl shadow-2xl border border-blue-100 p-12 flex flex-col items-center max-w-xl w-full">
              <img src={profile.profileImg} alt="Profile" className="w-32 h-32 rounded-full border-2 border-blue-100 shadow mb-6" />
              <div className="font-extrabold text-3xl text-blue-900 mb-2 font-serif">{profile.name}</div>
              <div className="text-blue-400 text-lg mb-6">{profile.email}</div>
              <div className="flex flex-col gap-6 w-full mt-2">
                <div className="flex justify-between text-blue-700 font-semibold text-xl">
                  <span>Courses Enrolled</span>
                  <span>{profile.enrolledCount}</span>
                </div>
                <div className="flex justify-between text-blue-700 font-semibold text-xl">
                  <span>Upcoming Exams</span>
                  <span>{profile.examsUpcoming}</span>
                </div>
                <div className="flex justify-between text-blue-700 font-semibold text-xl">
                  <span>Overall Progress</span>
                  <span>{profile.progress}%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Calendar Toggle for Small Screens */}
      <button
        className={`block md:hidden fixed top-4 right-4 z-50 bg-blue-500 text-white p-2 rounded-full shadow-lg ${showCalendar ? 'hidden' : ''}`}
        onClick={() => setShowCalendar(true)}
      >
        Show Calendar
      </button>

      {/* Calendar Section */}
      <div
        className={`fixed top-0 left-0 w-full h-screen bg-white z-50 transition-transform transform ${showCalendar ? 'translate-y-0' : '-translate-y-full'} lg:relative lg:translate-y-0 lg:w-[300px] lg:h-auto lg:bg-blue-50 lg:shadow-2xl lg:border-l lg:border-blue-100 lg:p-4 lg:sm:p-6 lg:flex lg:flex-col lg:items-center lg:z-30 lg:overflow-y-auto`}
      >
        {showCalendar && (
          <button
            className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-full shadow-lg lg:hidden"
            onClick={() => setShowCalendar(false)}
          >
            Close
          </button>
        )}
        <CalendarComponent
          highlightDates={highlightDates}
          onDateClick={handleCalendarClick}
        />
      </div>

      {/* Popup Component */}
      {popupData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-11/12 max-w-md">
            <h2 className="text-xl font-bold text-blue-800 mb-4">Sessions on {popupData.date}</h2>
            <ul className="space-y-2">
              {popupData.sessions.map((session, index) => (
                <li key={index} className="p-3 bg-blue-50 rounded-lg shadow-md">
                  <p className="text-blue-900 font-semibold">{session.title || 'Untitled Session'}</p>
                  <p className="text-sm text-blue-700">{session.description || 'No description available.'}</p>
                </li>
              ))}
            </ul>
            <button
              className="mt-4 w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600"
              onClick={closePopup}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CandidateDashboard;