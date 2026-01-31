import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchSubscriptionStatus } from "@/lib/subscription";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { isProUser } = await fetchSubscriptionStatus(user.id, supabase);
    if (!isProUser) {
      return NextResponse.json(
        { error: "Timetable Scan is a Pro feature. Please upgrade to access." },
        { status: 403 }
      );
    }

    // Rate Limit: 5 scans per minute per user
    const { success, reset } = await rateLimit(`scan-tt:${user.id}`, 5, 60 * 1000);
    if (!success) {
      return NextResponse.json(
        { error: "Too many scan requests. Please try again in a minute." },
        { 
          status: 429,
          headers: { 'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString() }
        }
      );
    }

    const body = await req.json();
    const { text } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: "No text provided for analysis" }, { status: 400 });
    }

    console.log("=== RECEIVED TIMETABLE OCR TEXT ===");
    console.log(text.substring(0, 500)); // Show first 500 chars for debug
    console.log("===================================");

    // Parse the OCR text to extract timetable slots
    const classes = parseTimetableText(text);

    console.log("=== EXTRACTED CLASSES ===");
    console.log(JSON.stringify(classes, null, 2));
    console.log("=========================");

    if (classes.length === 0) {
      return NextResponse.json({ 
        error: "No valid classes found. Please ensure the image is clear and contains a timetable." 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true,
      classes,
      count: classes.length 
    });

  } catch (error) {
    console.error("Timetable Parsing Error:", error);
    return NextResponse.json({ error: "Failed to process timetable text" }, { status: 500 });
  }
}

interface TimetableClass {
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject_name: string;
  subject_code: string;
  room_number: string | null;
}

/**
 * Parse timetable text to extract class schedules
 * Handles various timetable formats
 */
function parseTimetableText(text: string): TimetableClass[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const classes: TimetableClass[] = [];

  console.log("Parsing timetable lines:", lines.length);

  const dayMap: { [key: string]: number } = {
    'sunday': 0, 'sun': 0,
    'monday': 1, 'mon': 1,
    'tuesday': 2, 'tue': 2, 'tues': 2,
    'wednesday': 3, 'wed': 3,
    'thursday': 4, 'thu': 4, 'thur': 4, 'thurs': 4,
    'friday': 5, 'fri': 5,
    'saturday': 6, 'sat': 6
  };

  let currentDay = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line contains a day name
    const dayMatch = line.toLowerCase().match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/);
    if (dayMatch) {
      const dayName = dayMatch[1];
      currentDay = dayMap[dayName] ?? -1;
      // Don't continue - try to extract class info from the rest of the line
      // Strip the day name to avoid re-detecting it or confusing the parser
      const lineWithoutDay = line.replace(new RegExp(`\\b${dayMatch[0]}\\b`, 'i'), '').trim();
      if (lineWithoutDay) {
        const classData = extractClassInfo(lineWithoutDay, currentDay);
        if (classData) {
          classes.push(classData);
        }
      }
      continue;
    }

    // Skip if we haven't found a day yet
    if (currentDay === -1) continue;

    // Try to extract time and subject from the line
    const classData = extractClassInfo(line, currentDay);
    if (classData) {
      classes.push(classData);
    }
  }

  return classes;
}

/**
 * Extract class information from a line
 * Looks for patterns like: "09:00-10:00 Mathematics" or "9:00 AM - 10:00 AM Math"
 */
function extractClassInfo(line: string, dayOfWeek: number): TimetableClass | null {
  // Pattern 1: 09:00-10:00 or 9:00-10:00
  const timePattern1 = /(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/;
  const match1 = line.match(timePattern1);

  if (match1) {
    const startHour = parseInt(match1[1]);
    const startMin = match1[2];
    const endHour = parseInt(match1[3]);
    const endMin = match1[4];

    const startTime = `${String(startHour).padStart(2, '0')}:${startMin}`;
    const endTime = `${String(endHour).padStart(2, '0')}:${endMin}`;

    // Validate times
    if (startHour > 23 || parseInt(startMin) > 59 || endHour > 23 || parseInt(endMin) > 59) {
      return null;
    }

    // Extract subject name (everything after the time)
    const subjectPart = line.substring(match1.index! + match1[0].length).trim();
    
    // Try to extract room number (usually in format like "Room 301" or "A101")
    const roomMatch = subjectPart.match(/\b(room\s*)?([A-Z]?\d{3,4})\b/i);
    const roomNumber = roomMatch ? roomMatch[2] : null;

    // Clean subject name (remove room number if found)
    let subjectName = subjectPart;
    if (roomMatch) {
      subjectName = subjectPart.replace(roomMatch[0], '').trim();
    }

    // Extract subject code (usually uppercase letters followed by numbers, like CS301)
    const codeMatch = subjectName.match(/\b([A-Z]{2,4}\s*\d{3,4})\b/);
    const subjectCode = codeMatch ? codeMatch[1].replace(/\s+/g, '') : '';

    // Clean subject name (remove code if found)
    if (codeMatch) {
      subjectName = subjectName.replace(codeMatch[0], '').trim();
    }

    // If subject name is still empty or too short, use the whole line
    if (!subjectName || subjectName.length < 2) {
      subjectName = subjectPart.split(/\s+/).slice(0, 5).join(' ') || 'Unknown Subject';
    }

    return {
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      subject_name: subjectName,
      subject_code: subjectCode,
      room_number: roomNumber
    };
  }

  // Pattern 2: 9:00 AM - 10:00 AM (with AM/PM)
  const timePattern2 = /(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i;
  const match2 = line.match(timePattern2);

  if (match2) {
    let startHour = parseInt(match2[1]);
    const startMin = match2[2];
    const startPeriod = match2[3].toUpperCase();
    let endHour = parseInt(match2[4]);
    const endMin = match2[5];
    const endPeriod = match2[6].toUpperCase();

    // Convert to 24-hour format
    if (startPeriod === 'PM' && startHour !== 12) startHour += 12;
    if (startPeriod === 'AM' && startHour === 12) startHour = 0;
    if (endPeriod === 'PM' && endHour !== 12) endHour += 12;
    if (endPeriod === 'AM' && endHour === 12) endHour = 0;

    const startTime = `${String(startHour).padStart(2, '0')}:${startMin}`;
    const endTime = `${String(endHour).padStart(2, '0')}:${endMin}`;

    // Validate times
    if (startHour > 23 || parseInt(startMin) > 59 || endHour > 23 || parseInt(endMin) > 59) {
      return null;
    }

    // Extract subject name
    const subjectPart = line.substring(match2.index! + match2[0].length).trim();
    
    const roomMatch = subjectPart.match(/\b(room\s*)?([A-Z]?\d{3,4})\b/i);
    const roomNumber = roomMatch ? roomMatch[2] : null;

    let subjectName = subjectPart;
    if (roomMatch) {
      subjectName = subjectPart.replace(roomMatch[0], '').trim();
    }

    const codeMatch = subjectName.match(/\b([A-Z]{2,4}\s*\d{3,4})\b/);
    const subjectCode = codeMatch ? codeMatch[1].replace(/\s+/g, '') : '';

    if (codeMatch) {
      subjectName = subjectName.replace(codeMatch[0], '').trim();
    }

    if (!subjectName || subjectName.length < 2) {
      subjectName = subjectPart.split(/\s+/).slice(0, 5).join(' ') || 'Unknown Subject';
    }

    return {
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      subject_name: subjectName,
      subject_code: subjectCode,
      room_number: roomNumber
    };
  }

  return null;
}
