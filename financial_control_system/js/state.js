/**
 * state.js - Gerenciador de Estado Reativo e Persistência Local (LocalStorage)
 */

const STORAGE_KEY = 'finance_pro_data_v1';

// Estrutura inicial padrão de categorias
const DEFAULT_CATEGORIES = [
  // Despesas
  { id: 'cat_alim', name: 'Alimentação & Supermercado', type: 'expense', icon: 'utensils', color: '#EF4444', budget: 1200 },
  { id: 'cat_mor', name: 'Moradia & Contas', type: 'expense', icon: 'home', color: '#F97316', budget: 1800 },
  { id: 'cat_transp', name: 'Transporte & Combustível', type: 'expense', icon: 'car', color: '#F59E0B', budget: 600 },
  { id: 'cat_lazer', name: 'Lazer & Entretenimento', type: 'expense', icon: 'gamepad', color: '#8B5CF6', budget: 400 },
  { id: 'cat_saude', name: 'Saúde & Farmácia', type: 'expense', icon: 'heart-pulse', color: '#EC4899', budget: 350 },
  { id: 'cat_educ', name: 'Educação & Cursos', type: 'expense', icon: 'graduation-cap', color: '#3B82F6', budget: 300 },
  { id: 'cat_compras', name: 'Vestuário & Compras', type: 'expense', icon: 'shopping-bag', color: '#14B8A6', budget: 450 },
  { id: 'cat_serv', name: 'Assinaturas & Serviços', type: 'expense', icon: 'tv', color: '#6366F1', budget: 180 },
  { id: 'cat_outros_desp', name: 'Outras Despesas', type: 'expense', icon: 'tag', color: '#6B7280', budget: 200 },

  // Receitas
  { id: 'cat_salario', name: 'Salário & Pró-labore', type: 'income', icon: 'briefcase', color: '#10B981', budget: 0 },
  { id: 'cat_freela', name: 'Freelance & Serviços', type: 'income', icon: 'laptop', color: '#059669', budget: 0 },
  { id: 'cat_invest', name: 'Rendimentos & Dividendos', type: 'income', icon: 'trending-up', color: '#34D399', budget: 0 },
  { id: 'cat_outros_rec', name: 'Outras Receitas', type: 'income', icon: 'wallet', color: '#6EE7B7', budget: 0 }
];

// Contas e Cartões Padrão
const DEFAULT_ACCOUNTS = [
  { id: 'acc_nubank', name: 'Nubank (Conta Principal)', type: 'checking', initialBalance: 2850.00, color: '#820AD1', icon: 'landmark' },
  { id: 'acc_itau', name: 'Itaú Personalité', type: 'checking', initialBalance: 1420.50, color: '#EC7000', icon: 'landmark' },
  { id: 'acc_wallet', name: 'Carteira (Dinheiro Físico)', type: 'cash', initialBalance: 280.00, color: '#10B981', icon: 'coins' },
  { id: 'acc_poupanca', name: 'Reserva no CDI', type: 'investment', initialBalance: 8500.00, color: '#2563EB', icon: 'piggy-bank' },
  { id: 'card_nubank', name: 'Nubank Ultravioleta', type: 'credit_card', limit: 8000.00, closingDay: 25, dueDay: 5, color: '#4C1D95', icon: 'credit-card' }
];

// Metas Financeiras Padrão
const DEFAULT_GOALS = [
  { id: 'goal_reserva', name: 'Reserva de Emergência (6 Meses)', targetAmount: 15000.00, currentAmount: 8500.00, deadline: '2026-12-31', color: '#10B981', icon: 'shield-check' },
  { id: 'goal_viagem', name: 'Viagem de Férias', targetAmount: 5000.00, currentAmount: 2200.00, deadline: '2026-11-20', color: '#3B82F6', icon: 'plane' },
  { id: 'goal_carro', name: 'Troca de Computador/Setup', targetAmount: 7000.00, currentAmount: 3850.00, deadline: '2026-10-15', color: '#8B5CF6', icon: 'monitor' }
];

