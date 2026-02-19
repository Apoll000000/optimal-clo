"use client";

import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { CartProvider } from "@/contexts/CartContext";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            <CartProvider>{children}</CartProvider>
        </ThemeProvider>
    );
}
