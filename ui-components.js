// UI Components Library for suvernire plus
// Loading states, toasts, modals, empty states, confirmation dialogs

/**
 * Show loading spinner on a button
 */
function setButtonLoading(button, loading = true) {
	if (!button) return;
	if (loading) {
		button.dataset.originalText = button.textContent;
		button.disabled = true;
		button.innerHTML = '<span class="spinner"></span> Loading...';
		button.classList.add('is-loading');
	} else {
		button.disabled = false;
		button.textContent = button.dataset.originalText || '';
		button.classList.remove('is-loading');
	}
}

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duration in ms (default: 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
	// Remove existing toast container if any
	let container = document.getElementById('toast-container');
	if (!container) {
		container = document.createElement('div');
		container.id = 'toast-container';
		container.className = 'toast-container';
		document.body.appendChild(container);
	}
	
	const toast = document.createElement('div');
	toast.className = `toast toast-${type}`;
	
	const icon = {
		success: '✓',
		error: '✕',
		warning: '⚠',
		info: 'ℹ'
	}[type] || 'ℹ';
	
	toast.innerHTML = `
		<span class="toast-icon">${icon}</span>
		<span class="toast-message">${message}</span>
	`;
	
	container.appendChild(toast);
	
	// Trigger animation
	setTimeout(() => toast.classList.add('show'), 10);
	
	// Auto remove
	setTimeout(() => {
		toast.classList.remove('show');
		setTimeout(() => toast.remove(), 300);
	}, duration);
}

/**
 * Show confirmation modal
 * @param {string} message - Message to display
 * @param {Function} onConfirm - Callback when confirmed
 * @param {string} confirmText - Confirm button text
 * @param {string} cancelText - Cancel button text
 */
function showConfirm(message, onConfirm, confirmText = 'Confirm', cancelText = 'Cancel') {
	// Remove existing modal if any
	const existing = document.getElementById('modal-overlay');
	if (existing) existing.remove();
	
	const overlay = document.createElement('div');
	overlay.id = 'modal-overlay';
	overlay.className = 'modal-overlay';
	
	const modal = document.createElement('div');
	modal.className = 'modal';
	modal.innerHTML = `
		<div class="modal-header">
			<h3>Confirm</h3>
			<button class="modal-close" aria-label="Close">×</button>
		</div>
		<div class="modal-body">
			<p>${message}</p>
		</div>
		<div class="modal-footer">
			<button class="btn btn--outline modal-cancel">${cancelText}</button>
			<button class="btn modal-confirm">${confirmText}</button>
		</div>
	`;
	
	overlay.appendChild(modal);
	document.body.appendChild(overlay);
	
	// Show animation
	setTimeout(() => overlay.classList.add('show'), 10);
	
	// Close handlers
	const close = () => {
		overlay.classList.remove('show');
		setTimeout(() => overlay.remove(), 300);
	};
	
	modal.querySelector('.modal-close').addEventListener('click', close);
	modal.querySelector('.modal-cancel').addEventListener('click', close);
	modal.querySelector('.modal-confirm').addEventListener('click', () => {
		close();
		if (onConfirm) onConfirm();
	});
	
	overlay.addEventListener('click', (e) => {
		if (e.target === overlay) close();
	});
}

/**
 * Show alert modal
 * @param {string} message - Message to display
 * @param {string} type - 'success', 'error', 'warning', 'info'
 */
function showAlert(message, type = 'info') {
	const overlay = document.createElement('div');
	overlay.className = 'modal-overlay';
	
	const modal = document.createElement('div');
	modal.className = 'modal';
	
	const icon = {
		success: '✓',
		error: '✕',
		warning: '⚠',
		info: 'ℹ'
	}[type] || 'ℹ';
	
	modal.innerHTML = `
		<div class="modal-header">
			<h3>${type.charAt(0).toUpperCase() + type.slice(1)}</h3>
		</div>
		<div class="modal-body">
			<div style="display: flex; align-items: center; gap: 16px;">
				<span style="font-size: 48px; color: var(--color-primary);">${icon}</span>
				<p style="margin: 0; flex: 1;">${message}</p>
			</div>
		</div>
		<div class="modal-footer">
			<button class="btn modal-ok">OK</button>
		</div>
	`;
	
	overlay.appendChild(modal);
	document.body.appendChild(overlay);
	
	setTimeout(() => overlay.classList.add('show'), 10);
	
	overlay.querySelector('.modal-ok').addEventListener('click', () => {
		overlay.classList.remove('show');
		setTimeout(() => overlay.remove(), 300);
	});
	
	overlay.addEventListener('click', (e) => {
		if (e.target === overlay) {
			overlay.classList.remove('show');
			setTimeout(() => overlay.remove(), 300);
		}
	});
}

