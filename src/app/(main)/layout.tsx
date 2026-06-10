import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ThemeWrapper } from "@/components/ui/ThemeWrapper";
import { SettingsSync } from "@/components/ui/SettingsSync";
import { ToastContainer } from "@/components/ui/Toast";
import { PWAUpdatePrompt } from "@/components/ui/PWAUpdatePrompt";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <ThemeWrapper>
      <SettingsSync />
      <ToastContainer />
      <PWAUpdatePrompt />
      {children}
    </ThemeWrapper>
  );
}
