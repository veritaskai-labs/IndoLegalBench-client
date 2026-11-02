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
                <main className="min-w-0 flex-1 bg-slate-50 p-4 sm:p-8">{children}</main>
              </div>
            </div>
          </MobileNavProvider>
        </ToastProvider>
      </AuthGuard>
    </AuthProvider>
  );
}