import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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

const queryClient = new QueryClient();

import { App as CapacitorApp } from '@capacitor/app';
// ... other imports

const App = () => {
  const navigate = useNavigate();

  useEffect(() => {
    CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (!canGoBack) {
        CapacitorApp.exitApp();
      } else {
        navigate(-1);
      }
    });
  }, [navigate]);

  // ... rest of the component
};

export default App;
