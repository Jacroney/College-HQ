import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  ButtonGroup,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  useTheme,
  alpha,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  ChevronLeft,
  ChevronRight,
  Today,
  Add as AddIcon,
  CalendarViewMonth,
  CalendarViewWeek,
  CalendarViewDay,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  School as UniversityIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfileContext } from '../context/ProfileContext';

import { CalendarEvent, ViewType } from '../types';

// Styled Components
const CalendarContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
}));

const CalendarHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(3),
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius * 2,
  boxShadow: theme.shadows[1],
}));

const CalendarGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gap: theme.spacing(1),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius * 2,
  padding: theme.spacing(2),
  boxShadow: theme.shadows[1],
}));

const DayCell = styled(motion.div)(({ theme }) => ({
  minHeight: 120,
  padding: theme.spacing(1),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.default,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.05),
    borderColor: theme.palette.primary.main,
  },
}));

const EventChip = styled(Chip)(({ theme }) => ({
  fontSize: '0.75rem',
  height: 20,
  marginBottom: theme.spacing(0.5),
  cursor: 'pointer',
  '& .MuiChip-label': {
    padding: '0 6px',
  },
}));

const WeekView = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'auto repeat(7, 1fr)',
  gap: theme.spacing(1),
}));

const TimeSlot = styled(Box)(({ theme }) => ({
  minHeight: 60,
  padding: theme.spacing(1),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.default,
  position: 'relative',
}));

const EventBlock = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'eventType'
})<{ eventType: string }>(({ theme, eventType }) => {
  const colors = {
    class: theme.palette.primary.main,
    assignment: theme.palette.warning.main,
    exam: theme.palette.error.main,
    meeting: theme.palette.info.main,
    personal: theme.palette.success.main,
  };

  return {
    backgroundColor: alpha(colors[eventType as keyof typeof colors] || colors.personal, 0.8),
    color: theme.palette.common.white,
    padding: theme.spacing(0.5, 1),
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(0.5),
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    '&:hover': {
      backgroundColor: colors[eventType as keyof typeof colors] || colors.personal,
    },
  };
});

// Function to convert university calendar data to calendar events
const convertUniversityDataToEvents = (calendarData: any): CalendarEvent[] => {
  if (!calendarData) return [];
  
  const events: CalendarEvent[] = [];
  
  // Add holidays
  calendarData.holidays?.forEach((holiday: any) => {
    events.push({
      id: holiday.id,
      title: holiday.name,
      description: holiday.description,
      start: new Date(holiday.date),
      end: holiday.endDate ? new Date(holiday.endDate) : new Date(holiday.date),
      type: 'personal',
      allDay: true,
      color: '#f44336', // Red for holidays
    });
  });
  
  // Add important dates
  calendarData.importantDates?.forEach((date: any) => {
    events.push({
      id: date.id,
      title: date.title,
      description: date.description,
      start: new Date(date.date),
      end: date.endDate ? new Date(date.endDate) : new Date(date.date),
      type: date.type === 'deadline' ? 'assignment' : 
            date.type === 'exam' ? 'exam' : 
            date.type === 'orientation' ? 'meeting' : 'personal',
      location: date.location,
      allDay: date.type !== 'exam',
    });
  });
  
  // Add semester dates
  calendarData.semesters?.forEach((semester: any) => {
    // Semester start
    events.push({
      id: `${semester.id}-start`,
      title: `${semester.name} Begins`,
      start: new Date(semester.startDate),
      end: new Date(semester.startDate),
      type: 'personal',
      allDay: true,
      color: '#4caf50', // Green for semester events
    });
    
    // Semester end
    events.push({
      id: `${semester.id}-end`,
      title: `${semester.name} Ends`,
      start: new Date(semester.endDate),
      end: new Date(semester.endDate),
      type: 'personal',
      allDay: true,
      color: '#4caf50',
    });
    
    // Registration deadlines
    events.push({
      id: `${semester.id}-registration`,
      title: `Registration Deadline - ${semester.name}`,
      start: new Date(semester.registrationEnd),
      end: new Date(semester.registrationEnd),
      type: 'assignment',
      allDay: true,
    });
    
    // Drop deadline
    events.push({
      id: `${semester.id}-drop`,
      title: `Add/Drop Deadline - ${semester.name}`,
      start: new Date(semester.dropDeadline),
      end: new Date(semester.dropDeadline),
      type: 'assignment',
      allDay: true,
    });
    
    // Finals week
    events.push({
      id: `${semester.id}-finals`,
      title: `Finals Week - ${semester.name}`,
      start: new Date(semester.finalsWeekStart),
      end: new Date(semester.finalsWeekEnd),
      type: 'exam',
      allDay: true,
    });
  });
  
  return events;
};

