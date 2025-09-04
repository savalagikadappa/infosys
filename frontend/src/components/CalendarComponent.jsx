import React from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

// Calendar with highlighted training session dates and availability
function CalendarComponent({ highlightDates, availabilityDates = {}, examDates = {}, onDateClick }) {
  return (
    <div className="calendar-panel mt-4 md:mt-0 bg-white rounded-3xl shadow-2xl border border-blue-200 p-6 w-full max-w-lg custom-calendar" style={{ minWidth: '320px' }}>
      <div className="text-blue-700 font-extrabold text-2xl mb-4 text-center tracking-wide">Calendar</div>
      <Calendar
        onClickDay={onDateClick}
        tileClassName={({ date }) => {
          const key = date.toLocaleDateString('en-CA');
          const classes = [];
          if (highlightDates[key]) classes.push('session-highlight');
          if (availabilityDates[key]) classes.push('availability-highlight');
          if (examDates[key]) classes.push('exam-available-highlight');
          return classes.join(' ');
        }}
      />
      <div className="flex flex-wrap gap-3 mt-5 text-xs text-blue-700 justify-center">
        <span className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full bg-gradient-to-br from-rose-500 to-red-600 shadow" /> Session Scheduled</span>
        <span className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow" /> Available</span>
        <span className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 shadow" /> Exam Scheduling</span>
      </div>
    </div>
  );
}

export default CalendarComponent;
