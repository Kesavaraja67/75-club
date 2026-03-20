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

    const status = await fetchSubscriptionStatus(user.id, supabase);
    if (!status) {
      return NextResponse.json(
        { error: "Failed to verify subscription status. Please try again." },
        { status: 500 }
      );
    }

    if (!status.isProUser) {
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

    if (process.env.NODE_ENV !== "production") {
      console.log("=== RECEIVED TIMETABLE OCR TEXT ===");
      console.log(text.substring(0, 500)); // Show first 500 chars for debug
      console.log("===================================");
    }

    // Parse the OCR text to extract timetable slots
    let classes = parseTimetableText(text);

    // If standard parsing failed, try grid-based parsing
    if (classes.length === 0) {
      if (process.env.NODE_ENV !== "production") {
        console.log("Standard parsing failed, attempting grid parsing...");
      }
      classes = parseGridTimetable(text);
    }

    // If grid parsing also failed (no headers found), try generic row parsing
    // This handles cases where time headers are unreadable but "Monday | Math | Physics" structure exists
    if (classes.length === 0) {
      if (process.env.NODE_ENV !== "production") {
        console.log("Grid parsing failed, attempting generic row fallback...");
      }
      classes = parseGenericRows(text);
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("=== EXTRACTED CLASSES ===");
      console.log(JSON.stringify(classes, null, 2));
      console.log("=========================");
    }

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

  if (process.env.NODE_ENV !== "production") {
    console.log("Parsing timetable lines:", lines.length);
  }

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
      
      // Fix: Use literal replacement to avoid ReDoS from dynamic RegExp
      // dayMatch[0] is guaranteed to be a day name from the regex above, but we proceed safely
      const lineWithoutDay = line.replace(dayMatch[0], '').trim();
      
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

    // Validate times
    if (startHour > 23 || parseInt(startMin) > 59 || endHour > 23 || parseInt(endMin) > 59) {
      return null;
    }

    // Validate that start time is before end time
    const startTotal = startHour * 60 + parseInt(startMin);
    const endTotal = endHour * 60 + parseInt(endMin);
    if (startTotal >= endTotal) {
      return null;
    }

    const startTime = `${String(startHour).padStart(2, '0')}:${startMin}`;
    const endTime = `${String(endHour).padStart(2, '0')}:${endMin}`;

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

    // Validate times
    if (startHour > 23 || parseInt(startMin) > 59 || endHour > 23 || parseInt(endMin) > 59) {
      return null;
    }

    // Validate that start time is before end time
    const startTotal = startHour * 60 + parseInt(startMin);
    const endTotal = endHour * 60 + parseInt(endMin);
    if (startTotal >= endTotal) {
      return null;
    }

    const startTime = `${String(startHour).padStart(2, '0')}:${startMin}`;
    const endTime = `${String(endHour).padStart(2, '0')}:${endMin}`;

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

/**
 * Strategy: Grid/Table Parsing
 * Handles standard grid timetables where the first row has times and subsequent rows have days.
 */
function parseGridTimetable(text: string): TimetableClass[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const classes: TimetableClass[] = [];

  // 1. Detect Time Headers
  // Look for a line containing multiple time ranges (e.g., "09.00-09.50 09.55-10.45")
  const timeSlots: { start: string, end: string, originalIndex: number }[] = [];
  let headerLineIndex = -1;

  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i];
    // Regex for various time formats found in Indian colleges:
    // 1. "09.00-09.50" (Standard)
    // 2. "9 am - 10 am" (No minutes, text suffix)
    // 3. "8.00 AM to 8.55 AM" ('to' separator)
    // 4. "10:00-10:40 AM" (Colon)
    const timeRegex = /(\d{1,2})(?:[:.](\d{2}))?\s*(?:[aApP][mM])?\s*(?:-|–|to)\s*(\d{1,2})(?:[:.](\d{2}))?\s*(?:[aApP][mM])?/g;
    
    // We look for at least 3 occurrences to be sure it's a header
    const timeMatches = [...line.matchAll(timeRegex)];
    
    if (timeMatches.length >= 3) {
      headerLineIndex = i;
      timeMatches.forEach((match, index) => {
        // Extract start time
        const startHour = parseInt(match[1]);
        const startMin = match[2] || "00";
        
        // Extract end time
        const endHour = parseInt(match[3]);
        const endMin = match[4] || "00";

        // Simple AM/PM logic inference if needed (basic normalization)
        // If 9-10, assume AM. If 1-2, assume PM.
        // For now, return as-is digits formatted, logic below cleans it up.
        
        timeSlots.push({
          start: `${String(startHour).padStart(2, '0')}:${startMin}`,
          end: `${String(endHour).padStart(2, '0')}:${endMin}`,
          originalIndex: index
        });
      });
      break;
    }
  }

  if (timeSlots.length === 0) return [];

  if (process.env.NODE_ENV !== "production") {
    console.log("Detected Grid Header with slots:", timeSlots.length);
  }

  const dayMap: { [key: string]: number } = {
    'mon': 1, 'monday': 1,
    'tue': 2, 'tuesday': 2,
    'wed': 3, 'wednesday': 3,
    'thu': 4, 'thursday': 4,
    'fri': 5, 'friday': 5,
    'sat': 6, 'saturday': 6,
    'sun': 0, 'sunday': 0
  };

  // 2. Parse Rows
  for (let i = headerLineIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect Day
    const dayMatch = line.toLowerCase().match(/\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*\b/);
    if (!dayMatch) continue;
    
    const dayName = dayMatch[1].substring(0, 3); // normalized key
    const dayOfWeek = dayMap[dayName];
    if (dayOfWeek === undefined) continue;

    // Split line by pipe "|" or mostly spaces if pipe is missing, but pipe is common in OCR tables
    // The user's OCR sample showed "09.00 11.45 | 12.40..." and "meron | 05..."
    
    // Naive column extraction: split by common delimiters
    // WARNING: OCR often loses vertical bars. We might rely on token position if we had bounding boxes, 
    // but with raw text, we try to split by "|" or roughly equal chunks if possible.
    // Given the noise, let's try splitting by "|" first.
    const columns = line.split(/[|\[\]]+/).map(c => c.trim()).filter(c => c.length > 0);
    
    // Remove the day name from the first column if present
    if (columns.length > 0 && columns[0].toLowerCase().includes(dayName)) {
      columns.shift();
    }

    // Map content to time slots
    // If we have N time slots and M columns, mapping is fuzzy.
    // Assuming 1-to-1 mapping if counts match roughly.
    
    const maxCols = Math.min(columns.length, timeSlots.length);
    
    for (let c = 0; c < maxCols; c++) {
      const content = columns[c];
      // Skip empty or noise
      if (!content || content.length < 2 || /^\W+$/.test(content)) continue;
      
      const slot = timeSlots[c];
      
      // Clean content
      const subjectName = content.replace(/[^a-zA-Z0-9\s]/g, '').trim();
      
      if (subjectName.length > 1 && !/^\d+$/.test(subjectName)) {
         classes.push({
           day_of_week: dayOfWeek,
           start_time: slot.start,
           end_time: slot.end,
           subject_name: subjectName,
           subject_code: '', // Grid usually implies Subject Name
           room_number: null
         });
      }
    }
  }

  return classes;
}

