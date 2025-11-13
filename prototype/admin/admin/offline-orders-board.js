// [2025-11-08 07:02:12] Offline orders board interactions
(function () {
	const API_BASE = '/api/admin/offline-orders';
	const METRICS_ENDPOINT = `${API_BASE}/metrics/summary`;
	const STAGE_CONFIG_ENDPOINT = `${API_BASE}/config/stages`;
	const MAX_FETCH_LIMIT = 200;

	const boardEl = document.getElementById('offlineBoard');
	const columnTemplate = document.getElementById('kanban-column-template');
	const cardTemplate = document.getElementById('kanban-card-template');
	const metricsCards = document.querySelectorAll('[data-metric]');
	const searchInput = document.getElementById('kanbanSearchInput');
	const priorityFilter = document.getElementById('kanbanPriorityFilter');
	const ownerFilter = document.getElementById('kanbanOwnerFilter');
	const dateButton = document.getElementById('kanbanDateButton');
	const saveViewButton = document.getElementById('kanbanSaveView');
	const exportButton = document.getElementById('kanbanExport');
	const newOrderButton = document.getElementById('kanbanNewOrder');
	const configButton = document.getElementById('kanbanConfigButton');

	if (!boardEl || !columnTemplate || !cardTemplate) {
		return;
	}

	const state = {
		orders: [],
		stages: [],
		metrics: null,
		filters: {
			search: '',
			rush: null
		},
		drag: {
			orderId: null
		}
	};

	const debounce = (fn, delay = 250) => {
		let timer;
		return (...args) => {
			clearTimeout(timer);
			timer = setTimeout(() => fn.apply(null, args), delay);
		};
	};

	const formatDateTime = (value) => {
		if (!value) return 'Unknown';
		try {
			return new Intl.DateTimeFormat(undefined, {
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			}).format(new Date(value));
		} catch (error) {
			return value;
		}
	};

	const fetchJSON = async (url, options = {}) => {
		const opts = {
			credentials: 'include',
			...options
		};

		if (opts.body && typeof opts.body === 'object' && !(opts.body instanceof FormData)) {
			opts.headers = {
				'Content-Type': 'application/json',
				...(opts.headers || {})
			};
			opts.body = JSON.stringify(opts.body);
		}

		const response = await fetch(url, opts);
		const text = await response.text();
		let payload = null;

		try {
			payload = text ? JSON.parse(text) : null;
		} catch (error) {
			payload = null;
		}

		if (!response.ok) {
			const message = payload?.message || payload?.error || response.statusText;
			throw new Error(message || 'Request failed');
		}

		return payload;
	};

	const notify = (message, type = 'info') => {
		if (type === 'error') {
			console.error(message);
			window.alert(message);
		} else {
			console.info(message);
		}
	};

	const buildListQuery = () => {
		const params = new URLSearchParams();
		params.set('limit', String(MAX_FETCH_LIMIT));
		if (state.filters.search) {
			params.set('search', state.filters.search);
		}
		if (state.filters.rush !== null) {
			params.set('rush', state.filters.rush ? 'true' : 'false');
		}
		return params.toString();
	};

	const updateOrderInState = (incoming) => {
		if (!incoming) return;
		const idx = state.orders.findIndex((order) => order.id === incoming.id);
		if (idx !== -1) {
			state.orders[idx] = incoming;
		} else {
			state.orders.push(incoming);
		}
	};

	const renderMetrics = () => {
		if (!metricsCards.length) return;
		const summary = state.metrics?.summary || {};
		const stageSummaries = state.metrics?.stages || [];

		metricsCards.forEach((card) => {
			const target = card.querySelector('[data-metric-value]');
			if (!target) return;

			const metric = card.getAttribute('data-metric');
			switch (metric) {
				case 'total':
					target.textContent = summary.active ?? '0';
					break;
				case 'rush':
					target.textContent = summary.rushActive ?? '0';
					break;
				case 'delayed': {
					const logistics = stageSummaries.find((stage) => stage.key === 'logistics');
					target.textContent = logistics ? logistics.count : '0';
					break;
				}
				default:
					break;
			}
		});
	};

	const dispatchBoardUpdated = () => {
		document.dispatchEvent(new CustomEvent('offlineBoardUpdated'));
	};

	const renderBoard = () => {
		boardEl.innerHTML = '';

		if (!state.stages.length) {
			const emptyMessage = document.createElement('p');
			emptyMessage.className = 'text-muted';
			emptyMessage.textContent = 'No workflow stages configured. Please update settings.';
			boardEl.appendChild(emptyMessage);
			dispatchBoardUpdated();
			return;
		}

		state.stages.forEach((stage) => {
			const columnNode = columnTemplate.content.firstElementChild.cloneNode(true);
			columnNode.dataset.stageKey = stage.key;

			const labelEl = columnNode.querySelector('[data-stage-label]');
			const countEl = columnNode.querySelector('[data-stage-count]');
			const bodyEl = columnNode.querySelector('[data-stage-body]');
			const footerBtn = columnNode.querySelector('[data-stage-footer]');

			if (labelEl) labelEl.textContent = stage.label;
			if (footerBtn) {
				footerBtn.textContent = `+ Add note`;
				footerBtn.addEventListener('click', () => {
					notify('Notes support coming soon.');
				});
			}

			const ordersInStage = state.orders
				.filter((order) => order.stage?.key === stage.key)
				.sort((a, b) => {
					const aDate = new Date(a.createdAt).getTime();
					const bDate = new Date(b.createdAt).getTime();
					return aDate - bDate;
				});

			if (countEl) countEl.textContent = String(ordersInStage.length);

			if (!ordersInStage.length) {
				const empty = document.createElement('p');
				empty.className = 'kanban-card-detail';
				empty.textContent = 'No orders yet.';
				bodyEl.appendChild(empty);
			} else {
				ordersInStage.forEach((order) => {
					const cardNode = cardTemplate.content.firstElementChild.cloneNode(true);
					cardNode.dataset.orderId = order.id;
					cardNode.dataset.stageKey = order.stage?.key || '';

					const titleEl = cardNode.querySelector('[data-card-title]');
					const chipEl = cardNode.querySelector('[data-card-chip]');
					const metaEl = cardNode.querySelector('[data-card-meta]');
					const detailEl = cardNode.querySelector('[data-card-detail]');

					if (titleEl) {
						const project = order.projectName || 'Untitled';
						titleEl.textContent = `#${order.orderCode} · ${project}`;
					}

					if (chipEl) {
						if (order.rushOrder) {
							chipEl.textContent = 'Rush';
							chipEl.classList.add('is-priority');
							chipEl.hidden = false;
						} else if (order.requiresProof) {
							chipEl.textContent = 'Proof';
							chipEl.classList.add('is-warning');
							chipEl.hidden = false;
						} else if (order.status === 'COMPLETED') {
							chipEl.textContent = 'Completed';
							chipEl.classList.add('is-success');
							chipEl.hidden = false;
						} else {
							chipEl.hidden = true;
						}
					}

					if (metaEl) {
						const contactName = order.contact?.name || 'Unknown contact';
						metaEl.textContent = `${formatDateTime(order.createdAt)} · ${contactName}`;
					}

					if (detailEl) {
						const detail =
							order.description ||
							order.configuration?.artworkNotes ||
							order.primaryProduct ||
							'No additional details';
						detailEl.textContent = detail;
					}

					cardNode.addEventListener('dragstart', handleDragStart);
					cardNode.addEventListener('dragend', handleDragEnd);
					cardNode.addEventListener('click', () => handleCardClick(order.id));

					bodyEl.appendChild(cardNode);
				});
			}

			bodyEl.addEventListener('dragover', (event) => {
				if (!state.drag.orderId) return;
				event.preventDefault();
				bodyEl.classList.add('is-drag-over');
				event.dataTransfer.dropEffect = 'move';
			});

			bodyEl.addEventListener('dragleave', () => {
				bodyEl.classList.remove('is-drag-over');
			});

			bodyEl.addEventListener('drop', (event) => {
				event.preventDefault();
				bodyEl.classList.remove('is-drag-over');
				if (!state.drag.orderId) return;
				moveOrder(state.drag.orderId, stage.key);
			});

			boardEl.appendChild(columnNode);
		});

		dispatchBoardUpdated();
	};

	const handleDragStart = (event) => {
		const card = event.currentTarget;
		state.drag.orderId = card.dataset.orderId;
		card.classList.add('is-dragging');
		event.dataTransfer.effectAllowed = 'move';
		event.dataTransfer.setData('text/plain', card.dataset.orderId);
	};

	const handleDragEnd = (event) => {
		event.currentTarget.classList.remove('is-dragging');
		state.drag.orderId = null;
	};

	const moveOrder = async (orderId, targetStageKey) => {
		const order = state.orders.find((item) => item.id === orderId);
		if (!order) return;

		if (order.stage?.key === targetStageKey) return;

		const targetStage = state.stages.find((stage) => stage.key === targetStageKey);
		if (!targetStage) {
			notify('Unknown stage selected', 'error');
			return;
		}

		const original = JSON.parse(JSON.stringify(order));

		order.stage = {
			key: targetStage.key,
			label: targetStage.label,
			position: state.orders.filter((item) => item.stage?.key === targetStageKey).length
		};

		renderBoard();

		try {
			const response = await fetchJSON(`${API_BASE}/${orderId}/stage`, {
				method: 'PATCH',
				body: {
					stageKey: targetStage.key,
					position: order.stage.position
				}
			});

			if (response?.order) {
				updateOrderInState(response.order);
				renderBoard();
				await loadMetrics();
			}
		} catch (error) {
			updateOrderInState(original);
			renderBoard();
			notify(`Failed to move card: ${error.message}`, 'error');
		}
	};

	const handleCardClick = async (orderId) => {
		try {
			const response = await fetchJSON(`${API_BASE}/${orderId}`);
			if (!response?.order) return;

			const { order } = response;
			const details = [
				`Project: ${order.projectName || 'Untitled'}`,
				`Contact: ${order.contact?.name || 'Unknown'} (${order.contact?.email || 'no email'})`,
				`Stage: ${order.stage?.label || 'Unknown'}`,
				`Status: ${order.status}`,
				`Rush: ${order.rushOrder ? 'Yes' : 'No'}`,
				`Requires proof: ${order.requiresProof ? 'Yes' : 'No'}`,
				`Created: ${formatDateTime(order.createdAt)}`
			].join('\n');

			window.alert(details);
		} catch (error) {
			notify(`Failed to load order detail: ${error.message}`, 'error');
		}
	};

	const loadBoard = async () => {
		try {
			boardEl.setAttribute('aria-busy', 'true');
			const query = buildListQuery();
			const data = await fetchJSON(`${API_BASE}?${query}`);
			state.orders = data?.orders || [];
			if (Array.isArray(data?.stages) && data.stages.length) {
				state.stages = data.stages;
			}
			renderBoard();
			dispatchBoardUpdated();
		} catch (error) {
			notify(`Failed to load offline orders: ${error.message}`, 'error');
		} finally {
			boardEl.removeAttribute('aria-busy');
		}
	};

	const loadMetrics = async () => {
		try {
			const data = await fetchJSON(METRICS_ENDPOINT);
			state.metrics = data;
			renderMetrics();
		} catch (error) {
			console.warn('Failed to fetch metrics', error);
		}
	};

	const handleSearchChange = debounce((event) => {
		state.filters.search = event.target.value.trim();
		loadBoard();
	}, 300);

	const handlePriorityChange = (event) => {
		const value = event.target.value;
		if (!value) {
			state.filters.rush = null;
		} else if (value === 'rush') {
			state.filters.rush = true;
		} else {
			state.filters.rush = false;
		}
		loadBoard();
	};

	const handleConfigUpdate = async () => {
		if (!state.stages.length) {
			notify('No stages configured yet. Add labels separated by new lines.', 'info');
		}

		const current = state.stages.map((stage) => stage.label).join('\n');
		const input = window.prompt('Update stages (one label per line):', current);
		if (input === null) return;

		const labels = input
			.split('\n')
			.map((line) => line.trim())
			.filter(Boolean);

		if (!labels.length) {
			notify('At least one stage label is required.', 'error');
			return;
		}

		try {
			const response = await fetchJSON(STAGE_CONFIG_ENDPOINT, {
				method: 'PUT',
				body: {
					stages: labels.map((label) => ({ label }))
				}
			});

			if (Array.isArray(response?.stages) && response.stages.length) {
				state.stages = response.stages;
				await loadBoard();
				await loadMetrics();
				notify('Workflow stages updated.');
			}
		} catch (error) {
			notify(`Failed to update stages: ${error.message}`, 'error');
		}
	};

	const init = () => {
		if (searchInput) {
			searchInput.addEventListener('input', handleSearchChange);
		}

		if (priorityFilter) {
			priorityFilter.addEventListener('change', handlePriorityChange);
		}

		if (ownerFilter) {
			ownerFilter.addEventListener('change', () => notify('Owner filtering is coming soon.'));
		}

		if (dateButton) {
			dateButton.addEventListener('click', () => notify('Date filtering is coming soon.'));
		}

		if (saveViewButton) {
			saveViewButton.addEventListener('click', () => notify('Save view is coming soon.'));
		}

		if (exportButton) {
			exportButton.addEventListener('click', () => notify('Export pipeline is coming soon.'));
		}

		if (newOrderButton) {
			newOrderButton.addEventListener('click', () => {
				const newWindow = window.open('../offline-pod-intake.html', '_blank');
				if (newWindow) {
					newWindow.opener = null;
				}
			});
		}

		if (configButton) {
			configButton.addEventListener('click', handleConfigUpdate);
		}

		loadBoard();
		loadMetrics();
	};

	init();
})();

