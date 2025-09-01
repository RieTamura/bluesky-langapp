import React, { useState, useEffect } from 'react';

interface CalendarDay {
  date: Date;
  wordsLearned: number;
  quizzesTaken: number;
  isToday: boolean;
  isCurrentMonth: boolean;
}

interface LearningCalendarProps {
  learningHistory?: Array<{
    date: string;
    wordsLearned: number;
    quizzesTaken: number;
  }>;
}

export default function LearningCalendar({ learningHistory = [] }: LearningCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);

  useEffect(() => {
    generateCalendarDays();
  }, [currentDate, learningHistory]);

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Get first day of the month and last day
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Get the first day of the week for the first day of the month
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // Generate 42 days (6 weeks) for the calendar grid
    const days: CalendarDay[] = [];
    const today = new Date();
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      // Find learning data for this date
      const dateStr = date.toISOString().split('T')[0];
      const dayData = learningHistory.find(h => h.date === dateStr);
      
      days.push({
        date: new Date(date),
        wordsLearned: dayData?.wordsLearned || 0,
        quizzesTaken: dayData?.quizzesTaken || 0,
        isToday: date.toDateString() === today.toDateString(),
        isCurrentMonth: date.getMonth() === month
      });
    }
    
    setCalendarDays(days);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const getActivityLevel = (wordsLearned: number, quizzesTaken: number): string => {
    const totalActivity = wordsLearned + quizzesTaken;
    if (totalActivity === 0) return 'bg-gray-100';
    if (totalActivity <= 2) return 'bg-green-200';
    if (totalActivity <= 5) return 'bg-green-400';
    if (totalActivity <= 10) return 'bg-green-600';
    return 'bg-green-800';
  };

  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">学習カレンダー</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h3 className="text-lg font-medium text-gray-700 min-w-[120px] text-center">
            {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
          </h3>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {/* Week day headers */}
        {weekDays.map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {calendarDays.map((day, index) => (
          <div
            key={index}
            className={`
              relative aspect-square p-1 text-sm border border-gray-100 rounded
              ${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
              ${day.isToday ? 'ring-2 ring-blue-500' : ''}
            `}
          >
            <div className="flex flex-col h-full">
              <span className="text-xs">{day.date.getDate()}</span>
              <div className="flex-1 flex items-end">
                <div
                  className={`
                    w-full h-2 rounded-sm
                    ${getActivityLevel(day.wordsLearned, day.quizzesTaken)}
                  `}
                  title={`${day.wordsLearned}個の単語学習, ${day.quizzesTaken}回のクイズ`}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>少ない</span>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-gray-100 rounded-sm"></div>
          <div className="w-3 h-3 bg-green-200 rounded-sm"></div>
          <div className="w-3 h-3 bg-green-400 rounded-sm"></div>
          <div className="w-3 h-3 bg-green-600 rounded-sm"></div>
          <div className="w-3 h-3 bg-green-800 rounded-sm"></div>
        </div>
        <span>多い</span>
      </div>
    </div>
  );
}