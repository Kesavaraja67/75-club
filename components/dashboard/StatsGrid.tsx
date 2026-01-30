"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Subject } from "@/lib/types";

interface StatsGridProps {
  subjects: Subject[];
}

export default function StatsGrid({ subjects }: StatsGridProps) {
  // Calculations
  const totalClasses = subjects.reduce((acc, sub) => acc + sub.totalHours, 0);
  const totalPresent = subjects.reduce((acc, sub) => acc + sub.hoursPresent, 0);
  const overallPercentage = totalClasses > 0 ? (totalPresent / totalClasses) * 100 : 0;
  
  const atRisk = subjects.filter(sub => {
    if (sub.totalHours === 0) return false;
    const pct = (sub.hoursPresent / sub.totalHours) * 100;
    return pct < sub.threshold;
  }).length;

  const safeToBunk = subjects.filter(sub => {
    if (sub.totalHours === 0) return false;
    const pct = (sub.hoursPresent / sub.totalHours) * 100;
    const bunkLimit = Math.floor((sub.hoursPresent * 100 - sub.threshold * sub.totalHours) / sub.threshold);
    return pct >= sub.threshold && bunkLimit > 0;
  }).length;

  const stats = [
    {
      title: "Bunk Budget 💰",
      value: safeToBunk,
      desc: "Subjects safe to skip",
    },
    {
      title: "Danger Zone 🚨",
      value: atRisk,
      desc: "Need attention ASAP",
    },
    {
      title: "Overall Vibe ✨",
      value: `${overallPercentage.toFixed(0)}%`,
      desc: "Average Attendance",
    },
    {
      title: "Total Classes 📚",
      value: totalClasses,
      desc: "Conducted so far",
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="border-4 border-black rounded-3xl bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-md font-display font-bold text-black">
              {stat.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-display font-black text-black">{stat.value}</div>
            <p className="text-sm font-medium text-gray-600 mt-1">
              {stat.desc}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
