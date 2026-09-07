/**
 * insights.js - Motor de Inteligência Financeira e Alertas Proativos
 */

class InsightsManager {
  constructor() {}

  getInsights(monthStr = window.State.getSettings().selectedMonth || new Date().toISOString().slice(0, 7)) {
    const totals = window.Transactions.getMonthTotals(monthStr);
    const budgetAnalysis = window.Budgets.getBudgetAnalysis(monthStr);
    const goalsAnalysis = window.Goals.getGoalsAnalysis();
    const accountsInfo = window.Accounts.getTotalNetWorth();
    const insights = [];

    // 1. Alerta de Tetos Ultrapassados
    const exceeded = budgetAnalysis.items.filter(i => i.status === 'exceeded');
    if (exceeded.length > 0) {
      const names = exceeded.map(e => `<strong>${e.name}</strong> (R$ ${(e.spent - e.budget).toFixed(2)} acima)`).join(', ');
      insights.push({
        type: 'danger',
        icon: 'alert-triangle',
        title: 'Tetos de Gastos Ultrapassados',
        message: `Atenção: Você estourou o limite em ${exceeded.length} categoria(s): ${names}. Reavalie seus gastos discricionários.`
      });
    }

    // 2. Alerta de Tetos Próximos do Limite (75% a 99%)
    const warning = budgetAnalysis.items.filter(i => i.status === 'warning');
    if (warning.length > 0) {
      const names = warning.map(w => `<strong>${w.name}</strong> (${w.percentage.toFixed(0)}%)`).join(', ');
      insights.push({
        type: 'warning',
        icon: 'alert-circle',
        title: 'Categorias Próximas do Teto',
        message: `Fique atento! As categorias ${names} já consumiram mais de 75% do orçamento previsto.`
      });
    }

    // 3. Taxa de Economia / Poupança
    if (totals.totalIncome > 0) {
      if (totals.savingsRate >= 20) {
        insights.push({
          type: 'success',
          icon: 'sparkles',
          title: 'Excelente Taxa de Poupança!',
          message: `Parabéns! Você está economizando <strong>${totals.savingsRate.toFixed(1)}%</strong> da sua receita neste mês (Meta recomendada: 20%). Que tal direcionar parte para suas metas?`
        });
      } else if (totals.savingsRate > 0) {
        insights.push({
          type: 'info',
          icon: 'info',
          title: 'Poupança Positiva',
          message: `Sua taxa de economia está em <strong>${totals.savingsRate.toFixed(1)}%</strong>. O ideal segundo a regra 50-30-20 é poupar ao menos 20% das receitas.`
        });
      } else if (totals.balance < 0) {
        insights.push({
          type: 'danger',
          icon: 'trending-down',
          title: 'Balanço Mensal Negativo',
          message: `Suas despesas no mês superam as receitas em <strong>${StateManager.formatCurrency(Math.abs(totals.balance))}</strong>. Evite usar o rotativo ou cheque especial.`
        });
      }
    }

    // 4. Progresso de Metas
    const pendingGoals = goalsAnalysis.goals.filter(g => !g.isCompleted && g.monthlySavingNeeded > 0);
    if (pendingGoals.length > 0) {
      const priorityGoal = pendingGoals[0];
      insights.push({
        type: 'info',
        icon: 'target',
        title: `Meta em Foco: ${priorityGoal.name}`,
        message: `Para atingir o objetivo no prazo estimado (${StateManager.formatDateBR(priorityGoal.deadline)}), guarde <strong>${StateManager.formatCurrency(priorityGoal.monthlySavingNeeded)}/mês</strong>.`
      });
    }

    // 5. Economia Gerada no Orçamento
    if (budgetAnalysis.totalSaved > 0 && exceeded.length === 0) {
      insights.push({
        type: 'success',
        icon: 'award',
        title: 'Disciplina nos Orçamentos',
        message: `Você está mantendo todas as categorias dentro do planejado e gerando uma economia de <strong>${StateManager.formatCurrency(budgetAnalysis.totalSaved)}</strong> em relação ao teto orçado.`
      });
    }

    return insights;
  }
}

window.Insights = new InsightsManager();
