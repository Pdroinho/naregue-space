import { useEffect, useMemo, useRef } from 'react'
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartConfiguration,
} from 'chart.js'

Chart.register(BarController, BarElement, CategoryScale, Filler, Legend, LineController, LineElement, LinearScale, PointElement, Tooltip)

export type FinanceFlowPoint = {
  ym: string
  label: string
  entriesCents: number
  expensesCents: number
  balanceCents: number
}

type FinanceFlowChartProps = {
  data: FinanceFlowPoint[]
  currentMonthYm: string
  formatCurrency: (value: number) => string
}

function cssColor(element: HTMLElement, name: string, fallback: string) {
  return getComputedStyle(element).getPropertyValue(name).trim() || fallback
}

export function FinanceFlowChart({ data, currentMonthYm, formatCurrency }: FinanceFlowChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const movementMonths = useMemo(
    () => data.filter((month) => month.entriesCents > 0 || month.expensesCents > 0).length,
    [data],
  )
  const hasAnyMovement = movementMonths > 0

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !hasAnyMovement) return
    const income = cssColor(canvas, '--finance-income', '#267657')
    const expense = cssColor(canvas, '--finance-expense', '#a6463e')
    const accent = cssColor(canvas, '--finance-accent', '#9b3f36')
    const muted = cssColor(canvas, '--finance-muted', '#687980')
    const line = cssColor(canvas, '--finance-line', '#dde2df')
    const paper = cssColor(canvas, '--finance-paper', '#fffdf9')

    const config: ChartConfiguration<'bar' | 'line', number[], string> = {
      type: 'bar',
      data: {
        labels: data.map((point) => point.label),
        datasets: [
          {
            type: 'bar',
            label: 'Entradas',
            data: data.map((point) => point.entriesCents / 100),
            backgroundColor: income,
            borderRadius: 6,
            borderSkipped: false,
            maxBarThickness: 24,
            categoryPercentage: .64,
            barPercentage: .82,
          },
          {
            type: 'bar',
            label: 'Saídas',
            data: data.map((point) => point.expensesCents / 100),
            backgroundColor: expense,
            borderRadius: 6,
            borderSkipped: false,
            maxBarThickness: 24,
            categoryPercentage: .64,
            barPercentage: .82,
          },
          {
            type: 'line',
            label: 'Saldo',
            data: data.map((point) => point.balanceCents / 100),
            borderColor: accent,
            backgroundColor: paper,
            pointBackgroundColor: data.map((point) => point.ym === currentMonthYm ? accent : paper),
            pointBorderColor: accent,
            pointBorderWidth: 2,
            pointRadius: data.map((point) => point.ym === currentMonthYm ? 4 : 2.5),
            pointHoverRadius: 5,
            borderWidth: 2.25,
            tension: .34,
            spanGaps: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        normalized: true,
        interaction: { mode: 'index', intersect: false },
        animation: { duration: 260 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#031722',
            titleColor: '#fffdf8',
            bodyColor: '#f7f0e4',
            padding: 11,
            cornerRadius: 10,
            displayColors: true,
            callbacks: { label: (context) => `${context.dataset.label}: ${formatCurrency(Number(context.raw ?? 0))}` },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { color: muted, font: { size: 11, weight: 600 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: line, lineWidth: 1 },
            border: { display: false },
            ticks: {
              color: muted,
              maxTicksLimit: 5,
              padding: 8,
              font: { size: 10, weight: 600 },
              callback: (value) => {
                const amount = Number(value)
                if (Math.abs(amount) >= 1000) return `R$ ${(amount / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
                return `R$ ${amount.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
              },
            },
          },
        },
      },
    }

    const chart = new Chart(canvas, config)
    return () => chart.destroy()
  }, [currentMonthYm, data, formatCurrency, hasAnyMovement])

  return (
    <div className="nr-finance-entry-chart-shell">
      <div className="nr-finance-entry-chart-canvas">
        {hasAnyMovement ? <canvas ref={canvasRef} role="img" aria-label="Comparativo de entradas, saídas e saldo dos últimos seis meses" /> : null}
        {!hasAnyMovement ? (
          <div className="nr-finance-entry-chart-empty">
            <strong>Seu histórico aparece aqui.</strong>
            <span>Registre movimentações para acompanhar entradas, saídas e saldo ao longo dos meses.</span>
          </div>
        ) : null}
      </div>
      <div className="nr-finance-entry-chart-caption">
        <span>{movementMonths === 1 ? '1 mês com movimentação' : `${movementMonths} meses com movimentação`}</span>
        <small>{movementMonths <= 2 ? 'A leitura fica mais comparável conforme o histórico cresce.' : 'Toque ou passe o cursor pelo gráfico para ver os valores de cada mês.'}</small>
      </div>
      <table className="nr-finance-entry-chart-table sr-only">
        <caption>Valores financeiros dos últimos seis meses</caption>
        <thead><tr><th>Mês</th><th>Entradas</th><th>Saídas</th><th>Saldo</th></tr></thead>
        <tbody>{data.map((point) => <tr key={point.ym}><th>{point.label}</th><td>{formatCurrency(point.entriesCents / 100)}</td><td>{formatCurrency(point.expensesCents / 100)}</td><td>{formatCurrency(point.balanceCents / 100)}</td></tr>)}</tbody>
      </table>
    </div>
  )
}
