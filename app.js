/* ============================================
   Moe Topics Tracker – Main Application Logic
   All data persisted to localStorage (no backend)
   ============================================ */

(function () {
    'use strict';

    // ── Storage helpers ──
    const STORAGE_KEY = 'datatracker_v1';
    const THEME_KEY = 'datatracker_theme';

    function loadAll() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { trackers: [], activeId: null };
        } catch { return { trackers: [], activeId: null }; }
    }

    function saveAll(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    function generateId() {
        return 'trk_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
    }

    // ── Theme ──
    function loadTheme() {
        const saved = localStorage.getItem(THEME_KEY);
        // Default to light mode (no 'dark' class)
        if (saved === 'dark') {
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
        }
    }

    function toggleTheme() {
        document.body.classList.toggle('dark');
        const isDark = document.body.classList.contains('dark');
        localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    }

    // Apply theme immediately
    loadTheme();

    // ── Sample data ──
    function createSampleData() {
        return {
            trackers: [
                {
                    id: generateId(),
                    title: 'Moe Topics Tracker',
                    studentName: 'Josslyn Santiago',
                    courseName: '6th grade math',
                    defaultGoal: 90,
                    units: [
                        { name: 'Ratios, rates, & percentages', goal: 90, progress: 20 },
                        { name: 'Arithmetic operations', goal: 90, progress: 30 },
                        { name: 'Negative numbers', goal: 90, progress: 30 },
                        { name: 'Properties of numbers', goal: 90, progress: 30 },
                        { name: 'Variables & expressions', goal: 90, progress: 20 },
                        { name: 'Equations & inequalities introduction', goal: 90, progress: 10 },
                        { name: 'Geometry', goal: 90, progress: 0 },
                        { name: 'Data & statistics', goal: 90, progress: 0 }
                    ],
                    createdAt: Date.now()
                },
                {
                    id: generateId(),
                    title: 'Moe Topics Tracker',
                    studentName: 'Alex Rivera',
                    courseName: '7th grade science',
                    defaultGoal: 85,
                    units: [
                        { name: 'Cells & organisms', goal: 85, progress: 70 },
                        { name: 'Human body systems', goal: 85, progress: 50 },
                        { name: 'Ecology & ecosystems', goal: 85, progress: 40 },
                        { name: 'Forces & motion', goal: 85, progress: 20 },
                        { name: 'Energy & waves', goal: 85, progress: 10 },
                        { name: 'Earth & space', goal: 85, progress: 0 }
                    ],
                    createdAt: Date.now() - 86400000
                }
            ],
            activeId: null
        };
    }

    // ── State ──
    let state = loadAll();

    // If no trackers, prepopulate with sample data
    if (state.trackers.length === 0) {
        state = createSampleData();
        state.activeId = state.trackers[0].id;
        saveAll(state);
    }

    // ── DOM refs ──
    const $ = (sel) => document.querySelector(sel);
    const sidebar = $('#sidebar');
    const trackerList = $('#trackerList');
    const trackerCount = $('#trackerCount');
    const emptyState = $('#emptyState');
    const trackerView = $('#trackerView');
    const tableBody = $('#tableBody');
    const bannerTitle = $('#bannerTitle');
    const studentName = $('#studentName');
    const courseName = $('#courseName');

    // Print header fields
    const printStudentName = $('#printStudentName');
    const printCourseName = $('#printCourseName');
    const printGoal = $('#printGoal');

    // Modals
    const modalOverlay = $('#modalOverlay');
    const importOverlay = $('#importOverlay');
    const modalTitle = $('#modalTitle');
    const modalStudentName = $('#modalStudentName');
    const modalCourseName = $('#modalCourseName');
    const modalMasteryGoal = $('#modalMasteryGoal');
    const modalSave = $('#modalSave');
    const importTextEl = $('#importText');
    const importFile = $('#importFile');
    const fileUploadLabel = $('#fileUploadLabel');

    // Export dropdown
    const exportMenu = $('#exportMenu');

    let editingTrackerId = null; // when editing info

    // ── Toast ──
    function showToast(msg, type = 'info') {
        const container = $('#toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = msg;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(40px)';
            toast.style.transition = 'all .3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ── Sidebar rendering ──
    function renderSidebar() {
        trackerList.innerHTML = '';
        trackerCount.textContent = state.trackers.length;

        state.trackers.forEach((t) => {
            const li = document.createElement('li');
            if (t.id === state.activeId) li.classList.add('active');
            li.innerHTML = `
                <span class="li-icon"></span>
                <span class="li-text">${escHtml(t.studentName || 'Untitled')} – ${escHtml(t.courseName || 'No course')}</span>
                <button class="li-delete" data-id="${t.id}" title="Delete tracker">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>`;
            li.addEventListener('click', (e) => {
                if (e.target.closest('.li-delete')) return;
                setActive(t.id);
            });
            li.querySelector('.li-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteTracker(t.id);
            });
            trackerList.appendChild(li);
        });
    }

    // ── Set active tracker ──
    function setActive(id) {
        state.activeId = id;
        saveAll(state);
        renderSidebar();
        renderTracker();
        closeSidebarMobile();
    }

    // ── Render tracker view ──
    function renderTracker() {
        const t = state.trackers.find(tr => tr.id === state.activeId);
        if (!t) {
            emptyState.style.display = '';
            trackerView.style.display = 'none';
            return;
        }
        emptyState.style.display = 'none';
        trackerView.style.display = '';

        bannerTitle.textContent = t.title || 'Moe Topics Tracker';
        studentName.value = t.studentName || '';
        courseName.value = t.courseName || '';

        // Update print header
        printStudentName.textContent = t.studentName || '';
        printCourseName.textContent = t.courseName || '';
        printGoal.textContent = (t.defaultGoal || 90) + '%';

        renderTable(t);
    }

    // ── Render table rows ──
    const PROGRESS_STEPS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

    function renderTable(tracker) {
        tableBody.innerHTML = '';

        // Course summary row
        const courseProgress = calcCourseProgress(tracker);
        const courseRow = createRow({
            name: tracker.courseName || 'Course',
            goal: tracker.defaultGoal || 90,
            progress: courseProgress,
            isCourse: true,
            index: -1
        }, tracker);
        tableBody.appendChild(courseRow);

        // Unit rows
        tracker.units.forEach((unit, idx) => {
            const row = createRow({
                name: unit.name,
                goal: unit.goal,
                progress: unit.progress,
                isCourse: false,
                index: idx
            }, tracker);
            tableBody.appendChild(row);
        });
    }

    function createRow(data, tracker) {
        const tr = document.createElement('tr');
        if (data.isCourse) tr.classList.add('course-row');

        // Name cell
        const tdName = document.createElement('td');
        if (data.isCourse) {
            tdName.innerHTML = `<strong>${escHtml(data.name)}</strong>`;
        } else {
            const inp = document.createElement('input');
            inp.type = 'text';
            inp.className = 'cell-editable';
            inp.value = data.name;
            inp.placeholder = 'Unit name';
            inp.addEventListener('change', () => {
                tracker.units[data.index].name = inp.value;
                persist();
                renderSidebar();
            });
            tdName.appendChild(inp);
        }
        tr.appendChild(tdName);

        // Goal cell
        const tdGoal = document.createElement('td');
        if (data.isCourse) {
            tdGoal.innerHTML = `<strong>${data.goal}%</strong>`;
        } else {
            const inp = document.createElement('input');
            inp.type = 'number';
            inp.className = 'cell-editable cell-editable-sm';
            inp.min = 0; inp.max = 100;
            inp.value = data.goal;
            inp.addEventListener('change', () => {
                tracker.units[data.index].goal = clamp(parseInt(inp.value) || 0, 0, 100);
                inp.value = tracker.units[data.index].goal;
                persist();
            });
            tdGoal.appendChild(inp);
        }
        tr.appendChild(tdGoal);

        // Progress cells
        PROGRESS_STEPS.forEach(step => {
            const td = document.createElement('td');
            td.className = 'progress-cell';
            td.innerHTML = `<span class="progress-label">${step}%</span>`;

            const isFilled = data.progress >= step && step > 0;
            if (isFilled) {
                td.classList.add('filled');
                if (data.progress >= 80) td.classList.add('filled-high');
                else if (data.progress >= 50) td.classList.add('filled-mid');
            }

            if (!data.isCourse) {
                td.style.cursor = 'pointer';
                td.addEventListener('click', () => {
                    // If clicking the currently filled step, set to step below
                    if (tracker.units[data.index].progress === step) {
                        tracker.units[data.index].progress = Math.max(0, step - 10);
                    } else {
                        tracker.units[data.index].progress = step;
                    }
                    persist();
                    renderTable(tracker);
                });
            }
            tr.appendChild(td);
        });

        // Actions cell
        const tdActions = document.createElement('td');
        tdActions.className = 'col-actions';
        if (!data.isCourse) {
            const btn = document.createElement('button');
            btn.className = 'row-delete';
            btn.title = 'Remove unit';
            btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
            btn.addEventListener('click', () => {
                tracker.units.splice(data.index, 1);
                persist();
                renderTable(tracker);
            });
            tdActions.appendChild(btn);
        }
        tr.appendChild(tdActions);

        return tr;
    }

    function calcCourseProgress(tracker) {
        if (!tracker.units.length) return 0;
        const total = tracker.units.reduce((s, u) => s + u.progress, 0);
        return Math.round(total / tracker.units.length);
    }

    // ── Create new tracker ──
    function openNewModal() {
        editingTrackerId = null;
        modalTitle.textContent = 'Create New Tracker';
        modalStudentName.value = '';
        modalCourseName.value = '';
        modalMasteryGoal.value = 90;
        modalSave.textContent = 'Create';
        modalOverlay.style.display = '';
        modalStudentName.focus();
    }

    function openEditModal() {
        const t = state.trackers.find(tr => tr.id === state.activeId);
        if (!t) return;
        editingTrackerId = t.id;
        modalTitle.textContent = 'Edit Tracker Info';
        modalStudentName.value = t.studentName;
        modalCourseName.value = t.courseName;
        modalMasteryGoal.value = t.defaultGoal;
        modalSave.textContent = 'Save';
        modalOverlay.style.display = '';
        modalStudentName.focus();
    }

    function saveModal() {
        const sName = modalStudentName.value.trim();
        const cName = modalCourseName.value.trim();
        const goal = clamp(parseInt(modalMasteryGoal.value) || 90, 0, 100);

        if (!sName && !cName) {
            showToast('Please enter a student or course name.', 'error');
            return;
        }

        if (editingTrackerId) {
            // Update existing
            const t = state.trackers.find(tr => tr.id === editingTrackerId);
            if (t) {
                t.studentName = sName;
                t.courseName = cName;
                t.defaultGoal = goal;
            }
        } else {
            // Create new
            const newTracker = {
                id: generateId(),
                title: 'Moe Topics Tracker',
                studentName: sName,
                courseName: cName,
                defaultGoal: goal,
                units: [],
                createdAt: Date.now()
            };
            state.trackers.push(newTracker);
            state.activeId = newTracker.id;
        }

        persist();
        renderSidebar();
        renderTracker();
        closeModal();
        showToast(editingTrackerId ? 'Tracker updated!' : 'Tracker created!', 'success');
    }

    function closeModal() {
        modalOverlay.style.display = 'none';
        editingTrackerId = null;
    }

    // ── Delete tracker ──
    function deleteTracker(id) {
        const t = state.trackers.find(tr => tr.id === id);
        if (!t) return;
        if (!confirm(`Delete tracker for "${t.studentName || 'Untitled'}"? This cannot be undone.`)) return;
        state.trackers = state.trackers.filter(tr => tr.id !== id);
        if (state.activeId === id) {
            state.activeId = state.trackers.length ? state.trackers[0].id : null;
        }
        persist();
        renderSidebar();
        renderTracker();
        showToast('Tracker deleted.', 'info');
    }

    // ── Add unit ──
    function addUnit() {
        const t = state.trackers.find(tr => tr.id === state.activeId);
        if (!t) return;
        t.units.push({ name: '', goal: t.defaultGoal || 90, progress: 0 });
        persist();
        renderTable(t);
        // Focus the new input
        setTimeout(() => {
            const inputs = tableBody.querySelectorAll('.cell-editable:not(.cell-editable-sm)');
            if (inputs.length) inputs[inputs.length - 1].focus();
        }, 50);
    }

    // ── Import ──
    function openImport() {
        importTextEl.value = '';
        importFile.value = '';
        fileUploadLabel.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Choose file…`;
        importOverlay.style.display = '';
        importTextEl.focus();
    }

    function closeImport() {
        importOverlay.style.display = 'none';
    }

    function doImport() {
        const raw = importTextEl.value.trim();
        if (!raw) {
            showToast('Please paste data or upload a file.', 'error');
            return;
        }

        try {
            // Try JSON first
            let jsonData;
            try {
                jsonData = JSON.parse(raw);
            } catch { jsonData = null; }

            if (jsonData) {
                importJSON(jsonData);
            } else {
                importTextData(raw);
            }
            closeImport();
        } catch (err) {
            showToast('Import failed: ' + err.message, 'error');
        }
    }

    function importJSON(data) {
        // Support both single tracker and array
        const trackers = Array.isArray(data) ? data : [data];
        trackers.forEach(d => {
            const t = {
                id: generateId(),
                title: d.title || 'Moe Topics Tracker',
                studentName: d.studentName || d.student || '',
                courseName: d.courseName || d.course || '',
                defaultGoal: d.defaultGoal || d.goal || 90,
                units: (d.units || []).map(u => ({
                    name: u.name || '',
                    goal: u.goal || d.defaultGoal || 90,
                    progress: clamp(u.progress || 0, 0, 100)
                })),
                createdAt: Date.now()
            };
            state.trackers.push(t);
            state.activeId = t.id;
        });
        persist();
        renderSidebar();
        renderTracker();
        showToast('Imported successfully!', 'success');
    }

    function importTextData(raw) {
        const lines = raw.split('\n').map(l => l.trim()).filter(l => l);
        let sName = '', cName = '', goal = 90;
        const units = [];

        for (const line of lines) {
            const lower = line.toLowerCase();
            if (lower.startsWith('student:')) {
                sName = line.slice(line.indexOf(':') + 1).trim();
            } else if (lower.startsWith('course:')) {
                cName = line.slice(line.indexOf(':') + 1).trim();
            } else if (lower.startsWith('goal:')) {
                goal = parseInt(line.slice(line.indexOf(':') + 1).replace('%', '').trim()) || 90;
            } else if (line.includes('|')) {
                const parts = line.split('|');
                const name = parts[0].trim();
                const progress = clamp(parseInt(parts[1]?.trim()) || 0, 0, 100);
                units.push({ name, goal, progress });
            } else {
                // Treat as unit name with 0 progress
                units.push({ name: line, goal, progress: 0 });
            }
        }

        if (!sName && !cName && units.length === 0) {
            throw new Error('Could not parse any data. Check the format.');
        }

        const t = {
            id: generateId(),
            title: 'Moe Topics Tracker',
            studentName: sName,
            courseName: cName,
            defaultGoal: goal,
            units,
            createdAt: Date.now()
        };
        state.trackers.push(t);
        state.activeId = t.id;
        persist();
        renderSidebar();
        renderTracker();
        showToast(`Imported ${units.length} units!`, 'success');
    }

    // File upload handler
    importFile.addEventListener('change', () => {
        const file = importFile.files[0];
        if (!file) return;
        fileUploadLabel.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            ${escHtml(file.name)}`;
        const reader = new FileReader();
        reader.onload = (e) => {
            importTextEl.value = e.target.result;
        };
        reader.readAsText(file);
    });

    // ── Export ──
    function exportTxt() {
        const t = state.trackers.find(tr => tr.id === state.activeId);
        if (!t) return;

        let txt = `MOE TOPICS TRACKER\n`;
        txt += `${'='.repeat(40)}\n\n`;
        txt += `Student: ${t.studentName}\n`;
        txt += `Course: ${t.courseName}\n`;
        txt += `Goal: ${t.defaultGoal}%\n\n`;
        txt += `${'─'.repeat(60)}\n`;
        txt += `${'Unit Name'.padEnd(40)} ${'Goal'.padEnd(6)} Progress\n`;
        txt += `${'─'.repeat(60)}\n`;

        t.units.forEach(u => {
            const bar = buildAsciiBar(u.progress);
            txt += `${(u.name || '(unnamed)').padEnd(40)} ${(u.goal + '%').padEnd(6)} ${bar} ${u.progress}%\n`;
        });

        txt += `${'─'.repeat(60)}\n`;
        const avg = calcCourseProgress(t);
        txt += `\nOverall Progress: ${avg}%\n`;

        downloadFile(`${t.studentName || 'tracker'}_${t.courseName || 'data'}.txt`, txt, 'text/plain');
        showToast('Exported as TXT!', 'success');
        hideExportMenu();
    }

    function buildAsciiBar(progress) {
        const filled = Math.round(progress / 10);
        return '[' + '█'.repeat(filled) + '░'.repeat(10 - filled) + ']';
    }

    function exportPdf() {
        // Use browser print to create PDF
        const t = state.trackers.find(tr => tr.id === state.activeId);
        if (!t) return;
        showToast('Opening print dialog – save as PDF', 'info');
        hideExportMenu();
        setTimeout(() => window.print(), 200);
    }

    function downloadFile(filename, content, mime) {
        const blob = new Blob([content], { type: mime });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    // ── Banner field live-save ──
    studentName.addEventListener('change', () => {
        const t = state.trackers.find(tr => tr.id === state.activeId);
        if (t) {
            t.studentName = studentName.value.trim();
            printStudentName.textContent = t.studentName;
            persist();
            renderSidebar();
        }
    });
    courseName.addEventListener('change', () => {
        const t = state.trackers.find(tr => tr.id === state.activeId);
        if (t) {
            t.courseName = courseName.value.trim();
            printCourseName.textContent = t.courseName;
            persist();
            renderSidebar();
            renderTable(t);
        }
    });

    // ── Export dropdown toggle ──
    function toggleExportMenu(e) {
        e.stopPropagation();
        exportMenu.classList.toggle('show');
    }
    function hideExportMenu() {
        exportMenu.classList.remove('show');
    }

    // ── Mobile sidebar ──
    function closeSidebarMobile() {
        if (window.innerWidth <= 900) {
            sidebar.classList.remove('open');
        }
    }

    // ── Helpers ──
    function persist() { saveAll(state); }
    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
    function escHtml(s) {
        const d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    // ── Event bindings ──
    // Theme toggle
    $('#themeToggle').addEventListener('click', toggleTheme);

    // Sidebar buttons
    $('#btnNewTracker').addEventListener('click', openNewModal);
    $('#btnImport').addEventListener('click', openImport);
    $('#btnNewTrackerEmpty').addEventListener('click', openNewModal);
    $('#btnImportEmpty').addEventListener('click', openImport);

    // Mobile toggle
    $('#mobileToggle').addEventListener('click', () => sidebar.classList.toggle('open'));

    // Modal
    $('#modalClose').addEventListener('click', closeModal);
    $('#modalCancel').addEventListener('click', closeModal);
    modalSave.addEventListener('click', saveModal);
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

    // Import modal
    $('#importClose').addEventListener('click', closeImport);
    $('#importCancel').addEventListener('click', closeImport);
    $('#importGo').addEventListener('click', doImport);
    importOverlay.addEventListener('click', (e) => { if (e.target === importOverlay) closeImport(); });

    // Tracker toolbar
    $('#btnAddUnit').addEventListener('click', addUnit);
    $('#btnEditTracker').addEventListener('click', openEditModal);
    $('#btnDeleteTracker').addEventListener('click', () => deleteTracker(state.activeId));
    $('#btnExport').addEventListener('click', toggleExportMenu);
    $('#btnExportTxt').addEventListener('click', exportTxt);
    $('#btnExportPdf').addEventListener('click', exportPdf);

    // Close dropdown on outside click
    document.addEventListener('click', hideExportMenu);

    // Keyboard: Escape closes modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeImport();
            hideExportMenu();
        }
    });

    // Modal Enter key
    modalOverlay.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveModal();
    });

    // ── Initial render ──
    renderSidebar();
    renderTracker();

})();
