import React, { useState, useEffect } from 'react';
import CalendarComponent from '../components/CalendarComponent';
import Modal from 'react-modal';
import { useNavigate } from 'react-router-dom';

function ExaminerDashboard() {
  const [highlightDates, setHighlightDates] = useState({});
  const [popupData, setPopupData] = useState(null);
  const [availabilityDates, setAvailabilityDates] = useState({});
  const [examDates, setExamDates] = useState({});
  const [allocationsByDay, setAllocationsByDay] = useState({});
  const [selectedDateKey, setSelectedDateKey] = useState(null);
  const [isAvailableOnSelected, setIsAvailableOnSelected] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
  const fetchHighlightDates = async () => {
      try {
        const res = await fetch('/api/examiner/calendar', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (!res.ok) {
          console.error('Failed to fetch calendar data:', res.status, res.statusText);
          return;
        }
  const data = await res.json();

        // Log the entire API response for debugging
        console.log('API Response:', data);

        if (!data.sessions || !Array.isArray(data.sessions)) {
          console.error('Invalid API response: Missing or invalid sessions array');
          return;
        }

        const newHighlightDates = {};

        for (const session of data.sessions) {
          // Fetch trainer email using createdBy OID
          let trainerName = 'Unknown Trainer';
                      // console.log("hi")
          console.log("session named " + session.title + " created by " + session.createdBy._id);
          if (session.createdBy?._id) {
            try {
              const trainerRes = await fetch(`/api/examiner/users/${session.createdBy._id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
              });
              if (trainerRes.ok) {
                const trainerData = await trainerRes.json();
                trainerName = trainerData.email || 'Unknown Trainer';
              } else {
                console.warn(`Failed to fetch trainer data for ID ${session.createdBy._id}:`, trainerRes.status, trainerRes.statusText);
              }
            } catch (error) {
              console.error(`Error fetching trainer data for ID ${session.createdBy._id}:`, error);
            }
          } else {
            console.warn(`Missing createdBy ID for session: ${session.title}`);
          }
          // Fallback for trainer name if not fetched
          if (trainerName === 'Trainer') {
            console.warn(`Using fallback trainer name for session: ${session.title}`);
          }

          if (session.enrolledStudents.length === 0) {
            console.warn('No enrolled students for session:', session._id, session.title);
            continue;
          }

          for (const student of session.enrolledStudents) {
            // Fetch candidate email using user OID
            let candidateName = 'Candidate';
            if (student.user?.$oid) {
              try {
                const candidateRes = await fetch(`/api/examiner/users/${student.user.$oid}`, {
                  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                });
                if (candidateRes.ok) {
                  const candidateData = await candidateRes.json();
                  candidateName = candidateData.email || 'Unknown Candidate';
                } else {
                  console.warn('Failed to fetch candidate data:', candidateRes.status, candidateRes.statusText);
                }
              } catch (error) {
                console.error('Error fetching candidate data:', error);
              }
            } else {
              console.warn('Missing user OID for student:', student);
            }

            if (!student.nextSessionDates || student.nextSessionDates.length === 0) {
              console.warn('No next session dates for student:', student);
              continue;
            }

            for (const date of student.nextSessionDates) {
              const parsedDate = new Date(date);
              if (isNaN(parsedDate)) {
                console.warn('Invalid date format for student:', student, 'Date:', date);
                continue;
              }

              const key = parsedDate.toLocaleDateString('en-CA');
              if (!newHighlightDates[key]) newHighlightDates[key] = [];
              newHighlightDates[key].push({
                title: session.title,
                description: session.description,
                mode: session.mode,
                zoomLink: session.zoomLink,
                isLive: session.isLive,
                dayOfWeek: session.dayOfWeek,
                trainer: trainerName,
                candidate: candidateName,
              });
            }
          }
        }

        // Log the final highlightDates object for debugging
        // console.log('Final highlightDates:', newHighlightDates);

        setHighlightDates(newHighlightDates);

        // Availability dates from API (array of ISO strings)
        if (Array.isArray(data.availability)) {
          const avail = {};
            data.availability.forEach(d => {
              const dateObj = new Date(d);
              if (!isNaN(dateObj)) {
                avail[dateObj.toLocaleDateString('en-CA')] = true;
              }
            });
          setAvailabilityDates(avail);
        }

        // Map exam allocations to examDates and per-day details
        if (Array.isArray(data.allocations)) {
          const examMap = {};
          const byDay = {};
          data.allocations.forEach(al => {
            if (!al?.date) return;
            const key = new Date(al.date).toLocaleDateString('en-CA');
            examMap[key] = true;
            if (!byDay[key]) byDay[key] = [];
            byDay[key].push(al);
          });
          setExamDates(examMap);
          setAllocationsByDay(byDay);
        }
      } catch (error) {
        console.error('Error fetching highlight dates:', error);
      }
    };

    fetchHighlightDates();
  }, []);

  const handleDateClick = (date) => {
    const key = date.toLocaleDateString('en-CA');
    setSelectedDateKey(key);
    setIsAvailableOnSelected(!!availabilityDates[key]);
    const sessions = highlightDates[key] || [];
    setPopupData({ date: key, sessions });
  };

  const closePopup = () => {
    setPopupData(null);
    setSelectedDateKey(null);
  };

  const toggleAvailability = async () => {
    if (!selectedDateKey) return;
    try {
      const iso = new Date(selectedDateKey).toISOString();
      const res = await fetch('/api/examiner/availability/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ date: iso })
      });
      if (!res.ok) {
        console.error('Failed to toggle availability');
        return;
      }
      const data = await res.json();
      setAvailabilityDates(prev => {
        const copy = { ...prev };
        if (data.available) {
          copy[selectedDateKey] = true;
        } else {
          delete copy[selectedDateKey];
        }
        return copy;
      });
      setIsAvailableOnSelected(data.available);
    } catch (e) {
      console.error('Error toggling availability', e);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-200 flex flex-col items-center relative">
      <button
        onClick={handleLogout}
        className="absolute top-4 right-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
      >
        Logout
      </button>
      <h1 className="text-3xl font-bold text-center mt-8 mb-4">Examiner Dashboard</h1>
      <div className="flex justify-center w-full max-w-7xl p-8">
        <CalendarComponent
          highlightDates={highlightDates}
          availabilityDates={availabilityDates}
          examDates={examDates}
          onDateClick={handleDateClick}
        />
      </div>

      {popupData && (
        <Modal isOpen={!!popupData} onRequestClose={closePopup} ariaHideApp={false}>
          <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-100 shadow-2xl border-2 border-blue-200 min-w-[320px] max-w-lg mx-auto">
            <h2 className="text-xl font-bold text-blue-800 mb-4">{popupData.sessions.length > 0 ? 'Sessions on ' : 'Date: '}{popupData.date}</h2>
            {/* If there are scheduled exams on this day, show them first */}
            {allocationsByDay[popupData.date]?.length > 0 ? (
              <ul className="space-y-3 mb-6">
                {allocationsByDay[popupData.date].map((al, idx) => (
                  <li key={idx} className="p-4 bg-black text-white rounded-lg shadow-md">
                    <p className="text-sm font-semibold">Scheduled Exam</p>
                    <p className="text-xs">Candidate: {al.candidate?.email || 'N/A'}</p>
                    <p className="text-xs">Session: {al.session?.title || 'N/A'}</p>
                  </li>
                ))}
              </ul>
            ) : null}

            {popupData.sessions.length > 0 ? (
              <ul className="space-y-4">
                {popupData.sessions.map((session, index) => (
                  <li key={index} className="p-4 bg-white rounded-lg shadow-md">
                    <p className="text-lg font-semibold text-blue-900">Session: {session.title}</p>
                    <p className="text-sm text-gray-700">Trainer: {session.trainer}</p>
                    <p className="text-sm text-gray-700">Candidate: {session.candidate}</p>
                    <p className="text-sm text-gray-700">Mode: {session.mode}</p>
                    <p className="text-sm text-gray-700">Day: {session.dayOfWeek}</p>
                    <p className="text-sm text-gray-700">Zoom Link: {session.zoomLink}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-blue-900 mb-4">No sessions on this date.</p>
            )}

            <div className="mt-6 flex gap-3">
              <button onClick={toggleAvailability} className={`flex-1 py-2 rounded-lg text-white font-semibold ${isAvailableOnSelected ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-500 hover:bg-gray-600'}`}>{isAvailableOnSelected ? 'Mark Busy' : 'Mark Available'}</button>
              <button
                className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600"
                onClick={closePopup}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default ExaminerDashboard;