import { createClient } from "./supabase/client";

/**
 * Universal session reset utility.
 * Clears Supabase session, localStorage, and all relevant cookies.
 */
export async function clearSessionAndRedirect(customClient?: ReturnType<typeof createClient>) {
  try {
    const supabase = customClient || createClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.error("[SessionUtils] Auth signout failed:", err);
  }

  // Clear all storage
  if (typeof window !== "undefined") {
    localStorage.clear();
    sessionStorage.clear();

    // Clear all cookies starting with sb-
    document.cookie.split(";").forEach((c) => {
      const name = c.trim().split("=")[0];
      if (name.startsWith("sb-") || name.includes("supabase")) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
      }
    });

    // Force redirect to landing page
    window.location.href = "/";
  }
}
