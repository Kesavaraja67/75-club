import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchSubscriptionStatus } from "@/lib/subscription";

export async function POST(request: NextRequest) {
  try {
    // 1. Verify authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Check if user is Pro
    const { isProUser } = await fetchSubscriptionStatus(user.id, supabase);
    if (!isProUser) {
      return NextResponse.json(
        { error: "AI Buddy is a Pro feature. Please upgrade to access." },
        { status: 403 }
      );
    }

    // 3. Get user's message from request
    const { message } = await request.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // 4. Fetch user's subjects and attendance data
    const { data: subjects, error: subjectsError } = await supabase
      .from("subjects")
      .select("*")
      .eq("user_id", user.id);

    if (subjectsError) {
      console.error("Error fetching subjects:", subjectsError);
      return NextResponse.json(
        { error: "Failed to fetch attendance data" },
        { status: 500 }
      );
    }

    // 5. Build context for AI with detailed calculations
    const subjectsContext = subjects && subjects.length > 0
      ? subjects.map(s => {
          const threshold = typeof s.threshold === "number" ? s.threshold : 75;
          const percentage = s.total_hours > 0 
            ? Math.round((s.hours_present / s.total_hours) * 100) 
            : 0;
          
          // Calculate how many classes can be safely bunked
          const canBunk = s.total_hours > 0
            ? Math.floor((s.hours_present * 100 - threshold * s.total_hours) / threshold)
            : 0;
          
          return {
            name: s.name,
            code: s.code,
            totalHours: s.total_hours,
            hoursPresent: s.hours_present,
            percentage,
            canSafelyBunk: Math.max(0, canBunk),
            status: percentage >= threshold ? 'safe' : 'danger'
          };
        })
      : [];

    const totalHours = subjects?.reduce((sum, s) => sum + s.total_hours, 0) ?? 0;
    const presentHours = subjects?.reduce((sum, s) => sum + s.hours_present, 0) ?? 0;
    
    const overallAttendance = totalHours > 0 
      ? Math.round((presentHours / totalHours) * 100)
      : 0;

    // 6. Fetch timetable data for today
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const istNow = new Date(now.getTime() + istOffset);
    const currentDay = istNow.getUTCDay(); // 0=Sunday, 1=Monday, etc.
    const currentTime = `${String(istNow.getUTCHours()).padStart(2, '0')}:${String(istNow.getUTCMinutes()).padStart(2, '0')}`;

    const { data: todayClasses } = await supabase
      .from("timetable_slots")
      .select(`
        *,
        subjects (name, code)
      `)
      .eq("user_id", user.id)
      .eq("day_of_week", currentDay)
      .order("start_time");

    const toMinutes = (time: string) => {
      const parts = time.split(":");
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      return h * 60 + m;
    };
    const currentMinutes = toMinutes(currentTime);

    const timetableContext = todayClasses && todayClasses.length > 0
      ? todayClasses.map(slot => {
          const startMinutes = toMinutes(slot.start_time);
          const endMinutes = toMinutes(slot.end_time);
          
          return {
            subject: slot.subjects?.name || "Unknown",
            code: slot.subjects?.code || "",
            startTime: slot.start_time,
            endTime: slot.end_time,
            room: slot.room_number || "N/A",
            isNow: currentMinutes >= startMinutes && currentMinutes <= endMinutes,
            isUpcoming: currentMinutes < startMinutes
          };
        })
      : [];

    // 7. Build enhanced system prompt with timetable data
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const systemPrompt = `You are the Bunk Planner AI Buddy - a friendly, casual assistant helping students make smart bunking decisions.

CURRENT CONTEXT:
- Date: ${istNow.toLocaleDateString('en-IN')}
- Day: ${dayNames[currentDay]}
- Time: ${currentTime} IST

TODAY'S SCHEDULE:
${timetableContext.length > 0 
  ? timetableContext.map(cls => 
      `- ${cls.subject} (${cls.code}): ${cls.startTime}-${cls.endTime}${cls.room !== 'N/A' ? ` | Room ${cls.room}` : ''}${cls.isNow ? ' [HAPPENING NOW]' : cls.isUpcoming ? ' [UPCOMING]' : ' [COMPLETED]'}`
    ).join('\n')
  : '- No classes scheduled for today'}

ATTENDANCE DATA:
Overall Attendance: ${overallAttendance}%

Subject-wise breakdown:
${subjectsContext.map(s => 
  `- ${s.name} (${s.code}): ${s.percentage}% (${s.hoursPresent}/${s.totalHours} classes)
   Status: ${s.status === 'safe' ? '✅ Safe' : '🚨 Danger'}
   Can safely bunk: ${s.canSafelyBunk} more classes`
).join('\n')}

YOUR RESPONSE RULES:
1. Keep responses SHORT (2-3 sentences max or bullet points)
2. Use actual subject names and specific calculations
3. If there's a class happening now or upcoming, mention it specifically
4. Use emojis: ✅ (safe), 🚨 (danger), 😎 (chill)
5. Be friendly and casual, like a college buddy
6. Give actionable advice based on BOTH attendance AND schedule

EXAMPLES:
- "Math is at 2 PM today. You're at 82% - safe to bunk! 😎"
- "🚨 Physics class in 30 mins! You're at 72% - attend this one!"
- "You can skip Database (78%) but MUST attend OS (74%) 🚨"

Now respond to the student's question using this context!`;


    // 7. Call Gemini API using REST API directly
    console.log("[AI Buddy] Calling Gemini API via REST");
    console.log("[AI Buddy] API Key present:", !!process.env.GEMINI_API_KEY);

    const apiKey = process.env.GEMINI_API_KEY;
    // Using gemini-2.5-flash (confirmed available with this API key)
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [{ text: systemPrompt }]
        },
        {
          role: "model",
          parts: [{ text: "Got it! I'm your Bunk Planner AI Buddy. I'll help you make smart bunking decisions based on your attendance data. What's up?" }]
        },
        {
          role: "user",
          parts: [{ text: message }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    console.log("[AI Buddy] Sending request to Gemini...");
    
    let response;
    try {
      response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[AI Buddy] API Error:", response.status, errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("[AI Buddy] Got response from Gemini");

    const aiMessage = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response.";

    // 8. Return AI response
    return NextResponse.json({
      message: aiMessage,
      context: {
        subjects: subjectsContext.length,
        overallAttendance,
      },
    });

  } catch (error: unknown) {
    console.error("AI Buddy error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error details:", errorMessage);
    return NextResponse.json(
      { error: "Failed to process your message. Please try again." },
      { status: 500 }
    );
  }
}
