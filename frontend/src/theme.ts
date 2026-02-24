export const theme = {
    colors: {
        // Indeed-Inspired Light Theme
        primary: '#2557a7',        // Indeed blue
        primaryLight: '#e8f0fe',   // Light blue tint
        primaryDark: '#0d2d5e',    // Darker blue
        accent: '#2557a7',
        accentLight: '#59729a',
        secondary: '#6f6f6f',      // Gray for secondary elements

        // Backgrounds
        background: '#ffffff',     // Pure white background
        surface: '#f3f2f1',        // Light gray for surfaces/cards
        surfaceVariant: '#e1e1e1', // Slightly darker gray
        card: '#ffffff',           // White cards on light gray background

        // Text
        text: '#2d2d2d',           // Dark charcoal text
        textSecondary: '#6f6f6f',  // Medium gray for subtitles
        textMuted: '#949494',      // Light gray for placeholder/muted

        // Borders
        border: '#d4d2d0',         // Subtle gray border
        borderLight: '#e1e1e1',    // Even lighter border

        // Status colors
        success: '#00af41',        // Green
        error: '#d12020',          // Red
        warning: '#f6a700',        // Orange/Gold
        info: '#2557a7',

        // Legacy support
        white: '#ffffff',
    },
    spacing: {
        xs: 4,
        s: 8,
        m: 16,
        l: 24,
        xl: 32,
    },
    borderRadius: {
        s: 4,                      // Straighter edges for more professional look
        m: 8,
        l: 16,
        xl: 24,
    },
    typography: {
        h1: { fontSize: 32, fontWeight: '700' as const },
        h2: { fontSize: 24, fontWeight: '700' as const },
        h3: { fontSize: 20, fontWeight: '600' as const },
        body: { fontSize: 16, fontWeight: '400' as const },
        caption: { fontSize: 14, fontWeight: '400' as const, color: '#6f6f6f' },
    }
};
