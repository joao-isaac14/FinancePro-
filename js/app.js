/**
 * app.js - Controlador Principal da Aplicação SPA, Roteamento de Abas e Modais
 */

class AppController {
  constructor() {
    this.currentTab = 'dashboard';
    this.init();
  }

  init() {
    this.authMode = 'login';
    this.applyTheme(window.State.getSettings().theme);
    this.bindGlobalEvents();
    this.setupMonthSelector();
    this.setupFirebaseSyncListeners();
    this.renderCurrentView();

    // Reagir a qualquer alteração de estado
    window.State.subscribe(() => {
      this.renderCurrentView();
      if (window.lucide) window.lucide.createIcons();
    });

    if (window.lucide) window.lucide.createIcons();
  }

  // --- Controle de Tema (Dark / Light) ---
  applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  toggleTheme() {
    const current = window.State.getSettings().theme;
    const next = current === 'dark' ? 'light' : 'dark';
    window.State.updateSettings({ theme: next });
    this.applyTheme(next);
    this.showToast(`Modo ${next === 'dark' ? 'Escuro' : 'Claro'} ativado!`, 'info');
  }

  // --- Sistema de Notificações Toast ---
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const bgColors = {
      success: 'bg-emerald-600 text-white',
      danger: 'bg-rose-600 text-white',
      warning: 'bg-amber-500 text-white',
      info: 'bg-indigo-600 text-white'
    };

    const icons = {
      success: 'check-circle',
      danger: 'alert-triangle',
      warning: 'alert-circle',
      info: 'info'
    };

