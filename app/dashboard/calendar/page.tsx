"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect } from "react";
import { fetchSubscriptionStatus, SubscriptionStatus } from "@/lib/subscription";
import UpgradeDialog from "@/components/subscription/UpgradeDialog";
import CalendarView from "@/components/calendar/CalendarView";
import TodaySchedule from "@/components/calendar/TodaySchedule";
import { CalendarEvent } from "@/lib/types";

export default function CalendarPage() {
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEvent[]>([]);
  
  const isProUser = subscriptionStatus?.isProUser ?? false;

  useEffect(() => {
    const loadSubscription = async () => {
      const status = await fetchSubscriptionStatus();
      setSubscriptionStatus(status);
    };
    loadSubscription();
  }, []);

  const handleDateSelect = (date: Date, events: CalendarEvent[]) => {
      setSelectedDate(date);
      setSelectedDayEvents(events);
  };

  // FREE TIER
  if (subscriptionStatus && !isProUser) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full bg-gradient-to-br from-yellow-50 to-orange-50 border-4 border-black rounded-3xl shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
          <CardContent className="pt-12 pb-12 text-center space-y-6">
            <div className="flex justify-center">
              <div className="bg-white p-6 rounded-full border-4 border-black">
                <CalendarIcon className="h-16 w-16 text-orange-600" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-4 py-2 rounded-full font-bold text-sm border-2 border-black mb-4">
                <Sparkles className="h-4 w-4" />
                PRO FEATURE
              </div>
              <h2 className="text-4xl font-display font-black text-black">
                Calendar View
              </h2>
              <p className="text-gray-700 font-medium text-lg max-w-md mx-auto">
                Upgrade to Pro to unlock the calendar view with attendance predictions and class scheduling
              </p>
            </div>

            <Button 
              size="lg" 
              onClick={() => setIsUpgradeDialogOpen(true)}
              className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-black font-bold text-lg rounded-xl border-2 border-black px-8"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Upgrade to Pro
            </Button>
          </CardContent>
        </Card>

        <UpgradeDialog
          open={isUpgradeDialogOpen}
          onOpenChange={setIsUpgradeDialogOpen}
          feature="Calendar View"
        />
      </div>
    );
  }

  // PRO TIER
  return (
    <div className="p-6 h-[calc(100vh-4rem)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-display font-black flex items-center gap-2">
          <CalendarIcon className="h-8 w-8" />
          Calendar
        </h1>
        <p className="text-gray-600 font-medium">Manage your schedule and track important dates</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 h-full overflow-hidden">
        {/* Main Calendar Area */}
        <div className="flex-1 h-full overflow-hidden">
            <CalendarView onDateSelect={handleDateSelect} selectedDate={selectedDate} />
        </div>

        {/* Side Panel - Today's Schedule */}
        <div className="w-full lg:w-96 flex-shrink-0 h-full">
            <TodaySchedule selectedDate={selectedDate} events={selectedDayEvents} />
        </div>
      </div>
    </div>
  );
}
