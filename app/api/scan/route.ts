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
        { error: "AI Scan is a Pro feature. Please upgrade to access." },
        { status: 403 }
      );
    }

    // Rate Limit: 5 scans per minute per user
    const { success, reset } = await rateLimit(`scan:${user.id}`, 5, 60 * 1000);
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

    const MAX_OCR_CHARS = 50_000;
    if (text.length > MAX_OCR_CHARS) {
      return NextResponse.json(
        { error: "Text payload too large" },
        { status: 413 }
      );
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("=== RECEIVED OCR TEXT ===");
      // console.log(text); // Uncomment for full debug
      console.log("=========================");
    }

    // Parse the OCR text to extract subjects
    const subjects = parseAttendanceTable(text);

    if (process.env.NODE_ENV !== "production") {
      console.log("=== EXTRACTED SUBJECTS ===");
      console.log(JSON.stringify(subjects, null, 2));
      console.log("=========================");
    }

    if (subjects.length === 0) {
      return NextResponse.json({ 
        error: "No valid subjects found. Please ensure the image is clear and contains an attendance table." 
      }, { status: 400 });
    }

    return NextResponse.json({ data: subjects });

  } catch (error) {
    console.error("Parsing Error:", error);
    return NextResponse.json({ error: "Failed to process text" }, { status: 500 });
  }
}

/**
 * Universal interface for Subject Data
 */
interface SubjectData {
  name: string;
  code: string;
  total_hours: number;
  hours_present: number;
  type: string;
}

/**
 * Enhanced parser specifically optimized for SRM portal and similar formats
 * Handles table rows with multiple columns separated by spaces/tabs
 */
function parseAttendanceTable(text: string) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const subjects: SubjectData[] = [];

  if (process.env.NODE_ENV !== "production") {
    console.log("Parsing lines:", lines.length);
  }

  // Clean up the text first - remove timestamps and common noise
  const cleanedLines = lines.map(line => {
    // Remove timestamps like "Tue 27-jan-2026 23:43:24"
    return line.replace(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+\d{1,2}-\w{3}-\d{4}\s+\d{2}:\d{2}:\d{2}\b/gi, '').trim();
  }).filter(l => l.length > 0);

  // Try to find patterns that indicate attendance data
  for (let i = 0; i < cleanedLines.length; i++) {
    const line = cleanedLines[i];

    // Skip empty lines or very short lines
    if (!line || line.length < 5) continue;

    // Try multiple parsing strategies in order of specificity
    const subject = 
      tryParseSRMFormat(line) ||
      tryParseTableRow(line) ||
      tryParseWithNumbers(line) ||
      tryParseWithPercentage(line);

    if (subject && isSubjectNameValid(subject.name)) {
      subjects.push(subject);
    }
  }

  return subjects;
}

/**
 * Strategy 0: Parse SRM portal specific format
 * Format: CODE DESCRIPTION MAX_HOURS ATT_HOURS ABSENT_HOURS PERCENTAGE
 * Example: "21CSC303J SOFTWARE ENGINEERING AND PROJECT MANAGEMENT 12 11 1 91.67"
 */
function tryParseSRMFormat(line: string): SubjectData | null {
  // Look for course code pattern at the start: 2 digits + 2-4 letters + 3-4 digits + optional letter
  const codeMatch = line.match(/^(\d{2}[A-Z]{2,4}\d{3,4}[A-Z]?)\s+(.+)/i);
  
  if (codeMatch) {
    const code = codeMatch[1].toUpperCase();
    const rest = codeMatch[2].trim();
    
    // Extract numbers from the rest of the line
    const numbers = rest.match(/\b(\d+)\b/g);
    
    if (numbers && numbers.length >= 2) {
      const nums = numbers.map(n => parseInt(n));
      
      // Filter out unreasonably large numbers (likely not hours)
      const validNums = nums.filter(n => n <= 100);
      
      if (validNums.length >= 2) {
        // First number is usually total hours, second is attended
        const total = validNums[0];
        const present = validNums[1];
        
        // Extract subject name (everything before the first number)
        const nameMatch = rest.match(/^(.+?)\s+\d+/);
        const name = nameMatch ? nameMatch[1].trim() : rest.split(/\s+\d+/)[0].trim();
        
        if (name.length > 2 && total > 0) {
          return {
            name: cleanSubjectName(name),
            code: code,
            total_hours: total,
            hours_present: present,
            type: "Theory"
          };
        }
      }
    }
  }
  
  return null;
}

/**
 * Strategy 1: Look for lines with numbers (hours)
 * Example: "Mathematics 12 10 83.33"
 */
function tryParseWithNumbers(line: string): SubjectData | null {
  // Match: [text] [number] [number] [optional percentage]
  const match = line.match(/^(.+?)\s+(\d+)\s+(\d+)(?:\s+([\d.]+))?/);
  
  if (match) {
    const name = match[1].trim();
    const num1 = parseInt(match[2]);
    const num2 = parseInt(match[3]);
    
    // Trust input order: first number is total, second is present
    const total = num1;
    const present = num2;

    // Flag potential OCR errors where present > total
    if (present > total) {
      console.warn("OCR anomaly: present > total for line:", line);
      // We accept it anyway as raw data, or return null if strict
      // return null; 
    }

    // Skip if numbers are too large (likely not hours)
    if (total > 200 || present > 200) return null;

    // Skip header rows
    if (name.toLowerCase().includes('total') || 
        name.toLowerCase().includes('code') ||
        name.toLowerCase().includes('description')) {
      return null;
    }

    return {
      name: cleanSubjectName(name),
      code: extractCourseCode(name),
      total_hours: total,
      hours_present: present,
      type: "Theory"
    };
  }

  return null;
}