    toast.className = `toast ${bgColors[type] || bgColors.info}`;
    toast.innerHTML = `
      <i data-lucide="${icons[type] || 'info'}" class="w-5 h-5 flex-shrink-0"></i>
      <span class="text-sm font-medium flex-1">${message}</span>
      <button class="opacity-80 hover:opacity-100 transition ml-2" onclick="this.parentElement.remove()">
        <i data-lucide="x" class="w-4 h-4"></i>
      </button>
    `;

    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
      }
    }, 4000);
  }

  // --- Seletor Global de Mês ---
  setupMonthSelector() {
    const monthInput = document.getElementById('global-month-picker');
    if (monthInput) {
      monthInput.value = window.State.getSettings().selectedMonth;
      monthInput.addEventListener('change', (e) => {
        window.State.updateSettings({ selectedMonth: e.target.value });
        window.Transactions.currentFilters.month = e.target.value;
        this.renderCurrentView();
      });
    }

    const prevBtn = document.getElementById('btn-prev-month');
    const nextBtn = document.getElementById('btn-next-month');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        const cur = window.State.getSettings().selectedMonth;
        const [y, m] = cur.split('-').map(Number);
        const d = new Date(y, m - 2, 1);
        const nextMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        window.State.updateSettings({ selectedMonth: nextMonthStr });
        window.Transactions.currentFilters.month = nextMonthStr;
        if (monthInput) monthInput.value = nextMonthStr;
        this.renderCurrentView();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const cur = window.State.getSettings().selectedMonth;
        const [y, m] = cur.split('-').map(Number);
        const d = new Date(y, m, 1);
        const nextMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        window.State.updateSettings({ selectedMonth: nextMonthStr });
        window.Transactions.currentFilters.month = nextMonthStr;
        if (monthInput) monthInput.value = nextMonthStr;
        this.renderCurrentView();
      });
    }
  }

  // --- Troca de Abas ---
  switchTab(tabId) {
    this.currentTab = tabId;

    // Atualizar classes dos links de navegação
    document.querySelectorAll('[data-nav-tab]').forEach(btn => {
      const active = btn.getAttribute('data-nav-tab') === tabId;
      if (active) {
        btn.classList.add('bg-indigo-50', 'text-indigo-600', 'dark:bg-indigo-950/50', 'dark:text-indigo-400', 'font-semibold');
        btn.classList.remove('text-slate-600', 'dark:text-slate-400', 'hover:bg-slate-100', 'dark:hover:bg-slate-800');
      } else {
        btn.classList.remove('bg-indigo-50', 'text-indigo-600', 'dark:bg-indigo-950/50', 'dark:text-indigo-400', 'font-semibold');
        btn.classList.add('text-slate-600', 'dark:text-slate-400', 'hover:bg-slate-100', 'dark:hover:bg-slate-800');
      }
    });

    // Ocultar todas as seções de view e exibir a atual
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('hidden'));
    const targetSection = document.getElementById(`view-${tabId}`);
    if (targetSection) {
      targetSection.classList.remove('hidden');
    }

    this.renderCurrentView();
    if (window.lucide) window.lucide.createIcons();
  }

  // --- Renderização Dinâmica da Visão Ativa ---
  renderCurrentView() {
    const selectedMonth = window.State.getSettings().selectedMonth;

    // Atualizar badge de mês na barra superior
    const monthDisplay = document.getElementById('current-month-display');
    if (monthDisplay) {
      const [y, m] = selectedMonth.split('-').map(Number);
      const d = new Date(y, m - 1, 1);
      monthDisplay.textContent = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    }

    switch (this.currentTab) {
      case 'dashboard':
        this.renderDashboard(selectedMonth);
        break;
      case 'transactions':
        this.renderTransactionsView();
        break;
      case 'budgets':
        this.renderBudgetsView(selectedMonth);
        break;
      case 'goals':
        this.renderGoalsView();
        break;
      case 'accounts':
        this.renderAccountsView();
        break;
      case 'reports':
        this.renderReportsView(selectedMonth);
        break;
      case 'calendar':
        this.renderCalendarView();
        break;
      case 'importer':
        this.renderImporterView();
        break;
    }

    if (window.lucide) window.lucide.createIcons();
  }

  // 1. Dashboard
  renderDashboard(monthStr) {
    const totals = window.Transactions.getMonthTotals(monthStr);
    const budgetAnalysis = window.Budgets.getBudgetAnalysis(monthStr);
    const netWorth = window.Accounts.getTotalNetWorth();
    const insights = window.Insights.getInsights(monthStr);

    // Cards de Resumo
    document.getElementById('dash-income').textContent = StateManager.formatCurrency(totals.totalIncome);
    document.getElementById('dash-expense').textContent = StateManager.formatCurrency(totals.totalExpense);
    
    const balanceEl = document.getElementById('dash-balance');
    balanceEl.textContent = StateManager.formatCurrency(totals.balance);
    balanceEl.className = `text-2xl font-bold ${totals.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`;

    document.getElementById('dash-savings-rate').textContent = `${totals.savingsRate.toFixed(1)}%`;
    document.getElementById('dash-networth').textContent = StateManager.formatCurrency(netWorth.netWorth);

    // Card de Economia / Teto
    const budgetStatusEl = document.getElementById('dash-budget-status');
    if (budgetStatusEl) {
      const exceededCount = budgetAnalysis.items.filter(i => i.status === 'exceeded').length;
      if (exceededCount > 0) {
        budgetStatusEl.innerHTML = `<span class="text-rose-500 font-semibold flex items-center gap-1"><i data-lucide="alert-triangle" class="w-4 h-4"></i> ${exceededCount} categoria(s) estourada(s)</span>`;
      } else {
        budgetStatusEl.innerHTML = `<span class="text-emerald-500 font-semibold flex items-center gap-1"><i data-lucide="check-circle" class="w-4 h-4"></i> R$ ${budgetAnalysis.totalSaved.toFixed(2)} economizados do teto</span>`;
      }
    }

    // Insights Inteligentes
    const insightsContainer = document.getElementById('dash-insights-container');
    if (insightsContainer) {
      if (insights.length === 0) {
        insightsContainer.innerHTML = `<p class="text-slate-500 text-sm">Nenhum alerta crítico para este mês. Finanças equilibradas!</p>`;
      } else {
        insightsContainer.innerHTML = insights.map(ins => {
          const bgMap = {
            danger: 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800/50 dark:text-rose-200',
            warning: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800/50 dark:text-amber-200',
            success: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800/50 dark:text-emerald-200',
            info: 'bg-indigo-50 border-indigo-200 text-indigo-800 dark:bg-indigo-950/40 dark:border-indigo-800/50 dark:text-indigo-200'
          };
          return `
            <div class="p-3.5 rounded-xl border flex items-start gap-3 ${bgMap[ins.type] || bgMap.info}">
              <i data-lucide="${ins.icon}" class="w-5 h-5 flex-shrink-0 mt-0.5"></i>
              <div class="text-xs sm:text-sm">
                <p class="font-bold mb-0.5">${ins.title}</p>
                <p>${ins.message}</p>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Gráfico de Gastos por Categoria (Dashboard)
    window.Reports.renderCategoryPieChart('dash-chart-categories', monthStr);

    // Resumo de Tetos Rápidos
    const quickBudgetsContainer = document.getElementById('dash-quick-budgets');
    if (quickBudgetsContainer) {
      const topBudgets = budgetAnalysis.items.filter(i => i.budget > 0).slice(0, 4);
      if (topBudgets.length === 0) {
        quickBudgetsContainer.innerHTML = `<p class="text-slate-500 text-sm">Nenhum teto configurado. Clique na aba <strong>Tetos de Gastos</strong> para definir limites.</p>`;
      } else {
        quickBudgetsContainer.innerHTML = topBudgets.map(item => {
          const barColor = item.status === 'exceeded' ? 'bg-rose-500' : (item.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500');
          const pctClamped = Math.min(100, item.percentage).toFixed(0);
          return `
            <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
              <div class="flex items-center justify-between text-xs sm:text-sm font-semibold mb-1.5">
                <span class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${item.color}"></span>
                  ${item.name}
                </span>
                <span class="${item.status === 'exceeded' ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}">
                  ${StateManager.formatCurrency(item.spent)} / ${StateManager.formatCurrency(item.budget)}
                </span>
              </div>
              <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                <div class="${barColor} h-2 rounded-full progress-bar-fill" style="width: ${pctClamped}%"></div>
              </div>
              <div class="flex justify-between text-[11px] text-slate-500 mt-1">
                <span>${pctClamped}% consumido</span>
                <span>${item.status === 'exceeded' ? `Estourou ${StateManager.formatCurrency(item.spent - item.budget)}` : `Resta ${StateManager.formatCurrency(item.remaining)}`}</span>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Últimas Transações
    const recentTxContainer = document.getElementById('dash-recent-transactions');
    if (recentTxContainer) {
      const recent = window.State.getTransactions().slice(0, 6);
      if (recent.length === 0) {
        recentTxContainer.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-slate-500">Nenhum lançamento cadastrado.</td></tr>`;
      } else {
        recentTxContainer.innerHTML = recent.map(tx => {
          const cat = window.State.getCategoryById(tx.categoryId);
          const acc = window.State.getAccountById(tx.accountId);
          const isExp = tx.type === 'expense';
          return `
            <tr class="border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition text-xs sm:text-sm">
              <td class="py-3 px-3">
                <span class="font-medium text-slate-900 dark:text-slate-100">${tx.description}</span>
                ${tx.isInstallment ? `<span class="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300">${tx.installmentCurrent}/${tx.installmentTotal}x</span>` : ''}
                ${tx.isRecurring ? `<span class="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">Recorrente</span>` : ''}
              </td>
              <td class="py-3 px-3 text-slate-600 dark:text-slate-400">
                <span class="inline-flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full" style="background-color: ${cat?.color || '#9CA3AF'}"></span>
                  ${cat?.name || 'Geral'}
                </span>
              </td>
              <td class="py-3 px-3 text-slate-500 dark:text-slate-400">${StateManager.formatDateBR(tx.date)}</td>
              <td class="py-3 px-3 text-right font-bold ${isExp ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}">
                ${isExp ? '-' : '+'} ${StateManager.formatCurrency(tx.amount)}
              </td>
              <td class="py-3 px-3 text-center">
                <button onclick="window.App.toggleStatus('${tx.id}')" title="Clique para alternar status" class="px-2 py-0.5 rounded-full text-[11px] font-medium transition ${tx.status === 'paid' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'}">
                  ${tx.status === 'paid' ? 'Pago' : 'Pendente'}
                </button>
              </td>
            </tr>
          `;
        }).join('');
      }
    }
  }

  // 2. Tela de Transações
  renderTransactionsView() {
    const transactions = window.Transactions.getFilteredTransactions();
    const categories = window.State.getCategories();
    const accounts = window.State.getAccounts();
    const tbody = document.getElementById('transactions-table-body');
    const countEl = document.getElementById('tx-count-badge');

    if (countEl) countEl.textContent = `${transactions.length} lançamento(s)`;

    // Preencher selects de filtros se ainda não foram
    this.populateFilterDropdowns();

    if (!tbody) return;

    if (transactions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-10 text-slate-500">Nenhum lançamento encontrado para os filtros selecionados.</td></tr>`;
      this.updateSelectedTransactionsUI();
      return;
    }

    tbody.innerHTML = transactions.map(tx => {
      const cat = categories.find(c => c.id === tx.categoryId);
      const acc = accounts.find(a => a.id === tx.accountId);
      const isExp = tx.type === 'expense';

      return `
        <tr class="border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition text-sm">
          <td class="py-3 px-3 w-10 text-center">
            <input type="checkbox" class="tx-row-checkbox rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4" data-id="${tx.id}" onchange="window.App.handleRowCheckboxChange()">
          </td>
          <td class="py-3 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">${StateManager.formatDateBR(tx.date)}</td>
          <td class="py-3 px-3">
            <div class="font-medium text-slate-900 dark:text-slate-100">${tx.description}</div>
            ${tx.notes ? `<div class="text-xs text-slate-400 italic">${tx.notes}</div>` : ''}
          </td>
          <td class="py-3 px-3">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
              <span class="w-2 h-2 rounded-full" style="background-color: ${cat?.color || '#9CA3AF'}"></span>
              ${cat?.name || 'Geral'}
            </span>
          </td>
          <td class="py-3 px-3 text-xs text-slate-600 dark:text-slate-400">
            <span class="flex items-center gap-1">
              <i data-lucide="${acc?.icon || 'landmark'}" class="w-3.5 h-3.5"></i>
              ${acc?.name || 'Conta Padrão'}
            </span>
          </td>
          <td class="py-3 px-3 text-right font-bold whitespace-nowrap ${isExp ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}">
            ${isExp ? '-' : '+'} ${StateManager.formatCurrency(tx.amount)}
            ${tx.isInstallment ? `<span class="block text-[10px] text-purple-600 dark:text-purple-400 font-normal">Parc. ${tx.installmentCurrent}/${tx.installmentTotal}</span>` : ''}
          </td>
          <td class="py-3 px-3 text-center">
            <button onclick="window.App.toggleStatus('${tx.id}')" title="Alternar status" class="px-2.5 py-1 rounded-full text-xs font-medium transition cursor-pointer ${tx.status === 'paid' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-950/60 dark:text-amber-300'}">
              ${tx.status === 'paid' ? '✓ Efetivado' : '⏳ Pendente'}
            </button>
          </td>
          <td class="py-3 px-3 text-right whitespace-nowrap">
            <button onclick="window.App.openTransactionModal('${tx.id}')" class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition mr-1" title="Editar lançamento">
              <i data-lucide="edit-3" class="w-4 h-4"></i>
            </button>
            <button onclick="window.App.deleteTransactionPrompt('${tx.id}')" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition" title="Excluir lançamento">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    this.updateSelectedTransactionsUI();
  }

  populateFilterDropdowns() {
    const catSelect = document.getElementById('filter-category');
    const accSelect = document.getElementById('filter-account');

    if (catSelect && catSelect.children.length <= 1) {
      window.State.getCategories().forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = `${cat.type === 'income' ? '🟢' : '🔴'} ${cat.name}`;
        catSelect.appendChild(opt);
      });
    }

    if (accSelect && accSelect.children.length <= 1) {
      window.State.getAccounts().forEach(acc => {
        const opt = document.createElement('option');
        opt.value = acc.id;
        opt.textContent = acc.name;
        accSelect.appendChild(opt);
      });
    }
  }

  // 3. Tela de Tetos de Gastos (Budgeting)
  renderBudgetsView(monthStr) {
    const analysis = window.Budgets.getBudgetAnalysis(monthStr);

    document.getElementById('budget-total-budgeted').textContent = StateManager.formatCurrency(analysis.totalBudget);
    document.getElementById('budget-total-spent').textContent = StateManager.formatCurrency(analysis.totalSpentInBudgets);
    document.getElementById('budget-total-saved').textContent = StateManager.formatCurrency(analysis.totalSaved);
    document.getElementById('budget-total-exceeded').textContent = StateManager.formatCurrency(analysis.totalExceeded);

    const container = document.getElementById('budgets-cards-grid');
    if (!container) return;

    if (analysis.items.length === 0) {
      container.innerHTML = `<div class="col-span-full text-center py-12 text-slate-500">Nenhuma categoria de despesa cadastrada.</div>`;
      return;
    }

    container.innerHTML = analysis.items.map(item => {
      const pctClamped = Math.min(100, item.percentage).toFixed(0);
      const isExceeded = item.status === 'exceeded';
      const isWarning = item.status === 'warning';
      const hasBudget = item.budget > 0;

      let statusBadge = '';
      let barColor = 'bg-emerald-500';
      let borderHighlight = 'border-slate-200 dark:border-slate-700';

      if (!hasBudget) {
        statusBadge = '<span class="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">Sem Teto Definido</span>';
        barColor = 'bg-slate-400';
      } else if (isExceeded) {
        statusBadge = '<span class="px-2 py-0.5 rounded text-xs bg-rose-100 text-rose-700 font-bold dark:bg-rose-950/60 dark:text-rose-300">🔴 Limite Ultrapassado</span>';
        barColor = 'bg-rose-500';
        borderHighlight = 'border-rose-300 dark:border-rose-800 ring-1 ring-rose-300 dark:ring-rose-800';
      } else if (isWarning) {
        statusBadge = '<span class="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700 font-bold dark:bg-amber-950/60 dark:text-amber-300">🟡 Atenção (>75%)</span>';
        barColor = 'bg-amber-500';
      } else {
        statusBadge = '<span class="px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-700 font-bold dark:bg-emerald-950/60 dark:text-emerald-300">🟢 Dentro da Meta</span>';
        barColor = 'bg-emerald-500';
      }

      return `
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 border ${borderHighlight} shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center text-white" style="background-color: ${item.color}">
                  <i data-lucide="${item.icon || 'tag'}" class="w-5 h-5"></i>
                </div>
                <div>
                  <h3 class="font-bold text-slate-900 dark:text-slate-100 text-base">${item.name}</h3>
                  <span class="text-xs text-slate-400">${item.count} gasto(s) registrados</span>
                </div>
              </div>
              ${statusBadge}
            </div>

            <!-- Valores -->
            <div class="flex justify-between items-baseline my-3">
              <div>
                <span class="text-xs text-slate-500 block">Gasto Atual</span>
                <span class="text-xl font-bold ${isExceeded ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}">
                  ${StateManager.formatCurrency(item.spent)}
                </span>
              </div>
              <div class="text-right">
                <span class="text-xs text-slate-500 block">Teto Mensal</span>
                <span class="text-lg font-semibold text-slate-600 dark:text-slate-300">
                  ${hasBudget ? StateManager.formatCurrency(item.budget) : '—'}
                </span>
              </div>
            </div>

            <!-- Barra de Progresso -->
            ${hasBudget ? `
              <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden mb-2">
                <div class="${barColor} h-3 rounded-full progress-bar-fill" style="width: ${pctClamped}%"></div>
              </div>
              <div class="flex justify-between text-xs text-slate-500">
                <span>${item.percentage.toFixed(1)}% utilizado</span>
                <span>${isExceeded ? `Excedeu ${StateManager.formatCurrency(item.spent - item.budget)}` : `Economia de ${StateManager.formatCurrency(item.remaining)}`}</span>
              </div>
            ` : `
              <p class="text-xs text-slate-400 italic mb-2">Defina um limite para acompanhar se está extrapolando os gastos.</p>
            `}
          </div>

          <!-- Ação Rápida de Ajuste de Teto e Configuração -->
          <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
            <button onclick="window.App.promptEditBudget('${item.id}', ${item.budget})" class="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
              <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Ajustar Teto
            </button>
            <button onclick="window.App.openCategoryModal('${item.id}')" class="text-xs font-medium text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1 transition" title="Editar nome, cor ou tipo">
              <i data-lucide="settings" class="w-3.5 h-3.5"></i> Editar
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  promptEditBudget(categoryId, currentBudget) {
    const cat = window.State.getCategoryById(categoryId);
    const newBudgetStr = prompt(`Definir valor máximo mensal (Teto) para ${cat.name}:`, currentBudget || 0);
    if (newBudgetStr !== null) {
      const parsed = parseFloat(newBudgetStr);
      if (!isNaN(parsed) && parsed >= 0) {
        window.Budgets.updateCategoryBudget(categoryId, parsed);
        this.showToast(`Teto de ${cat.name} atualizado para ${StateManager.formatCurrency(parsed)}!`, 'success');
      }
    }
  }

  // 4. Tela de Metas (Cofrinhos)
  renderGoalsView() {
    const analysis = window.Goals.getGoalsAnalysis();
    document.getElementById('goals-total-accumulated').textContent = StateManager.formatCurrency(analysis.totalAccumulated);
    document.getElementById('goals-total-target').textContent = StateManager.formatCurrency(analysis.totalTarget);
    document.getElementById('goals-total-remaining').textContent = StateManager.formatCurrency(analysis.totalRemaining);

    const container = document.getElementById('goals-cards-grid');
    if (!container) return;

    if (analysis.goals.length === 0) {
      container.innerHTML = `<div class="col-span-full text-center py-12 text-slate-500">Nenhuma meta financeira cadastrada. Crie uma para começar a guardar dinheiro!</div>`;
      return;
    }

    container.innerHTML = analysis.goals.map(g => {
      const isDone = g.isCompleted;
      return `
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center text-white" style="background-color: ${g.color || '#3B82F6'}">
                  <i data-lucide="${g.icon || 'target'}" class="w-5 h-5"></i>
                </div>
                <div>
                  <h3 class="font-bold text-slate-900 dark:text-slate-100 text-base">${g.name}</h3>
                  <span class="text-xs text-slate-400">Prazo: ${StateManager.formatDateBR(g.deadline)}</span>
                </div>
              </div>
              <span class="px-2 py-0.5 rounded text-xs font-bold ${isDone ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'}">
                ${isDone ? '🎉 Concluída!' : `${g.percentage.toFixed(0)}%`}
              </span>
            </div>

            <!-- Progresso Financeiro -->
            <div class="flex justify-between items-baseline my-3">
              <div>
                <span class="text-xs text-slate-500 block">Acumulado</span>
                <span class="text-xl font-bold text-slate-900 dark:text-slate-100">${StateManager.formatCurrency(g.current)}</span>
              </div>
              <div class="text-right">
                <span class="text-xs text-slate-500 block">Alvo</span>
                <span class="text-base font-semibold text-slate-600 dark:text-slate-300">${StateManager.formatCurrency(g.target)}</span>
              </div>
            </div>

            <!-- Barra -->
            <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden mb-2">
              <div class="bg-indigo-600 dark:bg-indigo-500 h-3 rounded-full progress-bar-fill" style="width: ${g.percentage}%"></div>
            </div>

            <!-- Informação de Esforço -->
            ${!isDone ? `
              <div class="text-xs text-slate-500 flex items-center justify-between mt-2">
                <span>Faltam <strong>${StateManager.formatCurrency(g.remaining)}</strong></span>
                <span>Guardar <strong>${StateManager.formatCurrency(g.monthlySavingNeeded)}/mês</strong></span>
              </div>
            ` : ''}
          </div>

          <!-- Botões de Aporte / Resgate e Edição -->
          <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-1.5">
            <button onclick="window.App.openGoalDepositModal('${g.id}')" class="flex-1 py-1.5 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 dark:text-emerald-300 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1" title="Adicionar aporte financeiro">
              <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i> Aporte
            </button>
            <button onclick="window.App.openGoalWithdrawModal('${g.id}')" class="flex-1 py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700/60 dark:hover:bg-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1" title="Resgatar valor">
              <i data-lucide="minus-circle" class="w-3.5 h-3.5"></i> Resgate
            </button>
            <button onclick="window.App.openGoalModal('${g.id}')" class="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition" title="Editar nome, valor alvo ou prazo da meta">
              <i data-lucide="edit-3" class="w-4 h-4"></i>
            </button>
            <button onclick="window.App.deleteGoalPrompt('${g.id}')" class="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition" title="Excluir meta">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // 5. Tela de Contas & Cartões
  renderAccountsView() {
    const accounts = window.Accounts.getAccountsWithBalances();
    const netWorth = window.Accounts.getTotalNetWorth();

    document.getElementById('acc-net-worth').textContent = StateManager.formatCurrency(netWorth.netWorth);
    document.getElementById('acc-total-cash').textContent = StateManager.formatCurrency(netWorth.totalCashAndBank);
    document.getElementById('acc-total-credit').textContent = StateManager.formatCurrency(netWorth.totalCreditDebt);

    const container = document.getElementById('accounts-cards-grid');
    if (!container) return;

    container.innerHTML = accounts.map(acc => {
      const isCard = acc.type === 'credit_card';

      return `
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center text-white" style="background-color: ${acc.color || '#3B82F6'}">
                  <i data-lucide="${acc.icon || (isCard ? 'credit-card' : 'landmark')}" class="w-5 h-5"></i>
                </div>
                <div>
                  <h3 class="font-bold text-slate-900 dark:text-slate-100 text-base">${acc.name}</h3>
                  <span class="text-xs text-slate-400 capitalize">${isCard ? 'Cartão de Crédito' : 'Conta Bancária'}</span>
                </div>
              </div>
            </div>

            ${isCard ? `
              <div class="space-y-2">
                <div class="flex justify-between items-baseline">
                  <span class="text-xs text-slate-500">Fatura Atual</span>
                  <span class="text-xl font-bold text-rose-600 dark:text-rose-400">${StateManager.formatCurrency(acc.currentInvoice)}</span>
                </div>
                <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div class="bg-purple-600 h-2 rounded-full progress-bar-fill" style="width: ${acc.limitUsedPercentage}%"></div>
                </div>
                <div class="flex justify-between text-xs text-slate-500">
                  <span>Limite: ${StateManager.formatCurrency(acc.limit)}</span>
                  <span>Disp: ${StateManager.formatCurrency(acc.availableLimit)}</span>
                </div>
                <div class="pt-2 text-[11px] text-slate-400 flex justify-between">
                  <span>Fecha dia ${acc.closingDay || '25'}</span>
                  <span>Vence dia ${acc.dueDay || '05'}</span>
                </div>
              </div>
            ` : `
              <div class="space-y-1">
                <span class="text-xs text-slate-500">Saldo Disponível</span>
                <div class="text-2xl font-bold text-slate-900 dark:text-slate-100">${StateManager.formatCurrency(acc.currentBalance)}</div>
                <div class="flex gap-4 pt-3 text-xs text-slate-500">
                  <span class="text-emerald-600">Entradas: +${StateManager.formatCurrency(acc.totalIncome)}</span>
                  <span class="text-rose-600">Saídas: -${StateManager.formatCurrency(acc.totalExpense)}</span>
                </div>
              </div>
            `}
          </div>

          <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <button onclick="window.App.openAccountModal('${acc.id}')" class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold transition flex items-center gap-1" title="Editar dados da conta">
                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Editar
              </button>
              ${isCard ? `
                <button onclick="window.App.quickAdjustLimit('${acc.id}')" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition" title="Alterar limite total do cartão">
                  Ajustar Limite
                </button>
              ` : `
                <button onclick="window.App.quickAdjustBalance('${acc.id}')" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition" title="Ajustar saldo real atual">
                  Ajustar Saldo
                </button>
              `}
            </div>
            <button onclick="window.App.deleteAccountPrompt('${acc.id}')" class="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition" title="Excluir conta">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // 6. Tela de Relatórios
  renderReportsView(monthStr) {
    window.Reports.renderCategoryPieChart('report-chart-categories', monthStr);
    window.Reports.renderBudgetComparisonChart('report-chart-budgets', monthStr);
    window.Reports.renderCashFlowTrendChart('report-chart-cashflow');

    // Tabela analítica comparativa
    const analysis = window.Budgets.getBudgetAnalysis(monthStr);
    const tbody = document.getElementById('report-summary-table-body');
    if (tbody) {
      tbody.innerHTML = analysis.items.map(item => {
        const isExceeded = item.status === 'exceeded';
        return `
          <tr class="border-b border-slate-100 dark:border-slate-800 text-xs sm:text-sm">
            <td class="py-3 px-3 font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${item.color}"></span>
              ${item.name}
            </td>
            <td class="py-3 px-3 text-right text-slate-600 dark:text-slate-400">${item.budget > 0 ? StateManager.formatCurrency(item.budget) : '—'}</td>
            <td class="py-3 px-3 text-right font-semibold text-slate-900 dark:text-slate-100">${StateManager.formatCurrency(item.spent)}</td>
            <td class="py-3 px-3 text-right font-bold ${isExceeded ? 'text-rose-600' : 'text-emerald-600'}">
              ${isExceeded ? `+${StateManager.formatCurrency(item.spent - item.budget)}` : StateManager.formatCurrency(item.remaining)}
            </td>
            <td class="py-3 px-3 text-center">
              <span class="px-2 py-0.5 rounded text-xs font-semibold ${isExceeded ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'}">
                ${item.budget > 0 ? `${item.percentage.toFixed(0)}%` : 'N/A'}
              </span>
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  // 7. Tela de Calendário
  renderCalendarView() {
    const calData = window.Calendar.getCalendarData();
    const titleEl = document.getElementById('cal-month-title');
    if (titleEl) titleEl.textContent = calData.monthName;

    const grid = document.getElementById('calendar-grid-days');
    if (!grid) return;

    let html = '';

    // Dias do mês anterior para preencher a primeira semana
    for (let i = 0; i < calData.firstDayIndex; i++) {
      const prevDay = calData.prevMonthDays - calData.firstDayIndex + i + 1;
      html += `
        <div class="calendar-day-cell p-2 border border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/30 opacity-40 rounded-xl">
          <span class="text-xs font-semibold text-slate-400">${prevDay}</span>
        </div>
      `;
    }

    // Dias do mês atual
    for (let day = 1; day <= calData.totalDaysInMonth; day++) {
      const info = calData.daysMap[day];
      const hasIncome = info.totalIncome > 0;
      const hasExpense = info.totalExpense > 0;
      const isPending = info.pendingCount > 0;

      html += `
        <div onclick="window.App.showDayTransactionsModal('${info.dateKey}')" class="calendar-day-cell p-2 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/80 rounded-xl cursor-pointer hover:shadow-md transition flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">${day}</span>
            ${isPending ? `<span class="w-2 h-2 rounded-full bg-amber-500" title="Contas pendentes"></span>` : ''}
          </div>
          <div class="mt-1 space-y-1">
            ${hasIncome ? `<div class="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-1 py-0.5 rounded truncate">+${StateManager.formatCurrency(info.totalIncome)}</div>` : ''}
            ${hasExpense ? `<div class="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-1 py-0.5 rounded truncate">-${StateManager.formatCurrency(info.totalExpense)}</div>` : ''}
          </div>
        </div>
      `;
    }

    grid.innerHTML = html;
  }

  // 8. Tela de Importação / Exportação
  renderImporterView() {}

  // --- Handlers Globais & Modais ---
  bindGlobalEvents() {
    // Abrir Modal de Nova Transação
    const openTxBtns = document.querySelectorAll('.btn-open-new-tx');
    openTxBtns.forEach(b => b.addEventListener('click', () => this.openTransactionModal()));

    // Form de Nova / Editar Transação
    const formTx = document.getElementById('form-new-transaction');
    if (formTx) {
      formTx.addEventListener('submit', (e) => {
        e.preventDefault();
        try {
          const editId = document.getElementById('tx-edit-id').value;
          const isInstallment = document.getElementById('tx-is-installment').checked;
          const isRecurring = document.getElementById('tx-is-recurring').checked;

          const data = {
            description: document.getElementById('tx-description').value,
            amount: document.getElementById('tx-amount').value,
            type: document.getElementById('tx-type').value,
            categoryId: document.getElementById('tx-category').value,
            accountId: document.getElementById('tx-account').value,
            date: document.getElementById('tx-date').value,
            status: document.getElementById('tx-status').value,
            isInstallment: isInstallment,
            installmentsCount: document.getElementById('tx-installments-count')?.value || 1,
            isRecurring: isRecurring,
            recurringFrequency: document.getElementById('tx-recurring-freq')?.value || 'monthly',
            notes: document.getElementById('tx-notes')?.value || ''
          };

          if (editId) {
            window.State.updateTransaction(editId, {
              description: data.description,
              amount: Math.abs(parseFloat(data.amount)),
              type: data.type,
              categoryId: data.categoryId,
              accountId: data.accountId,
              date: data.date,
              status: data.status,
              notes: data.notes
            });
            this.showToast('Lançamento atualizado com sucesso!', 'success');
          } else {
            window.Transactions.createTransaction(data);
            this.showToast('Lançamento registrado com sucesso!', 'success');
          }

          this.closeAllModals();
          formTx.reset();
          document.getElementById('tx-edit-id').value = '';
        } catch (err) {
          alert(err.message);
        }
      });
    }

    // Select All Checkbox
    const selectAllCheckbox = document.getElementById('tx-select-all');
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener('change', (e) => {
        const rowCheckboxes = document.querySelectorAll('.tx-row-checkbox');
        rowCheckboxes.forEach(cb => cb.checked = e.target.checked);
        this.updateSelectedTransactionsUI();
      });
    }

    // Toggle de Parcelas / Recorrência no formulário
    const chkInstallment = document.getElementById('tx-is-installment');
    if (chkInstallment) {
      chkInstallment.addEventListener('change', (e) => {
        const box = document.getElementById('tx-installment-box');
        if (box) box.classList.toggle('hidden', !e.target.checked);
      });
    }

    const chkRecurring = document.getElementById('tx-is-recurring');
    if (chkRecurring) {
      chkRecurring.addEventListener('change', (e) => {
        const box = document.getElementById('tx-recurring-box');
        if (box) box.classList.toggle('hidden', !e.target.checked);
      });
    }

    // Modal de Nova / Editar Meta
    const formGoal = document.getElementById('form-new-goal');
    if (formGoal) {
      formGoal.addEventListener('submit', (e) => {
        e.preventDefault();
        const editId = document.getElementById('goal-edit-id').value;
        const goalData = {
          name: document.getElementById('goal-name').value,
          targetAmount: parseFloat(document.getElementById('goal-target').value),
          currentAmount: parseFloat(document.getElementById('goal-initial').value || 0),
          deadline: document.getElementById('goal-deadline').value,
          color: document.getElementById('goal-color').value || '#3B82F6',
          icon: 'target'
        };

        if (editId) {
          window.State.updateGoal(editId, goalData);
          this.showToast('Meta atualizada com sucesso!', 'success');
        } else {
          window.State.addGoal(goalData);
          this.showToast('Meta criada com sucesso!', 'success');
        }

        this.closeAllModals();
        formGoal.reset();
        document.getElementById('goal-edit-id').value = '';
      });
    }

    // Modal de Nova / Editar Conta ou Cartão
    const formAcc = document.getElementById('form-new-account');
    if (formAcc) {
      formAcc.addEventListener('submit', (e) => {
        e.preventDefault();
        const editId = document.getElementById('account-edit-id').value;
        const type = document.getElementById('account-type').value;
        const isCard = type === 'credit_card';

        const accData = {
          name: document.getElementById('account-name').value,
          type: type,
          initialBalance: isCard ? 0 : parseFloat(document.getElementById('account-initial-balance').value || 0),
          limit: isCard ? parseFloat(document.getElementById('account-credit-limit').value || 0) : 0,
          closingDay: isCard ? parseInt(document.getElementById('account-closing-day').value || 25) : null,
          dueDay: isCard ? parseInt(document.getElementById('account-due-day').value || 5) : null,
          color: document.getElementById('account-color').value || '#3B82F6',
          icon: isCard ? 'credit-card' : 'landmark'
        };

        if (editId) {
          window.State.updateAccount(editId, accData);
          this.showToast('Conta/Cartão atualizado com sucesso!', 'success');
        } else {
          window.State.addAccount(accData);
          this.showToast('Conta cadastrada com sucesso!', 'success');
        }

        this.closeAllModals();
        formAcc.reset();
        document.getElementById('account-edit-id').value = '';
      });
    }

    // Mudança no tipo de conta
    const selAccType = document.getElementById('account-type');
    if (selAccType) {
      selAccType.addEventListener('change', (e) => {
        const isCard = e.target.value === 'credit_card';
        document.getElementById('box-account-balance')?.classList.toggle('hidden', isCard);
        document.getElementById('box-account-card-fields')?.classList.toggle('hidden', !isCard);
      });
    }

    // Transferência entre Contas
    const formTransf = document.getElementById('form-transfer');
    if (formTransf) {
      formTransf.addEventListener('submit', (e) => {
        e.preventDefault();
        try {
          const fromId = document.getElementById('transf-from').value;
          const toId = document.getElementById('transf-to').value;
          const amt = document.getElementById('transf-amount').value;
          const date = document.getElementById('transf-date').value;
          const notes = document.getElementById('transf-notes').value;

          window.Accounts.transferFunds(fromId, toId, amt, date, notes);
          this.closeAllModals();
          this.showToast('Transferência realizada com sucesso!', 'success');
          formTransf.reset();
        } catch (err) {
          alert(err.message);
        }
      });
    }

    // Filtros da tabela de transações
    ['filter-type', 'filter-category', 'filter-account', 'filter-status'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', () => {
          window.Transactions.currentFilters.type = document.getElementById('filter-type').value;
          window.Transactions.currentFilters.categoryId = document.getElementById('filter-category').value;
          window.Transactions.currentFilters.accountId = document.getElementById('filter-account').value;
          window.Transactions.currentFilters.status = document.getElementById('filter-status').value;
          this.renderTransactionsView();
        });
      }
    });

    const searchInput = document.getElementById('filter-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        window.Transactions.currentFilters.search = e.target.value;
        this.renderTransactionsView();
      });
    }

    // Modal de Nova / Editar Categoria
    const formCat = document.getElementById('form-category');
    if (formCat) {
      formCat.addEventListener('submit', (e) => {
        e.preventDefault();
        const editId = document.getElementById('cat-edit-id').value;
        const catData = {
          name: document.getElementById('cat-name').value,
          type: document.getElementById('cat-type').value,
          color: document.getElementById('cat-color').value || '#6366F1',
          budget: parseFloat(document.getElementById('cat-budget').value || 0),
          icon: document.getElementById('cat-type').value === 'income' ? 'wallet' : 'tag'
        };

        if (editId) {
          window.State.updateCategory(editId, catData);
          this.showToast('Categoria atualizada com sucesso!', 'success');
        } else {
          window.State.addCategory(catData);
          this.showToast('Nova categoria criada com sucesso!', 'success');
        }

        this.closeAllModals();
        formCat.reset();
        document.getElementById('cat-edit-id').value = '';
      });
    }

    // Importador de Arquivo
    const fileInput = document.getElementById('import-file-input');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => this.handleFileImport(e));
    }

    // Form de Autenticação (Login / Cadastro)
    const formAuth = document.getElementById('form-auth');
    if (formAuth) {
      formAuth.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errBox = document.getElementById('auth-error-msg');
        if (errBox) {
          errBox.classList.add('hidden');
          errBox.textContent = '';
        }

        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        const name = document.getElementById('auth-name')?.value || '';

        const submitBtn = document.getElementById('btn-auth-submit');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processando...';

        try {
          if (this.authMode === 'register') {
            await window.FirebaseSync.registerWithEmail(email, password, name);
            this.showToast('Conta criada com sucesso! Sincronização em nuvem ativada.', 'success');
          } else {
            await window.FirebaseSync.loginWithEmail(email, password);
            this.showToast('Login realizado com sucesso! Seus dados foram sincronizados.', 'success');
          }
          this.closeAllModals();
          formAuth.reset();
        } catch (err) {
          if (errBox) {
            errBox.textContent = this.translateFirebaseError(err.message || err.code);
            errBox.classList.remove('hidden');
          }
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      });
    }

    // Form de Configuração do Firebase
    const formFb = document.getElementById('form-firebase-config');
    if (formFb) {
      formFb.addEventListener('submit', (e) => {
        e.preventDefault();
        try {
          const config = {
            apiKey: document.getElementById('fb-api-key').value.trim(),
            authDomain: document.getElementById('fb-auth-domain').value.trim(),
            projectId: document.getElementById('fb-project-id').value.trim(),
            storageBucket: document.getElementById('fb-storage-bucket')?.value.trim() || '',
            appId: document.getElementById('fb-app-id')?.value.trim() || ''
          };

          window.FirebaseSync.saveFirebaseConfig(config);
          this.closeAllModals();
          this.showToast('Configurações da Nuvem salvas e conectadas!', 'success');
        } catch (err) {
          alert('Erro ao salvar configuração: ' + err.message);
        }
      });
    }
  }

  // --- Modal Helpers & Edição de Transações ---
  openTransactionModal(txId = null) {
    this.populateModalSelects();
    const form = document.getElementById('form-new-transaction');
    form.reset();

    const installBox = document.getElementById('tx-installment-box');
    const recurringBox = document.getElementById('tx-recurring-box');
    if (installBox) installBox.classList.add('hidden');
    if (recurringBox) recurringBox.classList.add('hidden');

    if (txId) {
      const tx = window.State.getTransactionById(txId);
      if (tx) {
        document.getElementById('tx-modal-title').innerHTML = '<i data-lucide="edit-3" class="w-5 h-5 text-indigo-500"></i> Editar Lançamento';
        document.getElementById('tx-modal-submit-btn').textContent = 'Salvar Alterações';
        document.getElementById('tx-edit-id').value = tx.id;
        document.getElementById('tx-type').value = tx.type;
        document.getElementById('tx-amount').value = tx.amount;
        document.getElementById('tx-description').value = tx.description;
        document.getElementById('tx-category').value = tx.categoryId;
        document.getElementById('tx-account').value = tx.accountId;
        document.getElementById('tx-date').value = tx.date;
        document.getElementById('tx-status').value = tx.status;
        document.getElementById('tx-notes').value = tx.notes || '';
      }
    } else {
      document.getElementById('tx-modal-title').innerHTML = '<i data-lucide="plus-circle" class="w-5 h-5 text-indigo-500"></i> Novo Lançamento';
      document.getElementById('tx-modal-submit-btn').textContent = 'Salvar Lançamento';
      document.getElementById('tx-edit-id').value = '';
      const today = new Date().toISOString().slice(0, 10);
      document.getElementById('tx-date').value = today;
    }

    document.getElementById('modal-transaction').classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  // --- Seleção e Exclusão em Lote ---
  handleRowCheckboxChange() {
    this.updateSelectedTransactionsUI();
  }

  updateSelectedTransactionsUI() {
    const rowCheckboxes = Array.from(document.querySelectorAll('.tx-row-checkbox'));
    const checked = rowCheckboxes.filter(cb => cb.checked);
    const count = checked.length;

    const batchBar = document.getElementById('tx-batch-bar');
    const countLabel = document.getElementById('tx-selected-count');
    const selectAll = document.getElementById('tx-select-all');

    if (batchBar && countLabel) {
      if (count > 0) {
        batchBar.classList.remove('hidden');
        countLabel.textContent = `${count} lançamento(s) selecionado(s)`;
      } else {
        batchBar.classList.add('hidden');
      }
    }

    if (selectAll) {
      selectAll.checked = rowCheckboxes.length > 0 && count === rowCheckboxes.length;
    }
  }

  clearSelectedTransactions() {
    document.querySelectorAll('.tx-row-checkbox').forEach(cb => cb.checked = false);
    const selectAll = document.getElementById('tx-select-all');
    if (selectAll) selectAll.checked = false;
    this.updateSelectedTransactionsUI();
  }

  deleteSelectedTransactions() {
    const checkedRows = Array.from(document.querySelectorAll('.tx-row-checkbox:checked'));
    const ids = checkedRows.map(cb => cb.getAttribute('data-id')).filter(Boolean);

    if (ids.length === 0) return;

    if (confirm(`Deseja realmente excluir os ${ids.length} lançamentos selecionados?`)) {
      window.State.deleteMultipleTransactions(ids);
      this.clearSelectedTransactions();
      this.showToast(`${ids.length} lançamento(s) excluído(s) com sucesso!`, 'danger');
    }
  }

  populateModalSelects() {
    const catSelect = document.getElementById('tx-category');
    const accSelect = document.getElementById('tx-account');

    if (catSelect) {
      catSelect.innerHTML = window.State.getCategories().map(c => `
        <option value="${c.id}">${c.type === 'income' ? '🟢 [Receita]' : '🔴 [Despesa]'} ${c.name}</option>
      `).join('');
    }

    if (accSelect) {
      accSelect.innerHTML = window.State.getAccounts().map(a => `
        <option value="${a.id}">${a.name}</option>
      `).join('');
    }
  }

  openGoalModal(goalId = null) {
    const modal = document.getElementById('modal-goal');
    const form = document.getElementById('form-new-goal');
    form.reset();

    if (goalId) {
      const goal = window.State.getGoalById(goalId);
      if (goal) {
        document.getElementById('goal-modal-title').innerHTML = '<i data-lucide="edit-3" class="w-5 h-5 text-indigo-500"></i> Editar Meta Financeira';
        document.getElementById('goal-modal-submit-btn').textContent = 'Salvar Alterações';
        document.getElementById('goal-edit-id').value = goal.id;
        document.getElementById('goal-name').value = goal.name;
        document.getElementById('goal-target').value = goal.targetAmount;
        document.getElementById('goal-initial').value = goal.currentAmount || 0;
        document.getElementById('goal-deadline').value = goal.deadline || '';
        document.getElementById('goal-color').value = goal.color || '#3B82F6';
      }
    } else {
      document.getElementById('goal-modal-title').innerHTML = '<i data-lucide="piggy-bank" class="w-5 h-5 text-indigo-500"></i> Nova Meta Financeira';
      document.getElementById('goal-modal-submit-btn').textContent = 'Criar Meta';
      document.getElementById('goal-edit-id').value = '';
      document.getElementById('goal-color').value = '#3B82F6';
      document.getElementById('goal-initial').value = 0;
    }

    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  quickAdjustGoalTarget(goalId) {
    const goal = window.State.getGoalById(goalId);
    if (!goal) return;
    const newTargetStr = prompt(`Definir o novo Valor Alvo da meta "${goal.name}":\n(Alvo atual: ${StateManager.formatCurrency(goal.targetAmount)})`, goal.targetAmount);
    if (newTargetStr !== null) {
      const parsed = parseFloat(newTargetStr);
      if (!isNaN(parsed) && parsed > 0) {
        goal.targetAmount = parsed;
        window.State.updateGoal(goalId, goal);
        this.showToast(`Alvo da meta "${goal.name}" ajustado para ${StateManager.formatCurrency(parsed)}!`, 'success');
      }
    }
  }

  openGoalDepositModal(goalId) {
    const goal = window.State.getGoalById(goalId);
    if (!goal) return;
    const amountStr = prompt(`Depositar quanto na meta "${goal.name}"?`);
    if (amountStr) {
      const amt = parseFloat(amountStr);
      if (!isNaN(amt) && amt > 0) {
        const accId = window.State.getAccounts()[0]?.id;
        window.State.depositToGoal(goalId, amt, accId);
        this.showToast(`Depósito de ${StateManager.formatCurrency(amt)} realizado!`, 'success');
      }
    }
  }

  openGoalWithdrawModal(goalId) {
    const goal = window.State.getGoalById(goalId);
    if (!goal) return;
    const amountStr = prompt(`Resgatar quanto da meta "${goal.name}"?`);
    if (amountStr) {
      const amt = parseFloat(amountStr);
      if (!isNaN(amt) && amt > 0) {
        const accId = window.State.getAccounts()[0]?.id;
        window.State.withdrawFromGoal(goalId, amt, accId);
        this.showToast(`Resgate de ${StateManager.formatCurrency(amt)} realizado!`, 'success');
      }
    }
  }

  openAccountModal(accId = null) {
    const modal = document.getElementById('modal-account');
    const form = document.getElementById('form-new-account');
    form.reset();

    if (accId) {
      const acc = window.State.getAccountById(accId);
      if (acc) {
        document.getElementById('account-modal-title').innerHTML = '<i data-lucide="edit-3" class="w-5 h-5 text-indigo-500"></i> Editar Conta / Cartão';
        document.getElementById('account-modal-submit-btn').textContent = 'Salvar Alterações';
        document.getElementById('account-edit-id').value = acc.id;
        document.getElementById('account-name').value = acc.name;
        document.getElementById('account-type').value = acc.type;
        document.getElementById('account-color').value = acc.color || '#6366F1';

        const isCard = acc.type === 'credit_card';
        document.getElementById('box-account-balance')?.classList.toggle('hidden', isCard);
        document.getElementById('box-account-card-fields')?.classList.toggle('hidden', !isCard);

        if (isCard) {
          document.getElementById('account-credit-limit').value = acc.limit || 0;
          document.getElementById('account-closing-day').value = acc.closingDay || 25;
          document.getElementById('account-due-day').value = acc.dueDay || 5;
        } else {
          document.getElementById('account-initial-balance').value = acc.initialBalance || 0;
        }
      }
    } else {
      document.getElementById('account-modal-title').innerHTML = '<i data-lucide="landmark" class="w-5 h-5 text-indigo-500"></i> Nova Conta / Cartão';
      document.getElementById('account-modal-submit-btn').textContent = 'Salvar Conta';
      document.getElementById('account-edit-id').value = '';
      document.getElementById('box-account-balance')?.classList.remove('hidden');
      document.getElementById('box-account-card-fields')?.classList.add('hidden');
    }

    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  quickAdjustBalance(accId) {
    const acc = window.State.getAccountById(accId);
    if (!acc) return;
    const accountsWithBalances = window.Accounts.getAccountsWithBalances();
    const currentInfo = accountsWithBalances.find(a => a.id === accId);
    const currentCalculated = currentInfo ? currentInfo.currentBalance : (acc.initialBalance || 0);

    const newBalanceStr = prompt(`Definir o novo saldo real da conta "${acc.name}":\n(Saldo atual exibido: ${StateManager.formatCurrency(currentCalculated)})`, currentCalculated);
    if (newBalanceStr !== null) {
      const parsed = parseFloat(newBalanceStr);
      if (!isNaN(parsed)) {
        // Ajusta o saldo base para refletir exatamente o valor desejado
        const diff = parsed - currentCalculated;
        acc.initialBalance = (Number(acc.initialBalance) || 0) + diff;
        window.State.updateAccount(accId, acc);
        this.showToast(`Saldo da conta "${acc.name}" ajustado para ${StateManager.formatCurrency(parsed)}!`, 'success');
      }
    }
  }

  quickAdjustLimit(accId) {
    const acc = window.State.getAccountById(accId);
    if (!acc) return;
    const newLimitStr = prompt(`Definir o novo Limite Total de Crédito para "${acc.name}":`, acc.limit || 0);
    if (newLimitStr !== null) {
      const parsed = parseFloat(newLimitStr);
      if (!isNaN(parsed) && parsed >= 0) {
        acc.limit = parsed;
        window.State.updateAccount(accId, acc);
        this.showToast(`Limite do cartão "${acc.name}" ajustado para ${StateManager.formatCurrency(parsed)}!`, 'success');
      }
    }
  }

  openTransferModal() {
    const fromSel = document.getElementById('transf-from');
    const toSel = document.getElementById('transf-to');
    const accounts = window.State.getAccounts().filter(a => a.type !== 'credit_card');

    if (fromSel && toSel) {
      const opts = accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
      fromSel.innerHTML = opts;
      toSel.innerHTML = opts;
      if (accounts.length > 1) toSel.selectedIndex = 1;
    }

    document.getElementById('transf-date').value = new Date().toISOString().slice(0, 10);
    document.getElementById('modal-transfer').classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  showDayTransactionsModal(dateKey) {
    const dayTxs = window.State.getTransactions().filter(t => t.date === dateKey);
    const container = document.getElementById('day-modal-tx-list');
    document.getElementById('day-modal-title').textContent = `Lançamentos de ${StateManager.formatDateBR(dateKey)}`;

    if (container) {
      if (dayTxs.length === 0) {
        container.innerHTML = `<p class="text-slate-500 text-sm py-4 text-center">Nenhuma movimentação neste dia.</p>`;
      } else {
        container.innerHTML = dayTxs.map(tx => {
          const isExp = tx.type === 'expense';
          return `
            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-sm">
              <div>
                <div class="font-bold text-slate-900 dark:text-slate-100">${tx.description}</div>
                <div class="text-xs text-slate-500">${tx.status === 'paid' ? '✓ Pago' : '⏳ Pendente'}</div>
              </div>
              <div class="text-right">
                <span class="font-bold ${isExp ? 'text-rose-600' : 'text-emerald-600'}">
                  ${isExp ? '-' : '+'} ${StateManager.formatCurrency(tx.amount)}
                </span>
                <button onclick="window.App.toggleStatus('${tx.id}'); window.App.showDayTransactionsModal('${dateKey}')" class="block text-[11px] text-indigo-600 hover:underline">
                  Alternar status
                </button>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    document.getElementById('modal-day-details').classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  // --- Métodos de Categorias ---
  openCategoryModal(catId = null) {
    const modal = document.getElementById('modal-category');
    const form = document.getElementById('form-category');
    form.reset();

    if (catId) {
      const cat = window.State.getCategoryById(catId);
      if (cat) {
        document.getElementById('cat-modal-title').innerHTML = '<i data-lucide="edit-3" class="w-5 h-5 text-indigo-500"></i> Editar Categoria';
        document.getElementById('cat-edit-id').value = cat.id;
        document.getElementById('cat-name').value = cat.name;
        document.getElementById('cat-type').value = cat.type;
        document.getElementById('cat-color').value = cat.color || '#6366F1';
        document.getElementById('cat-budget').value = cat.budget || 0;
      }
    } else {
      document.getElementById('cat-modal-title').innerHTML = '<i data-lucide="tag" class="w-5 h-5 text-indigo-500"></i> Nova Categoria';
      document.getElementById('cat-edit-id').value = '';
      document.getElementById('cat-color').value = '#6366F1';
      document.getElementById('cat-budget').value = 0;
    }

    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  openCategoryManagerModal() {
    const modal = document.getElementById('modal-category-manager');
    const container = document.getElementById('cat-manager-list');
    const categories = window.State.getCategories();

    if (container) {
      container.innerHTML = categories.map(cat => {
        const isExp = cat.type === 'expense';
        return `
          <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="w-3.5 h-3.5 rounded-full" style="background-color: ${cat.color || '#6366F1'}"></span>
              <div>
                <span class="font-bold text-sm text-slate-800 dark:text-slate-200">${cat.name}</span>
                <span class="block text-xs text-slate-400">
                  ${isExp ? `🔴 Despesa ${cat.budget > 0 ? `• Teto: ${StateManager.formatCurrency(cat.budget)}` : ''}` : '🟢 Receita'}
                </span>
              </div>
            </div>
            <div class="flex items-center gap-1">
              <button onclick="window.App.openCategoryModal('${cat.id}')" class="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition" title="Editar">
                <i data-lucide="edit-2" class="w-4 h-4"></i>
              </button>
              <button onclick="window.App.deleteCategoryPrompt('${cat.id}')" class="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition" title="Excluir">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  deleteCategoryPrompt(catId) {
    const cat = window.State.getCategoryById(catId);
    if (!cat) return;
    if (confirm(`Deseja realmente excluir a categoria "${cat.name}"?`)) {
      window.State.deleteCategory(catId);
      this.showToast(`Categoria "${cat.name}" excluída!`, 'danger');
      this.openCategoryManagerModal(); // Re-renderiza a lista
    }
  }

  closeAllModals() {
    document.querySelectorAll('.app-modal').forEach(m => m.classList.add('hidden'));
  }

  toggleStatus(id) {
    const newStatus = window.State.toggleTransactionStatus(id);
    this.showToast(`Status alterado para: ${newStatus === 'paid' ? 'Pago/Recebido' : 'Pendente'}`, 'info');
  }

  deleteTransactionPrompt(id) {
    if (confirm('Deseja realmente excluir este lançamento?')) {
      window.State.deleteTransaction(id);
      this.showToast('Lançamento excluído!', 'danger');
    }
  }

  deleteGoalPrompt(id) {
    if (confirm('Deseja realmente excluir esta meta financeira?')) {
      window.State.deleteGoal(id);
      this.showToast('Meta excluída!', 'danger');
    }
  }

  deleteAccountPrompt(id) {
    if (confirm('Deseja realmente excluir esta conta/cartão?')) {
      window.State.deleteAccount(id);
      this.showToast('Conta excluída!', 'danger');
    }
  }

  // --- Processamento de Arquivos OFX / CSV ---
  handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    const fileName = file.name.toLowerCase();

    reader.onload = (event) => {
      const content = event.target.result;
      let parsedTxs = [];

      if (fileName.endsWith('.ofx')) {
        parsedTxs = window.Importer.parseOFX(content);
      } else if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
        parsedTxs = window.Importer.parseCSV(content);
      } else {
        alert('Formato não suportado. Por favor utilize arquivos .OFX ou .CSV');
        return;
      }

      if (parsedTxs.length === 0) {
        alert('Nenhuma transação identificada no arquivo enviado.');
        return;
      }

      if (confirm(`Encontradas ${parsedTxs.length} transações no extrato bancário. Deseja importar todas agora?`)) {
        window.State.addMultipleTransactions(parsedTxs);
        this.showToast(`${parsedTxs.length} transações importadas com sucesso!`, 'success');
        this.switchTab('transactions');
      }
    };

    reader.readAsText(file, 'ISO-8859-1');
  }

  // --- Restauração de Backup JSON ---
  handleRestoreJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const success = window.State.importBackupJSON(content);
      if (success) {
        this.showToast('Backup restaurado com sucesso! Todos os seus dados foram carregados.', 'success');
        this.renderCurrentView();
      } else {
        alert('Erro ao restaurar o arquivo de backup. Verifique se é um arquivo .json válido.');
      }
    };
    reader.readAsText(file, 'UTF-8');
  }

  // --- Autenticação & Nuvem Firebase ---
  setupFirebaseSyncListeners() {
    if (!window.FirebaseSync) return;

    window.FirebaseSync.onAuthChange((user) => {
      const userLabel = document.getElementById('auth-user-label');
      const authBtn = document.getElementById('btn-auth-profile');

      if (user) {
        const displayName = user.displayName || user.email.split('@')[0];
        if (userLabel) userLabel.textContent = displayName;
        if (authBtn) {
          authBtn.classList.remove('bg-indigo-50', 'text-indigo-700');
          authBtn.classList.add('bg-emerald-50', 'text-emerald-700', 'dark:bg-emerald-950/60', 'dark:text-emerald-300');
        }
      } else {
        if (userLabel) userLabel.textContent = 'Entrar / Cadastrar';
        if (authBtn) {
          authBtn.classList.add('bg-indigo-50', 'text-indigo-700');
          authBtn.classList.remove('bg-emerald-50', 'text-emerald-700', 'dark:bg-emerald-950/60', 'dark:text-emerald-300');
        }
      }
    });

    window.FirebaseSync.onSyncStatusChange((status, message) => {
      const dot = document.getElementById('sync-dot');
      const text = document.getElementById('sync-text');

      if (dot && text) {
        text.textContent = message;
        dot.className = 'w-2 h-2 rounded-full';

        if (status === 'synced') {
          dot.classList.add('bg-emerald-500');
        } else if (status === 'syncing') {
          dot.classList.add('bg-amber-500', 'animate-pulse');
        } else if (status === 'unconfigured') {
          dot.classList.add('bg-slate-400');
        } else {
          dot.classList.add('bg-rose-500');
        }
      }
    });
  }

  openAuthModal() {
    const modal = document.getElementById('modal-auth');
    if (!modal) return;

    const user = window.FirebaseSync?.currentUser;
    const loggedInView = document.getElementById('auth-logged-in-view');
    const loggedOutView = document.getElementById('auth-logged-out-view');

    if (user) {
      if (loggedInView) loggedInView.classList.remove('hidden');
      if (loggedOutView) loggedOutView.classList.add('hidden');

      const nameEl = document.getElementById('auth-user-name');
      const emailEl = document.getElementById('auth-user-email');
      const avatarEl = document.getElementById('auth-user-avatar');

      const name = user.displayName || user.email.split('@')[0];
      if (nameEl) nameEl.textContent = name;
      if (emailEl) emailEl.textContent = user.email || '';
      if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();
    } else {
      if (loggedInView) loggedInView.classList.add('hidden');
      if (loggedOutView) loggedOutView.classList.remove('hidden');
      this.switchAuthTab('login');
    }

    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  switchAuthTab(mode) {
    this.authMode = mode;
    const tabLogin = document.getElementById('tab-auth-login');
    const tabRegister = document.getElementById('tab-auth-register');
    const nameGroup = document.getElementById('auth-name-group');
    const forgotBtn = document.getElementById('btn-forgot-password');
    const submitBtn = document.getElementById('btn-auth-submit');
    const errBox = document.getElementById('auth-error-msg');

    if (errBox) errBox.classList.add('hidden');

    if (mode === 'register') {
      if (tabRegister) tabRegister.className = 'flex-1 py-2 text-xs font-bold border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 transition';
      if (tabLogin) tabLogin.className = 'flex-1 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition';
      if (nameGroup) nameGroup.classList.remove('hidden');
      if (forgotBtn) forgotBtn.classList.add('hidden');
      if (submitBtn) submitBtn.textContent = 'Criar Minha Conta';
    } else {
      if (tabLogin) tabLogin.className = 'flex-1 py-2 text-xs font-bold border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 transition';
      if (tabRegister) tabRegister.className = 'flex-1 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition';
      if (nameGroup) nameGroup.classList.add('hidden');
      if (forgotBtn) forgotBtn.classList.remove('hidden');
      if (submitBtn) submitBtn.textContent = 'Entrar';
    }
  }

  async handleGoogleLogin() {
    try {
      await window.FirebaseSync.loginWithGoogle();
      this.showToast('Login com Google realizado com sucesso!', 'success');
      this.closeAllModals();
    } catch (err) {
      const errBox = document.getElementById('auth-error-msg');
      if (errBox) {
        errBox.textContent = this.translateFirebaseError(err.message || err.code);
        errBox.classList.remove('hidden');
      }
    }
  }

  async handleLogout() {
    try {
      await window.FirebaseSync.logout();
      this.showToast('Você desconectou da sua conta.', 'info');
      this.closeAllModals();
    } catch (err) {
      alert('Erro ao desconectar: ' + err.message);
    }
  }

  async handleForgotPassword() {
    const email = document.getElementById('auth-email').value;
    if (!email) {
      alert('Por favor, digite seu e-mail no campo acima para redefinir sua senha.');
      return;
    }
    try {
      await window.FirebaseSync.sendPasswordReset(email);
      this.showToast(`E-mail de redefinição de senha enviado para ${email}!`, 'info');
    } catch (err) {
      alert('Erro ao enviar e-mail: ' + this.translateFirebaseError(err.message || err.code));
    }
  }

  openFirebaseConfigModal() {
    const modal = document.getElementById('modal-firebase-config');
    if (!modal) return;

    const config = window.FirebaseSync?.getFirebaseConfig();
    if (config) {
      document.getElementById('fb-api-key').value = config.apiKey || '';
      document.getElementById('fb-auth-domain').value = config.authDomain || '';
      document.getElementById('fb-project-id').value = config.projectId || '';
      document.getElementById('fb-storage-bucket').value = config.storageBucket || '';
      document.getElementById('fb-app-id').value = config.appId || '';
    }

    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  translateFirebaseError(msg) {
    if (!msg) return 'Ocorreu um erro. Tente novamente.';
    const str = String(msg).toLowerCase();
    if (str.includes('user-not-found') || str.includes('invalid-credential') || str.includes('wrong-password') || str.includes('invalid-login-credentials')) {
      return 'E-mail ou senha incorretos.';
    }
    if (str.includes('email-already-in-use')) {
      return 'Este e-mail já está cadastrado. Selecione a aba "Entrar".';
    }
    if (str.includes('weak-password')) {
      return 'A senha deve ter no mínimo 6 caracteres.';
    }
    if (str.includes('invalid-email')) {
      return 'Formato de e-mail inválido.';
    }
    if (str.includes('popup-closed-by-user')) {
      return 'A janela de autenticação foi fechada antes da conclusão.';
    }
    if (str.includes('unauthorized-domain')) {
      return 'Domínio não autorizado. Adicione seu domínio no painel do Firebase.';
    }
    if (str.includes('não configurado')) {
      return 'Configuração da Nuvem necessária. Clique em "Configurar Chaves do Firebase" abaixo.';
    }
    return msg;
  }
}

// Inicializar aplicação
document.addEventListener('DOMContentLoaded', () => {
  window.App = new AppController();
});
