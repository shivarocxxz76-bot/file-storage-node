/**
 * File & Folder Operations: Upload, Preview, Share, Rename, Move & Modals
 */

document.addEventListener('DOMContentLoaded', () => {
    // ---------------- Drag & Drop Multi-File Upload ----------------
    const dropzone = document.getElementById('fileDropzone');
    const fileInput = document.getElementById('fileUploadInput');
    const uploadProgressContainer = document.getElementById('uploadProgressContainer');
    const uploadProgressBar = document.getElementById('uploadProgressBar');
    const uploadStatusText = document.getElementById('uploadStatusText');

    if (dropzone && fileInput) {
        dropzone.addEventListener('click', () => fileInput.click());

        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.remove('dragover');
            });
        });

        dropzone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFileUpload(files);
            }
        });

        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                handleFileUpload(fileInput.files);
            }
        });
    }

    function handleFileUpload(files) {
        if (!files || files.length === 0) return;

        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append('files', files[i]);
        }

        const currentFolderId = document.getElementById('currentFolderId');
        if (currentFolderId && currentFolderId.value) {
            formData.append('folder_id', currentFolderId.value);
        }

        if (uploadProgressContainer && uploadProgressBar) {
            uploadProgressContainer.classList.remove('d-none');
            uploadProgressBar.style.width = '0%';
            uploadProgressBar.setAttribute('aria-valuenow', 0);
            if (uploadStatusText) uploadStatusText.textContent = `Encrypting & uploading ${files.length} file(s)...`;
        }

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/files/upload', true);

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && uploadProgressBar) {
                const percentComplete = Math.round((e.loaded / e.total) * 100);
                uploadProgressBar.style.width = percentComplete + '%';
                uploadProgressBar.setAttribute('aria-valuenow', percentComplete);
                uploadProgressBar.textContent = percentComplete + '%';
            }
        };

        xhr.onload = () => {
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success) {
                        showToast(response.message || 'Files encrypted & uploaded successfully!', 'success');
                        setTimeout(() => window.location.reload(), 800);
                    } else {
                        showToast(response.message || 'Failed to upload files.', 'danger');
                        if (uploadProgressContainer) uploadProgressContainer.classList.add('d-none');
                    }
                } catch (e) {
                    showToast('Unexpected server response.', 'danger');
                    if (uploadProgressContainer) uploadProgressContainer.classList.add('d-none');
                }
            } else {
                showToast('Upload failed due to server error.', 'danger');
                if (uploadProgressContainer) uploadProgressContainer.classList.add('d-none');
            }
        };

        xhr.onerror = () => {
            showToast('Network error during upload.', 'danger');
            if (uploadProgressContainer) uploadProgressContainer.classList.add('d-none');
        };

        xhr.send(formData);
    }
});

// ---------------- File Preview Modal ----------------
function previewFile(fileId) {
    const previewModalEl = document.getElementById('previewModal');
    if (!previewModalEl) return;

    const modalTitle = document.getElementById('previewModalTitle');
    const modalBody = document.getElementById('previewModalBody');
    const downloadBtn = document.getElementById('previewModalDownloadBtn');

    modalBody.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading and decrypting preview...</span>
            </div>
            <p class="mt-2 text-muted">Decrypting AES-256 payload...</p>
        </div>
    `;

    const bsModal = new bootstrap.Modal(previewModalEl);
    bsModal.show();

    fetch(`/files/preview?file_id=${fileId}`)
        .then(res => res.json())
        .then(data => {
            if (!data.success) {
                modalBody.innerHTML = `<div class="alert alert-warning">${data.message || 'Preview not available.'}</div>`;
                return;
            }

            modalTitle.textContent = data.file.original_name;
            if (downloadBtn) {
                downloadBtn.href = `/files/download?file_id=${fileId}`;
            }

            const ext = (data.file.file_extension || '').toLowerCase();
            const previewUrl = `/files/preview?file_id=${fileId}&raw=1`;

            if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) {
                modalBody.innerHTML = `
                    <div class="text-center">
                        <img src="${previewUrl}" class="img-fluid rounded shadow-sm" style="max-height: 500px; object-fit: contain;" alt="${data.file.original_name}">
                    </div>
                `;
            } else if (ext === 'pdf') {
                modalBody.innerHTML = `
                    <iframe src="${previewUrl}" style="width:100%; height:550px; border:none; border-radius:8px;"></iframe>
                `;
            } else if (['mp3', 'wav', 'ogg'].includes(ext)) {
                modalBody.innerHTML = `
                    <div class="text-center py-4">
                        <i class="bi bi-file-earmark-music text-info display-1 mb-3"></i>
                        <audio controls class="w-100 mt-3">
                            <source src="${previewUrl}" type="${data.file.mime_type}">
                            Your browser does not support audio playback.
                        </audio>
                    </div>
                `;
            } else if (['mp4', 'webm', 'mov'].includes(ext)) {
                modalBody.innerHTML = `
                    <div class="text-center">
                        <video controls class="w-100 rounded" style="max-height: 480px;">
                            <source src="${previewUrl}" type="${data.file.mime_type}">
                            Your browser does not support video playback.
                        </video>
                    </div>
                `;
            } else if (data.text_content !== undefined) {
                modalBody.innerHTML = `
                    <pre class="bg-body-secondary p-3 rounded border text-start" style="max-height: 500px; overflow-y: auto; font-size: 0.88rem;"><code>${escapeHtml(data.text_content)}</code></pre>
                `;
            } else {
                modalBody.innerHTML = `
                    <div class="text-center py-5">
                        <i class="bi bi-shield-lock text-primary display-2 mb-3"></i>
                        <h5>Encrypted File (${ext.toUpperCase()})</h5>
                        <p class="text-muted">This file is stored with AES-256 encryption. Click download to decrypt and open.</p>
                        <a href="/files/download?file_id=${fileId}" class="btn btn-primary">
                            <i class="bi bi-download me-1"></i> Download File (${data.file.file_size_formatted})
                        </a>
                    </div>
                `;
            }
        })
        .catch(err => {
            modalBody.innerHTML = `<div class="alert alert-danger">Error loading file preview.</div>`;
        });
}

// ---------------- Share Modal Helper ----------------
function openShareModal(fileId, fileName) {
    const modalEl = document.getElementById('shareModal');
    if (!modalEl) return;

    document.getElementById('shareFileId').value = fileId;
    document.getElementById('shareModalFileName').textContent = fileName;
    document.getElementById('shareForm').reset();

    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();
}

// ---------------- Rename Modal Helper ----------------
function openRenameModal(fileId, fileName) {
    const modalEl = document.getElementById('renameModal');
    if (!modalEl) return;

    document.getElementById('renameFileId').value = fileId;
    document.getElementById('renameFileName').value = fileName;

    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();
}

// ---------------- Move Modal Helper ----------------
function openMoveModal(fileId, fileName, currentFolderId) {
    const modalEl = document.getElementById('moveModal');
    if (!modalEl) return;

    document.getElementById('moveFileId').value = fileId;
    document.getElementById('moveModalFileName').textContent = fileName;
    document.getElementById('targetFolderSelect').value = currentFolderId || 'root';

    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
