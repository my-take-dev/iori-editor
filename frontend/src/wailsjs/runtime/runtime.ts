// Wails runtime stub - will be overwritten by Wails build
export function EventsOn(event: string, callback: (data: any) => void): () => void {
  if (typeof window !== 'undefined' && (window as any).runtime?.EventsOn) {
    return (window as any).runtime.EventsOn(event, callback)
  }
  return () => {}
}

export function EventsOff(event: string): void {
  if (typeof window !== 'undefined' && (window as any).runtime?.EventsOff) {
    (window as any).runtime.EventsOff(event)
  }
}

export function EventsEmit(event: string, data?: any): void {
  if (typeof window !== 'undefined' && (window as any).runtime?.EventsEmit) {
    (window as any).runtime.EventsEmit(event, data)
  }
}

export function BrowserOpenURL(url: string): void {
  if (typeof window !== 'undefined' && (window as any).runtime?.BrowserOpenURL) {
    (window as any).runtime.BrowserOpenURL(url)
  } else {
    window.open(url, '_blank')
  }
}
