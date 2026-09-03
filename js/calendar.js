/**
 * calendar.js - Calendário Financeiro Interativo de Contas a Pagar e Receber
 */

class CalendarManager {
  constructor() {
    this.currentDate = new Date();
  }

  setMonth(year, month) {
    this.currentDate = new Date(year, month, 1);
  }

  prevMonth() {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
  }

  nextMonth() {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
  }

  getCalendarData() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth(); // 0-11
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 (Dom) a 6 (Sab)
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const allTransactions = window.State.getTransactions();
    const monthTransactions = allTransactions.filter(t => t.date.startsWith(monthStr));

    // Mapear lançamentos por dia do mês
    const daysMap = {};
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateKey = `${monthStr}-${String(day).padStart(2, '0')}`;
      const dayTxs = monthTransactions.filter(t => t.date === dateKey);
      
      const totalIncome = dayTxs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0);
      const totalExpense = dayTxs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0);
      const pendingCount = dayTxs.filter(t => t.status === 'pending').length;

      daysMap[day] = {
        dateKey,
        day,
        transactions: dayTxs,
        totalIncome,
        totalExpense,
        pendingCount,
        hasTransactions: dayTxs.length > 0
      };
    }

    return {
      year,
      month,
      monthName: this.currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
      firstDayIndex,
      totalDaysInMonth,
      prevMonthDays,
      daysMap
    };
  }
}

window.Calendar = new CalendarManager();
