import type { ExpenseItemData } from './expense-item';
import { ExpenseItem } from './expense-item';
import '../ui/ui-card';

/**
 * Lista de despesas. Os eventos 'toggle-paid', 'edit' e 'delete'
 * dos itens borbulham através deste elemento.
 */
export class ExpenseList extends HTMLElement {
  set items(items: ExpenseItemData[]) {
    this.innerHTML = '';
    if (items.length === 0) return;

    const card = document.createElement('ui-card');
    card.setAttribute('pad', 'sm');
    for (const item of items) {
      const row = new ExpenseItem();
      card.appendChild(row);
      row.data = item;
    }
    this.appendChild(card);
  }
}

customElements.define('expense-list', ExpenseList);
