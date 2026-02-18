import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import MembersRegistration from "./pages/MembersRegistration";
import MemberDashboard from "./pages/MemberDashboard";
import Attendance from "./pages/Attendance";
import AdminLogin from "./pages/AdminLogin";
import Dashboard from "./pages/Dashboard";
import Antigravity from "@/components/ui/Antigravity";

import { useLocation } from "wouter";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/attendance"} component={Attendance} />
      <Route path={"/admin-login"} component={AdminLogin} />

      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/members-registration"} component={MembersRegistration} />
      <Route path={"/member-dashboard"} component={MemberDashboard} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  const isMemberDashboard = location === "/member-dashboard";

  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
      >
        <TooltipProvider>
          <div className="relative min-h-screen">
            {!isMemberDashboard && (
              <Antigravity
                count={600}
                magnetRadius={8}
                ringRadius={10}
                waveSpeed={0.3}
                waveAmplitude={1}
                particleSize={0.4}
                lerpSpeed={0.05}
                color="#6366f1"
                autoAnimate
                particleVariance={1}
                rotationSpeed={0.01}
                depthFactor={1}
                pulseSpeed={2}
                particleShape="capsule"
                fieldStrength={10}
              />
            )}
            <div className="relative z-10 font-noto-arabic">
              <Toaster />
              <Router />
            </div>
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

