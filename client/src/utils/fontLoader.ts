// Font loading utility to ensure Figtree is available in all environments
export class FontLoader {
  private static instance: FontLoader;
  private fontsLoaded = false;
  private fontCheckInterval: NodeJS.Timeout | null = null;

  static getInstance(): FontLoader {
    if (!FontLoader.instance) {
      FontLoader.instance = new FontLoader();
    }
    return FontLoader.instance;
  }

  async initializeFonts(): Promise<void> {
    // Only run in browser environment
    if (typeof window === 'undefined') return;

    // Force immediate font loading
    this.preloadFonts();
    
    // Set up font detection
    this.detectFontLoading();
    
    // Apply emergency CSS if needed
    this.applyEmergencyFontCSS();
  }

  private preloadFonts(): void {
    const fontFiles = [
      '/figtree-regular.woff2',
      '/figtree-medium.woff2', 
      '/figtree-semibold.woff2',
      '/figtree-bold.woff2'
    ];

    fontFiles.forEach(fontFile => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'font';
      link.type = 'font/woff2';
      link.crossOrigin = 'anonymous';
      link.href = fontFile;
      document.head.appendChild(link);
    });
  }

  private detectFontLoading(): void {
    if (!document.fonts) return;

    // Check if Figtree is loaded
    const checkFigtree = () => {
      try {
        const isLoaded = document.fonts.check('16px Figtree');
        if (isLoaded && !this.fontsLoaded) {
          this.fontsLoaded = true;
          this.onFontsLoaded();
          if (this.fontCheckInterval) {
            clearInterval(this.fontCheckInterval);
          }
        }
      } catch (error) {
        console.warn('Font check failed:', error);
      }
    };

    // Check immediately
    checkFigtree();

    // Check periodically until loaded
    this.fontCheckInterval = setInterval(checkFigtree, 100);

    // Stop checking after 5 seconds
    setTimeout(() => {
      if (this.fontCheckInterval) {
        clearInterval(this.fontCheckInterval);
      }
      if (!this.fontsLoaded) {
        this.applyEmergencyFontCSS();
      }
    }, 5000);
  }

  private onFontsLoaded(): void {
    // Add loaded class to body for CSS targeting
    document.body.classList.add('figtree-loaded');
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('figtreeLoaded'));
  }

  private applyEmergencyFontCSS(): void {
    const emergencyCSS = `
      * { 
        font-family: 'Figtree', 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif !important; 
      }
      .figtree-emergency {
        font-family: 'Figtree', 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif !important;
      }
    `;

    const style = document.createElement('style');
    style.textContent = emergencyCSS;
    document.head.appendChild(style);

    // Add emergency class to body
    document.body.classList.add('figtree-emergency');
  }

  public isFigtreeLoaded(): boolean {
    return this.fontsLoaded;
  }
}