/**
 * Strategy 2: Look for lines with percentage
 * Example: "Physics 75.5%"
 */
function tryParseWithPercentage(line: string): SubjectData | null {
  const match = line.match(/^(.+?)\s+([\d.]+)%/);
  
  if (match) {
    const name = match[1].trim();
    const percentage = parseFloat(match[2]);

    // Skip header rows
    if (name.toLowerCase().includes('subject') || 
        name.toLowerCase().includes('average')) {
      return null;
    }

    // Note: These are synthetic values derived from percentage only
    const total = 100; // Placeholder - actual hours unknown
    const present = Math.round(percentage);

    return {
      name: cleanSubjectName(name),
      code: extractCourseCode(name),
      total_hours: total,
      hours_present: present,
      type: "Theory"
    };
  }

  return null;
}

/**
 * Strategy 3: Parse structured table rows
 * Example: "21CSE303J | SOFTWARE ENGINEERING | 12 | 11 | 91.67"
 */
function tryParseTableRow(line: string): SubjectData | null {
  // Split by common separators
  const parts = line.split(/[\|\t]+/).map(p => p.trim());

  if (parts.length >= 3) {
    // Try to find numbers in the parts
    const numbers = parts.map(p => {
      const num = parseInt(p);
      return isNaN(num) ? null : num;
    }).filter((n): n is number => n !== null && n < 200);

    if (numbers.length >= 2) {
      // Find the subject name (longest text part)
      const textParts = parts.filter(p => !/^\d+$/.test(p) && p.length > 2);
      const name = textParts.join(' ').trim();

      if (name.length > 2) {
        const total = Math.max(...numbers);
        const present = Math.min(...numbers);

        return {
          name: cleanSubjectName(name),
          code: extractCourseCode(name),
          total_hours: total,
          hours_present: present,
          type: "Theory"
        };
      }
    }
  }

  return null;
}

/**
 * Filter out invalid subject names that are likely menu items or noise
 */
function isSubjectNameValid(name: string): boolean {
  if (!name || name.length < 3) return false;

  const invalidTerms = [
    "dashboard", "fee", "payment", "personal", "details", "course", "list",
    "grade", "mark", "credit", "attendance", "exam", "revaluation",
    "provisional", "internal", "abc", "id", "hallticket",
    "photo", "degree", "scribe", "request", "logout", "cumulative",
    "average", "total"
  ];
  
  const lowerName = name.toLowerCase();
  
  // Check against invalid terms
  if (invalidTerms.some(term => lowerName.includes(term))) {
    return false;
  }
  
  // Check for starting with special chars (sidebar items often have icons like =, &, etc)
  if (/^[^a-zA-Z0-9]/.test(name)) {
    return false;
  }
  
  return true;
}

/**
 * Extract course code from text with improved handling of malformed codes
 */
function extractCourseCode(text: string): string {
  // First try standard format: 21CSE303J
  const standardMatch = text.match(/\b(\d{2}[A-Z]{2,4}\d{3,4}[A-Z]?)\b/i);
  if (standardMatch) {
    return standardMatch[1].toUpperCase();
  }
  
  // Try to fix malformed codes like "2imeo104t" -> "21ME0104T"
  const malformedMatch = text.match(/\b(\d[a-z]{2,4}\d{3,4}[a-z]?)\b/i);
  if (malformedMatch) {
    const code = malformedMatch[1];
    // Return as-is in uppercase; institution-specific prefix correction is unreliable
    return code.toUpperCase();
  }
  
  return "";
}

/**
 * Clean subject name (remove course codes, extra spaces, timestamps)
 */
function cleanSubjectName(name: string): string {
  // Remove course codes like "21CSE303J"
  let cleaned = name.replace(/\b\d{2}[A-Z]{2,4}\d{3,4}[A-Z]?\b/gi, '').trim();
  
  // Remove malformed codes like "2imeo104t"
  cleaned = cleaned.replace(/\b\d[a-z]{2,4}\d{3,4}[a-z]?\b/gi, '').trim();
  
  // Remove timestamps
  cleaned = cleaned.replace(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+\d{1,2}-\w{3}-\d{4}\s+\d{2}:\d{2}:\d{2}\b/gi, '').trim();
  
  // Remove lines starting with special chars
  cleaned = cleaned.replace(/^[^a-zA-Z0-9]+/, '').trim();
  
  // Remove extra spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // Capitalize properly (title case)
  if (cleaned.length > 0) {
    cleaned = cleaned.split(' ')
      .map(word => {
        // Keep acronyms uppercase (2-3 letter words in all caps)
        if (word.length <= 3 && word === word.toUpperCase()) {
          return word;
        }
        // Handle words like "AND", "OF", "IN" - keep lowercase unless first word
        const lowerWords = ['and', 'of', 'in', 'to', 'for', 'with', 'on'];
        if (lowerWords.includes(word.toLowerCase())) {
          return word.toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
    
    // Ensure first word is capitalized
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return cleaned || name;
}
