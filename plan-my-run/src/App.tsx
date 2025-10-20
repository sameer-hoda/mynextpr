import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Index from "./pages/Index";

import CoachSelection from "./pages/CoachSelection";
import Onboarding from "./pages/Onboarding";
import Loading from "./pages/Loading";
import Plan from "./pages/Plan";
import Journal from "./pages/Journal";
import NotFound from "./pages/NotFound";
import ResetData from "./pages/ResetData";
import AuthCallback from "./pages/AuthCallback";
import ScrollToTop from "./components/utils/ScrollToTop";
import { App as CapacitorApp } from '@capacitor/app';

const queryClient = new QueryClient();

const AppContent = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const registerListeners = async () => {
      // Handle the back button
      await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) {
          CapacitorApp.exitApp();
        } else {
          navigate(-1);
        }
      });

      // Handle deep links
      await CapacitorApp.addListener('appUrlOpen', (event) => {
        // Correctly parse the URL to get the path and search params
        // Example URL: com.runna.app://auth/callback?token=...
        const url = new URL(event.url);
        const path = url.pathname + url.search; // This will correctly be /auth/callback?token=...
        navigate(path);
      });
    };

    const cleanup = () => {
      CapacitorApp.removeAllListeners();
    };

    registerListeners();

    return cleanup;
  }, [navigate]);

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/coach-selection" element={<CoachSelection />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/loading" element={<Loading />} />
        <Route path="/plan" element={<Plan />} />
        <Route path="/journal" element={<Journal />} />
        <Route path="/reset-data" element={<ResetData />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
