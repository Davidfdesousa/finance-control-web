import type { RecurringTemplateItemData } from './recurring-template-item';
import './recurring-template-item';

export class RecurringTemplateList extends HTMLElement {
  set items(items: RecurringTemplateItemData[]) {
    this.innerHTML = '<div class="stack"></div>';
    const stack = this.querySelector('.stack') as HTMLElement;
    for (const item of items) {
      const element = document.createElement('recurring-template-item') as HTMLElement & {
        data: RecurringTemplateItemData;
      };
      element.data = item;
      stack.appendChild(element);
    }
  }
}

customElements.define('recurring-template-list', RecurringTemplateList);
