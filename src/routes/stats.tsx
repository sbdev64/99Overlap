import { barY, defineChart, lineY } from '@tanstack/charts'
import { Chart } from '@tanstack/charts/react'
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { scalePoint } from '@tanstack/charts/scales/point'
import { tooltip } from '@tanstack/charts/tooltip'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo } from 'react'
import { toDisplayDate } from '@/lib/date-format'
import {
  type ColorIdentityCount,
  type GatheringDustDeck,
  getCollectionStats,
  type ManaCurveEntry,
} from '@/server/collection-stats'
import { type DeckGameStat, getGameStats, type PodCount } from '@/server/stats'

export const Route = createFileRoute('/stats')({
  component: StatsPage,
  loader: async () => {
    const [gameStats, collectionStats] = await Promise.all([
      getGameStats(),
      getCollectionStats(),
    ])
    return { gameStats, collectionStats }
  },
})

const CHART_HEIGHT = 260

function StatsPage() {
  const { gameStats, collectionStats } = Route.useLoaderData()
  const hasCollectionData = collectionStats.colorIdentityDistribution.length > 0

  return (
    <main>
      <h1 className="font-display font-semibold text-2xl">Statistics</h1>
      <p className="text-muted-foreground">
        Built from your {gameStats.totalGames} logged game
        {gameStats.totalGames === 1 ? '' : 's'}.
      </p>

      {gameStats.totalGames === 0 ? (
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
            <GamesByMonthChart data={gameStats.gamesByMonth} />
          </ChartSection>
          <ChartSection title="Most-played decks">
            <MostPlayedDecksChart data={gameStats.deckStats} />
          </ChartSection>
          <ChartSection title="Win rate per deck">
            <WinRateChart data={gameStats.deckStats} />
          </ChartSection>
          <ChartSection title="Most-played pods">
            <MostPlayedPodsChart data={gameStats.mostPlayedPods} />
          </ChartSection>
        </div>
      )}

      <h2 className="mt-10 font-medium text-sm uppercase tracking-wide">
        Collection
      </h2>
      {!hasCollectionData ? (
        <p className="mt-2 text-muted-foreground">
          Import a precon or custom deck to see collection stats here.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <ChartSection title="Color identity across owned decks">
            <ColorIdentityChart
              data={collectionStats.colorIdentityDistribution}
            />
          </ChartSection>
          <ChartSection title="Mana curve across owned decks">
            <ManaCurveChart data={collectionStats.manaCurve} />
          </ChartSection>
        </div>
      )}

      <ChartSection title="Gathering dust (not played in 90+ days)">
        <GatheringDustList decks={collectionStats.gatheringDust} />
      </ChartSection>
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

function ColorIdentityChart({ data }: { data: ColorIdentityCount[] }) {
  const definition = useMemo(
    () =>
      defineChart({
        marks: [barY(data, { x: 'label', y: 'count', inset: 2 })],
        scales: {
          x: {
            scale: () =>
              scaleBand<string>()
                .domain(data.map((row) => row.label))
                .padding(0.2),
          },
          y: {
            scale: scaleLinear,
            nice: true,
            grid: true,
            axis: { label: 'Decks' },
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
      ariaLabel="Color identity distribution across owned decks"
    />
  )
}

function ManaCurveChart({ data }: { data: ManaCurveEntry[] }) {
  const definition = useMemo(
    () =>
      defineChart({
        marks: [barY(data, { x: 'label', y: 'count', inset: 2 })],
        scales: {
          x: {
            scale: () =>
              scaleBand<string>()
                .domain(data.map((row) => row.label))
                .padding(0.2),
          },
          y: {
            scale: scaleLinear,
            nice: true,
            grid: true,
            axis: { label: 'Cards' },
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
      ariaLabel="Mana curve across owned decks"
    />
  )
}

function GatheringDustList({ decks }: { decks: GatheringDustDeck[] }) {
  if (decks.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No decks are gathering dust.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-2 text-sm">
      {decks.map((deck) => (
        <li key={deck.deckId} className="flex items-center justify-between">
          <Link
            to="/decks/$deckId"
            params={{ deckId: String(deck.deckId) }}
            className="underline"
          >
            {deck.deckName}
          </Link>
          <span className="text-muted-foreground">
            {deck.lastPlayedDate === null
              ? 'Never played'
              : `Last played ${toDisplayDate(deck.lastPlayedDate)} (${deck.daysSincePlayed} days ago)`}
          </span>
        </li>
      ))}
    </ul>
  )
}