/**
 * Show empty state
 * @param {HTMLElement} container - Container to show empty state in
 * @param {Object} options - Options
 */
function showEmptyState(container, options = {}) {
	const {
		icon = '📦',
		title = 'Nothing here yet',
		message = 'Start adding items to see them here.',
		actionText = null,
		onAction = null
	} = options;
	
	const emptyState = document.createElement('div');
	emptyState.className = 'empty-state';
	emptyState.innerHTML = `
		<div class="empty-state__icon">${icon}</div>
		<h3 class="empty-state__title">${title}</h3>
		<p class="empty-state__message">${message}</p>
		${actionText ? `<button class="btn">${actionText}</button>` : ''}
	`;
	
	if (actionText && onAction) {
		emptyState.querySelector('button').addEventListener('click', onAction);
	}
	
	container.innerHTML = '';
	container.appendChild(emptyState);
}

/**
 * Show loading skeleton
 * @param {HTMLElement} container - Container to show skeleton in
 * @param {string} type - 'product', 'list', 'card'
 */
function showSkeleton(container, type = 'list') {
	const skeleton = document.createElement('div');
	skeleton.className = `skeleton skeleton-${type}`;
	
	const templates = {
		product: `
			<div class="skeleton-image"></div>
			<div class="skeleton-text"></div>
			<div class="skeleton-text short"></div>
		`,
		list: `
			<div class="skeleton-item">
				<div class="skeleton-avatar"></div>
				<div class="skeleton-content">
					<div class="skeleton-text"></div>
					<div class="skeleton-text short"></div>
				</div>
			</div>
			<div class="skeleton-item">
				<div class="skeleton-avatar"></div>
				<div class="skeleton-content">
					<div class="skeleton-text"></div>
					<div class="skeleton-text short"></div>
				</div>
			</div>
		`,
		card: `
			<div class="skeleton-header"></div>
			<div class="skeleton-body">
				<div class="skeleton-text"></div>
				<div class="skeleton-text"></div>
				<div class="skeleton-text short"></div>
			</div>
		`
	};
	
	skeleton.innerHTML = templates[type] || templates.list;
	container.innerHTML = '';
	container.appendChild(skeleton);
}

/**
 * Validate form and show errors
 * @param {HTMLFormElement} form - Form element
 * @returns {boolean} - True if valid
 */
function validateForm(form) {
	const inputs = form.querySelectorAll('input[required], textarea[required], select[required]');
	let isValid = true;
	
	inputs.forEach(input => {
		const errorMsg = input.parentElement.querySelector('.error-message');
		if (errorMsg) errorMsg.remove();
		
		if (!input.value.trim()) {
			isValid = false;
			input.classList.add('error');
			const error = document.createElement('span');
			error.className = 'error-message';
			error.textContent = 'This field is required';
			input.parentElement.appendChild(error);
		} else if (input.type === 'email' && !isValidEmail(input.value)) {
			isValid = false;
			input.classList.add('error');
			const error = document.createElement('span');
			error.className = 'error-message';
			error.textContent = 'Please enter a valid email';
			input.parentElement.appendChild(error);
		} else {
			input.classList.remove('error');
		}
	});
	
	return isValid;
}

/**
 * Validate email format
 */
function isValidEmail(email) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Make functions available globally
window.UI = {
	setButtonLoading,
	showToast,
	showConfirm,
	showAlert,
	showEmptyState,
	showSkeleton,
	validateForm
};

// Auto-initialize common patterns
document.addEventListener('DOMContentLoaded', () => {
	// Add loading to buttons with data-loading attribute
	document.querySelectorAll('[data-loading]').forEach(btn => {
		btn.addEventListener('click', () => {
			setButtonLoading(btn, true);
			setTimeout(() => setButtonLoading(btn, false), 2000); // Demo only
		});
	});
	
	// Add confirmation to buttons with data-confirm attribute
	document.querySelectorAll('[data-confirm]').forEach(btn => {
		btn.addEventListener('click', (e) => {
			e.preventDefault();
			showConfirm(btn.dataset.confirm, () => {
				if (btn.form) {
					btn.form.submit();
				}
			});
		});
	});
});

