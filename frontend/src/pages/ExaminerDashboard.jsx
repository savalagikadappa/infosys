import React, { useState, useEffect } from 'react';
import CalendarComponent from '../components/CalendarComponent';
import Modal from 'react-modal';
import { useNavigate } from 'react-router-dom';

function ExaminerDashboard() {
  const [highlightDates, setHighlightDates] = useState({});
  const [popupData, setPopupData] = useState(null);
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
      } catch (error) {
        console.error('Error fetching highlight dates:', error);
      }
    };

    fetchHighlightDates();
  }, []);

  const handleDateClick = (date) => {
    const key = date.toLocaleDateString('en-CA');
    if (highlightDates[key]) {
      if (popupData) {
        console.warn('Popup already open, closing it before opening a new one.');
        closePopup();
      }
      setPopupData({ date: key, sessions: highlightDates[key] });
    } else {
      alert('No sessions on this date.');
    }
  };

  const closePopup = () => {
    setPopupData(null);
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
          onDateClick={handleDateClick}
        />
      </div>

      {popupData && (
        <Modal isOpen={!!popupData} onRequestClose={closePopup} ariaHideApp={false}>
          <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-100 shadow-2xl border-2 border-blue-200 min-w-[320px] max-w-lg mx-auto">
            <h2 className="text-xl font-bold text-blue-800 mb-4">Sessions on {popupData.date}</h2>
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
            <button
              className="mt-4 w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600"
              onClick={closePopup}
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default ExaminerDashboard;