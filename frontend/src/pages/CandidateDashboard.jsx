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
      className="group bg-white rounded-2xl shadow-xl border border-blue-100 p-6 flex flex-col lg:flex-row gap-6 w-full max-w-full text-left hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 hover:border-blue-300 backdrop-blur-sm"
    >
      <div className="flex-shrink-0">
        <img
          src={TEMP_SESSION_IMG}
          alt="Session"
          className="w-32 h-32 object-cover rounded-xl shadow-lg group-hover:shadow-xl transition-shadow duration-300 border border-blue-50"
        />
      </div>
      <div className="flex flex-col flex-1 gap-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <h2 className="text-xl lg:text-2xl font-bold text-gray-900 group-hover:text-blue-900 transition-colors duration-300">{session.title}</h2>
          {isEnrolled ? (
            <span className="bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 text-sm font-bold px-4 py-2 rounded-full border border-emerald-200 shadow-sm">
              ✓ Enrolled
            </span>
          ) : (
            <button
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold px-6 py-3 rounded-full shadow-lg hover:from-blue-600 hover:to-blue-700 hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 whitespace-nowrap"
              onClick={() => handleEnroll(session._id)}
            >
              Enroll Now
            </button>
          )}
        </div>
        <p className="text-gray-700 leading-relaxed">{session.description}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 text-gray-800 bg-blue-50 rounded-lg p-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-blue-600">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17.93A8.59 8.59 0 0110 18c-.08 0-.16 0-.24 0a8.59 8.59 0 01-2.93-.07A8.05 8.05 0 005 17v1a1 1 0 001 1h8a1 1 0 001-1v-1a8.05 8.05 0 00-.07-.07z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-medium">Instructor</p>
              <p className="text-sm font-semibold">{session.createdBy?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-gray-800 bg-blue-50 rounded-lg p-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-blue-600">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-medium">Schedule</p>
              <p className="text-sm font-semibold">{session.dayOfWeek || 'TBA'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-gray-800 bg-blue-50 rounded-lg p-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-blue-600">
                <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-600 font-medium">Students</p>
              <p className="text-sm font-semibold">{session.enrolledStudents?.length || 0} enrolled</p>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-blue-100">
          <span className="text-gray-500 text-sm bg-gray-50 px-3 py-1 rounded-full">
            Created: {new Date(session.createdAt).toLocaleDateString()}
          </span>
        </div>
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
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-slate-50 via-white to-blue-50 font-sans">
      {/* Hamburger Menu for Sidebar (Below 1100px) */}
      <button
        className="lg:hidden fixed top-6 left-6 z-50 bg-gradient-to-r from-blue-500 to-blue-600 text-white p-3 rounded-xl shadow-xl hover:shadow-2xl hover:from-blue-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-300"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <FaBars size={20} />
      </button>

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full bg-gradient-to-b from-white via-blue-50 to-blue-100 shadow-2xl border-r border-blue-200 flex flex-col items-center py-8 px-6 w-[280px] z-40 transition-transform transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 backdrop-blur-lg`}
      >
        <div className="relative mb-6">
          <img
            src={profile.profileImg}
            alt="Profile"
            className="w-28 h-28 rounded-full border-4 border-white shadow-xl ring-4 ring-blue-100"
          />
          <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-400 rounded-full border-4 border-white shadow-lg"></div>
        </div>
        <div className="font-bold text-2xl text-gray-900 mb-2 text-center tracking-tight">{profile.name}</div>
        <div className="text-blue-600 text-sm mb-8 text-center font-medium bg-blue-50 px-3 py-1 rounded-full">{profile.email}</div>

        <nav className="flex flex-col gap-3 w-full mb-8">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full text-left px-6 py-4 rounded-xl font-semibold text-base transition-all duration-300 flex items-center gap-4 group ${activeTab === 'dashboard'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-105'
                : 'text-gray-700 hover:bg-white hover:shadow-md hover:text-blue-600 hover:transform hover:scale-102'
              }`}
          >
            <FaChalkboardTeacher className={`transition-transform duration-300 ${activeTab === 'dashboard' ? 'scale-110' : 'group-hover:scale-110'}`} />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('exams')}
            className={`w-full text-left px-6 py-4 rounded-xl font-semibold text-base transition-all duration-300 flex items-center gap-4 group ${activeTab === 'exams'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-105'
                : 'text-gray-700 hover:bg-white hover:shadow-md hover:text-blue-600 hover:transform hover:scale-102'
              }`}
          >
            <FaCalendarAlt className={`transition-transform duration-300 ${activeTab === 'exams' ? 'scale-110' : 'group-hover:scale-110'}`} />
            Exams
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full text-left px-6 py-4 rounded-xl font-semibold text-base transition-all duration-300 flex items-center gap-4 group ${activeTab === 'profile'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-105'
                : 'text-gray-700 hover:bg-white hover:shadow-md hover:text-blue-600 hover:transform hover:scale-102'
              }`}
          >
            <FaUserCircle className={`transition-transform duration-300 ${activeTab === 'profile' ? 'scale-110' : 'group-hover:scale-110'}`} />
            Profile
          </button>
        </nav>

        <button
          onClick={handleLogout}
          className="mt-auto mb-6 w-full bg-gradient-to-r from-red-500 to-red-600 text-white font-bold px-6 py-4 rounded-xl shadow-lg hover:from-red-600 hover:to-red-700 hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3"
        >
          <FaSignOutAlt className="transition-transform duration-300 group-hover:scale-110" />
          Logout
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 lg:px-10 py-8 overflow-y-auto md:ml-[280px] w-full max-w-[60%]">
        {activeTab === 'dashboard' && (
          <div className="space-y-10">
            <div className="text-center mb-10">
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4 tracking-tight">Training Sessions</h2>
              <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-blue-600 mx-auto rounded-full"></div>
            </div>

            <section className="space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 tracking-wide">Enrolled Sessions</h3>
              </div>
              <div className="grid gap-6">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                    <span className="ml-3 text-gray-600 font-medium">Loading sessions...</span>
                  </div>
                ) : enrolledSessions.length === 0 ? (
                  <div className="text-center py-16 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FaChalkboardTeacher className="text-blue-500 text-2xl" />
                    </div>
                    <p className="text-gray-600 text-lg font-medium">No enrolled sessions yet.</p>
                    <p className="text-gray-500 text-sm mt-2">Browse available sessions below to get started!</p>
                  </div>
                ) : (
                  enrolledSessions.map((session) => renderSessionCard(session, true))
                )}
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 tracking-wide">Available Training Sessions</h3>
              </div>
              <div className="grid gap-6">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                    <span className="ml-3 text-gray-600 font-medium">Loading sessions...</span>
                  </div>
                ) : availableSessions.filter((s) => !isSessionEnrolled(s)).length === 0 ? (
                  <div className="text-center py-16 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl border border-gray-200">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FaChalkboardTeacher className="text-gray-500 text-2xl" />
                    </div>
                    <p className="text-gray-600 text-lg font-medium">No available sessions.</p>
                    <p className="text-gray-500 text-sm mt-2">Check back later for new training opportunities!</p>
                  </div>
                ) : (
                  availableSessions.filter((s) => !isSessionEnrolled(s)).map((session) => renderSessionCard(session, false))
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'exams' && (
          <div className="flex flex-col items-center justify-center min-h-[500px] py-16">
            <div className="text-center mb-10">
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4 tracking-tight">Scheduled Exams</h2>
              <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-600 mx-auto rounded-full"></div>
            </div>

            {examAllocations.length === 0 ? (
              <div className="text-center bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-12 border border-blue-100 max-w-md">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FaCalendarAlt className="text-blue-500 text-3xl" />
                </div>
                <p className="text-gray-600 text-xl font-semibold mb-2">No exams scheduled</p>
                <p className="text-gray-500">You'll see your upcoming exams here once they're scheduled.</p>
              </div>
            ) : (
              <div className="w-full max-w-4xl space-y-4">
                {examAllocations.map((exam, idx) => (
                  <div key={exam._id || idx} className="bg-white rounded-xl shadow-lg border border-blue-100 p-6 hover:shadow-xl transition-all duration-300 hover:border-blue-300">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                          {new Date(exam.date).getDate()}
                        </div>
                      </div>
                      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Date</p>
                          <p className="text-lg font-bold text-gray-900">{exam.date.slice(0, 10)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Session</p>
                          <p className="text-lg font-semibold text-gray-800">{exam.session?.title || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Examiner</p>
                          <p className="text-lg font-semibold text-gray-800">{exam.examiner?.email || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="flex flex-col items-center justify-center min-h-[500px] py-16">
            <div className="bg-white rounded-3xl shadow-2xl border border-blue-100 p-12 flex flex-col items-center max-w-2xl w-full relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-50 to-transparent rounded-full translate-y-12 -translate-x-12"></div>

              <div className="relative z-10 flex flex-col items-center w-full">
                <div className="relative mb-8">
                  <img
                    src={profile.profileImg}
                    alt="Profile"
                    className="w-36 h-36 rounded-full border-4 border-white shadow-2xl ring-4 ring-blue-100"
                  />
                  <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-green-400 rounded-full border-4 border-white shadow-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>

                <div className="font-bold text-3xl text-gray-900 mb-3 text-center tracking-tight">{profile.name}</div>
                <div className="text-blue-600 text-lg mb-10 text-center bg-blue-50 px-4 py-2 rounded-full font-medium">{profile.email}</div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 text-center border border-blue-200 hover:shadow-lg transition-all duration-300 group">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                      <FaChalkboardTeacher className="text-white text-xl" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-2">{profile.enrolledCount}</div>
                    <div className="text-blue-700 font-semibold">Courses Enrolled</div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 text-center border border-purple-200 hover:shadow-lg transition-all duration-300 group">
                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                      <FaCalendarAlt className="text-white text-xl" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-2">{profile.examsUpcoming}</div>
                    <div className="text-purple-700 font-semibold">Upcoming Exams</div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-6 text-center border border-green-200 hover:shadow-lg transition-all duration-300 group">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-2">{profile.progress}%</div>
                    <div className="text-green-700 font-semibold">Overall Progress</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Calendar Toggle for Small Screens */}
      <button
        className={`block min-[1400px]:hidden fixed top-6 right-6 z-50 bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-3 rounded-xl shadow-xl hover:shadow-2xl hover:from-indigo-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-300 ${showCalendar ? 'hidden' : ''}`}
        onClick={() => setShowCalendar(true)}
      >
        <FaCalendarAlt size={20} />
      </button>

      {/* Calendar Section */}
      <div
        className={`fixed top-0 left-0 w-full h-screen bg-white z-50 transition-transform transform ${showCalendar ? 'translate-y-0' : '-translate-y-full'} min-[1400px]:relative min-[1400px]:translate-y-0 min-[1400px]:w-[420px] min-[1400px]:h-auto min-[1400px]:bg-gradient-to-b min-[1400px]:from-white min-[1400px]:via-blue-50 min-[1400px]:to-blue-100 min-[1400px]:shadow-2xl min-[1400px]:border-l min-[1400px]:border-blue-200 min-[1400px]:p-6 min-[1400px]:flex min-[1400px]:flex-col min-[1400px]:items-center min-[1400px]:z-30 min-[1400px]:overflow-y-auto min-[1400px]:ml-auto`}
      >
        {showCalendar && (
          <button
            className="absolute top-6 right-6 bg-gradient-to-r from-red-500 to-red-600 text-white p-3 rounded-xl shadow-lg hover:shadow-xl hover:from-red-600 hover:to-red-700 transform hover:scale-105 transition-all duration-300 min-[1400px]:hidden"
            onClick={() => setShowCalendar(false)}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
        <div className="w-full max-w-sm mx-auto mt-16 min-[1400px]:mt-0">
          <CalendarComponent
            highlightDates={highlightDates}
            onDateClick={handleCalendarClick}
          />
        </div>
      </div>

      {/* Popup Component */}
      {popupData && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-blue-100 p-8 w-11/12 max-w-lg mx-4 transform scale-100 transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Sessions on {popupData.date}</h2>
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                {popupData.sessions.length}
              </div>
            </div>
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {popupData.sessions.map((session, index) => (
                <div key={index} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200 hover:shadow-lg transition-all duration-300 group">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-105 transition-transform duration-300">
                      {session.title ? session.title.charAt(0).toUpperCase() : 'S'}
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-bold text-gray-900 mb-2">{session.title || 'Untitled Session'}</p>
                      <p className="text-gray-700 leading-relaxed">{session.description || 'No description available.'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              className="mt-8 w-full bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-4 rounded-xl hover:from-red-600 hover:to-red-700 hover:shadow-xl transform hover:scale-105 transition-all duration-300"
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