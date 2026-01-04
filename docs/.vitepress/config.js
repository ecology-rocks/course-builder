import { defineConfig } from 'vitepress'
import path from 'node:path'
import fs from 'node:fs'

// Helper: Scans a folder, reads frontmatter title, and returns sidebar items
function getSidebarItems(folder) {
  const dirPath = path.resolve(process.cwd(), 'docs', folder)

  if (!fs.existsSync(dirPath)) return []

  return fs.readdirSync(dirPath)
    .filter(file => file.endsWith('.md') && file !== 'index.md')
    .map(file => {
      const fullPath = path.join(dirPath, file)
      const src = fs.readFileSync(fullPath, 'utf-8')
      
      // regex to find "title: <Something>" inside the file
      const match = src.match(/^title:\s*(.*)$/m)
      const frontmatterTitle = match ? match[1].trim() : null

      const name = path.parse(file).name
      
      // Use frontmatter title if found; otherwise format the filename
      const text = frontmatterTitle || name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      
      return { text, link: `/${folder}/${name}` }
    })
    .sort((a, b) => a.text.localeCompare(b.text)) // Sorts alphabetically by the visible text
}

export default defineConfig({
  title: "K9 Course Builder",
  description: "Developer Documentation",

themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Data Debug', link: '/data-test' },
    ],
    sidebar: [
      // New dynamic section for Rules
      {
        text: 'Rules',
        items: getSidebarItems('rules') 
      },
      {
        text: 'Architecture',
        items: getSidebarItems('architecture')
      }
    ]
  },

  vite: {
    configFile: false,
    server: {
      fs: { allow: [process.cwd()] }
    },

   resolve: {
      alias: [
        // 1. EXACT match for the store (catches imports with .js)
        {
          find: '@/stores/mapStore.js',
          replacement: path.resolve(process.cwd(), 'docs/mocks/mapStore.js')
        },
        // 2. EXACT match for the store (catches imports without .js)
        {
          find: '@/stores/mapStore',
          replacement: path.resolve(process.cwd(), 'docs/mocks/mapStore.js')
        },
        {
          find: '@/stores/mapActions',
          replacement: path.resolve(process.cwd(), 'src/stores/mapActions')
        },
        // 3. Fallback for everything else in src
        {
          find: '@',
          replacement: path.resolve(process.cwd(), 'src')
        },
      ]
    }
  }
})