class RoutineManager {
    constructor() {
        // Pool de tareas para los 5 días de la semana (Lunes a Viernes)
        // Cada categoría tiene 5 elementos para cubrir la semana laboral.
        this.defaultTasks = {
            trabajo: ['Jornada Laboral 💼', 'Jornada Laboral 💼', 'Jornada Laboral 💼', 'Jornada Laboral 💼', 'Jornada Laboral 💼'],
            ingles: ['Podcast 🎧', 'Podcast 🎧', 'Podcast + Speaking 🗣️', 'Podcast + Speaking 🗣️', 'Podcast + Speaking 🗣️'],
            leer: ['Lectura 📖', 'Lectura 📖', 'Lectura 📖', 'Lectura 📖', 'Descanso 🍃'],
            gatos: ['Pelo + Dientes 🐱', 'General + Dientes 🐱', 'Descanso 🍃', 'Descanso 🍃', 'Descanso 🍃'],
            apto: ['Aseo y Comida 🏠', 'Aseo y Comida 🏠', 'Aseo y Comida 🏠', 'Aseo y Comida 🏠', 'Aseo y Comida 🏠'],
            cv: ['Update CV 📄', 'Update CV 📄', 'Update CV 📄', 'Descanso 🍃', 'Descanso 🍃'],
            ejercicio: ['Entrenamiento 🔥', 'Entrenamiento 🔥', 'Descanso 🍃', 'Descanso 🍃', 'Descanso 🍃']
        };

        this.labels = { 
            trabajo: '💼', 
            ingles: '🗣️', 
            leer: '📚', 
            gatos: '🐱', 
            apto: '🏠', 
            cv: '📄', 
            ejercicio: '💪', 
            extra: '📌' 
        };

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
        const now = new Date();
        const dayIndex = now.getDay(); // 0: Dom, 1: Lun, ..., 6: Sab
        const isWeekend = (dayIndex === 0 || dayIndex === 6);

        this.tempSelection = { schedule: {}, indicesToRemove: {} };
        
        if (isWeekend) {
            // FDS: Únicamente ejercicio
            this.tempSelection.schedule['ejercicio'] = { name: 'Ejercicio FDS ⚡', done: false };
            // No removemos nada del pool semanal ya que el pool es para Lu-Vi
        } else {
            // ENTRE SEMANA: Lógica de Pool con restricciones de días específicos
            let descansosAcumulados = 0;
            const categorias = Object.keys(this.currentPool).sort(() => Math.random() - 0.5);

            for (const category of categorias) {
                let opciones = this.currentPool[category];
                
                if (opciones.length === 0) {
                    this.tempSelection.schedule[category] = { name: "✨ Completado", done: false };
                    continue;
                }

                let seleccion = null;
                let indexSeleccionado = -1;

                // REGLAS ESTRICTAS POR DÍA
                if (category === 'cv') {
                    // CV: Lunes(1), Miércoles(3), Viernes(5)
                    const isCvDay = [1, 3, 5].includes(dayIndex);
                    indexSeleccionado = opciones.findIndex(opt => isCvDay ? !opt.includes('Descanso') : opt.includes('Descanso'));
                } else if (category === 'ejercicio') {
                    // Ejercicio: Martes(2), Jueves(4)
                    const isEjDay = [2, 4].includes(dayIndex);
                    indexSeleccionado = opciones.findIndex(opt => isEjDay ? !opt.includes('Descanso') : opt.includes('Descanso'));
                }

                // Si no es una categoría estricta o no se encontró el tipo de item deseado, fallback a aleatorio
                if (indexSeleccionado === -1) {
                    indexSeleccionado = Math.floor(Math.random() * opciones.length);
                }

                seleccion = opciones[indexSeleccionado];
                if (seleccion.includes('Descanso')) descansosAcumulados++;

                this.tempSelection.schedule[category] = { name: seleccion, done: false };
                this.tempSelection.indicesToRemove[category] = indexSeleccionado;
            }
        }

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
            const icon = this.labels[key.startsWith('custom') ? 'extra' : key] || '🎯';
            div.innerHTML = `<span class="task-category">${icon} ${key.toUpperCase()}</span><span class="task-name">${taskObj.name}</span>`;
            fragment.appendChild(div);
        }
        this.DOM.taskList.appendChild(fragment);
    }

    acceptRoutine() {
        if (!this.tempSelection) return;
        // Solo removemos del pool si es día de semana (el fds es extra)
        for (const [category, index] of Object.entries(this.tempSelection.indicesToRemove)) {
            if (this.currentPool[category]) {
                this.currentPool[category].splice(index, 1);
            }
        }
        const today = this.getTodayDate();
        this.todaySchedule = this.tempSelection.schedule;
        this.saveData(today);
        this.DOM.taskList.hidden = true; 
        this.lockUI();
        this.renderTracker();
        Swal.fire({ title: '¡Plan Guardado!', text: 'A darle con todo hoy.', icon: 'info', confirmButtonColor: '#a2d2ff' });
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

    addCustomTask() {
        const taskName = this.DOM.inputCustomTask.value.trim();
        if (!taskName) return;
        const customId = `custom_${Date.now()}`;
        this.todaySchedule[customId] = { name: taskName, done: false, isCustom: true };
        this.DOM.inputCustomTask.value = '';
        this.saveData(this.getTodayDate());
        this.renderTracker();
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
            
            const poolEmpty = Object.values(this.currentPool).every(arr => arr.length === 0);
            if (poolEmpty) {
                Swal.fire({ 
                    title: '¡SEMANA COMPLETADA!', 
                    text: 'Has vaciado tu pool de tareas semanales. Reiniciando para el próximo ciclo.', 
                    icon: 'success', 
                    confirmButtonColor: '#b7e4c7' 
                }).then(() => {
                    this.resetSystem(false, true);
                });
            } else {
                Swal.fire({ title: '¡Excelente!', text: 'Día terminado.', icon: 'success', confirmButtonColor: '#b7e4c7' });
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
        this.DOM.btnGenerate.textContent = 'Modo Enfoque Activo 🚀';
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

    resetSystem(silent = false, keepHistory = false) {
        const executeReset = () => {
            const savedHistory = keepHistory ? JSON.stringify(this.history) : null;
            localStorage.clear();
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
            title: '¿Reiniciar sistema?', text: "Se restaurará el pool de tareas semanal.", icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#ffcad4', cancelButtonColor: '#a0aec0', confirmButtonText: 'Sí, reiniciar'
        }).then((result) => {
            if (result.isConfirmed) { executeReset(); }
        });
    }

    buildModalHTML(dataObject, emptyTitle, emptySub, isGold = false) {
        let html = '<div class="swal-grid">';
        let totalItems = 0;
        for (const [category, tasks] of Object.entries(dataObject)) {
            totalItems += tasks.length;
            html += `<div class="swal-category-card ${isGold ? 'gold-card' : ''}"><span class="swal-cat-icon">${this.labels[category] || '🎯'}</span><div class="swal-cat-title">${category}</div>`;
            if (tasks.length === 0) { html += `<div class="swal-empty-cat">Vacío ✨</div>`; } 
            else {
                html += `<ul class="swal-tags ${isGold ? 'gold-tags' : ''}">`;
                tasks.forEach(task => html += `<li>${task}</li>`);
                html += `</ul>`;
            }
            html += `</div>`;
        }
        html += '</div>';
        if (totalItems === 0) return `<div style="text-align: center; padding: 2rem 0;"><div style="font-size: 4rem; margin-bottom: 1rem;">👻</div><h3 style="color: var(--text-main); font-weight: 800;">${emptyTitle}</h3><p style="color: var(--text-muted);">${emptySub}</p></div>`;
        return html;
    }

    showPendingPool() {
        const htmlContent = this.buildModalHTML(this.currentPool, '¡Todo listo!', 'Pool vacío.', false);
        Swal.fire({ title: '🗂️ Inventario Semanal', html: htmlContent, width: '800px', confirmButtonText: 'Cerrar', confirmButtonColor: '#a2d2ff' });
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
        const htmlContent = this.buildModalHTML(consumedTasks, 'Sin progreso', 'Aún no hay tareas terminadas.', true);
        Swal.fire({ title: '🏆 Logros de la Semana', html: htmlContent, width: '800px', confirmButtonColor: '#fbbf24' });
    }

    showCustomTasks() {
        const customTasks = Object.values(this.todaySchedule || {}).filter(t => t.isCustom);
        let htmlContent = '';
        if (customTasks.length === 0) {
            htmlContent = `<div style="text-align: center; padding: 2rem 0;"><div style="font-size: 4rem; margin-bottom: 1rem;">🧘‍♂️</div><p>No hay tareas extra.</p></div>`;
        } else {
            htmlContent = '<div class="swal-grid" style="grid-template-columns: 1fr;"><div class="swal-category-card"><span class="swal-cat-icon">📌</span><div class="swal-cat-title">Extras</div><ul class="swal-tags">';
            customTasks.forEach(t => htmlContent += `<li>${t.name}</li>`);
            htmlContent += `</ul></div></div>`;
        }
        Swal.fire({ title: '📌 Tareas Extra', html: htmlContent, confirmButtonColor: '#94a3b8', width: '450px' });
    }

    bindEvents() {
        this.DOM.btnGenerate.addEventListener('click', () => this.generateRoutine());
        this.DOM.btnAccept.addEventListener('click', () => this.acceptRoutine());
        this.DOM.btnReject.addEventListener('click', () => this.rejectRoutine());
        this.DOM.btnReset.addEventListener('click', () => this.resetSystem());
        this.DOM.btnShowPendingPool.addEventListener('click', () => this.showPendingPool());
        this.DOM.btnShowCompletedPool.addEventListener('click', () => this.showCompletedPool());
        this.DOM.btnAddCustom.addEventListener('click', () => this.addCustomTask());
        this.DOM.btnShowCustom.addEventListener('click', () => this.showCustomTasks());
        this.DOM.inputCustomTask.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.addCustomTask(); });
        this.DOM.routineTracker.addEventListener('change', (e) => {
            if (e.target.classList.contains('task-checkbox')) { this.toggleTask(e.target.getAttribute('data-cat')); }
        });
    }
}
document.addEventListener('DOMContentLoaded', () => new RoutineManager());