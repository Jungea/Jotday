import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ThemeWrapper } from "@/components/ui/ThemeWrapper";
import { SettingsSync } from "@/components/ui/SettingsSync";
import { ToastContainer } from "@/components/ui/Toast";
import { GlobalLoadingIndicator } from "@/components/ui/GlobalLoadingIndicator";
import { PWAUpdatePrompt } from "@/components/ui/PWAUpdatePrompt";
import { BottomTabBar } from "@/components/ui/BottomTabBar";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <ThemeWrapper>
      <SettingsSync />
      <ToastContainer />
      <GlobalLoadingIndicator />
      <PWAUpdatePrompt />
      {children}
      <BottomTabBar />
    </ThemeWrapper>
  );
}
