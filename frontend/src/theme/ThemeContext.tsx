import React, { createContext, useContext, ReactNode } from 'react';
import { theme as appTheme } from '../theme';

// Define the theme type based on existing theme structure
type Theme = typeof appTheme;

interface ThemeContextType {
    theme: Theme;
    isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
    children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    // Using the app's theme - currently supporting dark mode only
    const value: ThemeContextType = {
        theme: appTheme,
        isDark: true, // The app uses a dark theme by default
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        // Return default theme if not in provider (for compatibility)
        return {
            theme: appTheme,
            isDark: true,
        };
    }
    return context;
};

// Also export the theme itself for direct imports
export { appTheme as theme };
