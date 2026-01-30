"use client";

import { useState, useEffect, useMemo } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CalendarEvent } from "@/lib/types";

interface CalendarViewProps {
  onDateSelect: (date: Date, events: CalendarEvent[]) => void;
  selectedDate: Date;
}

export default function CalendarView({ onDateSelect, selectedDate }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newEvent, setNewEvent] = useState<{
    title: string;
    description: string;
    type: string;
    is_class_off: boolean;
  }>({
    title: "",
    description: "",
    type: "personal",
    is_class_off: false,
  });

  const supabase = useMemo(() => createClient(), []);

  // Load events for the current month
  useEffect(() => {
    const fetchEvents = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const start = startOfMonth(currentMonth).toISOString();
        const end = endOfMonth(currentMonth).toISOString();

        const { data, error } = await supabase
            .from('calendar_events')
            .select('*')
            .eq('user_id', user.id)
            .gte('date', start)
            .lte('date', end);

        if (error) {
            console.error('Error fetching events:', error);
            // If error code 42P01 (undefined_table) or generic error on first load
            if (error.code === '42P01' || error.message.includes('relation') || error.message.includes('calendar_events')) {
               toast.error("Database setup required");
            } else {
               // Silent fail for other errors to avoid spamming, just log
               console.warn("Calendar sync issue", error);
            }
        } else {
            setEvents(data || []);
        }
        setLoading(false);
    };

    fetchEvents();
  }, [currentMonth, supabase]);


  // Calendar navigation
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  // Handle Event Creation
  const handleCreateEvent = async () => {
      if (!newEvent.title) {
        toast.error("Please enter an event title");
        setIsSubmitting(false); // Reset state
        return;
      }
      setIsSubmitting(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsSubmitting(false);
        toast.error("Please sign in to add events");
        return;
      }

      const { data, error } = await supabase
          .from('calendar_events')
          .insert({
              user_id: user.id,
              date: format(selectedDate, 'yyyy-MM-dd'),
              title: newEvent.title,
              description: newEvent.description,
              type: newEvent.type,
              is_class_off: newEvent.is_class_off,
          })
          .select()
          .single();

      if (error) {
          console.error(error);
          toast.error("Database table missing? Please run the migration.");
      } else {
          toast.success("Event added!");
          setEvents([...events, data]);
          setIsDialogOpen(false);
          setNewEvent({ title: "", description: "", type: "personal", is_class_off: false });
          // Notify parent of updated events for the selected date
          onDateSelect(selectedDate, [...events, data].filter(e => isSameDay(new Date(e.date), selectedDate)));
      }
      setIsSubmitting(false);
  };

  const handleDeleteEvent = async (eventId: string) => {
      if(!confirm("Delete this event?")) return;

      const { error } = await supabase.from('calendar_events').delete().eq('id', eventId);
      if(error) {
           toast.error("Failed to delete event");
      } else {
           toast.success("Event deleted");
           const updatedEvents = events.filter(e => e.id !== eventId);
           setEvents(updatedEvents);
           onDateSelect(selectedDate, updatedEvents.filter(e => isSameDay(new Date(e.date), selectedDate)));
      }
  }


  // Helper to get events for a specific day
  const getEventsForDay = (day: Date) => {
      return events.filter(event => isSameDay(new Date(event.date), day));
  };
  
  const handleDateClick = (day: Date) => {
      // If clicking same date, open dialog
      if (isSameDay(day, selectedDate)) {
        setIsDialogOpen(true);
      } else {
        onDateSelect(day, getEventsForDay(day));
      }
  };


  return (
    <div className="relative flex flex-col h-full bg-white border-4 border-black box-border rounded-3xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black capitalize flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <div className="flex gap-1">
                <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8 border-2 border-black rounded-lg hover:translate-y-0.5 hover:shadow-none transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8 border-2 border-black rounded-lg hover:translate-y-0.5 hover:shadow-none transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 mb-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className="text-center text-xs font-black text-gray-400 uppercase py-1">
                    {day}
                </div>
            ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 flex-1">
            {days.map((day) => {
                 const dayEvents = getEventsForDay(day);
                 const hasHoliday = dayEvents.some(e => e.type === 'holiday');
                 const isSelected = isSameDay(day, selectedDate);
                 const isCurrentMonth = isSameMonth(day, currentMonth);

                return (
                    <div
                        key={day.toString()}
                        onClick={() => handleDateClick(day)}
                        className={cn(
                            "min-h-[4.5rem] border-2 rounded-xl p-1.5 cursor-pointer transition-all relative flex flex-col justify-between group",
                            !isCurrentMonth && "opacity-20 bg-gray-50 border-gray-200 grayscale",
                            isCurrentMonth && "bg-white border-gray-200 hover:border-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                            isSelected && "border-black bg-blue-50/50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                            hasHoliday && "bg-red-50/50 border-red-200",
                        )}
                    >
                        <div className="flex justify-between items-start">
                             <span className={cn(
                                 "text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full",
                                 isToday(day) ? "bg-black text-white" : "text-gray-500 group-hover:text-black"
                             )}>
                                 {format(day, 'd')}
                             </span>
                        </div>
                        
                        {/* Event Indicators */}
                        <div className="space-y-0.5 mt-0.5">
                            {dayEvents.slice(0, 2).map(event => (
                                <div 
                                    key={event.id} 
                                    className={cn(
                                        "text-[9px] truncate px-1 rounded font-medium border h-4 flex items-center",
                                        event.type === 'holiday' ? "bg-red-100/80 text-red-800 border-red-200" :
                                        event.type === 'exam' ? "bg-yellow-100/80 text-yellow-800 border-yellow-200" :
                                        event.type === 'assignment' ? "bg-blue-100/80 text-blue-800 border-blue-200" :
                                        "bg-gray-100/80 text-gray-800 border-gray-200"
                                    )}
                                >
                                    {event.title}
                                </div>
                            ))}
                            {dayEvents.length > 2 && (
                                <div className="text-[9px] text-gray-400 pl-0.5 leading-none">
                                    +{dayEvents.length - 2}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
        
        {/* Loading Overlay */}
        {loading && (
             <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10 pointer-events-none rounded-3xl">
                 <Loader2 className="h-8 w-8 animate-spin" />
             </div>
        )}

        {/* Add Event Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[425px] bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <DialogHeader>
                    <DialogTitle className="font-black text-2xl flex items-center gap-2">
                         <span className="bg-black text-white px-3 py-1 rounded-lg text-lg">
                            {format(selectedDate, "MMM d")}
                         </span>
                         Add Event
                    </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="title" className="font-bold">Event Title</Label>
                        <Input
                            id="title"
                            value={newEvent.title}
                            onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                            className="bg-white border-2 border-black rounded-xl focus-visible:ring-offset-0 focus-visible:ring-2 focus-visible:ring-black"
                            placeholder="e.g. Math Exam"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="type" className="font-bold">Event Type</Label>
                        <Select
                            value={newEvent.type}
                            onValueChange={(val) => setNewEvent({ 
                                ...newEvent, 
                                type: val,
                                is_class_off: val === 'holiday' // Default logic
                            })}
                        >
                            <SelectTrigger className="bg-white border-2 border-black rounded-xl focus:ring-2 focus:ring-black">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-2 border-black rounded-xl">
                                <SelectItem value="personal">Personal 👤</SelectItem>
                                <SelectItem value="holiday">Holiday 🏖️</SelectItem>
                                <SelectItem value="exam">Exam 📝</SelectItem>
                                <SelectItem value="assignment">Assignment 📚</SelectItem>
                                <SelectItem value="important">Important ⚠️</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                
                {/* Existing Events List for Deletion */}
                {getEventsForDay(selectedDate).length > 0 && (
                    <div className="mb-4 bg-gray-50 border-2 border-gray-200 rounded-xl p-3">
                        <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Events on this day</Label>
                        <div className="space-y-2">
                            {getEventsForDay(selectedDate).map(e => (
                                <div key={e.id} className="flex justify-between items-center text-sm p-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                                    <span className="font-medium">{e.title}</span>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-md" onClick={() => handleDeleteEvent(e.id)}>
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button onClick={handleCreateEvent} disabled={isSubmitting} className="w-full font-bold text-lg rounded-xl border-2 border-black bg-black text-white hover:bg-gray-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] hover:shadow-none hover:translate-y-1 transition-all">
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-2" /> Add Event</>}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
