"use client";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Subject } from "@/lib/types";
import { motion } from "framer-motion";
import { Pencil, Trash2 } from "lucide-react";

interface AttendanceCardProps {
  subject: Subject;
  onEdit?: (subject: Subject) => void;
  onDelete?: (subject: Subject) => void;
  onUpdateAttendance?: (subjectId: string, type: 'present' | 'total') => void;
}

function calculateValues(subject: Subject) {
  const percentage = (subject.hoursPresent / subject.totalHours) * 100;
  const t = subject.threshold;
  const p = subject.hoursPresent;
  const T = subject.totalHours;

  let bunkLimit = 0;
  let required = 0;

  if (percentage >= t) {
    // Safe: How many can I bunk?
    // Formula: floor((Present - (Threshold * Total)) / Threshold)
    // Actually easier: standard formula for "how many classes can I miss and stay above X" requires knowing future classes.
    // Simplified "Process" logic for MVP:
    // If I miss next N classes, will I drop below?
    // Let's use the provided prompts logic:
    // Bunk Limit = floor((Attended - (Threshold × Total)) / Threshold)
    // Note: This formula assumes we are "converting" attended classes to missed classes which isn't quite right physically,
    // but the standard "Margin of Safety" formula is:
    // M = (P / Threshold) - T 
    // Let's stick to the prompt's suggested or a robust derived one:
    // Max Bunks = floor((Present * 100 - Threshold * Total) / Threshold) 
    bunkLimit = Math.floor((p * 100 - t * T) / t);
  } else {
    // Danger: How many need to attend?
    // Required = ceil((Threshold * Total - Attended) / (1 - Threshold))
    // Actually: ceil((Threshold * (Total + x) - Present - x) ... wait.
    // Standard recovery formula: x = (Threshold * Total - Present * 100) / (100 - Threshold)
    required = Math.ceil((t * T - p * 100) / (100 - t));
  }
  
  return { percentage, bunkLimit, required };
}

export default function AttendanceCard({ subject, onEdit, onDelete, onUpdateAttendance }: AttendanceCardProps) {
  const { percentage, bunkLimit, required } = calculateValues(subject);
  
  // Status Logic
  const isSafe = percentage >= subject.threshold;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, type: "spring" }}
      className="h-full"
    >
      <Card className="relative overflow-hidden border-4 border-black rounded-3xl h-full flex flex-col justify-between bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 hover:-translate-y-1">
        <CardHeader className="flex flex-row items-start justify-between pb-2 space-y-0">
          <div className="space-y-1 flex-1">
            <Badge variant="secondary" className="mb-1 rounded-full px-3 py-1 text-xs font-bold bg-black text-white uppercase tracking-wider">
              {subject.code || "SUB-00"}
            </Badge>
            <CardTitle className="text-xl font-display font-bold leading-tight line-clamp-2 text-black" title={subject.name}>
              {subject.name}
            </CardTitle>
          </div>
          <div className="flex items-center gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full hover:bg-gray-100"
                onClick={() => onEdit(subject)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full hover:bg-red-100 hover:text-red-600"
                onClick={() => onDelete(subject)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <div className="text-2xl ml-1">
              {subject.type === 'Lab' ? '🧪' : subject.type === 'Practical' ? '🛠️' : '📚'}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
               <div>
                  <div className="text-4xl font-display font-black tracking-tight text-black">
                    {percentage.toFixed(0)}<span className="text-xl text-gray-500">%</span>
                  </div>
                  <div className="text-sm font-medium text-gray-600 mt-1">
                    {subject.hoursPresent} / {subject.totalHours} classes
                  </div>
               </div>
               
               {/* Ring Progress */}
               <div className="relative">
                 <svg className="transform -rotate-90 w-16 h-16">
                   <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-200" />
                   <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={2 * Math.PI * 28} strokeDashoffset={2 * Math.PI * 28 * (1 - percentage/100)} strokeLinecap="round" className="text-black" />
                 </svg>
               </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-4 pb-4">
          {/* Status Message */}
          <div className="w-full py-2 px-3 rounded-xl border-2 border-black font-display font-medium text-center bg-white">
            {isSafe ? (
              <div className="flex items-center gap-2 justify-center text-black">
                <span className="text-lg">😎</span>
                <span>Bunk <strong>{bunkLimit}</strong> more!</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 justify-center text-black">
                <span className="text-lg">⚠️</span>
                <span>Attend <strong>{required}</strong> now!</span>
              </div>
            )}
          </div>
          
          {/* Quick Action Buttons */}
          {onUpdateAttendance && (
            <div className="flex gap-2 w-full">
              <Button
                size="sm"
                onClick={() => onUpdateAttendance(subject.id, 'present')}
                className="flex-1 bg-black hover:bg-gray-800 text-white font-display font-bold rounded-xl border-2 border-black h-9 text-[11px] px-1.5"
              >
                ✅ Present
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUpdateAttendance(subject.id, 'total')}
                className="flex-1 font-display font-bold rounded-xl border-2 border-black hover:bg-gray-100 h-9 text-[11px] px-1.5"
              >
                ➕ Class
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
}
