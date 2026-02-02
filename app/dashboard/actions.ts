"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ActionResponse = {
  success: boolean;
  message: string;
  data?: unknown;
};

export async function addSubject(formData: {
  name: string;
  code: string;
  type: string;
  totalHours: number;
  hoursPresent: number;
}): Promise<ActionResponse> {
  const supabase = await createClient();

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, message: "User not authenticated" };
    }

      const { data: newSubject, error } = await supabase
      .from('subjects')
      .insert({
        user_id: user.id,
        name: formData.name,
        code: formData.code,
        type: formData.type,
        total_hours: formData.totalHours,
        hours_present: formData.hoursPresent,
        threshold: 75
      })
      .select()
      .single();

    if (error) {
      return { success: false, message: error.message };
    }

    revalidatePath('/dashboard');
    return { success: true, message: "Subject added successfully", data: newSubject };
  } catch (err) {
    console.error("Add subject error:", err);
    return { success: false, message: "An unexpected error occurred" };
  }
}

export async function updateSubject(subjectId: string, formData: {
  name: string;
  code: string;
  type: string;
  totalHours: number;
  hoursPresent: number;
}): Promise<ActionResponse> {
  const supabase = await createClient();

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, message: "User not authenticated" };
    }

    const { error } = await supabase
      .from('subjects')
      .update({
        name: formData.name,
        code: formData.code,
        type: formData.type,
        total_hours: formData.totalHours,
        hours_present: formData.hoursPresent,
      })
      .eq('id', subjectId)
      .eq('user_id', user.id);

    if (error) {
      return { success: false, message: error.message };
    }

    revalidatePath('/dashboard');
    return { success: true, message: "Subject updated successfully" };
  } catch (err) {
    console.error("Update subject error:", err);
    return { success: false, message: "An unexpected error occurred" };
  }
}
