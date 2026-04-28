const { defineConfig } = require('vite')

module.exports = defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
        filters: './src/ui/Filters/filters.html',
        navbar: './src/ui/Navbar/navbar.html',
        colorBar: './src/ui/ColorBar/colorBar.html',
        colorBarGreen: './src/ui/ColorBar/colorBarGreen.html',
        colorBarMagenta: './src/ui/ColorBar/colorBarMagenta.html',
        showing: './src/ui/Showing/showing.html',
      }
    }
  }
})