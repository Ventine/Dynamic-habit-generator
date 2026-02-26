class RoutineManager {
    constructor() {
        this.defaultTasks = {
            ejercicio: ['Cardio', 'Superior', 'Inferior', 'Cardio', 'Abdomen', 'Descanso', 'Descanso'],
            ingles: ['Video Dev YT', 'Song', 'Journey', 'Documental', 'Study with IA', 'Descanso', 'Descanso'],
            programacion: ['Estudiar con YT', 'Kill Code', 'Novedades', 'Estudiar con IA', 'API Spring', 'Descanso', 'Descanso'],
            leer: ['Libro', 'Libro', 'Libro', 'Libro', 'Libro', 'Descanso', 'Descanso'],
            gatos: ['Limpiar', 'Dientes', 'Dientes', 'Dientes', 'Pelo', 'Descanso', 'Descanso']
        };

        // Añadimos 'apto' y 'extra' a las etiquetas visuales
        this.labels = { ejercicio: '💪', ingles: '🗣️', programacion: '💻', leer: '📚', gatos: '🐱', apto: '🏠', extra: '📌' };

        this.DOM = {
            btnGenerate: document.getElementById('btnGenerate'),
            taskList: document.getElementById('taskList'),
            actionButtons: document.getElementById('actionButtons'),
            btnAccept: document.getElementById('btnAccept'),
            btnReject: document.getElementById('btnReject'),
            btnReset: document.getElementById('btnReset'),
            routineTracker: document.getElementById('routineTracker'),
            pendingTasks: document.getElementById('pendingTasks'),
            completedTasks: document.getElementById('completedTasks'),
            pendingCount: document.getElementById('pendingCount'),
            completedCount: document.getElementById('completedCount'),
            historySection: document.getElementById('historySection'),
            historyList: document.getElementById('historyList'),
            btnShowPendingPool: document.getElementById('btnShowPendingPool'),
            btnShowCompletedPool: document.getElementById('btnShowCompletedPool'),
            // Nuevos elementos
            inputCustomTask: document.getElementById('inputCustomTask'),
            btnAddCustom: document.getElementById('btnAddCustom'),
            btnShowCustom: document.getElementById('btnShowCustom')
        };

        this.tempSelection = null;
        this.loadState();
        this.bindEvents();
        this.checkTodayStatus();
        this.renderHistory();
    }

    loadState() {
        try {
            const savedPool = localStorage.getItem('taskPool');
            this.currentPool = savedPool ? JSON.parse(savedPool) : structuredClone(this.defaultTasks);
            this.todaySchedule = JSON.parse(localStorage.getItem('todayTracker')) || null;
            this.lastGeneratedDate = localStorage.getItem('lastGeneratedDate');
            this.history = JSON.parse(localStorage.getItem('routineHistory')) || [];
        } catch (error) {
            this.resetSystem(true);
        }
    }

    getTodayDate() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    checkTodayStatus() {
        const today = this.getTodayDate();
        if (this.lastGeneratedDate === today && this.todaySchedule) {
            this.lockUI();
            this.renderTracker();
        }
    }

    generateRoutine() {
        this.tempSelection = { schedule: {}, indicesToRemove: {} };
        let descansosAcumulados = 0;
        
        // Desordenar categorías para que el descanso no caiga siempre en la misma
        const categorias = Object.keys(this.currentPool).sort(() => Math.random() - 0.5);

        // PRE-CÁLCULO: ¿Cuántas categorías en la ruleta de hoy tienen al menos un 'Descanso'?
        let categoriesWithDescansoLeft = categorias.filter(c => 
            this.currentPool[c].some(opt => opt.toLowerCase() === 'descanso')
        ).length;

        for (const category of categorias) {
            let opciones = this.currentPool[category];
            
            if (opciones.length === 0) {
                this.tempSelection.schedule[category] = { name: "✨ Completado", done: false };
                continue;
            }

            const hasDescanso = opciones.some(opt => opt.toLowerCase() === 'descanso');
            // Si esta categoría tiene descanso, restamos 1 a las oportunidades futuras
            if (hasDescanso) categoriesWithDescansoLeft--;

            let opcionesValidas = opciones.map((opt, idx) => ({ name: opt, idx: idx }));

            // REGLA 1: Máximo 2 descansos
            if (descansosAcumulados >= 2) {
                const sinDescanso = opcionesValidas.filter(o => o.name.toLowerCase() !== 'descanso');
                if (sinDescanso.length > 0) opcionesValidas = sinDescanso;
            } 
            // REGLA 2: Mínimo 1 descanso. 
            // Si no tenemos descansos, no quedan más categorías con descanso en el futuro, 
            // y ESTA categoría sí tiene... ¡Forzamos el descanso!
            else if (descansosAcumulados === 0 && categoriesWithDescansoLeft === 0 && hasDescanso) {
                const soloDescanso = opcionesValidas.filter(o => o.name.toLowerCase() === 'descanso');
                if (soloDescanso.length > 0) opcionesValidas = soloDescanso;
            }

            const seleccion = opcionesValidas[Math.floor(Math.random() * opcionesValidas.length)];
            if (seleccion.name.toLowerCase() === 'descanso') descansosAcumulados++;

            this.tempSelection.schedule[category] = { name: seleccion.name, done: false };
            this.tempSelection.indicesToRemove[category] = seleccion.idx;
        }

        this.tempSelection.schedule['apto'] = { name: 'Aseo y Mantenimiento', done: false, isStatic: true };

        this.renderPreview(this.tempSelection.schedule);
        
        this.DOM.taskList.classList.remove('pop-animation');
        void this.DOM.taskList.offsetWidth; 
        this.DOM.taskList.classList.add('pop-animation');

        this.DOM.btnGenerate.hidden = true;
        this.DOM.actionButtons.hidden = false;
        this.DOM.taskList.hidden = false;
    }

    renderPreview(tasks) {
        this.DOM.taskList.innerHTML = '';
        const fragment = document.createDocumentFragment();
        for (const [key, taskObj] of Object.entries(tasks)) {
            const div = document.createElement('div');
            div.className = 'task-item';
            // Formatear visualmente si es 'apto' o 'extra'
            const catName = (key === 'apto' || key.startsWith('custom')) ? key : key;
            div.innerHTML = `<span class="task-category">${this.labels[key.startsWith('custom') ? 'extra' : key]} ${catName.toUpperCase()}</span><span class="task-name">${taskObj.name}</span>`;
            fragment.appendChild(div);
        }
        this.DOM.taskList.appendChild(fragment);
    }

    acceptRoutine() {
        if (!this.tempSelection) return;
        for (const [category, index] of Object.entries(this.tempSelection.indicesToRemove)) {
            this.currentPool[category].splice(index, 1);
        }
        const today = this.getTodayDate();
        this.todaySchedule = this.tempSelection.schedule;
        this.saveData(today);
        this.DOM.taskList.hidden = true; 
        this.lockUI();
        this.renderTracker();
        Swal.fire({ title: '¡Plan Guardado!', text: 'Marca las tareas a medida que las termines.', icon: 'info', confirmButtonColor: '#a2d2ff' });
    }

    renderTracker() {
        this.DOM.routineTracker.hidden = false;
        this.DOM.pendingTasks.innerHTML = '';
        this.DOM.completedTasks.innerHTML = '';
        let pending = 0, completed = 0;

        for (const [category, taskObj] of Object.entries(this.todaySchedule)) {
            const div = document.createElement('label');
            div.className = `task-row ${taskObj.done ? 'completed' : ''}`;
            
            const isCustom = category.startsWith('custom');
            const labelIcon = this.labels[isCustom ? 'extra' : category];
            const labelText = isCustom ? 'EXTRA' : category.toUpperCase();

            div.innerHTML = `
                <input type="checkbox" class="task-checkbox" data-cat="${category}" ${taskObj.done ? 'checked' : ''}>
                <div class="task-info">
                    <span class="task-cat">${labelIcon} ${labelText}</span>
                    <span class="task-title">${taskObj.name}</span>
                </div>
            `;
            if (taskObj.done) { this.DOM.completedTasks.appendChild(div); completed++; } 
            else { this.DOM.pendingTasks.appendChild(div); pending++; }
        }
        this.DOM.pendingCount.textContent = pending;
        this.DOM.completedCount.textContent = completed;
        if (pending === 0 && completed > 0) this.DOM.completedTasks.parentElement.setAttribute('open', '');
    }

    // NUEVO REQUERIMIENTO: Agregar tareas extras al vuelo
    addCustomTask() {
        const taskName = this.DOM.inputCustomTask.value.trim();
        if (!taskName) return;

        // Generamos un ID único para no sobreescribir tareas
        const customId = `custom_${Date.now()}`;
        this.todaySchedule[customId] = { name: taskName, done: false, isCustom: true };
        
        this.DOM.inputCustomTask.value = ''; // Limpiar input
        this.saveData(this.getTodayDate());
        this.renderTracker();

        // Pequeño toast (notificación no intrusiva)
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Tarea añadida', showConfirmButton: false, timer: 1500 });
    }

    toggleTask(category) {
        this.todaySchedule[category].done = !this.todaySchedule[category].done;
        this.saveData(this.getTodayDate());
        this.renderTracker();
        this.checkVictory();
    }

    checkVictory() {
        const todasCompletadas = Object.values(this.todaySchedule).every(t => t.done === true);
        
        if (todasCompletadas) {
            const today = this.getTodayDate();
            const existingIndex = this.history.findIndex(h => h.date === today);
            const historialSimple = {};
            for(let key in this.todaySchedule) historialSimple[key] = this.todaySchedule[key].name;

            if (existingIndex === -1) {
                this.history.push({ date: today, schedule: historialSimple });
                if (this.history.length > 5) this.history.shift();
                localStorage.setItem('routineHistory', JSON.stringify(this.history));
                this.renderHistory();
            }
            confetti({ particleCount: 200, spread: 90, origin: { y: 0.5 } });
            
            // REQUERIMIENTO: Eliminar caché si se completó TODA la memoria semanal
            const poolEmpty = Object.values(this.currentPool).every(arr => arr.length === 0);

            if (poolEmpty) {
                Swal.fire({ 
                    title: '¡SEMANA MAESTRA!', 
                    text: 'Has completado absolutamente TODAS las tareas guardadas del pool semanal. La caché se ha limpiado automáticamente para empezar un nuevo ciclo.', 
                    icon: 'success', 
                    confirmButtonColor: '#b7e4c7' 
                }).then(() => {
                    this.resetSystem(false, true); // True para mantener el historial
                });
            } else {
                Swal.fire({ title: '¡Impresionante!', text: 'Has completado todas tus tareas de hoy.', icon: 'success', confirmButtonColor: '#b7e4c7', color: '#4a5568' });
            }
        }
    }

    saveData(todayDate) {
        localStorage.setItem('taskPool', JSON.stringify(this.currentPool));
        localStorage.setItem('todayTracker', JSON.stringify(this.todaySchedule));
        localStorage.setItem('lastGeneratedDate', todayDate);
    }

    rejectRoutine() { this.generateRoutine(); }

    lockUI() {
        this.DOM.actionButtons.hidden = true;
        this.DOM.btnGenerate.hidden = false;
        this.DOM.btnGenerate.textContent = 'Tu día está en marcha 🚀';
        this.DOM.btnGenerate.disabled = true;
    }

    renderHistory() {
        const today = this.getTodayDate();
        const pastRecords = this.history.filter(r => r.date !== today).slice(-2).reverse();
        if (pastRecords.length === 0) { this.DOM.historySection.hidden = true; return; }

        this.DOM.historySection.hidden = false;
        this.DOM.historyList.innerHTML = '';
        const fragment = document.createDocumentFragment();
        const dFormat = new Intl.DateTimeFormat('es-CO', { weekday: 'long', month: 'long', day: 'numeric' });

        pastRecords.forEach(record => {
            const card = document.createElement('div');
            card.className = 'history-card';
            const [y, m, d] = record.date.split('-');
            let badgesHtml = '';
            for (const [key, task] of Object.entries(record.schedule)) {
                badgesHtml += `<span class="badge">${this.labels[key.startsWith('custom') ? 'extra' : key] || '✅'} ${task}</span>`;
            }
            card.innerHTML = `<div class="history-date">📅 ${dFormat.format(new Date(y, m - 1, d))}</div><div class="history-badges">${badgesHtml}</div>`;
            fragment.appendChild(card);
        });
        this.DOM.historyList.appendChild(fragment);
    }

    // REQUERIMIENTO: Limpiar toda la memoria (con opción a preservar historial en auto-reset)
    resetSystem(silent = false, keepHistory = false) {
        const executeReset = () => {
            const savedHistory = keepHistory ? JSON.stringify(this.history) : null;
            
            localStorage.clear(); // LIMPIEZA TOTAL DE CACHÉ NATIVA
            
            if (savedHistory) localStorage.setItem('routineHistory', savedHistory);

            this.currentPool = structuredClone(this.defaultTasks);
            this.todaySchedule = null;
            this.lastGeneratedDate = null;
            this.history = keepHistory ? JSON.parse(savedHistory) : [];
            
            this.DOM.btnGenerate.textContent = '🎲 Generar Tareas de Hoy';
            this.DOM.btnGenerate.disabled = false;
            this.DOM.taskList.hidden = true;
            this.DOM.actionButtons.hidden = true;
            this.DOM.routineTracker.hidden = true;
            this.renderHistory();
        };

        if (silent) { executeReset(); return; }

        Swal.fire({
            title: '¿Formatear sistema?', text: "Esto eliminará toda la caché y el progreso. ¡Acción irreversible!", icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#ffcad4', cancelButtonColor: '#a0aec0', confirmButtonText: 'Sí, formatear'
        }).then((result) => {
            if (result.isConfirmed) { 
                executeReset(); 
                Swal.fire('Sistema Limpio', 'Caché eliminada. Se ha restaurado tu planificador.', 'success'); 
            }
        });
    }

    // =========================================================
    // MODALES PREMIUM (DIVERTIDOS Y VISUALES)
    // =========================================================

    buildModalHTML(dataObject, emptyTitle, emptySub, isGold = false) {
        let html = '<div class="swal-grid">';
        let totalItems = 0;

        for (const [category, tasks] of Object.entries(dataObject)) {
            totalItems += tasks.length;
            
            html += `
                <div class="swal-category-card ${isGold ? 'gold-card' : ''}">
                    <span class="swal-cat-icon">${this.labels[category] || '🎯'}</span>
                    <div class="swal-cat-title">${category}</div>
            `;
            
            if (tasks.length === 0) {
                html += `<div class="swal-empty-cat">Vacío ✨</div>`;
            } else {
                html += `<ul class="swal-tags ${isGold ? 'gold-tags' : ''}">`;
                tasks.forEach(task => html += `<li>${task}</li>`);
                html += `</ul>`;
            }
            html += `</div>`; // Cierre de card
        }
        html += '</div>';

        // Si literalmente no hay nada en todo el objeto
        if (totalItems === 0) {
            return `
                <div style="text-align: center; padding: 2rem 0;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">👻</div>
                    <h3 style="color: var(--text-main); font-weight: 800;">${emptyTitle}</h3>
                    <p style="color: var(--text-muted);">${emptySub}</p>
                </div>
            `;
        }

        return html;
    }

    showPendingPool() {
        const htmlContent = this.buildModalHTML(this.currentPool, '¡Todo completado!', 'No te quedan tareas en el Pool. ¡Eres una máquina!', false);
        Swal.fire({ 
            title: '🗂️ Tu Inventario Restante', 
            html: htmlContent, 
            width: '800px',
            showConfirmButton: true,
            confirmButtonText: 'Genial, a seguir',
            confirmButtonColor: '#a2d2ff',
            customClass: { popup: 'custom-swal' }
        });
    }

    showCompletedPool() {
        const consumedTasks = {};
        for (const cat in this.defaultTasks) {
            const original = [...this.defaultTasks[cat]];
            const current = [...this.currentPool[cat]];
            current.forEach(item => {
                const idx = original.indexOf(item);
                if (idx > -1) original.splice(idx, 1);
            });
            consumedTasks[cat] = original; 
        }
        
        const htmlContent = this.buildModalHTML(consumedTasks, 'Aún no arrancas', 'No has completado tareas de la lista original. ¡Hoy es el día!', true);
        Swal.fire({ 
            title: '🏆 Salón de la Fama', 
            html: htmlContent, 
            width: '800px',
            confirmButtonText: '¡Qué orgullo!',
            confirmButtonColor: '#fbbf24',
            customClass: { popup: 'custom-swal' }
        });
    }

    showCustomTasks() {
        const customTasks = Object.values(this.todaySchedule || {}).filter(t => t.isCustom);
        
        let htmlContent = '';
        if (customTasks.length === 0) {
            htmlContent = `
                <div style="text-align: center; padding: 2rem 0;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">🧘‍♂️</div>
                    <h3 style="color: var(--text-main); font-weight: 800;">Día tranquilo</h3>
                    <p style="color: var(--text-muted);">No has agregado tareas extra (bomberazos) el día de hoy.</p>
                </div>
            `;
        } else {
            htmlContent = '<div class="swal-grid" style="grid-template-columns: 1fr;">';
            htmlContent += `<div class="swal-category-card" style="border-color: #cbd5e1;">`;
            htmlContent += `<span class="swal-cat-icon">📌</span><div class="swal-cat-title">Extras de Hoy</div>`;
            htmlContent += `<ul class="swal-tags" style="align-items: center;">`;
            customTasks.forEach(t => htmlContent += `<li style="width: 80%;">${t.name}</li>`);
            htmlContent += `</ul></div></div>`;
        }

        Swal.fire({
            title: '📌 Tareas Extra',
            html: htmlContent,
            confirmButtonColor: '#94a3b8',
            confirmButtonText: 'Entendido',
            width: '450px',
            customClass: { popup: 'custom-swal' }
        });
    }

    bindEvents() {
        this.DOM.btnGenerate.addEventListener('click', () => this.generateRoutine());
        this.DOM.btnAccept.addEventListener('click', () => this.acceptRoutine());
        this.DOM.btnReject.addEventListener('click', () => this.rejectRoutine());
        this.DOM.btnReset.addEventListener('click', () => this.resetSystem());
        
        this.DOM.btnShowPendingPool.addEventListener('click', () => this.showPendingPool());
        this.DOM.btnShowCompletedPool.addEventListener('click', () => this.showCompletedPool());
        
        // NUEVOS EVENTOS
        this.DOM.btnAddCustom.addEventListener('click', () => this.addCustomTask());
        this.DOM.btnShowCustom.addEventListener('click', () => this.showCustomTasks());
        
        // Permitir presionar "Enter" para agregar tarea extra
        this.DOM.inputCustomTask.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addCustomTask();
        });

        this.DOM.routineTracker.addEventListener('change', (e) => {
            if (e.target.classList.contains('task-checkbox')) {
                const categoria = e.target.getAttribute('data-cat');
                this.toggleTask(categoria);
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => new RoutineManager());