import { AuthProvider } from "@/hooks/useAuth";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AuthGuard>
        <div className="flex min-h-screen flex-col">
          <TopBar />
          <div className="flex flex-1">
            <Sidebar />
            <main className="flex-1 bg-slate-50 p-8">{children}</main>
          </div>
        </div>
      </AuthGuard>
    </AuthProvider>
  );
}