// Gerar transações de demonstração para o mês atual
function generateSampleTransactions() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  return [
    {
      id: 'tx_1',
      description: 'Salário Mensal',
      amount: 6200.00,
      type: 'income',
      categoryId: 'cat_salario',
      accountId: 'acc_nubank',
      date: `${year}-${month}-05`,
      status: 'paid',
      isRecurring: true,
      recurringFrequency: 'monthly',
      notes: 'Depósito em conta corrente'
    },
    {
      id: 'tx_2',
      description: 'Projeto Freelance Website',
      amount: 1450.00,
      type: 'income',
      categoryId: 'cat_freela',
      accountId: 'acc_itau',
      date: `${year}-${month}-12`,
      status: 'paid',
      isRecurring: false,
      notes: 'Consultoria de desenvolvimento'
    },
    {
      id: 'tx_3',
      description: 'Rendimento FIIs / CDB',
      amount: 112.40,
      type: 'income',
      categoryId: 'cat_invest',
      accountId: 'acc_poupanca',
      date: `${year}-${month}-15`,
      status: 'paid',
      isRecurring: true,
      recurringFrequency: 'monthly',
      notes: 'Rendimento automático'
    },
    {
      id: 'tx_4',
      description: 'Aluguel do Apartamento',
      amount: 1550.00,
      type: 'expense',
      categoryId: 'cat_mor',
      accountId: 'acc_nubank',
      date: `${year}-${month}-10`,
      status: 'paid',
      isRecurring: true,
      recurringFrequency: 'monthly',
      notes: 'Boleto pago'
    },
    {
      id: 'tx_5',
      description: 'Energia Elétrica & Água',
      amount: 215.80,
      type: 'expense',
      categoryId: 'cat_mor',
      accountId: 'acc_nubank',
      date: `${year}-${month}-14`,
      status: 'paid',
      isRecurring: true,
      recurringFrequency: 'monthly',
      notes: 'Contas básicas'
    },
    {
      id: 'tx_6',
      description: 'Supermercado Mensal',
      amount: 780.50,
      type: 'expense',
      categoryId: 'cat_alim',
      accountId: 'card_nubank',
      date: `${year}-${month}-07`,
      status: 'paid',
      isRecurring: false,
      notes: 'Compras do mês'
    },
    {
      id: 'tx_7',
      description: 'iFood & Jantar Final de Semana',
      amount: 260.00,
      type: 'expense',
      categoryId: 'cat_alim',
      accountId: 'card_nubank',
      date: `${year}-${month}-18`,
      status: 'paid',
      isRecurring: false,
      notes: 'Delivery'
    },
    {
      id: 'tx_8',
      description: 'Abastecimento Posto Shell',
      amount: 240.00,
      type: 'expense',
      categoryId: 'cat_transp',
      accountId: 'card_nubank',
      date: `${year}-${month}-09`,
      status: 'paid',
      isRecurring: false,
      notes: 'Gasolina aditivada'
    },
    {
      id: 'tx_9',
      description: 'Netflix, Spotify & Prime',
      amount: 94.70,
      type: 'expense',
      categoryId: 'cat_serv',
      accountId: 'card_nubank',
      date: `${year}-${month}-08`,
      status: 'paid',
      isRecurring: true,
      recurringFrequency: 'monthly',
      notes: 'Assinaturas de streaming'
    },
    {
      id: 'tx_10',
      description: 'Curso de Especialização (Parcela 2/4)',
      amount: 150.00,
      type: 'expense',
      categoryId: 'cat_educ',
      accountId: 'card_nubank',
      date: `${year}-${month}-20`,
      status: 'paid',
      isInstallment: true,
      installmentCurrent: 2,
      installmentTotal: 4,
      installmentParentId: 'inst_group_1',
      notes: 'Plataforma de cursos'
    },
    {
      id: 'tx_11',
      description: 'Cinema e Passeio no Parque',
      amount: 140.00,
      type: 'expense',
      categoryId: 'cat_lazer',
      accountId: 'acc_wallet',
      date: `${year}-${month}-22`,
      status: 'paid',
      isRecurring: false,
      notes: 'Lazer com amigos'
    },
    {
      id: 'tx_12',
      description: 'Farmácia - Vitaminas e Remédios',
      amount: 120.00,
      type: 'expense',
      categoryId: 'cat_saude',
      accountId: 'acc_nubank',
      date: `${year}-${month}-25`,
      status: 'paid',
      isRecurring: false,
      notes: 'Checkup'
    }
  ];
}

