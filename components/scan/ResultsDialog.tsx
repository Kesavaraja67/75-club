"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";

export interface ScannedSubject {
  name: string;
  code?: string;
  total_hours: number;
  hours_present: number;
  type: string;
}

interface ResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  results: ScannedSubject[];
  onSaved: () => void;
}

export default function ResultsDialog({ open, onOpenChange, results, onSaved }: ResultsDialogProps) {
  const [data, setData] = useState<ScannedSubject[]>(results);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setData(results);
  }, [results]);

  const handleUpdate = (index: number, field: keyof ScannedSubject, value: string | number) => {
    const newData = [...data];
    newData[index] = {
      ...newData[index],
      [field]: value
    };
    setData(newData);
  };

  const handleDelete = (index: number) => {
    const newData = data.filter((_, i) => i !== index);
    setData(newData);
  };

  const handleSave = async () => {
    if (data.length === 0) {
      toast.error("No subjects to save");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in");
        setSaving(false);
        return;
      }

      // Check for existing subjects
      const { data: existingSubjects, error: fetchError } = await supabase
        .from('subjects')
        .select('id, name, code')
        .eq('user_id', user.id);

      if (fetchError) {
        console.error("Error fetching existing subjects:", fetchError);
        toast.error("Failed to check existing subjects");
        setSaving(false);
        return;
      }

      // Find duplicates
      const duplicates: string[] = [];
      const newSubjects: ScannedSubject[] = [];

      data.forEach(scannedSub => {
        const isDuplicate = existingSubjects?.some(existing => 
          existing.name.toLowerCase() === scannedSub.name.toLowerCase() ||
          (existing.code && scannedSub.code && existing.code === scannedSub.code)
        );

        if (isDuplicate) {
          duplicates.push(scannedSub.name);
        } else {
          newSubjects.push(scannedSub);
        }
      });

      // If there are duplicates, warn the user
      if (duplicates.length > 0) {
        toast.warning(`${duplicates.length} subject(s) already exist`, {
          description: "These subjects are already in your dashboard. Only new subjects will be added.",
          duration: 5000,
        });
      }

        if (newSubjects.length === 0) {
        toast.info("All subjects already exist in your dashboard");
        setSaving(false);
        onOpenChange(false);
        return;
      }

      // Validation guard
      const invalid = newSubjects.find(sub => {
        const total = Number(sub.total_hours);
        const present = Number(sub.hours_present);
        return total < 0 || present < 0 || present > total;
      });

      if (invalid) {
        toast.error("Attendance values must be non-negative and present ≤ total");
        setSaving(false);
        return;
      }

      const subjectsToInsert = newSubjects.map(sub => ({
        user_id: user.id,
        name: sub.name,
        code: sub.code,
        type: sub.type,
        total_hours: Number(sub.total_hours),
        hours_present: Number(sub.hours_present),
        threshold: 75 // Default threshold
      }));

      const { error } = await supabase.from('subjects').insert(subjectsToInsert);

      if (error) {
        console.error("Insert error:", error);
        toast.error("Failed to save subjects");
        setSaving(false);
        return;
      }

      toast.success(`Successfully added ${newSubjects.length} new subject(s)!`);
      onSaved();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Save error:", error);
      toast.error("An error occurred while saving");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col p-0 overflow-hidden border-4 border-black rounded-3xl bg-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
        <DialogHeader className="px-6 pt-6 pb-2 border-b-2 border-black">
          <DialogTitle className="text-2xl font-display font-black text-black">
            Verify Scanned Data
          </DialogTitle>
          <DialogDescription className="text-gray-600 font-medium">
            Please check if the extracted data is correct. You can edit values or delete unwanted rows.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-2">
          <div className="border-2 border-black rounded-2xl bg-white overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-100 sticky top-0 z-10 border-b-2 border-black">
                <TableRow className="hover:bg-gray-100">
                  <TableHead className="w-[25%] font-bold text-black border-r border-gray-300">Subject Name</TableHead>
                  <TableHead className="w-[12%] font-bold text-black border-r border-gray-300">Code</TableHead>
                  <TableHead className="w-[12%] font-bold text-black border-r border-gray-300">Type</TableHead>
                  <TableHead className="w-[13%] text-center font-bold text-black border-r border-gray-300">Total Classes</TableHead>
                  <TableHead className="w-[13%] text-center font-bold text-black border-r border-gray-300">Attended</TableHead>
                  <TableHead className="w-[10%] text-center font-bold text-black border-r border-gray-300">Percentage</TableHead>
                  <TableHead className="w-[5%] text-black"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-gray-600 bg-white">
                      <p className="text-lg font-medium mb-1">No subjects found</p>
                      <p className="text-sm">Scan your portal screenshot or add manually to get started</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((item, index) => {
                    const total = Number(item.total_hours);
                    const present = Number(item.hours_present);
                    const percentage = total > 0 ? (present / total) * 100 : 0;
                    
                    return (
                      <TableRow key={index} className="hover:bg-gray-50 transition-colors border-b border-gray-200">
                        <TableCell className="border-r border-gray-200">
                          <Input 
                            value={item.name} 
                            onChange={(e) => handleUpdate(index, 'name', e.target.value)} 
                            className="h-10 font-medium border-2 border-gray-300 focus-visible:border-black focus-visible:ring-0 rounded-lg"
                          />
                        </TableCell>
                        <TableCell className="border-r border-gray-200">
                          <Input 
                            value={item.code || ''} 
                            onChange={(e) => handleUpdate(index, 'code', e.target.value)} 
                            placeholder="21CSE303J"
                            className="h-10 font-mono text-xs border-2 border-gray-300 focus-visible:border-black focus-visible:ring-0 rounded-lg"
                          />
                        </TableCell>
                        <TableCell className="border-r border-gray-200">
                          <div className="relative">
                            <select 
                              className="flex h-10 w-full appearance-none rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:border-black disabled:cursor-not-allowed disabled:opacity-50"
                              value={item.type}
                              onChange={(e) => handleUpdate(index, 'type', e.target.value)}
                            >
                              <option value="Theory">Theory</option>
                              <option value="Practical">Practical</option>
                              <option value="Lab">Lab</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-black">
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="border-r border-gray-200">
                          <Input 
                            type="number" 
                            value={item.total_hours} 
                            onChange={(e) => handleUpdate(index, 'total_hours', e.target.value)}
                            className="h-10 text-center border-2 border-gray-300 focus-visible:border-black focus-visible:ring-0 rounded-lg"
                          />
                        </TableCell>
                        <TableCell className="border-r border-gray-200">
                          <Input 
                            type="number" 
                            value={item.hours_present} 
                            onChange={(e) => handleUpdate(index, 'hours_present', e.target.value)}
                            className="h-10 text-center border-2 border-gray-300 focus-visible:border-black focus-visible:ring-0 rounded-lg"
                          />
                        </TableCell>
                        <TableCell className="text-center border-r border-gray-200">
                          <span className="font-bold text-sm text-black">
                            {isNaN(percentage) ? '0%' : percentage.toFixed(0) + '%'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-600 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 bg-gray-100 border-t-2 border-black">
          <div className="flex w-full justify-between items-center">
            <p className="text-sm text-gray-700 font-medium w-1/2">
              Found {data.length} subjects. Click Save to add them to your dashboard.
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="border-2 border-black rounded-xl font-bold hover:bg-gray-200"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={saving || data.length === 0}
                className="bg-black hover:bg-gray-800 text-white font-bold rounded-xl border-2 border-black"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Save to Dashboard
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
