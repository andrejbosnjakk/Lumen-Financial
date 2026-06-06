import type { AnalyticsData } from './types'

type Period = 'week' | 'month' | '3months' | 'year' | 'all'

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

export async function generatePdfReport(data: AnalyticsData, period: Period) {
  // Dynamic import keeps jsPDF out of the SSR bundle
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF()
  const W = doc.internal.pageSize.getWidth()

  // ── Header ──────────────────────────────────────────────────────────────
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

  // ── Summary cards ────────────────────────────────────────────────────────
  let y = 50
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Summary', 14, y)
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

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12

  // ── Spending by category ─────────────────────────────────────────────────
  const categoryRows = Object.entries(data.byCategory)
    .sort(([, a], [, b]) => b - a)

  if (categoryRows.length > 0) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('Spending by Category', 14, y)
    y += 4

    const total = categoryRows.reduce((s, [, v]) => s + v, 0)

    autoTable(doc, {
      startY: y,
      head: [['Category', 'Amount', 'Share']],
      body: categoryRows.map(([cat, amount]) => [
        cat,
        fmt(amount),
        `${((amount / total) * 100).toFixed(1)}%`,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [17, 17, 17], textColor: 255, fontSize: 10, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right', textColor: [100, 100, 100] },
      },
    })

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12
  }

  // ── Top merchants ────────────────────────────────────────────────────────
  if (data.topMerchants.length > 0) {
    // Start new page if not enough room
    if (y > 220) { doc.addPage(); y = 20 }

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('Top Merchants', 14, y)
    y += 4

    autoTable(doc, {
      startY: y,
      head: [['Merchant', 'Transactions', 'Total Spent']],
      body: data.topMerchants.map((m) => [m.description, m.count, fmt(m.total)]),
      theme: 'striped',
      headStyles: { fillColor: [17, 17, 17], textColor: 255, fontSize: 10, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
      },
    })
  }

  // ── Footer on every page ─────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages()
  const H = doc.internal.pageSize.getHeight()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(160, 160, 160)
    doc.text(`Lumen Financial Report · Page ${i} of ${pageCount}`, W / 2, H - 8, { align: 'center' })
  }

  doc.save(`lumen-report-${period}-${new Date().toISOString().split('T')[0]}.pdf`)
}
