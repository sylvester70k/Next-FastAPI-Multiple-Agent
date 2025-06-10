"use client";

import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { Toaster } from "@/components/ui/sonner";

import "../app/github-markdown.css";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SessionProvider } from "next-auth/react";
import { AuthProvider } from "@/context/AuthContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      forcedTheme="dark"
      themes={["dark"]}
      disableTransitionOnChange
    >
      <TooltipProvider>
        <SessionProvider>
          <AuthProvider>
            <ProgressBar
              height="2px"
              color="#BAE9F4"
              options={{ showSpinner: false }}
              shallowRouting
            />
            {children}
          </AuthProvider>
        </SessionProvider>
      </TooltipProvider>
      <Toaster richColors />
    </ThemeProvider>
  );
}
