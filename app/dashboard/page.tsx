"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, Plus, Sparkles, Info } from "lucide-react";
import StatsGrid from "@/components/dashboard/StatsGrid";
import AttendanceCard from "@/components/attendance/AttendanceCard";
import { Subject } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { fetchSubscriptionStatus, UPGRADE_MESSAGES, SubscriptionStatus } from "@/lib/subscription";
import UpgradeDialog from "@/components/subscription/UpgradeDialog";
import { RealtimeChannel } from "@supabase/supabase-js";
import { SectionErrorBoundary } from "@/components/dashboard/SectionErrorBoundary";
import dynamic from "next/dynamic";
import type { ScannedSubject } from "@/components/scan/ResultsDialog";

const ScanUploader = dynamic(() => import("@/components/scan/ScanUploader"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center p-12">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm mt-4 text-muted-foreground animate-pulse">Loading AI Scanner...</p>
    </div>
  ),
});

const loadingFallback = () => (
  <div className="flex justify-center p-8" role="status" aria-live="polite">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
    <span className="sr-only">Loading dialog content...</span>
  </div>
);

const ResultsDialog = dynamic(() => import("@/components/scan/ResultsDialog"), { 
  ssr: false,
  loading: loadingFallback,
});
const ManualSubjectDialog = dynamic(() => import("@/components/dashboard/ManualSubjectDialog"), { 
  ssr: false,
  loading: loadingFallback,
});

