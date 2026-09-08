/**
 * View & Controller Helper Utilities
 */

const formatBytes = (bytes, decimals = 2) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const timeAgo = (date) => {
    if (!date) return '';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + 'y ago';
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + 'mo ago';
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + 'd ago';
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + 'h ago';
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + 'm ago';
    return Math.floor(seconds) + 's ago';
};

const getFileIcon = (ext) => {
    const e = (ext || '').toLowerCase().replace('.', '');
    const map = {
        pdf: { icon: 'bi-file-earmark-pdf-fill', color: 'text-danger' },
        doc: { icon: 'bi-file-earmark-word-fill', color: 'text-primary' },
        docx: { icon: 'bi-file-earmark-word-fill', color: 'text-primary' },
        xls: { icon: 'bi-file-earmark-excel-fill', color: 'text-success' },
        xlsx: { icon: 'bi-file-earmark-excel-fill', color: 'text-success' },
        ppt: { icon: 'bi-file-earmark-ppt-fill', color: 'text-warning' },
        pptx: { icon: 'bi-file-earmark-ppt-fill', color: 'text-warning' },
        jpg: { icon: 'bi-file-earmark-image-fill', color: 'text-info' },
        jpeg: { icon: 'bi-file-earmark-image-fill', color: 'text-info' },
        png: { icon: 'bi-file-earmark-image-fill', color: 'text-info' },
        gif: { icon: 'bi-file-earmark-image-fill', color: 'text-info' },
        svg: { icon: 'bi-file-earmark-image-fill', color: 'text-info' },
        mp4: { icon: 'bi-file-earmark-play-fill', color: 'text-danger' },
        mkv: { icon: 'bi-file-earmark-play-fill', color: 'text-danger' },
        mov: { icon: 'bi-file-earmark-play-fill', color: 'text-danger' },
        mp3: { icon: 'bi-file-earmark-music-fill', color: 'text-info' },
        wav: { icon: 'bi-file-earmark-music-fill', color: 'text-info' },
        zip: { icon: 'bi-file-earmark-zip-fill', color: 'text-warning' },
        rar: { icon: 'bi-file-earmark-zip-fill', color: 'text-warning' },
        '7z': { icon: 'bi-file-earmark-zip-fill', color: 'text-warning' },
        js: { icon: 'bi-file-earmark-code-fill', color: 'text-warning' },
        json: { icon: 'bi-file-earmark-code-fill', color: 'text-warning' },
        py: { icon: 'bi-file-earmark-code-fill', color: 'text-primary' },
        html: { icon: 'bi-file-earmark-code-fill', color: 'text-danger' },
        css: { icon: 'bi-file-earmark-code-fill', color: 'text-primary' },
        txt: { icon: 'bi-file-earmark-text-fill', color: 'text-secondary' },
        sql: { icon: 'bi-file-earmark-binary-fill', color: 'text-info' }
    };
    return map[e] || { icon: 'bi-file-earmark-fill', color: 'text-secondary' };
};

module.exports = {
    formatBytes,
    timeAgo,
    getFileIcon
};
