"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, User, CreditCard, LogOut, Shield, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import UpgradeDialog from "@/components/subscription/UpgradeDialog";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState<"free" | "pro">("free");
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }
  
        setEmail(user.email || ""); // Set email from auth user
  
        // Fetch profile from database
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
  
        if (profile) {
          setName(profile.name);
          setTier(profile.subscription_tier as "free" | "pro");
        } else {
          // Fallback to metadata if profile doesn't exist yet (should trigger on signup but just in case)
          setName(user.user_metadata?.name || "");
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router, supabase]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_profiles')
        .update({ name })
        .eq('user_id', user.id);

      if (error) throw error;

      // Also update auth metadata
      await supabase.auth.updateUser({
        data: { name }
      });

      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setUpdating(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-display font-black text-black">Settings</h1>
        <p className="text-gray-600 font-medium">Manage your account and preferences</p>
      </div>

      <div className="grid gap-8">
        {/* Profile Section */}
        <Card className="bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="bg-gray-100 p-2 rounded-full border-2 border-black">
                <User className="h-5 w-5 text-black" />
              </div>
              <CardTitle className="text-xl font-display font-black">Profile Information</CardTitle>
            </div>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name" className="font-bold">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="max-w-md border-2 border-gray-200 focus-visible:ring-black rounded-xl"
                  placeholder="Your Name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email" className="font-bold">Email Address</Label>
                <Input
                  id="email"
                  value={email}
                  disabled
                  className="max-w-md bg-gray-50 border-2 border-gray-100 rounded-xl text-gray-500"
                />
                <p className="text-xs text-gray-400">Email cannot be changed</p>
              </div>
              <Button 
                type="submit" 
                disabled={updating}
                className="mt-2 font-bold bg-black text-white hover:bg-gray-800 rounded-xl border-2 border-black"
              >
                {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Subscription Section */}
        <Card className="bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
          <CardHeader className="bg-gray-50 border-b-2 border-gray-100">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-100 p-2 rounded-full border-2 border-black">
                <CreditCard className="h-5 w-5 text-yellow-700" />
              </div>
              <CardTitle className="text-xl font-display font-black">Subscription</CardTitle>
            </div>
            <CardDescription>Manage your plan and billing</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-bold text-gray-900">Current Plan:</h3>
                  {tier === 'pro' ? (
                    <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-3 py-1 rounded-full text-sm font-black border-2 border-black shadow-sm flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> PRO
                    </span>
                  ) : (
                    <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm font-bold border-2 border-gray-400">
                      FREE
                    </span>
                  )}
                </div>
                <p className="text-gray-600 max-w-md">
                  {tier === 'pro' 
                    ? "You have access to unlimited subjects, AI scanning, and advanced analytics."
                    : "You are on the basic plan with limited features."}
                </p>
              </div>

              {tier === 'free' && (
                <Button 
                  onClick={() => setIsUpgradeOpen(true)}
                  size="lg"
                  className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-black font-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all rounded-xl"
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  Upgrade to Pro
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card className="bg-white border-4 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-red-900/10">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="bg-red-100 p-2 rounded-full border-2 border-red-200">
                <Shield className="h-5 w-5 text-red-700" />
              </div>
              <CardTitle className="text-xl font-display font-black">Account Actions</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button 
                variant="outline" 
                onClick={handleSignOut}
                className="w-full sm:w-auto font-bold border-2 border-black hover:bg-gray-100 rounded-xl"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <UpgradeDialog 
        open={isUpgradeOpen} 
        onOpenChange={setIsUpgradeOpen}
        feature="Pro Upgrade"
        message="Get unlimited subjects and AI scanning!"
      />
    </div>
  );
}
