// utils/backtest/stats.js
// Calcule toutes les statistiques d'un backtest à partir du journal des trades et
// de la courbe d'équité. Indépendant du moteur (peut être testé isolément).
function round(n, d = 2) {
  if (n == null || !isFinite(n)) return n
  const f = Math.pow(10, d)
  return Math.round(n * f) / f
}

function computeStats(trades, equity_curve, initial_balance, final_balance) {
  const total = trades.length
  let gross_profit = 0, gross_loss = 0
  let wins = 0, losses = 0
  let biggest_win = 0, biggest_loss = 0
  let winStreak = 0, lossStreak = 0, maxWinStreak = 0, maxLossStreak = 0

  for (const t of trades) {
    const p = t.profit
    if (p > 0) {
      gross_profit += p; wins++
      winStreak++; lossStreak = 0
      if (winStreak > maxWinStreak) maxWinStreak = winStreak
      if (p > biggest_win) biggest_win = p
    } else if (p < 0) {
      gross_loss += -p; losses++
      lossStreak++; winStreak = 0
      if (lossStreak > maxLossStreak) maxLossStreak = lossStreak
      if (p < biggest_loss) biggest_loss = p
    } else {
      winStreak = 0; lossStreak = 0
    }
  }

  const net_profit = gross_profit - gross_loss
  const avg_win = wins ? gross_profit / wins : 0
  const avg_loss = losses ? gross_loss / losses : 0
  const win_rate = total ? (wins / total) * 100 : 0
  const profit_factor = gross_loss > 0 ? gross_profit / gross_loss : (gross_profit > 0 ? null : 0) // null = pas de perte
  const risk_reward = avg_loss > 0 ? avg_win / avg_loss : (avg_win > 0 ? null : 0)
  const expectancy = total ? net_profit / total : 0

  // Drawdown depuis la courbe d'équité (peak-to-trough).
  let peak = initial_balance
  let maxDD = 0, maxDDpct = 0, sumDD = 0, ddCount = 0
  for (const point of equity_curve) {
    const e = point.equity
    if (e > peak) peak = e
    const dd = peak - e
    if (dd > 0) {
      sumDD += dd; ddCount++
      if (dd > maxDD) maxDD = dd
      const ddPct = peak > 0 ? (dd / peak) * 100 : 0
      if (ddPct > maxDDpct) maxDDpct = ddPct
    }
  }
  const avg_drawdown = ddCount ? sumDD / ddCount : 0

  return {
    initial_balance: round(initial_balance),
    final_balance: round(final_balance),
    total_profit: round(net_profit),      // profit total (= net)
    net_profit: round(net_profit),        // profit net
    gross_profit: round(gross_profit),    // profit brut (gains cumulés)
    gross_loss: round(gross_loss),        // pertes cumulées
    total_return_pct: round(initial_balance > 0 ? (net_profit / initial_balance) * 100 : 0),
    total_trades: total,
    winning_trades: wins,
    losing_trades: losses,
    win_rate: round(win_rate),
    profit_factor: profit_factor == null ? null : round(profit_factor),
    max_drawdown: round(maxDD),
    max_drawdown_pct: round(maxDDpct),
    avg_drawdown: round(avg_drawdown),
    expectancy: round(expectancy),
    risk_reward: risk_reward == null ? null : round(risk_reward),
    avg_win: round(avg_win),
    avg_loss: round(avg_loss),
    biggest_win: round(biggest_win),
    biggest_loss: round(biggest_loss),
    max_win_streak: maxWinStreak,
    max_loss_streak: maxLossStreak,
  }
}

module.exports = { computeStats }
