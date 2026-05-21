import React, { useState, useEffect, useRef } from 'react';
import { useLabs } from '../context/LabsContext';
import { db } from '../services/db';

export default function GlassyDateTimePicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [clockMode, setClockMode] = useState('hour'); // 'hour' or 'minute'
  const containerRef = useRef(null);

  const { labs } = useLabs();
  const [taskDates, setTaskDates] = useState([]);

  // Parse the current value
  const getSelectedDate = () => {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  };

  const selectedDate = getSelectedDate();

  // On open, set currentMonth to the month of the selected date or today
  useEffect(() => {
    if (isOpen) {
      const activeDate = selectedDate || new Date();
      setCurrentMonth(new Date(activeDate.getFullYear(), activeDate.getMonth(), 1));
      setClockMode('hour');
    }
  }, [isOpen]);

  // Click outside listener to close the popover
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch dates of existing tasks for the heatmap
  useEffect(() => {
    if (labs.heatmap) {
      db.tasks.toArray().then(tasks => {
        const dates = tasks
          .filter(t => t.dueDate && !t.deleted)
          .map(t => t.dueDate.split('T')[0]);
        setTaskDates(dates);
      });
    } else {
      setTaskDates([]);
    }
  }, [labs.heatmap, value]);

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Calendar Helpers
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const startDay = new Date(year, month, 1).getDay(); // Sunday is 0
  const firstDayIndex = startDay === 0 ? 6 : startDay - 1; // Align to Monday index (0-6)
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevTotalDays = new Date(year, month, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const handleDaySelect = (day, isCurrentMonth = true) => {
    const baseDate = selectedDate || new Date();
    const newDate = new Date(baseDate);

    if (isCurrentMonth) {
      newDate.setFullYear(year);
      newDate.setMonth(month);
      newDate.setDate(day);
    } else {
      const targetMonth = day > 20 ? month - 1 : month + 1;
      const d = new Date(year, targetMonth, day);
      newDate.setFullYear(d.getFullYear());
      newDate.setMonth(d.getMonth());
      newDate.setDate(d.getDate());
      setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }

    triggerChange(newDate);
  };

  const triggerChange = (dateObj) => {
    const localISO = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    onChange(localISO);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  // Clock variables
  const displayHour = selectedDate ? (selectedDate.getHours() % 12 || 12) : 12;
  const activeMinute = selectedDate ? selectedDate.getMinutes() : 0;
  const ampm = selectedDate ? (selectedDate.getHours() >= 12 ? 'PM' : 'AM') : 'AM';

  const handleAmPmChange = (newAmPm) => {
    const baseDate = selectedDate || new Date();
    const newDate = new Date(baseDate);
    const h = newDate.getHours();
    if (newAmPm === 'AM' && h >= 12) {
      newDate.setHours(h - 12);
    } else if (newAmPm === 'PM' && h < 12) {
      newDate.setHours(h + 12);
    }
    triggerChange(newDate);
  };

  const adjustTime = (type, amount) => {
    const baseDate = selectedDate || new Date();
    const newDate = new Date(baseDate);
    if (type === 'hour') {
      newDate.setHours(newDate.getHours() + amount);
    } else {
      newDate.setMinutes(newDate.getMinutes() + amount);
    }
    triggerChange(newDate);
  };

  const handleClockNumberSelect = (val) => {
    const baseDate = selectedDate || new Date();
    const newDate = new Date(baseDate);

    if (clockMode === 'hour') {
      let targetHour = val;
      if (ampm === 'PM' && val !== 12) targetHour = val + 12;
      if (ampm === 'AM' && val === 12) targetHour = 0;
      newDate.setHours(targetHour);
      triggerChange(newDate);
      setTimeout(() => setClockMode('minute'), 250);
    } else {
      newDate.setMinutes(val === 12 ? 0 : val);
      triggerChange(newDate);
    }
  };

  // Build calendar days array
  const daysArray = [];
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    daysArray.push({ day: prevTotalDays - i, current: false });
  }
  for (let i = 1; i <= totalDays; i++) {
    daysArray.push({ day: i, current: true });
  }
  const remaining = 42 - daysArray.length;
  for (let i = 1; i <= remaining; i++) {
    daysArray.push({ day: i, current: false });
  }

  const isToday = (day) => {
    const today = new Date();
    return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
  };

  const isSelectedDay = (day, isCurrent) => {
    if (!selectedDate || !isCurrent) return false;
    return selectedDate.getDate() === day && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
  };

  const hasTaskOnDay = (day, isCurrent) => {
    if (!labs.heatmap || !isCurrent) return false;
    const formattedMonth = String(month + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const dateStr = `${year}-${formattedMonth}-${formattedDay}`;
    return taskDates.includes(dateStr);
  };

  // Generate trigonometry positions for clock numbers
  const getClockNumberPosition = (index, radius = 72) => {
    const angle = (index * 30) * (Math.PI / 180);
    const x = Math.round(radius * Math.sin(angle));
    const y = Math.round(-radius * Math.cos(angle));
    return {
      transform: `translate(${x}px, ${y}px)`,
    };
  };

  // Compute clock hand rotation
  const getClockHandRotation = () => {
    if (clockMode === 'hour') {
      return displayHour * 30;
    } else {
      return activeMinute * 6;
    }
  };

  const clockNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  const isClockNumberSelected = (val) => {
    if (clockMode === 'hour') {
      return displayHour === val;
    } else {
      const minVal = val === 12 ? 0 : val * 5;
      return Math.round(activeMinute / 5) * 5 % 60 === minVal;
    }
  };

  // Natural Language Parsing handler
  const handleNLPChange = (val) => {
    if (!val) return;
    const clean = val.toLowerCase().trim();
    let newDate = new Date();
    let match = false;
    
    if (clean.includes('today')) {
      newDate = new Date();
      match = true;
    } else if (clean.includes('tomorrow')) {
      newDate = new Date();
      newDate.setDate(newDate.getDate() + 1);
      match = true;
    } else if (clean.includes('next monday')) {
      newDate = new Date();
      const day = newDate.getDay();
      const daysToAdd = (day === 0 ? 1 : 8 - day);
      newDate.setDate(newDate.getDate() + daysToAdd);
      match = true;
    } else if (clean.includes('next friday')) {
      newDate = new Date();
      const day = newDate.getDay();
      const daysToAdd = (day <= 5 ? 5 - day : 12 - day);
      newDate.setDate(newDate.getDate() + daysToAdd);
      match = true;
    }
    
    // Parse hours (e.g. 5pm, 9am, 12pm, 6:30pm)
    const timeMatch = clean.match(/(\d+)(?::(\d+))?\s*(am|pm)?/);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1], 10);
      let minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const ampmVal = timeMatch[3];
      
      if (ampmVal === 'pm' && hour < 12) hour += 12;
      if (ampmVal === 'am' && hour === 12) hour = 0;
      newDate.setHours(hour, minute, 0, 0);
      match = true;
    }
    
    if (match) {
      triggerChange(newDate);
    }
  };

  // Preset Applicator
  const applyPreset = (amount, unit) => {
    const base = selectedDate || new Date();
    const newDate = new Date(base);
    if (unit === 'minutes') newDate.setMinutes(newDate.getMinutes() + amount);
    if (unit === 'hours') newDate.setHours(newDate.getHours() + amount);
    if (unit === 'days') newDate.setDate(newDate.getDate() + amount);
    triggerChange(newDate);
  };

  return (
    <div className="datetime-input-container" ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div className="datetime-input-wrapper" onClick={() => setIsOpen(!isOpen)} style={{ cursor: 'pointer' }}>
        <svg className="datetime-icon" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <input
          type="text"
          readOnly
          placeholder="Set due date and time..."
          value={formatDisplayDate(value)}
          className="form-input datetime-input"
          style={{ cursor: 'pointer' }}
        />
      </div>

      {isOpen && (
        <div className="glass-panel datetime-popover">
          {/* Calendar Side */}
          <div className="datetime-popover-calendar">
            {labs.nlp && (
              <div className="nlp-container" style={{ padding: '12px 14px', borderBottom: '1px solid var(--panel-border)' }}>
                <input 
                  type="text" 
                  placeholder="Type dynamic time (e.g. tomorrow 5pm)..." 
                  className="form-input nlp-input" 
                  style={{ padding: '6px 10px', fontSize: '12px', background: 'rgba(0,0,0,0.02)', width: '100%', boxSizing: 'border-box' }}
                  onChange={(e) => handleNLPChange(e.target.value)}
                />
              </div>
            )}

            <div className="calendar-header" style={{ paddingTop: labs.nlp ? '8px' : '16px' }}>
              <button type="button" className="calendar-nav-btn" onClick={handlePrevMonth} title="Previous Month">
                &larr;
              </button>
              <div className="calendar-month-year">
                {monthNames[month]} {year}
              </div>
              <button type="button" className="calendar-nav-btn" onClick={handleNextMonth} title="Next Month">
                &rarr;
              </button>
            </div>

            <div className="calendar-weekdays">
              <div>Mo</div>
              <div>Tu</div>
              <div>We</div>
              <div>Th</div>
              <div>Fr</div>
              <div>Sa</div>
              <div>Su</div>
            </div>

            <div className="calendar-grid">
              {daysArray.map((cell, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleDaySelect(cell.day, cell.current)}
                  className={`calendar-day-btn ${!cell.current ? 'prev-next-month' : ''} ${
                    isSelectedDay(cell.day, cell.current) ? 'selected' : ''
                  } ${cell.current && isToday(cell.day) ? 'today' : ''}`}
                  style={{ position: 'relative' }}
                >
                  <span>{cell.day}</span>
                  {hasTaskOnDay(cell.day, cell.current) && (
                    <span className="calendar-heatmap-dot" style={{
                      position: 'absolute',
                      bottom: '3px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '4px',
                      height: '4px',
                      backgroundColor: 'var(--primary)',
                      borderRadius: '50%'
                    }}></span>
                  )}
                </button>
              ))}
            </div>

            {labs.presets && (
              <div className="presets-container" style={{ 
                display: 'flex', 
                gap: '6px', 
                padding: '8px 12px', 
                background: 'rgba(0,0,0,0.01)', 
                borderTop: '1px solid var(--panel-border)',
                boxSizing: 'border-box'
              }}>
                <button type="button" onClick={() => applyPreset(30, 'minutes')} className="chip-btn" style={{ flex: 1, fontSize: '10.5px', padding: '4px 6px', background: 'var(--bg-secondary)', border: '1px solid var(--panel-border)', borderRadius: '4px', cursor: 'pointer' }}>+30m</button>
                <button type="button" onClick={() => applyPreset(2, 'hours')} className="chip-btn" style={{ flex: 1, fontSize: '10.5px', padding: '4px 6px', background: 'var(--bg-secondary)', border: '1px solid var(--panel-border)', borderRadius: '4px', cursor: 'pointer' }}>+2h</button>
                <button type="button" onClick={() => applyPreset(1, 'days')} className="chip-btn" style={{ flex: 1, fontSize: '10.5px', padding: '4px 6px', background: 'var(--bg-secondary)', border: '1px solid var(--panel-border)', borderRadius: '4px', cursor: 'pointer' }}>+1d</button>
              </div>
            )}

            {labs.timezone && (
              <div className="timezone-container" style={{ 
                padding: '8px 12px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                borderTop: '1px solid var(--panel-border)', 
                fontSize: '11px',
                color: 'var(--text-secondary)'
              }}>
                <span>Zone:</span>
                <select 
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '11px' }}
                  defaultValue="local"
                >
                  <option value="local">GMT+5:30 (Local)</option>
                  <option value="utc">GMT+0:00 (UTC)</option>
                  <option value="est">GMT-5:00 (EST)</option>
                  <option value="pst">GMT-8:00 (PST)</option>
                </select>
              </div>
            )}
          </div>

          {/* Clock Time Picker Side */}
          <div className="datetime-popover-time">
            <div className="clock-time-header">
              <div className="clock-time-selectors">
                <div className={`time-selector-unit ${clockMode === 'hour' ? 'active' : ''}`} onClick={() => setClockMode('hour')}>
                  <button type="button" className="time-adjust-btn" onClick={(e) => { e.stopPropagation(); adjustTime('hour', 1); }}>&and;</button>
                  <span className="time-value-display">{displayHour.toString().padStart(2, '0')}</span>
                  <button type="button" className="time-adjust-btn" onClick={(e) => { e.stopPropagation(); adjustTime('hour', -1); }}>&or;</button>
                </div>
                <span className="time-separator">:</span>
                <div className={`time-selector-unit ${clockMode === 'minute' ? 'active' : ''}`} onClick={() => setClockMode('minute')}>
                  <button type="button" className="time-adjust-btn" onClick={(e) => { e.stopPropagation(); adjustTime('minute', 1); }}>&and;</button>
                  <span className="time-value-display">{activeMinute.toString().padStart(2, '0')}</span>
                  <button type="button" className="time-adjust-btn" onClick={(e) => { e.stopPropagation(); adjustTime('minute', -1); }}>&or;</button>
                </div>
              </div>
              <div className="clock-ampm-toggle">
                <button type="button" className={`ampm-btn ${ampm === 'AM' ? 'active' : ''}`} onClick={() => handleAmPmChange('AM')}>AM</button>
                <button type="button" className={`ampm-btn ${ampm === 'PM' ? 'active' : ''}`} onClick={() => handleAmPmChange('PM')}>PM</button>
              </div>
            </div>

            {/* Circular Clock Face */}
            <div className="clock-face-container">
              <div className="clock-face">
                <div className="clock-center-pivot"></div>
                <div className="clock-hand" style={{ transform: `rotate(${getClockHandRotation()}deg)` }}>
                  <div className="clock-hand-pin"></div>
                </div>

                {clockNumbers.map((num) => {
                  const displayLabel = clockMode === 'hour' ? num : (num === 12 ? '00' : (num * 5).toString().padStart(2, '0'));
                  const selectVal = clockMode === 'hour' ? num : (num === 12 ? 0 : num * 5);
                  
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleClockNumberSelect(selectVal)}
                      className={`clock-number-btn ${isClockNumberSelected(num) ? 'selected' : ''}`}
                      style={getClockNumberPosition(num)}
                    >
                      {displayLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="datetime-popover-footer">
              <button type="button" className="popover-btn popover-btn-clear" onClick={handleClear}>
                Clear
              </button>
              <button type="button" className="popover-btn popover-btn-done" onClick={() => setIsOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
