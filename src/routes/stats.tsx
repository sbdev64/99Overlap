import { barY, defineChart, lineY } from '@tanstack/charts'
import { Chart } from '@tanstack/charts/react'
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { scalePoint } from '@tanstack/charts/scales/point'
import { tooltip } from '@tanstack/charts/tooltip'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo } from 'react'
import { type DeckGameStat, getGameStats, type PodCount } from '@/server/stats'

export const Route = createFileRoute('/stats')({
  component: StatsPage,
  loader: () => getGameStats(),
})

const CHART_HEIGHT = 260

function StatsPage() {
  const stats = Route.useLoaderData()

  return (
    <main>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Statistics</h1>
        <Link to="/history" className="text-sm underline">
          Game history
        </Link>
      </div>
      <p className="text-muted-foreground">
        Built from your {stats.totalGames} logged game
        {stats.totalGames === 1 ? '' : 's'}.
      </p>

      {stats.totalGames === 0 ? (
        <p className="mt-6 text-muted-foreground">
          No games logged yet.{' '}
          <Link to="/history" className="underline">
            Log your first one
          </Link>{' '}
          to see stats here.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <ChartSection title="Games logged over time">
            <GamesByMonthChart data={stats.gamesByMonth} />
          </ChartSection>
          <ChartSection title="Most-played decks">
            <MostPlayedDecksChart data={stats.deckStats} />
          </ChartSection>
          <ChartSection title="Win rate per deck">
            <WinRateChart data={stats.deckStats} />
          </ChartSection>
          <ChartSection title="Most-played pods">
            <MostPlayedPodsChart data={stats.mostPlayedPods} />
          </ChartSection>
        </div>
      )}
    </main>
  )
}

function ChartSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-md border border-border p-4">
      <h2 className="font-medium text-sm uppercase tracking-wide">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function GamesByMonthChart({
  data,
}: {
  data: { month: string; count: number }[]
}) {
  const definition = useMemo(
    () =>
      defineChart({
        marks: [lineY(data, { x: 'month', y: 'count', points: true })],
        scales: {
          x: { scale: () => scalePoint<string>().padding(0.2) },
          y: {
            scale: scaleLinear,
            nice: true,
            grid: true,
            axis: { label: 'Games' },
          },
        },
        tooltip,
      }),
    [data],
  )

  return (
    <Chart
      definition={definition}
      height={CHART_HEIGHT}
      ariaLabel="Games logged per month"
    />
  )
}

function MostPlayedDecksChart({ data }: { data: DeckGameStat[] }) {
  const definition = useMemo(
    () =>
      defineChart({
        marks: [barY(data, { x: 'deckName', y: 'games', inset: 2 })],
        scales: {
          x: {
            scale: () =>
              scaleBand<string>()
                .domain(data.map((row) => row.deckName))
                .padding(0.2),
          },
          y: {
            scale: scaleLinear,
            nice: true,
            grid: true,
            axis: { label: 'Games played' },
          },
        },
        tooltip,
      }),
    [data],
  )

  return (
    <Chart
      definition={definition}
      height={CHART_HEIGHT}
      ariaLabel="Most-played decks by game count"
    />
  )
}

function WinRateChart({ data }: { data: DeckGameStat[] }) {
  const definition = useMemo(
    () =>
      defineChart({
        marks: [barY(data, { x: 'deckName', y: 'winRatePercent', inset: 2 })],
        scales: {
          x: {
            scale: () =>
              scaleBand<string>()
                .domain(data.map((row) => row.deckName))
                .padding(0.2),
          },
          y: {
            scale: scaleLinear,
            nice: true,
            grid: true,
            axis: { label: 'Win rate %' },
          },
        },
        tooltip,
      }),
    [data],
  )

  return (
    <Chart
      definition={definition}
      height={CHART_HEIGHT}
      ariaLabel="Win rate percentage per deck"
    />
  )
}

function MostPlayedPodsChart({ data }: { data: PodCount[] }) {
  const definition = useMemo(
    () =>
      defineChart({
        marks: [barY(data, { x: 'pod', y: 'count', inset: 2 })],
        scales: {
          x: {
            scale: () =>
              scaleBand<string>()
                .domain(data.map((row) => row.pod))
                .padding(0.2),
          },
          y: {
            scale: scaleLinear,
            nice: true,
            grid: true,
            axis: { label: 'Games played' },
          },
        },
        tooltip,
      }),
    [data],
  )

  return (
    <Chart
      definition={definition}
      height={CHART_HEIGHT}
      ariaLabel="Most-played pods by game count"
    />
  )
}
