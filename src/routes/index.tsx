import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <main>
      <h1>99Overlap</h1>
      <p>Scaffolding in progress — see docs/ROADMAP.md.</p>
    </main>
  )
}
