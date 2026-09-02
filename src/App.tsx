import { useState, useEffect } from "react";
import { Toaster } from "sonner";
import { useAppStore } from "@/stores/appStore";
import { getAppStatus } from "@/lib/tauri";
import { WelcomeScreen } from "@/components/screens/WelcomeScreen";
import { UnlockScreen } from "@/components/screens/UnlockScreen";
import { MainScreen } from "@/components/screens/MainScreen";

export function App() {
  const { theme } = useAppStore();
  const [hasVault, setHasVault] = useState<boolean | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [rateLimitedUntil, setRateLimitedUntil] = useState<number | undefined>(undefined);

  const checkStatus = async () => {
    try {
      const status = await getAppStatus();
      setHasVault(status.has_vault);
      setIsUnlocked(status.is_unlocked);
      setRateLimitedUntil(status.rate_limited_until || undefined);
    } catch (e) {
      console.error(e);
      setHasVault(false);
      setIsUnlocked(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  useEffect(() => {
    if (theme === "light") {
      document.documentElement.classList.remove("dark");
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, [theme]);

  if (hasVault === null) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-surface-0 text-text-muted text-sm">
        Initializing KobeanPass...
      </div>
    );
  }

  return (
    <>
      <Toaster
        theme={theme === "light" ? "light" : "dark"}
        position="bottom-right"
        richColors
      />

      {!hasVault ? (
        <WelcomeScreen onVaultCreated={checkStatus} />
      ) : !isUnlocked ? (
        <UnlockScreen onUnlocked={checkStatus} rateLimitedUntil={rateLimitedUntil} />
      ) : (
        <MainScreen onLocked={checkStatus} />
      )}
    </>
  );
}

export default App;
