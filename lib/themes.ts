export interface Theme {
  name: string
  id: string
  primaryColor: string
  secondaryColor: string
  backgroundColor: string
  textColor: string
  accentColor: string
  fontFamily: string
  backgroundImage?: string
  backgroundPattern?: string
}

export const themes: Record<string, Theme> = {
  halloween: {
    name: "Halloween",
    id: "halloween",
    primaryColor: "#FF6B00",
    secondaryColor: "#8B00FF",
    backgroundColor: "#1a0a1e",
    textColor: "#FFA500",
    accentColor: "#8B00FF",
    fontFamily: "'Creepster', 'Nosifer', cursive",
    backgroundPattern: "radial-gradient(circle at 20% 50%, rgba(139, 0, 255, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255, 107, 0, 0.1) 0%, transparent 50%)",
  },
  christmas: {
    name: "Christmas",
    id: "christmas",
    primaryColor: "#C41E3A",
    secondaryColor: "#0F7939",
    backgroundColor: "#0d3b1f",
    textColor: "#FFFFFF",
    accentColor: "#FFD700",
    fontFamily: "'Mountains of Christmas', 'Satisfy', cursive",
    backgroundPattern: "radial-gradient(circle at 30% 40%, rgba(196, 30, 58, 0.15) 0%, transparent 50%), radial-gradient(circle at 70% 70%, rgba(15, 121, 57, 0.15) 0%, transparent 50%)",
  },
  thanksgiving: {
    name: "Thanksgiving",
    id: "thanksgiving",
    primaryColor: "#D2691E",
    secondaryColor: "#8B4513",
    backgroundColor: "#2c1810",
    textColor: "#FFDAB9",
    accentColor: "#FF8C00",
    fontFamily: "'Lobster', 'Pacifico', cursive",
    backgroundPattern: "radial-gradient(circle at 25% 60%, rgba(210, 105, 30, 0.12) 0%, transparent 50%), radial-gradient(circle at 75% 30%, rgba(139, 69, 19, 0.12) 0%, transparent 50%)",
  },
  default: {
    name: "Default",
    id: "default",
    primaryColor: "#3B82F6",
    secondaryColor: "#EF4444",
    backgroundColor: "#111827",
    textColor: "#FFFFFF",
    accentColor: "#10B981",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    backgroundPattern: "none",
  },
}

export const getTheme = (themeId: string): Theme => {
  return themes[themeId] || themes.default
}

export const applyTheme = (theme: Theme, element: HTMLElement) => {
  element.style.setProperty("--theme-primary", theme.primaryColor)
  element.style.setProperty("--theme-secondary", theme.secondaryColor)
  element.style.setProperty("--theme-bg", theme.backgroundColor)
  element.style.setProperty("--theme-text", theme.textColor)
  element.style.setProperty("--theme-accent", theme.accentColor)
  element.style.fontFamily = theme.fontFamily
  
  if (theme.backgroundPattern) {
    element.style.background = `${theme.backgroundColor} ${theme.backgroundPattern}`
  } else {
    element.style.backgroundColor = theme.backgroundColor
  }
}
