import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { reconcileSubscription } from "@/lib/subscription-server";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reconciled = await reconcileSubscription(user.id);
    console.log(`[Reconcile API] User matched: ${user.email} (ID: ${user.id}) - Found new activation: ${reconciled}`);

    return NextResponse.json({ 
      success: true, 
      reconciled,
      message: reconciled ? "Account reconciled! Your Pro tier is now active." : "Account is up to date."
    });

  } catch (error: unknown) {
    console.error("[Reconcile] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
