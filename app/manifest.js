export default function manifest() {
    return {
      name: 'Shiftly',
      short_name: 'Shiftly',
      // The site positions the solver as constraint satisfaction, not "AI", so
      // keep the installed app's description on the same message.
      description: 'Fair staff rotas, built in seconds',
      start_url: '/auth-redirect',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#FF1F7D',
      // No orientation lock: this install target is desktop, where portrait is
      // wrong. Phones are served by the native apps, not by this.
      icons: [
        {
          src: '/icons/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/icons/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
        },
        {
          src: '/icons/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    }
  }