/**
 * Strategy: Generic Row Parsing (Fallback)
 * Ignores headers, just looks for "DayName ... ... ..." rows.
 * Assigns synthetic hourly slots (Period 1 = 09:00, Period 2 = 10:00, etc.)
 */
function parseGenericRows(text: string): TimetableClass[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const classes: TimetableClass[] = [];

  const dayMap: { [key: string]: number } = {
    'mon': 1, 'monday': 1,
    'tue': 2, 'tuesday': 2,
    'wed': 3, 'wednesday': 3,
    'thu': 4, 'thursday': 4,
    'fri': 5, 'friday': 5,
    'sat': 6, 'saturday': 6,
    'sun': 0, 'sunday': 0
  };

  for (const line of lines) {
    // Detect Day at start of line
    const dayMatch = line.toLowerCase().match(/^[^a-z0-9]*\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*\b/i);
    if (!dayMatch) continue;

    const dayName = dayMatch[1].substring(0, 3).toLowerCase();
    const dayOfWeek = dayMap[dayName];
    if (dayOfWeek === undefined) continue;

    // Remove day name
    // Use substring safely
    const matchIndex = line.toLowerCase().indexOf(dayName);
    const cleanLine = line.substring(matchIndex + dayName.length).trim();
    
    // Split by delimiters that suggest columns: 
    // - Pipes (|)
    // - Multiple spaces (  )
    // - Tab chars
    let rawCols = cleanLine.split(/\||\t|\s{2,}/).map(c => c.trim()).filter(c => c.length > 0);
    
    // Fallback: If we only got 1 chunk, maybe it's just space-separated (bad OCR)
    // e.g. "m A eo] C219" -> "m", "A", "eo]", "C219"
    if (rawCols.length <= 1 && cleanLine.includes(' ')) {
      const spaceSplit = cleanLine.split(/\s+/).filter(c => c.trim().length > 0);
      
      // Heuristic: If we have multiple space-separated chunks and they look "code-like" (short), accept them
      // Heuristic: If we have multiple space-separated chunks and they look "code-like" (short), accept them
      // OR if we simply have enough chunks to look like a schedule row (> 3)
      // const meaningfulChunks = spaceSplit.filter(c => c.length > 1 || /^[A-Z]$/.test(c));
      
      if (spaceSplit.length >= 2) {
        rawCols = spaceSplit;
      }
    }
    
    // Assign 1-hour slots starting from 09:00
    // This is an assumption, but better than extracting nothing
    rawCols.forEach((subjectName, index) => {
       // Filter noise
       if (subjectName.length < 1 || /^\W+$/.test(subjectName)) return;
       // Skip simple numbers often found in OCR noise (like 1, 2, 3 from period row)
       if (/^\d{1,2}$/.test(subjectName)) return;
       
       const startHour = 9 + index;
       const endHour = startHour + 1;
       
       const startTime = `${String(startHour).padStart(2, '0')}:00`;
       const endTime = `${String(endHour).padStart(2, '0')}:00`;

       classes.push({
         day_of_week: dayOfWeek,
         start_time: startTime,
         end_time: endTime,
         subject_name: subjectName,
         subject_code: '', // Inferred
         room_number: null
       });
    });
  }
  
  return classes;
}
