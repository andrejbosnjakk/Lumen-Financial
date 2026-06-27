import type { AnalyticsData, Subscription, ZombieSubscription, Insight, AgeComparison } from './types'

type Period = 'week' | 'month' | '3months' | 'year' | 'all'

export type PdfReportExtras = {
  subscriptions?: Subscription[]
  zombies?: ZombieSubscription[]
  insights?: Insight[]
  ageComparisons?: AgeComparison[]
  ageGroup?: string
}

function fmt(n: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
}

function periodLabel(period: Period): string {
  const now = new Date()
  switch (period) {
    case 'week':    return `Week of ${now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
    case 'month':   return now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    case '3months': return 'Last 3 months'
    case 'year':    return `${now.getFullYear()}`
    case 'all':     return 'All time'
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = any

function getY(doc: AnyDoc): number {
  return doc.lastAutoTable?.finalY ?? 0
}

function sectionHeader(doc: AnyDoc, text: string, y: number): void {
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text(text, 14, y)
}

export async function generatePdfReport(data: AnalyticsData, period: Period, extras: PdfReportExtras = {}) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF()
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()

  function checkPageBreak(y: number, needed = 40): number {
    if (y + needed > H - 20) { doc.addPage(); return 20 }
    return y
  }

  // Header
  doc.setFillColor(17, 17, 17)
  doc.rect(0, 0, W, 38, 'F')

  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('Lumen', 14, 17)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 180, 180)
  doc.text('Financial Report', 14, 25)
  doc.text(`Period: ${periodLabel(period)}`, 14, 32)

  const genDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  doc.text(`Generated: ${genDate}`, W - 14, 32, { align: 'right' })

  // Summary
  let y = 50
  sectionHeader(doc, 'Summary', y)
  y += 6

  autoTable(doc, {
    startY: y,
    body: [
      ['Total Income',   fmt(data.totalIncome)],
      ['Total Expenses', fmt(data.totalExpenses)],
      ['Net Savings',    fmt(data.netSavings)],
    ],
    theme: 'plain',
    styles: { fontSize: 11, cellPadding: { top: 3, bottom: 3, left: 0, right: 0 } },
    columnStyles: {
      0: { cellWidth: 80, fontStyle: 'normal', textColor: [80, 80, 80] },
      1: { halign: 'right', fontStyle: 'bold' },
    },
  })

  y = getY(doc) + 12

  // Spending by category
  const categoryRows = Object.entries(data.byCategory).sort(([, a], [, b]) => b - a)

  if (categoryRows.length > 0) {
    y = checkPageBreak(y, 60)
    sectionHeader(doc, 'Spending by Category', y)
    y += 4

    const total = categoryRows.reduce((s, [, v]) => s + v, 0)

    autoTable(doc, {
      startY: y,
      head: [['Category', 'Amount', 'Share']],
      body: categoryRows.map(([cat, amount]) => [cat, fmt(amount), `${((amount / total) * 100).toFixed(1)}%`]),
      theme: 'striped',
      headStyles: { fillColor: [17, 17, 17], textColor: 255, fontSize: 10, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right', textColor: [100, 100, 100] } },
    })

    y = getY(doc) + 12
  }

  // Top merchants
  if (data.topMerchants.length > 0) {
    y = checkPageBreak(y, 60)
    sectionHeader(doc, 'Top Merchants', y)
    y += 4

    autoTable(doc, {
      startY: y,
      head: [['Merchant', 'Transactions', 'Total Spent']],
      body: data.topMerchants.map((m) => [m.description, m.count, fmt(m.total)]),
      theme: 'striped',
      headStyles: { fillColor: [17, 17, 17], textColor: 255, fontSize: 10, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    })

    y = getY(doc) + 12
  }

  // Insights
  if (extras.insights && extras.insights.length > 0) {
    y = checkPageBreak(y, 60)
    sectionHeader(doc, 'AI Insights', y)
    y += 4

    autoTable(doc, {
      startY: y,
      head: [['Insight', 'Detail']],
      body: extras.insights.map(ins => [ins.title, ins.body]),
      theme: 'striped',
      headStyles: { fillColor: [17, 17, 17], textColor: 255, fontSize: 10, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } },
      columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' }, 1: { cellWidth: 120 } },
    })

    y = getY(doc) + 12
  }

  // Subscriptions
  if (extras.subscriptions && extras.subscriptions.length > 0) {
    y = checkPageBreak(y, 60)
    sectionHeader(doc, 'Active Subscriptions', y)
    y += 4

    const totalMonthly = extras.subscriptions.reduce((s, sub) => s + sub.monthlyEquivalent, 0)

    autoTable(doc, {
      startY: y,
      head: [['Service', 'Frequency', 'Per charge', 'Monthly']],
      body: extras.subscriptions.map(s => [
        s.description,
        s.frequency.charAt(0).toUpperCase() + s.frequency.slice(1),
        fmt(s.amount),
        fmt(s.monthlyEquivalent),
      ]),
      foot: [['', '', 'Total /month', fmt(totalMonthly)]],
      theme: 'striped',
      headStyles: { fillColor: [17, 17, 17], textColor: 255, fontSize: 10, fontStyle: 'bold' },
      footStyles: { fillColor: [240, 240, 240], fontStyle: 'bold', fontSize: 10 },
      styles: { fontSize: 10, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } },
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' } },
    })

    y = getY(doc) + 12
  }

  // Zombie subscriptions
  if (extras.zombies && extras.zombies.length > 0) {
    y = checkPageBreak(y, 60)
    sectionHeader(doc, 'Zombie Subscriptions - Review These', y)
    y += 2
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120, 120, 120)
    doc.text('These charges may be forgotten or inactive. Review and cancel if unused.', 14, y + 4)
    y += 8

    autoTable(doc, {
      startY: y,
      head: [['Service', 'Issue', 'Last charged', 'Monthly cost']],
      body: extras.zombies.map(z => [
        z.description,
        z.zombieReason === 'overdue'
          ? `No charge in ${z.staleDays} days (expected ${z.frequency})`
          : `Small recurring - ${z.count} months, easy to overlook`,
        new Date(z.lastCharge).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        fmt(z.monthlyEquivalent),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [120, 60, 0], textColor: 255, fontSize: 10, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } },
      columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } },
    })

    y = getY(doc) + 12
  }

  // Age-group comparison
  if (extras.ageComparisons && extras.ageComparisons.length > 0 && extras.ageGroup) {
    y = checkPageBreak(y, 60)
    sectionHeader(doc, `Peer Comparison - ${extras.ageGroup} Age Group`, y)
    y += 2
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120, 120, 120)
    doc.text('Your monthly category spending vs the average for your age group (based on 1M transactions).', 14, y + 4)
    y += 8

    autoTable(doc, {
      startY: y,
      head: [['Category', 'Your avg/mo', 'Peer avg/mo', 'Difference']],
      body: extras.ageComparisons.map(c => {
        const pct = Math.round((c.ratio - 1) * 100)
        return [
          c.category,
          fmt(c.userMonthly),
          fmt(c.benchmarkMonthly),
          `${pct > 0 ? '+' : ''}${pct}%`,
        ]
      }),
      theme: 'striped',
      headStyles: { fillColor: [17, 17, 17], textColor: 255, fontSize: 10, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right', textColor: [100, 100, 100] },
        3: { halign: 'right', fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          const val = String(data.cell.raw)
          if (val.startsWith('+')) data.cell.styles.textColor = [180, 40, 40]
          else if (val.startsWith('-')) data.cell.styles.textColor = [20, 130, 70]
        }
      },
    })

    y = getY(doc) + 12
  }

  // Footer on every page
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(160, 160, 160)
    doc.text(`Lumen Financial Report - Page ${i} of ${pageCount}`, W / 2, H - 8, { align: 'center' })
  }

  doc.save(`lumen-report-${period}-${new Date().toISOString().split('T')[0]}.pdf`)
}
