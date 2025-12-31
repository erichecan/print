// Cost management dashboard interactions
const state = {
  currency: 'CAD',
  search: '',
  category: '',
  timeframe: '30',
  products: [],
  categories: [],
  summary: null,
  isLoading: false
};

const selectors = {
  totalCost: document.querySelector('[data-field="totalCostValue"]'),
  totalRevenue: document.querySelector('[data-field="totalRevenueValue"]'),
  averageGrossProfit: document.querySelector('[data-field="averageGrossProfitValue"]'),
  averageMargin: document.querySelector('[data-field="averageMarginValue"]'),
  tableBody: document.querySelector('[data-cost-table-body]'),
  tableWrapper: document.querySelector('[data-table-wrapper]'),
  searchInput: document.querySelector('[data-field="searchQuery"]'),
  categorySelect: document.querySelector('[data-field="categoryFilter"]'),
  currencySelect: document.querySelector('[data-filter="currency"]'),
  timeframeSelect: document.querySelector('[data-filter="timeframe"]'),
  bulkEditButton: document.querySelector('[data-action="open-cost-modal"]')
};

const numberFormatter = (currency) =>
  new Intl.NumberFormat(i18n.currentLang === 'zh' ? 'zh-CN' : 'en-CA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

const percentFormatter = new Intl.NumberFormat(undefined, {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
});

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    ...options
  });

  if (!response.ok) {
    let detail = 'Request failed';
    try {
      const payload = await response.json();
      detail = payload.error || detail;
    } catch (error) {
      // Ignore JSON parse errors
    }
    throw new Error(detail);
  }

  return response.json();
};

const renderSummary = () => {
  if (!state.summary) {
    selectors.totalCost.textContent = '--';
    selectors.totalRevenue.textContent = '--';
    selectors.averageGrossProfit.textContent = '--';
    selectors.averageMargin.textContent = '--';
    return;
  }
  const formatter = numberFormatter(state.currency);
  selectors.totalCost.textContent = formatter.format(state.summary.totalCost || 0);
  selectors.totalRevenue.textContent = formatter.format(state.summary.totalRevenue || 0);
  selectors.averageGrossProfit.textContent = formatter.format(state.summary.averageGrossProfit || 0);
  selectors.averageMargin.textContent = percentFormatter.format((state.summary.averageMargin || 0) / 100);
};

const renderCategories = () => {
  if (!selectors.categorySelect) {
    return;
  }

  const currentValue = selectors.categorySelect.value;
  selectors.categorySelect.innerHTML = '';
  const allOption = document.createElement('option');
  allOption.value = '';
  allOption.setAttribute('data-i18n', 'allCategories');
  allOption.textContent = i18n.t('allCategories');
  selectors.categorySelect.appendChild(allOption);

  state.categories.forEach((category) => {
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = `${category.name} (${category.productCount})`;
    selectors.categorySelect.appendChild(option);
  });

  selectors.categorySelect.value = currentValue && state.categories.some((c) => c.id === currentValue)
    ? currentValue
    : '';
};

const renderTable = () => {
  if (!selectors.tableBody) return;
  selectors.tableBody.innerHTML = '';

  if (!state.products.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 8;
    cell.style.textAlign = 'center';
    cell.style.padding = '24px';
    cell.style.color = 'var(--color-text-muted)';
    cell.setAttribute('data-i18n', 'costNoResults');
    cell.textContent = i18n.t('costNoResults');
    row.appendChild(cell);
    selectors.tableBody.appendChild(row);
    return;
  }

  const formatter = numberFormatter(state.currency);

  state.products.forEach((product) => {
    const row = document.createElement('tr');
    row.dataset.productId = product.id;
    row.innerHTML = `
      <td>
        <div style="display: flex; gap: 12px; align-items: center;">
          <div class="placeholder" style="width: 48px; height: 48px; border-radius: 8px; flex-shrink: 0;"></div>
          <div>
            <div style="font-weight: 600;">${product.name}</div>
            <div style="font-size: 12px; color: var(--color-text-muted);">${product.category?.name || '-'}</div>
          </div>
        </div>
      </td>
      <td>${product.sku}</td>
      <td>${formatter.format(product.unitCost || 0)}</td>
      <td>${formatter.format(product.salePrice || 0)}</td>
      <td>${formatter.format(product.grossProfit || 0)}</td>
      <td>${percentFormatter.format((product.margin || 0) / 100)}</td>
      <td>${product.updatedAt ? new Date(product.updatedAt).toLocaleString() : '--'}</td>
      <td></td>
    `;
    const actionCell = row.lastElementChild;
    if (actionCell) {
      const button = document.createElement('button');
      button.className = 'btn btn--ghost';
      button.type = 'button';
      button.dataset.action = 'edit-cost';
      button.dataset.productId = product.id;
      button.setAttribute('data-i18n', 'edit');
      button.textContent = i18n.t('edit');
      actionCell.appendChild(button);
    }
    selectors.tableBody.appendChild(row);
  });
};

