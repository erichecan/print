// Offline POD intake interactions
(function () {
	const form = document.querySelector('.pod-form');
	const uploadZone = document.querySelector('[data-upload-zone]');
	if (!form || !uploadZone) {
		return;
	}

	const API_ENDPOINT = '/api/offline-orders';
	const DRAFT_STORAGE_KEY = 'offlinePodDraft';
	const MAX_FILES = parseInt(window.OFFLINE_ORDER_MAX_FILES || '10', 10);
	const MAX_FILE_SIZE_MB = parseInt(window.OFFLINE_ORDER_MAX_FILE_MB || '50', 10);
	const ACCEPTED_EXTENSIONS = ['.ai', '.eps', '.svg', '.pdf', '.png', '.jpg', '.jpeg', '.psd'];

	const selectedFiles = [];

	const statusEl = document.createElement('div');
	statusEl.className = 'pod-alert';
	statusEl.setAttribute('aria-live', 'polite');
	form.prepend(statusEl);

	const fileListEl = document.createElement('div');
	fileListEl.className = 'pod-upload__list';
	uploadZone.appendChild(fileListEl);

	const fileInput = document.createElement('input');
	fileInput.type = 'file';
	fileInput.accept = ACCEPTED_EXTENSIONS.join(',');
	fileInput.multiple = true;
	fileInput.hidden = true;
	form.appendChild(fileInput);

	const saveDraftButton = form.querySelector('.pod-form__actions .btn.btn--outline');
	const submitButton = form.querySelector('.pod-form__actions .btn[type="submit"]');

	const setStatus = (message, type = 'info') => {
		if (!message) {
			statusEl.removeAttribute('data-type');
			statusEl.textContent = '';
			statusEl.style.display = 'none';
			return;
		}

		statusEl.dataset.type = type;
		statusEl.textContent = message;
		statusEl.style.display = 'block';
	};

	const extensionIsValid = (fileName) => {
		const lower = fileName.toLowerCase();
		return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
	};

	const addFiles = (fileList) => {
		const files = Array.from(fileList);
		if (!files.length) return;

		let added = 0;
		for (const file of files) {
			if (selectedFiles.length >= MAX_FILES) {
				setStatus(`Maximum of ${MAX_FILES} files reached.`, 'error');
				break;
			}

			if (!extensionIsValid(file.name)) {
				setStatus(`Unsupported file type: ${file.name}`, 'error');
				continue;
			}

			const sizeMb = file.size / (1024 * 1024);
			if (sizeMb > MAX_FILE_SIZE_MB) {
				setStatus(`${file.name} exceeds ${MAX_FILE_SIZE_MB}MB limit.`, 'error');
				continue;
			}

			const duplicate = selectedFiles.some(
				(existing) => existing.name === file.name && existing.size === file.size
			);

			if (duplicate) {
				continue;
			}

			selectedFiles.push(file);
			added += 1;
		}

		if (added > 0) {
			setStatus('');
		}

		renderFileList();
	};

	const removeFile = (index) => {
		selectedFiles.splice(index, 1);
		renderFileList();
	};

	const renderFileList = () => {
		fileListEl.innerHTML = '';

		if (!selectedFiles.length) {
			const empty = document.createElement('p');
			empty.className = 'pod-upload__empty';
			empty.textContent = 'No files selected yet.';
			fileListEl.appendChild(empty);
			return;
		}

		selectedFiles.forEach((file, index) => {
			const item = document.createElement('div');
			item.className = 'pod-upload__item';

			const name = document.createElement('span');
			name.textContent = `${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)`;

			const removeBtn = document.createElement('button');
			removeBtn.type = 'button';
			removeBtn.className = 'pod-upload__remove';
			removeBtn.textContent = 'Remove';
			removeBtn.addEventListener('click', () => removeFile(index));

			item.appendChild(name);
			item.appendChild(removeBtn);
			fileListEl.appendChild(item);
		});
	};

	const handleBrowseClick = () => fileInput.click();

	const handleFileInputChange = (event) => {
		addFiles(event.target.files);
		event.target.value = '';
	};

	const preventDefaults = (event) => {
		event.preventDefault();
		event.stopPropagation();
	};

	const highlightDropZone = () => uploadZone.classList.add('is-dragging');
	const unhighlightDropZone = () => uploadZone.classList.remove('is-dragging');

	const handleDrop = (event) => {
		preventDefaults(event);
		unhighlightDropZone();
		if (event.dataTransfer?.files) {
			addFiles(event.dataTransfer.files);
		}
	};

	const toggleSubmitting = (isSubmitting) => {
		if (submitButton) {
			submitButton.disabled = isSubmitting;
			submitButton.textContent = isSubmitting ? 'Submitting…' : 'Submit Offline Order';
		}
		if (saveDraftButton) {
			saveDraftButton.disabled = isSubmitting;
		}
	};

	const buildFormData = () => {
		const formData = new FormData(form);
		selectedFiles.forEach((file) => formData.append('assets', file, file.name));

		const configuration = {
			source: 'offline-intake-web',
			preferences: {
				primaryProduct: formData.get('primaryProduct') || null,
				quantity: formData.get('quantity') || null
			}
		};

		formData.append('configuration', JSON.stringify(configuration));

		return formData;
	};

	const resetForm = () => {
		form.reset();
		selectedFiles.splice(0, selectedFiles.length);
		renderFileList();
		localStorage.removeItem(DRAFT_STORAGE_KEY);
	};

	const submitForm = async (event) => {
		event.preventDefault();
		setStatus('');

		if (!form.reportValidity()) {
			return;
		}

		try {
			toggleSubmitting(true);
			const formData = buildFormData();
			const response = await fetch(API_ENDPOINT, {
				method: 'POST',
				body: formData,
				credentials: 'include'
			});

			const payload = await response.json();
			if (!response.ok) {
				throw new Error(payload?.message || payload?.error || 'Submission failed');
			}

			const orderCode = payload?.order?.orderCode || 'your request';
			setStatus(`Thanks! We received ${orderCode}. Our offline team will reach out shortly.`, 'success');
			resetForm();
		} catch (error) {
			setStatus(error.message || 'Failed to submit order. Please try again.', 'error');
		} finally {
			toggleSubmitting(false);
		}
	};

	const saveDraft = () => {
		const formData = new FormData(form);
		const draft = {};
		for (const [key, value] of formData.entries()) {
			if (draft[key]) continue;
			draft[key] = value;
		}
		draft.timestamp = Date.now();
		localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
		setStatus('Draft saved locally. Files are not stored in drafts.', 'success');
	};

	const restoreDraft = () => {
		try {
			const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
			if (!raw) return;
			const draft = JSON.parse(raw);
			Object.entries(draft).forEach(([key, value]) => {
				if (key === 'timestamp') return;
				const field = form.elements.namedItem(key);
				if (!field) return;
				if (field.type === 'checkbox') {
					field.checked = value === 'on' || value === true;
				} else {
					field.value = value;
				}
			});
			setStatus('Draft restored. Please reattach files before submitting.', 'info');
		} catch (error) {
			console.warn('Failed to restore draft', error);
		}
	};

	const initialise = () => {
		const browseButton = uploadZone.querySelector('button');
		const browseSpan = uploadZone.querySelector('span');

		if (browseButton) {
			browseButton.addEventListener('click', handleBrowseClick);
		}

		if (browseSpan) {
			browseSpan.style.cursor = 'pointer';
			browseSpan.addEventListener('click', handleBrowseClick);
		}

		fileInput.addEventListener('change', handleFileInputChange);

		['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
			uploadZone.addEventListener(eventName, preventDefaults);
		});

		['dragenter', 'dragover'].forEach((eventName) => {
			uploadZone.addEventListener(eventName, highlightDropZone);
		});

		['dragleave', 'drop'].forEach((eventName) => {
			uploadZone.addEventListener(eventName, unhighlightDropZone);
		});

		uploadZone.addEventListener('drop', handleDrop);
		form.addEventListener('submit', submitForm);

		if (saveDraftButton) {
			saveDraftButton.addEventListener('click', (event) => {
				event.preventDefault();
				saveDraft();
			});
		}

		restoreDraft();
		renderFileList();
	};

	initialise();
})();

