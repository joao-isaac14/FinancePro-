/**
 * goals.js - Gestão de Metas Financeiras (Cofrinhos / Objetivos)
 */

class GoalsManager {
  constructor() {}

  getGoalsAnalysis() {
    const goals = window.State.getGoals();
    let totalTarget = 0;
    let totalAccumulated = 0;

    const analyzedGoals = goals.map(g => {
      const target = Number(g.targetAmount) || 0;
      const current = Number(g.currentAmount) || 0;
      const percentage = target > 0 ? (current / target) * 100 : 0;
      const remaining = Math.max(0, target - current);

      totalTarget += target;
      totalAccumulated += current;

      // Calcular tempo restante e esforço mensal
      let monthsRemaining = 0;
      let monthlySavingNeeded = 0;
      if (g.deadline) {
        const deadlineDate = new Date(g.deadline);
        const now = new Date();
        const diffYears = deadlineDate.getFullYear() - now.getFullYear();
        const diffMonths = (diffYears * 12) + (deadlineDate.getMonth() - now.getMonth());
        monthsRemaining = Math.max(1, diffMonths);
        monthlySavingNeeded = remaining / monthsRemaining;
      }

      return {
        ...g,
        target,
        current,
        percentage: Math.min(100, percentage),
        remaining,
        monthsRemaining,
        monthlySavingNeeded: Math.max(0, monthlySavingNeeded),
        isCompleted: current >= target
      };
    });

    const totalPercentage = totalTarget > 0 ? (totalAccumulated / totalTarget) * 100 : 0;

    return {
      goals: analyzedGoals,
      totalTarget,
      totalAccumulated,
      totalRemaining: Math.max(0, totalTarget - totalAccumulated),
      totalPercentage: Math.min(100, totalPercentage)
    };
  }
}

window.Goals = new GoalsManager();
