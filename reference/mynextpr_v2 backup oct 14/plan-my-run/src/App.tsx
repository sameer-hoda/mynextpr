import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CoachSelection from "./pages/CoachSelection";
import Onboarding from "./pages/Onboarding";
import Loading from "./pages/Loading";
import Plan from "./pages/Plan";
import Journal from "./pages/Journal";
import NotFound from "./pages/NotFound";
import ResetData from "./pages/ResetData";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/coach-selection" element={<CoachSelection />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/loading" element={<Loading />} />
            <Route path="/plan" element={<Plan />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/reset-data" element={<ResetData />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