class StateManager {
  constructor() {
    this.subscribers = [];
    this.data = this.loadData();
  }

  loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Erro ao ler do localStorage:', e);
    }
    // Retorna os dados iniciais
    const initialData = {
      categories: DEFAULT_CATEGORIES,
      accounts: DEFAULT_ACCOUNTS,
      goals: DEFAULT_GOALS,
      transactions: generateSampleTransactions(),
      settings: {
        theme: 'light',
        currency: 'BRL',
        selectedMonth: new Date().toISOString().slice(0, 7) // 'YYYY-MM'
      }
    };
    this.saveData(initialData);
    return initialData;
  }

  saveData(data = this.data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      this.notifySubscribers();
    } catch (e) {
      console.error('Erro ao salvar no localStorage:', e);
    }
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  notifySubscribers() {
    this.subscribers.forEach(cb => {
      try {
        cb(this.data);
      } catch (err) {
        console.error('Erro ao notificar subscriber:', err);
      }
    });
  }

  // --- Transações ---
  getTransactions() {
    return this.data.transactions || [];
  }

  getTransactionById(id) {
    return this.getTransactions().find(t => t.id === id);
  }

  addTransaction(tx) {
    if (!tx.id) tx.id = 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    this.data.transactions.unshift(tx);
    this.saveData();
    return tx;
  }

  addMultipleTransactions(txArray) {
    this.data.transactions.unshift(...txArray);
    this.saveData();
  }

  updateTransaction(id, updatedTx) {
    const idx = this.data.transactions.findIndex(t => t.id === id);
    if (idx !== -1) {
      this.data.transactions[idx] = { ...this.data.transactions[idx], ...updatedTx };
      this.saveData();
      return true;
    }
    return false;
  }

  deleteTransaction(id) {
    this.data.transactions = this.data.transactions.filter(t => t.id !== id);
    this.saveData();
  }

  deleteMultipleTransactions(ids) {
    const idSet = new Set(ids);
    this.data.transactions = this.data.transactions.filter(t => !idSet.has(t.id));
    this.saveData();
  }

  toggleTransactionStatus(id) {
    const tx = this.getTransactionById(id);
    if (tx) {
      tx.status = tx.status === 'paid' ? 'pending' : 'paid';
      this.saveData();
      return tx.status;
    }
    return null;
  }

  // --- Categorias & Tetos (Budgets) ---
  getCategories() {
    return this.data.categories || [];
  }

  getCategoryById(id) {
    return this.getCategories().find(c => c.id === id);
  }

  addCategory(cat) {
    if (!cat.id) cat.id = 'cat_' + Date.now();
    this.data.categories.push(cat);
    this.saveData();
    return cat;
  }

  updateCategory(id, updatedCat) {
    const idx = this.data.categories.findIndex(c => c.id === id);
    if (idx !== -1) {
      this.data.categories[idx] = { ...this.data.categories[idx], ...updatedCat };
      this.saveData();
      return true;
    }
    return false;
  }

  deleteCategory(id) {
    this.data.categories = this.data.categories.filter(c => c.id !== id);
    this.saveData();
  }

  // --- Contas & Cartões ---
  getAccounts() {
    return this.data.accounts || [];
  }

  getAccountById(id) {
    return this.getAccounts().find(a => a.id === id);
  }

  addAccount(acc) {
    if (!acc.id) acc.id = 'acc_' + Date.now();
    this.data.accounts.push(acc);
    this.saveData();
    return acc;
  }

  updateAccount(id, updatedAcc) {
    const idx = this.data.accounts.findIndex(a => a.id === id);
    if (idx !== -1) {
      this.data.accounts[idx] = { ...this.data.accounts[idx], ...updatedAcc };
      this.saveData();
      return true;
    }
    return false;
  }

  deleteAccount(id) {
    this.data.accounts = this.data.accounts.filter(a => a.id !== id);
    this.saveData();
  }

  // --- Metas / Cofrinhos ---
  getGoals() {
    return this.data.goals || [];
  }

  getGoalById(id) {
    return this.getGoals().find(g => g.id === id);
  }

  addGoal(goal) {
    if (!goal.id) goal.id = 'goal_' + Date.now();
    this.data.goals.push(goal);
    this.saveData();
    return goal;
  }

  updateGoal(id, updatedGoal) {
    const idx = this.data.goals.findIndex(g => g.id === id);
    if (idx !== -1) {
      this.data.goals[idx] = { ...this.data.goals[idx], ...updatedGoal };
      this.saveData();
      return true;
    }
    return false;
  }

  deleteGoal(id) {
    this.data.goals = this.data.goals.filter(g => g.id !== id);
    this.saveData();
  }

  depositToGoal(goalId, amount, accountId) {
    const goal = this.getGoalById(goalId);
    if (!goal) return false;
    goal.currentAmount = (Number(goal.currentAmount) || 0) + Number(amount);
    
    // Registrar transação de despesa/reserva na conta
    this.addTransaction({
      description: `Aporte na Meta: ${goal.name}`,
      amount: Number(amount),
      type: 'expense',
      categoryId: 'cat_outros_desp',
      accountId: accountId,
      date: new Date().toISOString().slice(0, 10),
      status: 'paid',
      notes: `Depósito para objetivo financeiro`
    });

    this.saveData();
    return true;
  }

  withdrawFromGoal(goalId, amount, accountId) {
    const goal = this.getGoalById(goalId);
    if (!goal) return false;
    goal.currentAmount = Math.max(0, (Number(goal.currentAmount) || 0) - Number(amount));

    // Registrar transação de receita/resgate na conta
    this.addTransaction({
      description: `Resgate da Meta: ${goal.name}`,
      amount: Number(amount),
      type: 'income',
      categoryId: 'cat_outros_rec',
      accountId: accountId,
      date: new Date().toISOString().slice(0, 10),
      status: 'paid',
      notes: `Resgate de objetivo financeiro`
    });

    this.saveData();
    return true;
  }

  // --- Configurações & Reset ---
  getSettings() {
    return this.data.settings || { theme: 'light', selectedMonth: new Date().toISOString().slice(0, 7) };
  }

  updateSettings(newSettings) {
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.saveData();
  }

  resetToSampleData() {
    this.data = {
      categories: DEFAULT_CATEGORIES,
      accounts: DEFAULT_ACCOUNTS,
      goals: DEFAULT_GOALS,
      transactions: generateSampleTransactions(),
      settings: {
        theme: 'light',
        currency: 'BRL',
        selectedMonth: new Date().toISOString().slice(0, 7)
      }
    };
    this.saveData();
  }

  clearAllData() {
    this.data = {
      categories: DEFAULT_CATEGORIES.map(c => ({ ...c, budget: 0 })),
      accounts: [DEFAULT_ACCOUNTS[0]],
      goals: [],
      transactions: [],
      settings: {
        theme: 'light',
        currency: 'BRL',
        selectedMonth: new Date().toISOString().slice(0, 7)
      }
    };
    this.saveData();
  }

  exportBackupJSON() {
    const jsonStr = JSON.stringify(this.data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_financas_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importBackupJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.categories && parsed.transactions) {
        this.data = parsed;
        this.saveData();
        return true;
      }
    } catch (e) {
      console.error('Erro no formato JSON de backup:', e);
    }
    return false;
  }

  // --- Formatadores Úteis ---
  static formatCurrency(value) {
    const num = Number(value) || 0;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  static formatDateBR(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }
}

// Instância Global
window.StateManager = StateManager;
window.State = new StateManager();

