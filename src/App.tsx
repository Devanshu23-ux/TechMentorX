import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AIAuditor from "./pages/AIAuditor";
import StudentsExplorer from "./pages/StudentsExplorer";
import StudentProgress from "./pages/StudentProgress";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public route */}
            <Route path="/auth" element={<Auth />} />
            
            {/* Admin/Teacher routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/auditor"
              element={
                <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                  <AIAuditor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/students"
              element={
                <ProtectedRoute allowedRoles={['admin', 'teacher']}>
                  <StudentsExplorer />
                </ProtectedRoute>
              }
            />
            
            {/* Student route */}
            <Route
              path="/my-progress"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentProgress />
                </ProtectedRoute>
              }
            />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