const loadSummary = async () => {
  try {
    const payload = await fetchJson('/api/admin/cost-management/summary');
    state.summary = payload.data || null;
    renderSummary();
  } catch (error) {
    selectors.totalCost.textContent = '--';
    selectors.totalRevenue.textContent = '--';
    selectors.averageGrossProfit.textContent = '--';
    selectors.averageMargin.textContent = '--';
    console.warn('[CostManagement] Failed to load summary', error);
  }
};

const loadCategories = async () => {
  try {
    const payload = await fetchJson('/api/admin/cost-management/categories');
    state.categories = payload.data || [];
    renderCategories();
  } catch (error) {
    console.warn('[CostManagement] Failed to load categories', error);
  }
};

const loadProducts = async () => {
  state.isLoading = true;
  try {
    const params = new URLSearchParams();
    if (state.search) {
      params.set('search', state.search);
    }
    if (state.category) {
      params.set('categoryId', state.category);
    }
    const payload = await fetchJson(`/api/admin/cost-management/products?${params.toString()}`);
    state.products = payload.data || [];
    renderTable();
  } catch (error) {
    if (selectors.tableBody) {
      selectors.tableBody.innerHTML = '';
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 8;
      cell.style.textAlign = 'center';
      cell.style.padding = '24px';
      cell.style.color = 'var(--color-error, #ef4444)';
      cell.textContent = error.message;
      row.appendChild(cell);
      selectors.tableBody.appendChild(row);
    }
  } finally {
    state.isLoading = false;
  }
};

let searchDebounce;
const handleSearchInput = (event) => {
  const value = event.target.value.trim();
  state.search = value;
  if (searchDebounce) {
    clearTimeout(searchDebounce);
  }
  searchDebounce = setTimeout(() => {
    loadProducts();
  }, 300);
};

const handleCategoryChange = (event) => {
  state.category = event.target.value;
  loadProducts();
};

const handleCurrencyChange = (event) => {
  const nextCurrency = event.target.value;
  if (nextCurrency !== 'CAD') {
    alert(i18n.t('costMultiCurrencyNotice'));
    selectors.currencySelect.value = 'CAD';
    return;
  }
  state.currency = nextCurrency;
  renderSummary();
  renderTable();
};

const handleTimeframeChange = (event) => {
  state.timeframe = event.target.value;
};

const promptForCostValues = (product) => {
  const costPrompt = `${i18n.t('unitCost')} (${state.currency})`;
  const salePrompt = `${i18n.t('unitSalePrice')} (${state.currency})`;
  const costInput = window.prompt(costPrompt, product.unitCost?.toFixed(2) || '0.00');
  if (costInput === null) {
    return null;
  }
  const saleInput = window.prompt(salePrompt, product.salePrice?.toFixed(2) || '0.00');
  if (saleInput === null) {
    return null;
  }

  const parsedCost = Number.parseFloat(costInput);
  const parsedSale = Number.parseFloat(saleInput);

  if (Number.isNaN(parsedCost) || Number.isNaN(parsedSale)) {
    alert(i18n.t('costInvalidNumber'));
    return null;
  }

  return {
    unitCost: Math.round(parsedCost * 100) / 100,
    salePrice: Math.round(parsedSale * 100) / 100
  };
};

const updateProductCost = async (productId, values) => {
  const response = await fetchJson(`/api/admin/cost-management/products/${productId}`, {
    method: 'PUT',
    body: JSON.stringify(values)
  });
  return response.data;
};

const handleEditClick = async (productId) => {
  const product = state.products.find((item) => item.id === productId);
  if (!product) {
    alert(i18n.t('costProductMissing'));
    return;
  }

  const values = promptForCostValues(product);
  if (!values) {
    return;
  }

  try {
    const updated = await updateProductCost(productId, values);
    const index = state.products.findIndex((item) => item.id === productId);
    if (index !== -1) {
      state.products[index] = updated;
      renderTable();
      await loadSummary();
      alert(i18n.t('costUpdateSuccess'));
    }
  } catch (error) {
    alert(error.message);
  }
};

const attachEventListeners = () => {
  selectors.searchInput?.addEventListener('input', handleSearchInput);
  selectors.categorySelect?.addEventListener('change', handleCategoryChange);
  selectors.currencySelect?.addEventListener('change', handleCurrencyChange);
  selectors.timeframeSelect?.addEventListener('change', handleTimeframeChange);
  selectors.bulkEditButton?.addEventListener('click', () => {
    if (!state.products.length) {
      alert(i18n.t('costNoProductsLoaded'));
      return;
    }
    handleEditClick(state.products[0].id);
  });
  selectors.tableBody?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="edit-cost"]');
    if (!button) return;
    const productId = button.dataset.productId;
    if (productId) {
      handleEditClick(productId);
    }
  });
};

const init = async () => {
  attachEventListeners();
  await Promise.all([loadSummary(), loadCategories(), loadProducts()]);
  renderSummary();
  renderTable();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}