export default function DashboardPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTimeout, setIsTimeout] = useState(false);
  
  // Subscription Status
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const subjectLimit = subscriptionStatus?.subjectLimit ?? 4;
  const canUseAIScan = subscriptionStatus?.canUseAIScan ?? false;

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const loadSubscription = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;
      
      // SELF-HEALING: Trigger reconciliation on mount to catch any missed activations
      fetch("/api/subscription/reconcile", { method: "POST" })
        .then(async (res) => {
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.message || data.error || "Reconciliation failed");
          }
          return res.json();
        })
        .then(data => {
          if (data.reconciled) {
            console.log("[Dashboard] Subscription reconciled, refreshing status...");
            loadSubscription(); // Re-run to get fresh Pro status
          }
        })
        .catch(err => console.error("Reconciliation trigger failed:", err));
      
      const status = await fetchSubscriptionStatus(user.id, supabase);
      if (status) {
        setSubscriptionStatus(status);
      } else {
        console.error("Failed to fetch subscription status, keeping current or null state");
      }
    };
    loadSubscription();
  }, [supabase]);
  
  // Scan States
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [scanResults, setScanResults] = useState<ScannedSubject[]>([]);
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  
  // Manual Entry State
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [subjectToEdit, setSubjectToEdit] = useState<Subject | null>(null);
  
  // Delete State
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Upgrade Dialog State
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<string>("");
  const [upgradeMessage, setUpgradeMessage] = useState<string>("");

  const fetchSubjects = useCallback(async (signalOrEvent?: AbortSignal | unknown) => {
    const externalSignal = signalOrEvent instanceof AbortSignal ? signalOrEvent : undefined;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 25000); // hard 25s deadline as requested by bot

    const signal = controller.signal;

    // Link external signal to our controller
    if (externalSignal) {
      if (externalSignal.aborted) controller.abort();
      externalSignal.addEventListener('abort', () => controller.abort());
    }

    try {
      setLoading(true);
      setIsTimeout(false);

      // Use getSession for faster client-side check since Layout already verified auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        return;
      }

      const query = supabase
        .from('subjects')
        .select('*')
        .eq('user_id', session.user.id)
        .abortSignal(signal);


      const { data, error } = await query;

      // If our internal timeout triggered
      if (signal.aborted && !externalSignal?.aborted) {
        const timeoutErr = new Error("TimeoutError");
        timeoutErr.name = "TimeoutError";
        throw timeoutErr;
      }

      // If the request was aborted by external signal, stop here
      if (externalSignal?.aborted) return;

      if (error) throw error;
      
      const mapped = (data || []).map((sub: { id: string; name: string; code?: string; type: string; total_hours: number; hours_present: number; threshold: number }) => ({
        id: sub.id,
        name: sub.name,
        code: sub.code,
        type: sub.type as import("@/lib/types").SubjectType, 
        totalHours: sub.total_hours,
        hoursPresent: sub.hours_present,
        threshold: sub.threshold
      }));

      setSubjects(mapped);

    } catch (error: unknown) {
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
        console.log("Fetch subjects aborted");
        return;
      }
      
      console.error("Error fetching subjects:", error);
      
      if (error instanceof Error && (error.message.toLowerCase().includes("time") || error.name === 'TimeoutError')) {
        setIsTimeout(true);
        toast.error("Connection timed out. Please try again.");
      } else {
        toast.error("Failed to load dashboard data");
      }
    } finally {
      clearTimeout(timeoutId);
      if (!signal.aborted || (signal.aborted && !externalSignal?.aborted)) {
        setLoading(false);
      }
    }
  }, [supabase]);

  useEffect(() => {
    const controller = new AbortController();
    fetchSubjects(controller.signal);
    return () => {
      controller.abort();
    };
  }, [fetchSubjects]);

  // Real-time Sync
  useEffect(() => {
    let channel: RealtimeChannel;

    const setupRealtime = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      channel = supabase
        .channel('subjects-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'subjects',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            // Refetch subjects when any change occurs
            fetchSubjects();
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase, fetchSubjects]);

  const handleManualAdd = () => {
    // Check subject limit
    if (subjects.length >= subjectLimit) {
      setUpgradeFeature("Unlimited Subjects");
      setUpgradeMessage(UPGRADE_MESSAGES.SUBJECT_LIMIT);
      setIsUpgradeDialogOpen(true);
      return;
    }
    
    setEditMode(false);
    setSubjectToEdit(null);
    setIsManualOpen(true);
  };

  const handleScanClick = () => {
    // Check if user can use AI scan
    if (!canUseAIScan) {
      setUpgradeFeature("AI Scan");
      setUpgradeMessage(UPGRADE_MESSAGES.AI_SCAN);
      setIsUpgradeDialogOpen(true);
      return;
    }
    
    setIsScanOpen(true);
  };

  const handleScanComplete = (results: ScannedSubject[]) => {
    setScanResults(results);
    setIsScanOpen(false);
    setIsResultsOpen(true);
  };

  const handleSaved = (newSubjectData?: Record<string, unknown>) => {
    if (newSubjectData) {
      // Map DB response to UI model
      const mappedSubject: Subject = {
        id: String(newSubjectData.id),
        name: String(newSubjectData.name),
        code: newSubjectData.code ? String(newSubjectData.code) : undefined,
        type: String(newSubjectData.type) as import("@/lib/types").SubjectType,
        totalHours: Number(newSubjectData.total_hours),
        hoursPresent: Number(newSubjectData.hours_present),
        threshold: Number(newSubjectData.threshold)
      };

      setSubjects(prev => {
        if (editMode && subjectToEdit) {
           return prev.map(s => s.id === mappedSubject.id ? mappedSubject : s);
        } else {
           return [...prev, mappedSubject];
        }
      });
    } else {
      // Fallback if no data returned (should shouldn't happen with new actions)
      fetchSubjects();
    }
    
    setEditMode(false);
    setSubjectToEdit(null);
  };

  const handleEdit = (subject: Subject) => {
    setSubjectToEdit(subject);
    setEditMode(true);
    setIsManualOpen(true);
  };

  const handleDelete = (subject: Subject) => {
    setSubjectToDelete(subject);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!subjectToDelete) return;
    
    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', subjectToDelete.id);

      if (error) throw error;

      toast.success("Subject deleted successfully");
      fetchSubjects();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete subject");
    } finally {
      setIsDeleteDialogOpen(false);
      setSubjectToDelete(null);
    }
  };

  const handleUpdateAttendance = useCallback(async (subjectId: string, type: 'present' | 'total') => {
    try {
      // Find the subject
      const subject = subjects.find(s => s.id === subjectId);
      if (!subject) return;

      // Calculate new values
      const newPresent = type === 'present' ? subject.hoursPresent + 1 : subject.hoursPresent;
      const newTotal = subject.totalHours + 1;

      // Update in database
      const { error } = await supabase
        .from('subjects')
        .update({
          hours_present: newPresent,
          total_hours: newTotal
        })
        .eq('id', subjectId);

      if (error) throw error;

      // Calculate new percentage
      const newPercentage = (newPresent / newTotal) * 100;

      // Show success message
      if (type === 'present') {
        toast.success(`Marked present! New attendance: ${newPercentage.toFixed(1)}%`);
      } else {
        toast.success(`Class added! New attendance: ${newPercentage.toFixed(1)}%`);
      }

      // Refresh subjects
      fetchSubjects();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update attendance");
    }
  }, [subjects, supabase, fetchSubjects]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 py-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-display font-black tracking-tight text-black">
            Hey there! 👋
          </h1>
          <p className="text-gray-600 text-lg font-medium">
            Your bunking dashboard is ready.
          </p>
          {/* Subject Count Indicator */}
          <div className="mt-2 inline-flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full border-2 border-gray-300">
                <h3 className="font-display font-black text-lg text-black">
                  {subjects.length} / {subscriptionStatus?.isProUser ? '∞' : subjectLimit} subjects
                </h3>
            {subjects.length >= subjectLimit && isFinite(subjectLimit) && (
              <span className="text-xs bg-yellow-400 text-black px-2 py-0.5 rounded-full font-bold">
                LIMIT REACHED
              </span>
            )}
          </div>
        </div>
        <div className="hidden md:flex gap-2">
          <Button onClick={handleManualAdd}>
            <Plus className="mr-2 h-4 w-4" /> Add Subject
          </Button>
          <Button 
            variant="secondary" 
            onClick={handleScanClick}
            className="relative"
          >
            <Camera className="mr-2 h-4 w-4" /> 
            {canUseAIScan ? 'Upload Screenshots' : 'AI Scan'}
            {!canUseAIScan && (
              <span className="ml-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-2 py-0.5 rounded-full text-xs font-bold">
                PRO
              </span>
            )}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading your dashboard...</p>
        </div>
      ) : isTimeout ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-xl font-bold text-black">Connection Request Timed Out</h2>
          <p className="text-gray-600 max-w-sm">
            It&apos;s taking longer than expected to load your subjects. This might be due to a slow connection.
          </p>
          <Button onClick={fetchSubjects} size="lg">
            Retry Loading
          </Button>
        </div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-2xl font-display font-black text-black">No subjects yet</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Get started by adding your first subject manually or upload a screenshot of your attendance portal
          </p>
          <div className="flex gap-3 justify-center pt-4">
            <Button onClick={handleManualAdd} size="lg">
              <Plus className="mr-2 h-5 w-5" /> Add Subject Manually
            </Button>
            <Button variant="secondary" size="lg" onClick={handleScanClick}>
              <Camera className="mr-2 h-5 w-5" /> 
              {canUseAIScan ? 'Upload Screenshots' : 'Try AI Scan'}
              {!canUseAIScan && (
                <Sparkles className="ml-2 h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      ) : (

        <>
          {/* Stats Overview */}
          <div className="bg-blue-50 border-2 border-black rounded-xl p-4 flex items-start md:items-center gap-3 mb-6">
            <Info className="h-5 w-5 text-black shrink-0 mt-0.5 md:mt-0" />
            <p className="text-sm font-medium text-gray-700">
              <span className="font-bold text-black">Pro Tip: </span> Update your attendance regularly to get accurate bunk suggestions.
            </p>
          </div>
          <StatsGrid subjects={subjects} />

          {/* Subjects Grid */}
          <div className="space-y-4">
             <div className="flex justify-between items-center md:hidden">
               <h2 className="text-xl font-semibold tracking-tight">Your Subjects</h2>
               <Button size="sm" variant="ghost" onClick={handleManualAdd}>
                 <Plus className="h-4 w-4 mr-1" /> Add
               </Button>
             </div>
             <h2 className="hidden md:block text-xl font-semibold tracking-tight">Your Subjects</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {subjects.map((subject) => (
                 <AttendanceCard key={subject.id} subject={subject} onEdit={handleEdit} onDelete={handleDelete} onUpdateAttendance={handleUpdateAttendance} />
              ))}
            </div>
          </div>
        </>
      )}

      {/* Manual Subject Dialog */}
      <ManualSubjectDialog
        open={isManualOpen}
        onOpenChange={setIsManualOpen}
        onSaved={handleSaved}
        editMode={editMode}
        subjectToEdit={subjectToEdit}
      />

      {/* Scan Results Dialog */}
      <ResultsDialog
        open={isResultsOpen}
        onOpenChange={setIsResultsOpen}
        results={scanResults}
        onSaved={fetchSubjects}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white border-4 border-black rounded-3xl shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
          <DialogHeader className="border-b-2 border-black pb-4">
            <DialogTitle className="text-2xl font-display font-black text-black flex items-center gap-2">
              <span className="text-3xl">🗑️</span> Delete Subject?
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700 font-medium">
              Are you sure you want to delete <strong className="text-black">{subjectToDelete?.name}</strong>? This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-3 justify-end border-t-2 border-black pt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="font-display font-bold rounded-xl border-2 border-black hover:bg-gray-100"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              className="font-display font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white border-2 border-black"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade Dialog */}
      <UpgradeDialog
        open={isUpgradeDialogOpen}
        onOpenChange={setIsUpgradeDialogOpen}
        feature={upgradeFeature}
        message={upgradeMessage}
      />

      {/* Scan Upload Dialog (for Pro users) */}
      <Dialog open={isScanOpen} onOpenChange={setIsScanOpen}>
        <DialogContent className="sm:max-w-[600px] bg-white border-4 border-black rounded-3xl shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display font-black text-black flex items-center gap-2">
              <span className="text-3xl">📸</span> Upload Screenshots
            </DialogTitle>
          </DialogHeader>
          <SectionErrorBoundary sectionName="AI Scanner">
            <ScanUploader onScanComplete={handleScanComplete} onCancel={() => setIsScanOpen(false)} />
          </SectionErrorBoundary>
        </DialogContent>
      </Dialog>

      {/* Mobile FAB (Scan) */}
      <div className="md:hidden fixed bottom-20 right-4 z-50">
        <Button 
          size="icon" 
          className="h-14 w-14 rounded-full shadow-lg shadow-blue-500/20"
          onClick={handleScanClick}
        >
          <Camera className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
