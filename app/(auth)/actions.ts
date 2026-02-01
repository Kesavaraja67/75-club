"use server";

import { createClient } from "@/lib/supabase/server";

export async function updatePassword(password: string) {
  const supabase = await createClient();

  try {
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: "Password updated successfully" };
  } catch (err) {
    console.error("Update password action error:", err);
    return { success: false, message: "An unexpected error occurred" };
  }
}
