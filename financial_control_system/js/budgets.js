/**
 * budgets.js - Gerenciamento de Tetos de Gastos (Orçamentos por Categoria) e Alertas
 */

class BudgetManager {
  constructor() {}

  // Obter análise completa de orçamento do mês selecionado
  getBudgetAnalysis(monthStr = window.State.getSettings().selectedMonth || new Date().toISOString().slice(0, 7)) {
    const categories = window.State.getCategories().filter(c => c.type === 'expense');
    const expensesByCategory = window.Transactions.getExpensesByCategory(monthStr);

    let totalBudget = 0;
    let totalSpentInBudgets = 0;
    let totalSaved = 0;
    let totalExceeded = 0;

    const items = categories.map(cat => {
      const budget = Number(cat.budget) || 0;
      const match = expensesByCategory.find(e => e.id === cat.id);
      const spent = match ? match.spent : 0;
      const count = match ? match.count : 0;

      let percentage = 0;
      if (budget > 0) {
        percentage = (spent / budget) * 100;
        totalBudget += budget;
        totalSpentInBudgets += spent;
      }

      let status = 'safe'; // verde
      let remaining = budget - spent;

      if (budget > 0) {
        if (spent > budget) {
          status = 'exceeded'; // vermelho
          totalExceeded += (spent - budget);
        } else if (percentage >= 75) {
          status = 'warning'; // amarelo
          totalSaved += remaining;
        } else {
          status = 'safe'; // verde
          totalSaved += remaining;
        }
      }

      return {
        id: cat.id,
        name: cat.name,
        color: cat.color,
        icon: cat.icon,
        budget: budget,
        spent: spent,
        count: count,
        remaining: remaining,
        percentage: percentage,
        status: status // 'safe' | 'warning' | 'exceeded' | 'no_budget'
      };
    }).sort((a, b) => b.spent - a.spent);

    const overallPercentage = totalBudget > 0 ? (totalSpentInBudgets / totalBudget) * 100 : 0;

    return {
      items,
      totalBudget,
      totalSpentInBudgets,
      totalSaved,
      totalExceeded,
      overallPercentage
    };
  }

  // Atualizar teto de gasto de uma categoria
  updateCategoryBudget(categoryId, newBudget) {
    const cat = window.State.getCategoryById(categoryId);
    if (cat) {
      cat.budget = Math.max(0, parseFloat(newBudget) || 0);
      window.State.updateCategory(categoryId, cat);
      return true;
    }
    return false;
  }
}

window.Budgets = new BudgetManager();
