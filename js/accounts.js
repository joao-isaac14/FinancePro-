/**
 * accounts.js - Gestão de Múltiplas Contas Bancárias, Carteira e Cartões de Crédito
 */

class AccountsManager {
  constructor() {}

  // Calcular saldos dinâmicos e faturas a partir das transações
  getAccountsWithBalances() {
    const accounts = window.State.getAccounts();
    const transactions = window.State.getTransactions();

    return accounts.map(acc => {
      let currentBalance = Number(acc.initialBalance) || 0;
      let totalIncome = 0;
      let totalExpense = 0;
      let currentInvoice = 0; // Para cartões de crédito

      transactions.forEach(tx => {
        if (tx.accountId === acc.id) {
          const val = Number(tx.amount) || 0;
          if (acc.type === 'credit_card') {
            // Cartão de crédito soma compras na fatura do mês atual
            if (tx.type === 'expense') {
              currentInvoice += val;
            } else if (tx.type === 'income') {
              // Pagamento de fatura reduz a fatura
              currentInvoice -= val;
            }
          } else {
            // Conta bancária / Carteira
            if (tx.status === 'paid') {
              if (tx.type === 'income') {
                currentBalance += val;
                totalIncome += val;
              } else if (tx.type === 'expense') {
                currentBalance -= val;
                totalExpense += val;
              }
            }
          }
        }
      });

      if (acc.type === 'credit_card') {
        const limit = Number(acc.limit) || 0;
        const availableLimit = Math.max(0, limit - currentInvoice);
        const limitUsedPercentage = limit > 0 ? (currentInvoice / limit) * 100 : 0;

        return {
          ...acc,
          currentInvoice: Math.max(0, currentInvoice),
          availableLimit,
          limitUsedPercentage: Math.min(100, limitUsedPercentage)
        };
      }

      return {
        ...acc,
        currentBalance,
        totalIncome,
        totalExpense
      };
    });
  }

  // Obter patrimônio líquido total (soma de contas menos faturas de cartões)
  getTotalNetWorth() {
    const accountsWithBalances = this.getAccountsWithBalances();
    let totalCashAndBank = 0;
    let totalCreditDebt = 0;

    accountsWithBalances.forEach(acc => {
      if (acc.type === 'credit_card') {
        totalCreditDebt += (acc.currentInvoice || 0);
      } else {
        totalCashAndBank += (acc.currentBalance || 0);
      }
    });

    return {
      totalCashAndBank,
      totalCreditDebt,
      netWorth: totalCashAndBank - totalCreditDebt
    };
  }

  // Transferência entre contas
  transferFunds(fromAccountId, toAccountId, amount, date = new Date().toISOString().slice(0, 10), notes = '') {
    const fromAcc = window.State.getAccountById(fromAccountId);
    const toAcc = window.State.getAccountById(toAccountId);
    const numAmount = Math.abs(parseFloat(amount));

    if (!fromAcc || !toAcc || isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Contas inválidas ou valor inválido para transferência.');
    }

    if (fromAccountId === toAccountId) {
      throw new Error('A conta de origem e destino devem ser diferentes.');
    }

    // Cria lançamento de saída
    window.State.addTransaction({
      description: `Transferência enviada para ${toAcc.name}`,
      amount: numAmount,
      type: 'expense',
      categoryId: 'cat_outros_desp',
      accountId: fromAccountId,
      date: date,
      status: 'paid',
      notes: notes || 'Transferência interna entre contas'
    });

    // Cria lançamento de entrada
    window.State.addTransaction({
      description: `Transferência recebida de ${fromAcc.name}`,
      amount: numAmount,
      type: 'income',
      categoryId: 'cat_outros_rec',
      accountId: toAccountId,
      date: date,
      status: 'paid',
      notes: notes || 'Transferência interna entre contas'
    });

    return true;
  }
}

window.Accounts = new AccountsManager();