// Main Component
const Schedule: React.FC = () => {
  const theme = useTheme();
  const { state: profileState, getUniversityCalendar } = useProfileContext();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [personalEvents, setPersonalEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showUniversityEvents, setShowUniversityEvents] = useState(true);

  // Event form state
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    start: new Date(),
    end: new Date(),
    type: 'personal' as CalendarEvent['type'],
    location: '',
    course: '',
    allDay: false,
  });

  // Load university calendar data when profile changes
  useEffect(() => {
    const universityCalendar = getUniversityCalendar();
    if (universityCalendar && showUniversityEvents) {
      const universityEvents = convertUniversityDataToEvents(universityCalendar);
      setEvents([...universityEvents, ...personalEvents]);
    } else {
      setEvents(personalEvents);
    }
  }, [profileState.profile, showUniversityEvents, personalEvents, getUniversityCalendar]);

  // Navigation functions
  const navigateDate = useCallback((direction: 'prev' | 'next' | 'today') => {
    const newDate = new Date(currentDate);
    
    switch (direction) {
      case 'prev':
        if (view === 'month') {
          newDate.setMonth(newDate.getMonth() - 1);
        } else if (view === 'week') {
          newDate.setDate(newDate.getDate() - 7);
        } else {
          newDate.setDate(newDate.getDate() - 1);
        }
        break;
      case 'next':
        if (view === 'month') {
          newDate.setMonth(newDate.getMonth() + 1);
        } else if (view === 'week') {
          newDate.setDate(newDate.getDate() + 7);
        } else {
          newDate.setDate(newDate.getDate() + 1);
        }
        break;
      case 'today':
        return setCurrentDate(new Date());
    }
    
    setCurrentDate(newDate);
  }, [currentDate, view]);

  // Get events for a specific date
  const getEventsForDate = useCallback((date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start);
      return (
        eventDate.getFullYear() === date.getFullYear() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getDate() === date.getDate()
      );
    });
  }, [events]);

  // Get events for time slot (for week/day view)
  const getEventsForTimeSlot = useCallback((date: Date, hour: number) => {
    return events.filter(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      const slotStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour);
      const slotEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour + 1);
      
      return (
        (eventStart >= slotStart && eventStart < slotEnd) ||
        (eventEnd > slotStart && eventEnd <= slotEnd) ||
        (eventStart <= slotStart && eventEnd >= slotEnd)
      );
    });
  }, [events]);

  // Format date for display
  const formatDate = useCallback((date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      ...(view !== 'month' && { day: 'numeric' })
    };
    return date.toLocaleDateString('en-US', options);
  }, [view]);

  // Handle event creation/editing
  const handleSaveEvent = () => {
    const newEvent: CalendarEvent = {
      id: selectedEvent ? selectedEvent.id : Date.now().toString(),
      title: eventForm.title,
      description: eventForm.description,
      start: eventForm.start,
      end: eventForm.end,
      type: eventForm.type,
      location: eventForm.location,
      course: eventForm.course,
      allDay: eventForm.allDay,
    };

    if (selectedEvent) {
      const updatedPersonalEvents = personalEvents.map(e => e.id === selectedEvent.id ? newEvent : e);
      setPersonalEvents(updatedPersonalEvents);
    } else {
      setPersonalEvents([...personalEvents, newEvent]);
    }

    setEventDialogOpen(false);
    setSelectedEvent(null);
    setIsEditing(false);
  };

  // Handle event deletion
  const handleDeleteEvent = () => {
    if (selectedEvent) {
      const updatedPersonalEvents = personalEvents.filter(e => e.id !== selectedEvent.id);
      setPersonalEvents(updatedPersonalEvents);
      setEventDialogOpen(false);
      setSelectedEvent(null);
      setIsEditing(false);
    }
  };

  // Open event dialog
  const openEventDialog = (date?: Date, event?: CalendarEvent) => {
    if (event) {
      setSelectedEvent(event);
      setEventForm({
        title: event.title,
        description: event.description || '',
        start: event.start,
        end: event.end,
        type: event.type,
        location: event.location || '',
        course: event.course || '',
        allDay: event.allDay || false,
      });
      setIsEditing(false);
    } else {
      setSelectedEvent(null);
      const startDate = date || selectedDate || new Date();
      const endDate = new Date(startDate);
      endDate.setHours(startDate.getHours() + 1);
      
      setEventForm({
        title: '',
        description: '',
        start: startDate,
        end: endDate,
        type: 'personal',
        location: '',
        course: '',
        allDay: false,
      });
      setIsEditing(true);
    }
    setEventDialogOpen(true);
  };

  // Render Month View
  const renderMonthView = () => {
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const startDate = new Date(startOfMonth);
    startDate.setDate(startDate.getDate() - startOfMonth.getDay());
    
    const days = [];
    const currentDay = new Date(startDate);
    
    // Week headers
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 0; i < 42; i++) {
      const dayEvents = getEventsForDate(currentDay);
      const isCurrentMonth = currentDay.getMonth() === currentDate.getMonth();
      const isToday = currentDay.toDateString() === new Date().toDateString();
      
      days.push(
        <DayCell
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.01 }}
          onClick={() => {
            setSelectedDate(new Date(currentDay));
            openEventDialog(new Date(currentDay));
          }}
          style={{
            opacity: isCurrentMonth ? 1 : 0.3,
            backgroundColor: isToday ? alpha(theme.palette.primary.main, 0.1) : undefined,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontWeight: isToday ? 700 : 400,
              color: isToday ? theme.palette.primary.main : undefined,
              mb: 1
            }}
          >
            {currentDay.getDate()}
          </Typography>
          {dayEvents.slice(0, 3).map((event) => (
            <EventChip
              key={event.id}
              label={event.title}
              size="small"
              style={{
                backgroundColor: getEventColor(event.type),
                color: 'white',
              }}
              onClick={(e) => {
                e.stopPropagation();
                openEventDialog(undefined, event);
              }}
            />
          ))}
          {dayEvents.length > 3 && (
            <Typography variant="caption" color="text.secondary">
              +{dayEvents.length - 3} more
            </Typography>
          )}
        </DayCell>
      );
      
      currentDay.setDate(currentDay.getDate() + 1);
    }

    return (
      <CalendarGrid style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {weekDays.map((day) => (
          <Typography
            key={day}
            variant="subtitle2"
            sx={{
              textAlign: 'center',
              fontWeight: 600,
              p: 2,
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              borderRadius: 1,
            }}
          >
            {day}
          </Typography>
        ))}
        {days}
      </CalendarGrid>
    );
  };

  // Render Week View
  const renderWeekView = () => {
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay());
    
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + i);
      return day;
    });

    return (
      <WeekView>
        {/* Time column */}
        <Box>
          <Box sx={{ height: 60, p: 1 }} /> {/* Header spacer */}
          {hours.map((hour) => (
            <TimeSlot key={hour}>
              <Typography variant="caption" color="text.secondary">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </Typography>
            </TimeSlot>
          ))}
        </Box>
        
        {/* Day columns */}
        {weekDays.map((day, dayIndex) => (
          <Box key={dayIndex}>
            <Box
              sx={{
                height: 60,
                p: 1,
                textAlign: 'center',
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                borderRadius: 1,
                mb: 1,
              }}
            >
              <Typography variant="subtitle2" fontWeight={600}>
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </Typography>
              <Typography variant="body2">
                {day.getDate()}
              </Typography>
            </Box>
            {hours.map((hour) => {
              const slotEvents = getEventsForTimeSlot(day, hour);
              return (
                <TimeSlot
                  key={hour}
                  onClick={() => {
                    const slotDate = new Date(day);
                    slotDate.setHours(hour);
                    openEventDialog(slotDate);
                  }}
                >
                  {slotEvents.map((event) => (
                    <EventBlock
                      key={event.id}
                      eventType={event.type}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEventDialog(undefined, event);
                      }}
                    >
                      {event.title}
                    </EventBlock>
                  ))}
                </TimeSlot>
              );
            })}
          </Box>
        ))}
      </WeekView>
    );
  };

  // Render Day View
  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    return (
      <CalendarGrid style={{ gridTemplateColumns: 'auto 1fr' }}>
        {hours.map((hour) => {
          const slotEvents = getEventsForTimeSlot(currentDate, hour);
          return (
            <React.Fragment key={hour}>
              <Box sx={{ p: 2, minWidth: 80 }}>
                <Typography variant="caption" color="text.secondary">
                  {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                </Typography>
              </Box>
              <TimeSlot
                onClick={() => {
                  const slotDate = new Date(currentDate);
                  slotDate.setHours(hour);
                  openEventDialog(slotDate);
                }}
                sx={{ minHeight: 80 }}
              >
                {slotEvents.map((event) => (
                  <EventBlock
                    key={event.id}
                    eventType={event.type}
                    onClick={(e) => {
                      e.stopPropagation();
                      openEventDialog(undefined, event);
                    }}
                  >
                    <Typography variant="body2" fontWeight={600}>
                      {event.title}
                    </Typography>
                    {event.location && (
                      <Typography variant="caption">
                        📍 {event.location}
                      </Typography>
                    )}
                  </EventBlock>
                ))}
              </TimeSlot>
            </React.Fragment>
          );
        })}
      </CalendarGrid>
    );
  };

  // Get event color based on type
  const getEventColor = (type: CalendarEvent['type']) => {
    const colors = {
      class: theme.palette.primary.main,
      assignment: theme.palette.warning.main,
      exam: theme.palette.error.main,
      meeting: theme.palette.info.main,
      personal: theme.palette.success.main,
    };
    return colors[type];
  };

  return (
    <CalendarContainer>
      {/* Header */}
      <CalendarHeader>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h4" fontWeight={700}>
              {formatDate(currentDate)}
            </Typography>
            <ButtonGroup variant="outlined" size="small">
              <IconButton onClick={() => navigateDate('prev')}>
                <ChevronLeft />
              </IconButton>
              <Button onClick={() => navigateDate('today')} startIcon={<Today />}>
                Today
              </Button>
              <IconButton onClick={() => navigateDate('next')}>
                <ChevronRight />
              </IconButton>
            </ButtonGroup>
          </Box>
          
          {/* University Info */}
          {profileState.profile?.university ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip
                icon={<UniversityIcon />}
                label={profileState.profile.university.name}
                variant="outlined"
                color="primary"
                size="small"
              />
              <Button
                size="small"
                variant={showUniversityEvents ? "contained" : "outlined"}
                onClick={() => setShowUniversityEvents(!showUniversityEvents)}
                startIcon={<InfoIcon />}
              >
                {showUniversityEvents ? 'Hide' : 'Show'} University Events
              </Button>
            </Box>
          ) : (
            <Alert severity="info" sx={{ mt: 1 }}>
              <Typography variant="body2">
                Set your university in your <strong>Profile</strong> to see university-specific calendar events like holidays, registration deadlines, and important dates.
              </Typography>
            </Alert>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ButtonGroup variant="outlined" size="small">
            <Button
              onClick={() => setView('month')}
              variant={view === 'month' ? 'contained' : 'outlined'}
              startIcon={<CalendarViewMonth />}
            >
              Month
            </Button>
            <Button
              onClick={() => setView('week')}
              variant={view === 'week' ? 'contained' : 'outlined'}
              startIcon={<CalendarViewWeek />}
            >
              Week
            </Button>
            <Button
              onClick={() => setView('day')}
              variant={view === 'day' ? 'contained' : 'outlined'}
              startIcon={<CalendarViewDay />}
            >
              Day
            </Button>
          </ButtonGroup>
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => openEventDialog()}
          >
            Add Event
          </Button>
        </Box>
      </CalendarHeader>

      {/* Calendar Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {view === 'month' && renderMonthView()}
          {view === 'week' && renderWeekView()}
          {view === 'day' && renderDayView()}
        </motion.div>
      </AnimatePresence>

      {/* Event Dialog */}
      <Dialog
        open={eventDialogOpen}
        onClose={() => setEventDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedEvent && !isEditing ? (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">{selectedEvent.title}</Typography>
              <Box>
                <IconButton onClick={() => setIsEditing(true)}>
                  <EditIcon />
                </IconButton>
                <IconButton onClick={handleDeleteEvent} color="error">
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Box>
          ) : (
            'Add New Event'
          )}
        </DialogTitle>
        
        <DialogContent>
          {selectedEvent && !isEditing ? (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body1" gutterBottom>
                <strong>Time:</strong> {selectedEvent.start.toLocaleString()} - {selectedEvent.end.toLocaleString()}
              </Typography>
              {selectedEvent.description && (
                <Typography variant="body1" gutterBottom>
                  <strong>Description:</strong> {selectedEvent.description}
                </Typography>
              )}
              {selectedEvent.location && (
                <Typography variant="body1" gutterBottom>
                  <strong>Location:</strong> {selectedEvent.location}
                </Typography>
              )}
              {selectedEvent.course && (
                <Typography variant="body1" gutterBottom>
                  <strong>Course:</strong> {selectedEvent.course}
                </Typography>
              )}
              <Chip
                label={selectedEvent.type}
                style={{
                  backgroundColor: getEventColor(selectedEvent.type),
                  color: 'white',
                  marginTop: 8,
                }}
              />
            </Box>
          ) : (
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Event Title"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={2}
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Start Date & Time"
                  type="datetime-local"
                  value={eventForm.start.toISOString().slice(0, 16)}
                  onChange={(e) => setEventForm({ ...eventForm, start: new Date(e.target.value) })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="End Date & Time"
                  type="datetime-local"
                  value={eventForm.end.toISOString().slice(0, 16)}
                  onChange={(e) => setEventForm({ ...eventForm, end: new Date(e.target.value) })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Event Type</InputLabel>
                  <Select
                    value={eventForm.type}
                    label="Event Type"
                    onChange={(e) => setEventForm({ ...eventForm, type: e.target.value as CalendarEvent['type'] })}
                  >
                    <MenuItem value="class">Class</MenuItem>
                    <MenuItem value="assignment">Assignment</MenuItem>
                    <MenuItem value="exam">Exam</MenuItem>
                    <MenuItem value="meeting">Meeting</MenuItem>
                    <MenuItem value="personal">Personal</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Location"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Course"
                  value={eventForm.course}
                  onChange={(e) => setEventForm({ ...eventForm, course: e.target.value })}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setEventDialogOpen(false)}>
            Cancel
          </Button>
          {(isEditing || !selectedEvent) && (
            <Button onClick={handleSaveEvent} variant="contained">
              Save Event
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </CalendarContainer>
  );
};

export default Schedule;