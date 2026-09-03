/**
 * importer.js - Importador de Extratos Bancários (OFX e CSV) e Exportação de Relatórios
 */

class ImporterManager {
  constructor() {}

  // Parser robusto de arquivo OFX (padrão de bancos brasileiros: Nubank, Inter, Itaú, BB, etc.)
  parseOFX(ofxContent) {
    const transactions = [];
    const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    let match;

    while ((match = stmtTrnRegex.exec(ofxContent)) !== null) {
      const block = match[1];

      // Extrair tipo TRNTYPE (DEBIT / CREDIT)
      const typeMatch = /<TRNTYPE>(.*)/i.exec(block);
      const trnType = typeMatch ? typeMatch[1].trim().toUpperCase() : '';

      // Extrair Data DTPOSTED (YYYYMMDD...)
      const dateMatch = /<DTPOSTED>(\d{4})(\d{2})(\d{2})/i.exec(block);
      let date = new Date().toISOString().slice(0, 10);
      if (dateMatch) {
        date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
      }

      // Extrair Valor TRNAMT
      const amtMatch = /<TRNAMT>([-\d.,]+)/i.exec(block);
      let rawAmt = amtMatch ? parseFloat(amtMatch[1].replace(',', '.')) : 0;

      // Extrair Descrição / MEMO ou NAME
      const memoMatch = /<MEMO>(.*)/i.exec(block);
      const nameMatch = /<NAME>(.*)/i.exec(block);
      let description = (memoMatch ? memoMatch[1] : (nameMatch ? nameMatch[1] : 'Transação Importada')).trim();
      // Limpar tags residuais se houver
      description = description.replace(/<[^>]+>/g, '').trim();

      const type = rawAmt < 0 || trnType === 'DEBIT' ? 'expense' : 'income';
      const amount = Math.abs(rawAmt);

      // Tentar sugerir categoria com base no nome
      const suggestedCat = this.guessCategory(description, type);

      transactions.push({
        id: 'tx_ofx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        description: description,
        amount: amount,
        type: type,
        categoryId: suggestedCat,
        accountId: window.State.getAccounts()[0]?.id || 'acc_nubank',
        date: date,
        status: 'paid',
        notes: 'Importado via arquivo OFX'
      });
    }

    return transactions;
  }

  // Parser de arquivo CSV (ex: Nubank CSV, padrão Data;Descrição;Valor)
  parseCSV(csvContent) {
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return [];

    const transactions = [];
    const header = lines[0].toLowerCase();
    const delimiter = header.includes(';') ? ';' : ',';

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length < 2) continue;

      let date = '';
      let description = '';
      let amount = 0;
      let type = 'expense';

      // Detectar formato Nubank: data, valor, identificador, descrição
      // ou padrão simples: Data, Descrição, Valor
      if (cols[0].match(/\d{4}-\d{2}-\d{2}/)) {
        date = cols[0];
      } else if (cols[0].match(/\d{2}\/\d{2}\/\d{4}/)) {
        const parts = cols[0].split('/');
        date = `${parts[2]}-${parts[1]}-${parts[0]}`;
      } else {
        date = new Date().toISOString().slice(0, 10);
      }

      // Procurar coluna numérica
      for (let j = 1; j < cols.length; j++) {
        const cleanedNum = cols[j].replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
        const parsed = parseFloat(cleanedNum);
        if (!isNaN(parsed) && parsed !== 0) {
          amount = Math.abs(parsed);
          type = parsed < 0 ? 'expense' : 'income';
          // A descrição é a coluna antes ou depois
          description = cols[j === 1 ? 2 : 1] || 'Lançamento CSV';
          break;
        }
      }

      if (amount > 0) {
        transactions.push({
          id: 'tx_csv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          description: description || 'Lançamento Importado',
          amount: amount,
          type: type,
          categoryId: this.guessCategory(description, type),
          accountId: window.State.getAccounts()[0]?.id || 'acc_nubank',
          date: date,
          status: 'paid',
          notes: 'Importado via CSV'
        });
      }
    }

    return transactions;
  }

  // Sugestão de categoria com base em palavras-chave comuns no Brasil
  guessCategory(description, type) {
    const desc = (description || '').toLowerCase();
    if (type === 'income') {
      if (desc.includes('salario') || desc.includes('folha') || desc.includes('remunera')) return 'cat_salario';
      if (desc.includes('freela') || desc.includes('servico') || desc.includes('prestac')) return 'cat_freela';
      if (desc.includes('rend') || desc.includes('cdb') || desc.includes('fii') || desc.includes('divid')) return 'cat_invest';
      return 'cat_outros_rec';
    }

    if (desc.includes('super') || desc.includes('mercado') || desc.includes('ifood') || desc.includes('padaria') || desc.includes('restaurante') || desc.includes('cafe') || desc.includes('burger') || desc.includes('pizza') || desc.includes('pao')) {
      return 'cat_alim';
    }
    if (desc.includes('aluguel') || desc.includes('condom') || desc.includes('luz') || desc.includes('enel') || desc.includes('cpfl') || desc.includes('agua') || desc.includes('sabesp') || desc.includes('gas')) {
      return 'cat_mor';
    }
    if (desc.includes('uber') || desc.includes('99') || desc.includes('posto') || desc.includes('gasolina') || desc.includes('combust') || desc.includes('shell') || desc.includes('ipiranga') || desc.includes('estacion')) {
      return 'cat_transp';
    }
    if (desc.includes('farmacia') || desc.includes('droga') || desc.includes('saude') || desc.includes('medico') || desc.includes('consul') || desc.includes('drogasil') || desc.includes('raia')) {
      return 'cat_saude';
    }
    if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('prime') || desc.includes('disney') || desc.includes('hbo') || desc.includes('youtube') || desc.includes('apple')) {
      return 'cat_serv';
    }
    if (desc.includes('curso') || desc.includes('udemy') || desc.includes('escola') || desc.includes('faculdade') || desc.includes('livro')) {
      return 'cat_educ';
    }
    if (desc.includes('cinema') || desc.includes('show') || desc.includes('steam') || desc.includes('jogos') || desc.includes('ingress') || desc.includes('bar')) {
      return 'cat_lazer';
    }
    if (desc.includes('amazon') || desc.includes('mercado livre') || desc.includes('shopee') || desc.includes('shein') || desc.includes('zara') || desc.includes('roupa')) {
      return 'cat_compras';
    }

    return 'cat_outros_desp';
  }

  // Exportar todas as transações para CSV
  exportTransactionsToCSV() {
    const transactions = window.State.getTransactions();
    const categories = window.State.getCategories();
    const accounts = window.State.getAccounts();

    const headers = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Conta', 'Valor', 'Status', 'Observações'];
    const rows = transactions.map(tx => {
      const cat = categories.find(c => c.id === tx.categoryId)?.name || 'Sem Categoria';
      const acc = accounts.find(a => a.id === tx.accountId)?.name || 'Conta Padrão';
      const typeLabel = tx.type === 'income' ? 'Receita' : 'Despesa';
      const statusLabel = tx.status === 'paid' ? 'Pago/Recebido' : 'Pendente';
      const formattedAmount = (tx.amount || 0).toFixed(2).replace('.', ',');

      return [
        `"${tx.date}"`,
        `"${typeLabel}"`,
        `"${(tx.description || '').replace(/"/g, '""')}"`,
        `"${cat}"`,
        `"${acc}"`,
        `"${formattedAmount}"`,
        `"${statusLabel}"`,
        `"${(tx.notes || '').replace(/"/g, '""')}"`
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_transacoes_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

window.Importer = new ImporterManager();
