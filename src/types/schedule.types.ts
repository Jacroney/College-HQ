/**
 * Schedule and calendar related type definitions
 */

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  type: 'class' | 'assignment' | 'exam' | 'meeting' | 'personal';
  color?: string;
  location?: string;
  course?: string;
  recurring?: boolean;
  allDay?: boolean;
}

export type ViewType = 'month' | 'week' | 'day';