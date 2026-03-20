"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Tesseract from "tesseract.js";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Plus, Trash2, Loader2, Upload, Camera } from "lucide-react";
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

export default function SchedulePage() {
  const [loading, setLoading] = useState(true);
  const [isProUser, setIsProUser] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [authCheckError, setAuthCheckError] = useState<unknown | null>(null);
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
  
  // Image upload states
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

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

  const checkAccess = useCallback(async () => {
    setAuthCheckError(null);
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    
    if (!user) {
      router.push("/login");
      return;
    }

    const { isProUser: isPro } = await fetchSubscriptionStatus(user.id, supabase);
    setIsProUser(isPro);
    if (isPro) {
      await loadData(user.id);
    }
    
    setLoading(false);
  }, [router, supabase, loadData]);

  useEffect(() => {
    checkAccess().catch((err: unknown) => {
      console.error("Schedule access check failed:", err);
      setAuthCheckError(err);
      setLoading(false);
    });
  }, [checkAccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
    } catch (error) {
      console.error("Error adding slot:", error);
      alert("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScanTimetable = async () => {
    if (!selectedImage) {
      alert("Please select a timetable image first");
      return;
    }

    setScanning(true);

    try {
      // Step 1: Extract text from image using Tesseract OCR
      console.log("[Timetable] Starting OCR...");
      const { data: { text } } = await Tesseract.recognize(
        selectedImage,
        'eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              console.log(`[Timetable OCR] Progress: ${Math.round(m.progress * 100)}%`);
            }
          }
        }
      );

      console.log("[Timetable] OCR complete, extracted text length:", text.length);

      // Step 2: Send extracted text to parsing API
      const response = await fetch("/api/scan-timetable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to parse timetable");
      }

      console.log("Parsed classes:", data.classes);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // For each scanned class, try to match with existing subjects or create new ones
      let successCount = 0;
      for (const cls of data.classes) {
        // Try to find matching subject by name or code
        let subjectId = null;
        
        const matchingSubject = subjects.find(
          s => s.name.toLowerCase() === cls.subject_name.toLowerCase() ||
               (cls.subject_code && s.code.toLowerCase() === cls.subject_code.toLowerCase())
        );

        if (matchingSubject) {
          subjectId = matchingSubject.id;
        } else {
          // Create new subject
          const { data: newSubject, error: subjectError } = await supabase
            .from("subjects")
            .insert({
              user_id: user.id,
              name: cls.subject_name,
              code: cls.subject_code || cls.subject_name.substring(0, 6).toUpperCase(),
              total_hours: 0,
              hours_present: 0,
            })
            .select()
            .single();

          if (subjectError) {
            console.error("Error creating subject:", subjectError);
            continue;
          }

          subjectId = newSubject.id;
        }

        // Insert timetable slot
        const { error: slotError } = await supabase
          .from("timetable_slots")
          .insert({
            user_id: user.id,
            subject_id: subjectId,
            day_of_week: cls.day_of_week,
            start_time: cls.start_time,
            end_time: cls.end_time,
            room_number: cls.room_number,
          });

        if (!slotError) {
          successCount++;
        }
      }

      alert(`Successfully added ${successCount} out of ${data.classes.length} classes to your schedule!`);
      
      // Reload data
      await loadData(user.id);
      
      // Reset image
      setSelectedImage(null);
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

    } catch (error: unknown) {
      console.error("Scan error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to scan timetable. Please try again.";
      alert(errorMessage);
    } finally {
      setScanning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-black" />
      </div>
    );
  }

  if (authCheckError) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="p-8 text-center border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex justify-center mb-4">
            <Loader2 className="h-16 w-16 text-red-500" />
          </div>
          <h2 className="text-3xl font-black mb-4">Connection Error 🔌</h2>
          <p className="text-gray-600 mb-6 text-lg">
            We couldn&apos;t verify your account access. This might be due to a slow connection or a service issue.
          </p>
          <Button
            onClick={() => checkAccess()}
            className="font-bold text-lg px-8 py-6 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all"
          >
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  if (!isProUser) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="p-8 text-center border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex justify-center mb-4">
            <Calendar className="h-16 w-16 text-blue-500" />
          </div>
          <h2 className="text-3xl font-black mb-4">Schedule is Pro Only! 📅</h2>
          <p className="text-gray-600 mb-6 text-lg">
            Create your weekly class schedule and get time-aware attendance advice. Upgrade to Pro to unlock this feature!
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
          feature="Schedule"
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
          <Calendar className="h-8 w-8" />
          My Schedule
        </h1>
        <p className="text-gray-600">Manage your weekly class schedule and attendance</p>
      </div>

      {/* Upload Timetable Screenshot */}
      <Card className="p-6 mb-6 border-2 border-black">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Timetable Screenshot
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Upload a screenshot of your timetable and we&apos;ll automatically extract all your classes!
        </p>

        <div className="space-y-4">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              id="timetable-upload"
            />
            <label htmlFor="timetable-upload">
              <Button
                type="button"
                variant="outline"
                className="w-full border-2 border-black rounded-xl hover:bg-gray-50"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-4 w-4 mr-2" />
                {selectedImage ? "Change Image" : "Select Timetable Image"}
              </Button>
            </label>
          </div>

          {imagePreview && (
            <div className="relative w-full h-96">
              <Image
                src={imagePreview}
                alt="Timetable preview"
                fill
                className="object-contain rounded-lg border-2 border-black"
              />
            </div>
          )}

          {selectedImage && (
            <Button
              onClick={handleScanTimetable}
              disabled={scanning}
              className="w-full rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all"
            >
              {scanning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scanning Timetable...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Scan & Add to Schedule
                </>
              )}
            </Button>
          )}
        </div>
      </Card>

      {/* Add New Slot Form */}
      <Card className="p-6 mb-6 border-2 border-black">
        <h2 className="text-xl font-bold mb-4">Add Class Manually</h2>
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
