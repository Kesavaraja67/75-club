"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, Plus, Trash2, Loader2 } from "lucide-react";
import { fetchSubscriptionStatus } from "@/lib/subscription";
import UpgradeDialog from "@/components/subscription/UpgradeDialog";

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface TimetableSlot {
  id: string;
  subject_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room_number: string | null;
  subjects?: Subject;
}

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export default function TimetablePage() {
  const [loading, setLoading] = useState(true);
  const [isProUser, setIsProUser] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [formData, setFormData] = useState({
    subject_id: "",
    day_of_week: "",
    start_time: "",
    end_time: "",
    room_number: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // Load data - Function declaration is hoisted
  // Load data
  const loadData = useCallback(async (userId: string) => {
    // Load subjects
    const { data: subjectsData } = await supabase
      .from("subjects")
      .select("id, name, code")
      .eq("user_id", userId)
      .order("name");

    if (subjectsData) {
      setSubjects(subjectsData);
    }

    // Load timetable slots
    const { data: slotsData } = await supabase
      .from("timetable_slots")
      .select(`
        *,
        subjects (id, name, code)
      `)
      .eq("user_id", userId)
      .order("day_of_week")
      .order("start_time");

    if (slotsData) {
      setSlots(slotsData);
    }
  }, [supabase]);

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      const { isProUser: isPro } = await fetchSubscriptionStatus(user.id);
      setIsProUser(isPro);

      if (isPro) {
        await loadData(user.id);
      }
      
      setLoading(false);
    };

    checkAccess();
  }, [supabase, router, loadData]); // Added loadData dependency

  // Move loadData definition up or inside useEffect if it's only used there... 
  // But wait, loadData is used in handleSubmit and handleDelete too.
  // So loadData should be defined normally. 
  // Let's wrapping checkAccess and loadData in useCallback? 
  // Or simpler: define loadData first, then checkAccess (wrapped in useCallback), then useEffect using checkAccess.
  
  // Implementation below: rearranging.

  // Load data - Function declaration is hoisted
  // Implementation below: rearranging.

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from("timetable_slots").insert({
      user_id: user.id,
      subject_id: formData.subject_id,
      day_of_week: parseInt(formData.day_of_week),
      start_time: formData.start_time,
      end_time: formData.end_time,
      room_number: formData.room_number || null,
    });

    if (error) {
      console.error("Error adding slot:", error);
      alert("Failed to add timetable slot. Please try again.");
    } else {
      // Reset form
      setFormData({
        subject_id: "",
        day_of_week: "",
        start_time: "",
        end_time: "",
        room_number: "",
      });
      // Reload data
      await loadData(user.id);
    }

    setSubmitting(false);
  };

  const handleDelete = async (slotId: string) => {
    if (!confirm("Delete this timetable slot?")) return;

    const { error } = await supabase
      .from("timetable_slots")
      .delete()
      .eq("id", slotId);

    if (error) {
      console.error("Error deleting slot:", error);
      alert("Failed to delete slot.");
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await loadData(user.id);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-black" />
      </div>
    );
  }

  if (!isProUser) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="p-8 text-center border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex justify-center mb-4">
            <Clock className="h-16 w-16 text-blue-500" />
          </div>
          <h2 className="text-3xl font-black mb-4">Timetable is Pro Only! 📅</h2>
          <p className="text-gray-600 mb-6 text-lg">
            Create your class schedule and get time-aware attendance advice. Upgrade to Pro to unlock this feature!
          </p>
          <Button
            onClick={() => setShowUpgrade(true)}
            className="font-bold text-lg px-8 py-6 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all"
          >
            Upgrade to Pro
          </Button>
        </Card>
        <UpgradeDialog
          open={showUpgrade}
          onOpenChange={setShowUpgrade}
        />
      </div>
    );
  }

  // Group slots by day
  const slotsByDay = DAYS.map(day => ({
    ...day,
    slots: slots.filter(s => s.day_of_week === day.value),
  }));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-black flex items-center gap-2">
          <Clock className="h-8 w-8" />
          My Timetable
        </h1>
        <p className="text-gray-600">Manage your weekly class schedule</p>
      </div>

      {/* Add New Slot Form */}
      <Card className="p-6 mb-6 border-2 border-black">
        <h2 className="text-xl font-bold mb-4">Add Class</h2>
        <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="subject">Subject *</Label>
            <Select
              value={formData.subject_id}
              onValueChange={(value) => setFormData({ ...formData, subject_id: value })}
              required
            >
              <SelectTrigger className="border-2 border-black rounded-xl">
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map(subject => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name} ({subject.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="day">Day *</Label>
            <Select
              value={formData.day_of_week}
              onValueChange={(value) => setFormData({ ...formData, day_of_week: value })}
              required
            >
              <SelectTrigger className="border-2 border-black rounded-xl">
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map(day => (
                  <SelectItem key={day.value} value={day.value.toString()}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="start_time">Start Time *</Label>
            <Input
              id="start_time"
              type="time"
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              className="border-2 border-black rounded-xl"
              required
            />
          </div>

          <div>
            <Label htmlFor="end_time">End Time *</Label>
            <Input
              id="end_time"
              type="time"
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              className="border-2 border-black rounded-xl"
              required
            />
          </div>

          <div>
            <Label htmlFor="room">Room Number (Optional)</Label>
            <Input
              id="room"
              type="text"
              value={formData.room_number}
              onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
              placeholder="e.g., Room 301"
              className="border-2 border-black rounded-xl"
            />
          </div>

          <div className="flex items-end">
            <Button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-2" /> Add Class</>}
            </Button>
          </div>
        </form>
      </Card>

      {/* Timetable Display */}
      <div className="grid gap-4">
        {slotsByDay.map(day => (
          <Card key={day.value} className="p-4 border-2 border-black">
            <h3 className="text-lg font-bold mb-3">{day.label}</h3>
            {day.slots.length === 0 ? (
              <p className="text-gray-500 text-sm">No classes scheduled</p>
            ) : (
              <div className="space-y-2">
                {day.slots.map(slot => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex-1">
                      <p className="font-bold">{slot.subjects?.name}</p>
                      <p className="text-sm text-gray-600">
                        {slot.start_time} - {slot.end_time}
                        {slot.room_number && ` • Room ${slot.room_number}`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(slot.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      aria-label={`Delete ${slot.subjects?.name || 'class'}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
