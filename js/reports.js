/**
 * reports.js - Gráficos Analíticos com Chart.js e Relatórios Comparativos
 */

class ReportsManager {
  constructor() {
    this.charts = {
      categoryPie: null,
      budgetComparison: null,
      cashFlowTrend: null,
      incomeVsExpense: null
    };
  }

  destroyChart(chartKey) {
    if (this.charts[chartKey]) {
      this.charts[chartKey].destroy();
      this.charts[chartKey] = null;
    }
  }

  // 1. Gráfico de Rosca: Gastos por Categoria
  renderCategoryPieChart(canvasId, monthStr) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    this.destroyChart('categoryPie');
    const expensesByCategory = window.Transactions.getExpensesByCategory(monthStr)
      .filter(item => item.spent > 0)
      .sort((a, b) => b.spent - a.spent);

    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#E2E8F0' : '#475569';

    if (expensesByCategory.length === 0) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = '14px Plus Jakarta Sans';
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.fillText('Nenhuma despesa registrada neste período.', canvas.width / 2, canvas.height / 2);
      return;
    }

    const labels = expensesByCategory.map(e => e.name);
    const data = expensesByCategory.map(e => e.spent);
    const colors = expensesByCategory.map(e => e.color || '#3B82F6');

    this.charts.categoryPie = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: isDark ? '#1E293B' : '#FFFFFF',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: textColor,
              font: { family: 'Plus Jakarta Sans', size: 12 },
              padding: 12,
              usePointStyle: true
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const val = context.raw || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                return ` ${context.label}: ${window.StateManager.formatCurrency(val)} (${pct}%)`;
              }
            }
          }
        },
        cutout: '68%'
      }
    });
  }

  // 2. Gráfico de Barras: Comparativo Orçado vs. Realizado por Categoria
  renderBudgetComparisonChart(canvasId, monthStr) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    this.destroyChart('budgetComparison');
    const budgetAnalysis = window.Budgets.getBudgetAnalysis(monthStr);
    const validItems = budgetAnalysis.items.filter(item => item.budget > 0 || item.spent > 0);

    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#E2E8F0' : '#475569';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';

    if (validItems.length === 0) return;

    const labels = validItems.map(i => i.name.split('&')[0].trim());
    const budgetData = validItems.map(i => i.budget);
    const spentData = validItems.map(i => i.spent);

    this.charts.budgetComparison = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Teto Orçado',
            data: budgetData,
            backgroundColor: 'rgba(59, 130, 246, 0.65)',
            borderColor: '#3B82F6',
            borderWidth: 1,
            borderRadius: 6
          },
          {
            label: 'Gasto Realizado',
            data: spentData,
            backgroundColor: spentData.map((s, idx) => {
              const b = budgetData[idx];
              if (b > 0 && s > b) return 'rgba(239, 68, 68, 0.85)'; // vermelho estouro
              return 'rgba(249, 115, 22, 0.75)'; // laranja normal
            }),
            borderColor: spentData.map((s, idx) => {
              const b = budgetData[idx];
              if (b > 0 && s > b) return '#EF4444';
              return '#F97316';
            }),
            borderWidth: 1,
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: { color: textColor, font: { family: 'Plus Jakarta Sans', size: 11 } },
            grid: { display: false }
          },
          y: {
            ticks: {
              color: textColor,
              font: { family: 'Plus Jakarta Sans' },
              callback: (val) => 'R$ ' + val
            },
            grid: { color: gridColor }
          }
        },
        plugins: {
          legend: {
            labels: { color: textColor, font: { family: 'Plus Jakarta Sans' } }
          },
          tooltip: {
            callbacks: {
              label: (context) => ` ${context.dataset.label}: ${window.StateManager.formatCurrency(context.raw)}`
            }
          }
        }
      }
    });
  }

  // 3. Gráfico de Linha / Evolução de Fluxo de Caixa (Últimos 6 Meses)
  renderCashFlowTrendChart(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    this.destroyChart('cashFlowTrend');
    const all = window.State.getTransactions();

    // Obter lista dos últimos 6 meses
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      months.push({ key: mStr, label: label });
    }

    const incomeData = months.map(m => {
      return all
        .filter(t => t.date.startsWith(m.key) && t.type === 'income')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    });

    const expenseData = months.map(m => {
      return all
        .filter(t => t.date.startsWith(m.key) && t.type === 'expense')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    });

    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#E2E8F0' : '#475569';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';

    this.charts.cashFlowTrend = new Chart(canvas, {
      type: 'line',
      data: {
        labels: months.map(m => m.label),
        datasets: [
          {
            label: 'Receitas',
            data: incomeData,
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointRadius: 4
          },
          {
            label: 'Despesas',
            data: expenseData,
            borderColor: '#EF4444',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: { color: textColor, font: { family: 'Plus Jakarta Sans' } },
            grid: { display: false }
          },
          y: {
            ticks: {
              color: textColor,
              font: { family: 'Plus Jakarta Sans' },
              callback: (val) => 'R$ ' + val
            },
            grid: { color: gridColor }
          }
        },
        plugins: {
          legend: {
            labels: { color: textColor, font: { family: 'Plus Jakarta Sans' } }
          },
          tooltip: {
            callbacks: {
              label: (context) => ` ${context.dataset.label}: ${window.StateManager.formatCurrency(context.raw)}`
            }
          }
        }
      }
    });
  }
}

window.Reports = new ReportsManager();
