"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { createClient } from "@/lib/supabase/client"; // Removed, using Server Actions
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Subject } from "@/lib/types";

interface ManualSubjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (subject?: Record<string, unknown>) => void;
  editMode?: boolean;
  subjectToEdit?: Subject | null;
}

export default function ManualSubjectDialog({ open, onOpenChange, onSaved, editMode = false, subjectToEdit }: ManualSubjectDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    type: "Theory",
    totalHours: "",
    hoursPresent: "",
  });

  // Pre-fill form when editing
  useEffect(() => {
    if (editMode && subjectToEdit) {
      setFormData({
        name: subjectToEdit.name,
        code: subjectToEdit.code || "",
        type: subjectToEdit.type,
        totalHours: subjectToEdit.totalHours.toString(),
        hoursPresent: subjectToEdit.hoursPresent.toString(),
      });
    } else if (!open) {
      // Reset form when dialog closes
      setFormData({
        name: "",
        code: "",
        type: "Theory",
        totalHours: "",
        hoursPresent: "",
      });
    }
  }, [editMode, subjectToEdit, open]);

  // const supabase = createClient(); // Removed

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.name || !formData.totalHours || !formData.hoursPresent) {
        throw new Error("Please fill in all required fields");
      }

      const total = parseInt(formData.totalHours, 10);
      const present = parseInt(formData.hoursPresent, 10);

      if (isNaN(total) || isNaN(present)) {
        throw new Error("Hours must be valid numbers");
      }

      if (present > total) {
        throw new Error("Present hours cannot exceed total classes");
      }

      // Server Actions import (dynamic to avoid build issues if file not ready)
      const { addSubject, updateSubject } = await import("@/app/dashboard/actions");

      if (editMode && subjectToEdit) {
        // Update existing subject
        const result = await updateSubject(subjectToEdit.id, {
            name: formData.name,
            code: formData.code,
            type: formData.type,
            totalHours: total,
            hoursPresent: present,
        });

        if (!result.success) throw new Error(result.message);
        toast.success("Subject updated successfully");
        onSaved();
      } else {
        // Insert new subject
        const result = await addSubject({
            name: formData.name,
            code: formData.code,
            type: formData.type,
            totalHours: total,
            hoursPresent: present,
        });

        if (!result.success) throw new Error(result.message);
        toast.success("Subject added successfully");
        onSaved(result.data as Record<string, unknown>);
      }

      setFormData({
        name: "",
        code: "",
        type: "Theory",
        totalHours: "",
        hoursPresent: "",
      });
      // onSaved call moved up inside the success blocks
      onOpenChange(false);

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to add subject";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white border-4 border-black rounded-3xl neo-shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display font-black text-foreground flex items-center gap-2">
            <span className="text-3xl">{editMode ? "✏️" : "📝"}</span> {editMode ? "Edit Subject" : "Add Subject Manually"}
          </DialogTitle>
          <DialogDescription className="text-foreground/70 font-medium">
            Enter the details of your course here.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right font-display font-bold">
              Name
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="col-span-3 border-2 rounded-xl bg-white"
              placeholder="e.g. Mathematics"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="code" className="text-right font-display font-bold">
              Code
            </Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => handleChange("code", e.target.value)}
              className="col-span-3 border-2 rounded-xl bg-white"
              placeholder="e.g. MAT101"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right font-display font-bold">
              Type
            </Label>
            <Select 
              value={formData.type} 
              onValueChange={(val) => handleChange("type", val)}
            >
              <SelectTrigger className="col-span-3 border-2 rounded-xl bg-white">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="bg-white border-2 border-black rounded-xl">
                <SelectItem value="Theory">📚 Theory</SelectItem>
                <SelectItem value="Practical">🛠️ Practical</SelectItem>
                <SelectItem value="Lab">🧪 Lab</SelectItem>
                <SelectItem value="Clinical">🏥 Clinical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="total" className="text-right font-display font-bold">
              Total
            </Label>
            <Input
              id="total"
              type="number"
              value={formData.totalHours}
              onChange={(e) => handleChange("totalHours", e.target.value)}
              className="col-span-3 border-2 rounded-xl bg-white"
              placeholder="Total classes"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="present" className="text-right font-display font-bold">
              Attended
            </Label>
            <Input
              id="present"
              type="number"
              value={formData.hoursPresent}
              onChange={(e) => handleChange("hoursPresent", e.target.value)}
              className="col-span-3 border-2 rounded-xl bg-white"
              placeholder="Classes attended"
            />
          </div>
          <DialogFooter>
            <Button 
              type="submit" 
              disabled={loading}
              className="font-display font-bold rounded-2xl h-12"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editMode ? "Update Subject ✨" : "Save Subject ✨"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
