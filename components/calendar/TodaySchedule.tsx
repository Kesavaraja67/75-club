"use client";

import { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, CalendarDays, Loader2 } from "lucide-react";
import { CalendarEvent } from "@/lib/types";

interface TimetableSlot {
  id: string;
  subject_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room_number: string | null;
  subjects?: {
    name: string;
    code: string;
  };
}

export default function TodaySchedule({ selectedDate, events }: { selectedDate: Date, events: CalendarEvent[] }) {
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const fetchSchedule = async () => {
      setLoading(true);
      const dayOfWeek = selectedDate.getDay();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSlots([]);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("timetable_slots")
        .select(`
          *,
          subjects (name, code)
        `)
        .eq("user_id", user.id)
        .eq("day_of_week", dayOfWeek)
        .order("start_time");

      if (data) {
        setSlots(data);
      }
      setLoading(false);
    };

    fetchSchedule();
  }, [selectedDate, supabase]);

  const importantEvents = events.filter(e => e.type !== 'holiday' && e.type !== 'personal');
  const holidays = events.filter(e => e.type === 'holiday');
  const isHoliday = holidays.length > 0;
  const isWeekend = selectedDate.getDay() === 0 || selectedDate.getDay() === 6; // Sunday or Saturday (depending on school, usually Sunday)

  return (
    <Card className="h-full border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col">
      <CardHeader className="border-b-2 border-black bg-yellow-50">
        <CardTitle className="flex items-center gap-2 text-xl font-display font-black">
          <CalendarDays className="h-5 w-5" />
          Schedule for {format(selectedDate, "MMM d")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 overflow-y-auto flex-1 space-y-4">
        
        {/* Important Events Section */}
        {importantEvents.length > 0 && (
          <div className="space-y-2">
             <h4 className="font-bold text-sm text-gray-500 uppercase">Important</h4>
             {importantEvents.map(event => (
               <div key={event.id} className="bg-yellow-100 border-2 border-yellow-400 p-3 rounded-xl">
                 <p className="font-bold text-yellow-900">{event.title}</p>
                 <Badge variant="outline" className="bg-white text-xs mt-1 border-yellow-600 text-yellow-800">
                    {event.type}
                 </Badge>
               </div>
             ))}
          </div>
        )}

        {/* Holidays */}
        {isHoliday && (
           <div className="bg-red-100 border-2 border-red-400 p-4 rounded-xl text-center">
             <p className="font-bold text-red-900 text-lg">🎉 Holiday today!</p>
             <p className="text-red-700">{holidays[0].title}</p>
             <p className="text-sm text-gray-600 mt-2">No classes scheduled.</p>
           </div>
        )}

        {/* Regular Schedule */}
        {!isHoliday && (
          <div className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : slots.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <p>No classes scheduled for this day.</p>
                {isWeekend && <p className="text-sm">Enjoy your weekend! 😴</p>}
              </div>
            ) : (
              slots.map((slot) => (
                <div key={slot.id} className="bg-white border-2 border-black p-3 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] hover:translate-x-1 transition-transform">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-display font-bold text-lg leading-tight">{slot.subjects?.name}</h4>
                      <p className="text-xs text-gray-500 font-mono">{slot.subjects?.code}</p>
                    </div>
                    <Badge variant="secondary" className="border border-black font-mono text-xs">
                      {slot.start_time.slice(0, 5)}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-600 font-medium">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                    </div>
                    {slot.room_number && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {slot.room_number}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
