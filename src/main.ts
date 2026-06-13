import './styles/tokens.css';
import './styles/global.css';

// Componentes de UI
import './components/ui/ui-button';
import './components/ui/ui-input';
import './components/ui/ui-select';
import './components/ui/ui-card';
import './components/ui/ui-checkbox';
import './components/ui/ui-modal';
import './components/ui/ui-bottom-nav';
import './components/ui/ui-money-input';
import './components/ui/ui-date-input';
import './components/ui/ui-empty-state';
import './components/ui/ui-loading';
import './components/ui/ui-month-switcher';

// Componentes de feature
import './components/expense/expense-item';
import './components/expense/expense-list';
import './components/expense/expense-form';
import './components/income/income-list';
import './components/income/income-form';
import './components/recurring/recurring-template-list';
import './components/recurring/recurring-template-item';
import './components/recurring/recurring-template-form';
import './components/recurring/month-generator-panel';
import './components/installment/installment-list';
import './components/installment/installment-form';
import './components/installment/installment-detail';
import './components/cards/credit-card-list';
import './components/cards/credit-card-detail';
import './components/cards/credit-card-invoice';
import './components/cards/credit-card-invoice-item';
import './components/reserve/emergency-reserve-card';
import './components/ui/progress-bar';

// Páginas
import './pages/auth-page';
import './pages/dashboard-page';
import './pages/expenses-page';
import './pages/incomes-page';
import './pages/recurring-page';
import './pages/installments-page';
import './pages/cards-page';
import './pages/emergency-reserve-page';
import './pages/reports-page';
import './pages/settings-page';

// Aplicação
import './components/app-router';
import './components/app-shell';
import './components/app-root';

const mount = document.querySelector('#app');
if (mount) {
  mount.appendChild(document.createElement('app-root'));
}
