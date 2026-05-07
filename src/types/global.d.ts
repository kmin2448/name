declare module '*.css' {
  const styles: Record<string, string>
  export default styles
}

interface Window {
  queryLocalFonts?: () => Promise<{ family: string }[]>
}
