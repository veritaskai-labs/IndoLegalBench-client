import { AuthProvider } from "@/hooks/useAuth";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { MobileNavProvider } from "@/components/layout/MobileNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { ToastProvider } from "@/components/ui/Toast";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AuthGuard>
        <ToastProvider>
          <MobileNavProvider>
            <div className="flex min-h-screen flex-col">
              <TopBar />
              <div className="flex flex-1">
                <Sidebar />
                <main className="min-w-0 flex-1 bg-paper px-4 pt-6 pb-12 sm:px-10 sm:pt-8 sm:pb-16">{children}</main>
              </div>
            </div>
          </MobileNavProvider>
        </ToastProvider>
      </AuthGuard>
    </AuthProvider>
  );
}