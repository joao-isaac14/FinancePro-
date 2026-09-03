/**
 * transactions.js - Gestão e Lógica de Lançamentos (Receitas, Despesas, Parcelamentos e Recorrências)
 */

class TransactionsManager {
  constructor() {
    this.currentFilters = {
      month: window.State.getSettings().selectedMonth || new Date().toISOString().slice(0, 7),
      type: 'all',
      categoryId: 'all',
      accountId: 'all',
      search: '',
      status: 'all'
    };
  }

  // Obter transações filtradas
  getFilteredTransactions() {
    const all = window.State.getTransactions();
    const { month, type, categoryId, accountId, search, status } = this.currentFilters;

    return all.filter(tx => {
      // Filtro de mês (YYYY-MM)
      if (month && !tx.date.startsWith(month)) {
        return false;
      }
      // Filtro de tipo (income / expense / transfer)
      if (type !== 'all' && tx.type !== type) {
        return false;
      }
      // Filtro de categoria
      if (categoryId !== 'all' && tx.categoryId !== categoryId) {
        return false;
      }
      // Filtro de conta
      if (accountId !== 'all' && tx.accountId !== accountId) {
        return false;
      }
      // Filtro de status (paid / pending)
      if (status !== 'all' && tx.status !== status) {
        return false;
      }
      // Busca por texto na descrição ou observações
      if (search.trim() !== '') {
        const query = search.toLowerCase();
        const descMatch = (tx.description || '').toLowerCase().includes(query);
        const notesMatch = (tx.notes || '').toLowerCase().includes(query);
        if (!descMatch && !notesMatch) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  // Criar Lançamento (com suporte a Parcelamento e Recorrência)
  createTransaction(formData) {
    const {
      description,
      amount,
      type,
      categoryId,
      accountId,
      date,
      status = 'paid',
      isRecurring = false,
      recurringFrequency = 'monthly',
      isInstallment = false,
      installmentsCount = 1,
      notes = ''
    } = formData;

    const baseAmount = Math.abs(parseFloat(amount));
    if (!description || isNaN(baseAmount) || baseAmount <= 0) {
      throw new Error('Por favor, informe uma descrição válida e um valor maior que zero.');
    }

    // Caso 1: Compra Parcelada
    if (isInstallment && parseInt(installmentsCount) > 1) {
      const count = parseInt(installmentsCount);
      const installmentAmount = +(baseAmount / count).toFixed(2);
      const groupId = 'inst_group_' + Date.now();
      const generatedList = [];

      const [baseYear, baseMonth, baseDay] = date.split('-').map(Number);

      for (let i = 1; i <= count; i++) {
        // Calcular data do mês seguinte para cada parcela
        const targetDate = new Date(baseYear, (baseMonth - 1) + (i - 1), baseDay);
        const y = targetDate.getFullYear();
        const m = String(targetDate.getMonth() + 1).padStart(2, '0');
        const d = String(targetDate.getDate()).padStart(2, '0');
        const formattedDate = `${y}-${m}-${d}`;

        generatedList.push({
          id: `tx_${Date.now()}_inst_${i}`,
          description: `${description} (${i}/${count})`,
          amount: installmentAmount,
          type: type,
          categoryId: categoryId,
          accountId: accountId,
          date: formattedDate,
          status: i === 1 ? status : 'pending',
          isInstallment: true,
          installmentCurrent: i,
          installmentTotal: count,
          installmentParentId: groupId,
          notes: notes
        });
      }

      window.State.addMultipleTransactions(generatedList);
      return generatedList;
    }

    // Caso 2: Lançamento Único ou Recorrente
    const singleTx = {
      description,
      amount: baseAmount,
      type,
      categoryId,
      accountId,
      date,
      status,
      isRecurring,
      recurringFrequency: isRecurring ? recurringFrequency : null,
      notes
    };

    return window.State.addTransaction(singleTx);
  }

  // Cálculos de Totais para o Mês Selecionado
  getMonthTotals(monthStr = this.currentFilters.month) {
    const all = window.State.getTransactions();
    let totalIncome = 0;
    let totalExpense = 0;
    let pendingIncome = 0;
    let pendingExpense = 0;

    all.forEach(tx => {
      if (tx.date.startsWith(monthStr)) {
        const val = Number(tx.amount) || 0;
        if (tx.type === 'income') {
          totalIncome += val;
          if (tx.status === 'pending') pendingIncome += val;
        } else if (tx.type === 'expense') {
          totalExpense += val;
          if (tx.status === 'pending') pendingExpense += val;
        }
      }
    });

    const balance = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

    return {
      totalIncome,
      totalExpense,
      balance,
      savingsRate: Math.max(0, savingsRate),
      pendingIncome,
      pendingExpense
    };
  }

  // Gastos agrupados por categoria no mês
  getExpensesByCategory(monthStr = this.currentFilters.month) {
    const all = window.State.getTransactions();
    const categories = window.State.getCategories();
    const categoryMap = {};

    categories.forEach(cat => {
      categoryMap[cat.id] = {
        ...cat,
        spent: 0,
        count: 0
      };
    });

    all.forEach(tx => {
      if (tx.date.startsWith(monthStr) && tx.type === 'expense') {
        if (!categoryMap[tx.categoryId]) {
          categoryMap[tx.categoryId] = {
            id: tx.categoryId,
            name: 'Outros / Sem Categoria',
            color: '#9CA3AF',
            icon: 'tag',
            budget: 0,
            spent: 0,
            count: 0
          };
        }
        categoryMap[tx.categoryId].spent += Number(tx.amount) || 0;
        categoryMap[tx.categoryId].count += 1;
      }
    });

    return Object.values(categoryMap);
  }
}

window.Transactions = new TransactionsManager();
