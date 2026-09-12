import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <main>
      <h1 className="text-2xl font-semibold">99Overlap</h1>
      <p className="text-muted-foreground">Scaffolding in progress — see docs/ROADMAP.md.</p>
      <Button className="mt-4">shadcn/ui is wired up</Button>
    </main>
  )
}
