// customer/src/hooks/useTheme.ts
import { useAppStore } from "../store";
import { LightTheme, DarkTheme } from "../shared/theme";

export const useTheme = () => {
    const theme = useAppStore((state) => state.theme);
    const colors = theme === "light" ? LightTheme : DarkTheme;

    return {
        colors,
        isDark: theme === "dark",
        theme,
    };
};
