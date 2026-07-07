(function() {
            'use strict';

            // I18N loaded from data.js

            let currentLang = localStorage.getItem('cal_lang') || 'zh';

            function t(key) {
                return I18N[currentLang][key] || key;
            }

            function tGreeting() {
                const h = new Date().getHours();
                if (h >= 6 && h < 12) return t('greeting').morning;
                if (h >= 12 && h < 18) return t('greeting').afternoon;
                if (h >= 18 && h < 23) return t('greeting').evening;
                return t('greeting').night;
            }

            // ===== DOM引用 =====
            const $ = id => document.getElementById(id);
            const timeText = $('timeText');
            const dayGrid = $('dayGrid');
            const yearText = $('yearText');
            const monthText = $('monthText');
            const yearPanel = $('yearPanel');
            const monthPanel = $('monthPanel');
            const btnToday = $('btnToday');
            const calendarBox = $('calendarBox');
            const countdownText = $('countdownText');
            const noteTooltip = $('noteTooltip');
            const modalOverlay = $('modalOverlay');
            const modalDialog = modalOverlay.querySelector('.modal-dialog');
            const modalDateLabel = $('modalDateLabel');
            const modalNotesList = $('modalNotesList');
            const modalNoteInput = $('modalNoteInput');
            const btnAddNote = $('btnAddNote');
            const btnCloseModal = $('btnCloseModal');
            const weekRow = $('weekRow');
            const greetingSub = $('greetingSub');

            // ===== 状态 =====
            const today = new Date();
            const todayYear = today.getFullYear();
            const todayMonth = today.getMonth() + 1;
            const todayDay = today.getDate();
            let currentShowYear = todayYear;
            let currentShowMonth = todayMonth;
            let currentModalDateKey = null;
            let lastMinute = -1;

            // lunarData loaded from data.js

            // allYearHolidays/allYearWorkdays loaded from data.js

            // peaceQuotes loaded from data.js

            // ===== 新增：世界时钟更新 =====
            const worldClockTzMap = {
                'wcBeijing': 'Asia/Shanghai',
                'wcTokyo': 'Asia/Tokyo',
                'wcNewYork': 'America/New_York',
                'wcLondon': 'Europe/London',
                'wcParis': 'Europe/Paris',
                'wcSydney': 'Australia/Sydney'
            };

            function updateWorldClocks() {
                const now = new Date();
                for (const [elId, tz] of Object.entries(worldClockTzMap)) {
                    const el = $(elId);
                    if (!el) continue;
                    try {
                        const timeStr = now.toLocaleTimeString(currentLang === 'zh' ? 'zh-CN' : 'en-US', {
                            timeZone: tz,
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                        });
                        el.textContent = timeStr;
                    } catch (e) {
                        el.textContent = '--:--';
                    }
                }
            }

            function updateWorldClockCityNames() {
                const cards = document.querySelectorAll('.world-clock-card');
                const cityNames = I18N[currentLang].worldClockCities;
                cards.forEach(card => {
                    const cityEl = card.querySelector('.wc-city');
                    const tz = card.getAttribute('data-tz');
                    if (cityEl && tz) {
                        const key = Object.keys(worldClockTzMap).find(k => worldClockTzMap[k] === tz);
                        if (key) {
                            const shortKey = key.replace('wc', '');
                            cityEl.textContent = cityNames[shortKey] || shortKey;
                        }
                    }
                });
            }

            // ===== 新增：许愿星系统 =====
            const WISH_KEY = 'peace_wish_star_wishes';

            function loadWishes() {
                try {
                    const r = localStorage.getItem(WISH_KEY);
                    return r ? JSON.parse(r) : [];
                } catch (e) { return []; }
            }

            function saveWishes(wishes) {
                try { localStorage.setItem(WISH_KEY, JSON.stringify(wishes)); } catch (e) {}
            }

            function addWish(text) {
                const wishes = loadWishes();
                wishes.unshift({ id: Date.now(), text: text.trim(), createdAt: new Date().toISOString() });
                if (wishes.length > 20) wishes.length = 20;
                saveWishes(wishes);
                return wishes;
            }

            function renderWishHistory() {
                const wishes = loadWishes();
                const historyEl = $('wishHistory');
                const emptyEl = $('wishEmpty');
                if (!historyEl) return;
                historyEl.innerHTML = '';
                if (wishes.length === 0) {
                    if (emptyEl) emptyEl.style.display = '';
                    return;
                }
                if (emptyEl) emptyEl.style.display = 'none';
                wishes.slice(0, 8).forEach(w => {
                    const div = document.createElement('div');
                    div.className = 'wish-history-item';
                    div.innerHTML =
                        `<span class="wh-star">⭐</span><span>${escapeHtml(w.text)}</span>`;
                    historyEl.appendChild(div);
                });
            }

            function spawnWishStarParticles(cx, cy) {
                const emojis = ['⭐', '🌟', '✨', '💫', '🕊', '☮️', '💛', '🌍'];
                for (let i = 0; i < 20; i++) {
                    const el = document.createElement('div');
                    el.className = 'wish-star-particle';
                    el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
                    const angle = (Math.random() * 180 - 90) * Math.PI / 180;
                    const dist = 60 + Math.random() * 120;
                    const wx = Math.cos(angle) * dist;
                    const wy = -(80 + Math.random() * 160);
                    const wx2 = Math.cos(angle) * dist * 1.6;
                    const wy2 = -(200 + Math.random() * 250);
                    el.style.cssText =
                        `left:${cx}px;top:${cy}px;--wx:${wx}px;--wy:${wy}px;--wx2:${wx2}px;--wy2:${wy2}px;font-size:${14 + Math.random() * 16}px;`;
                    document.body.appendChild(el);
                    setTimeout(() => el.remove(), 2600);
                }
            }

            function openWishModal() {
                $('wishModalOverlay').classList.add('show');
                $('wishInput').value = '';
                $('wishSubtitle').textContent = currentLang === 'zh' ? '向星空许下心愿，愿世界和平' :
                    'Make a wish upon the stars for world peace';
                $('wishInput').placeholder = currentLang === 'zh' ? '写下你的愿望...' : 'Write your wish...';
                $('btnWishSubmit').textContent = currentLang === 'zh' ? '许愿 ✨' : 'Wish ✨';
                const emptyEl = $('wishEmpty');
                if (emptyEl) emptyEl.textContent = currentLang === 'zh' ? '还没有愿望，快来许下第一个吧~' :
                    'No wishes yet, make your first one~';
                renderWishHistory();
                setTimeout(() => $('wishInput').focus(), 200);
            }

            function closeWishModal() {
                $('wishModalOverlay').classList.remove('show');
            }

            function submitWish() {
                const input = $('wishInput');
                const text = input.value.trim();
                if (!text) return;
                addWish(text);
                input.value = '';
                renderWishHistory();
                const fab = $('wishStarFab');
                const fabRect = fab.getBoundingClientRect();
                const cx = fabRect.left + fabRect.width / 2;
                const cy = fabRect.top + fabRect.height / 2;
                spawnWishStarParticles(cx, cy);
                input.focus();
            }

            // ===== 新增：和平日金色粒子雨 =====
            function spawnPeaceDayParticles() {
                const emojis = ['🕊', '☮️', '💛', '🌟', '✨', '🕊️', '🌍', '💫', '⭐', '🎗️', '🏳️', '💖'];
                const count = 25;
                for (let i = 0; i < count; i++) {
                    setTimeout(() => {
                        const el = document.createElement('div');
                        el.className = 'peace-day-particle';
                        el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
                        const startX = Math.random() * window.innerWidth;
                        const pdx = (Math.random() - 0.5) * 200;
                        const pdx2 = (Math.random() - 0.5) * 350;
                        el.style.cssText =
                            `left:${startX}px;top:-30px;--pdx:${pdx}px;--pdx2:${pdx2}px;font-size:${16 + Math.random() * 20}px;animation-delay:${Math.random() * 2}s;animation-duration:${3.5 + Math.random() * 3}s;`;
                        document.body.appendChild(el);
                        setTimeout(() => el.remove(), 5000);
                    }, i * 80);
                }
            }

            function checkPeaceDayEnhanced() {
                const now = new Date();
                if (now.getMonth() === 8 && now.getDate() === 21) {
                    if (!sessionStorage.getItem('peace_day_particles_2026')) {
                        sessionStorage.setItem('peace_day_particles_2026', '1');
                        setTimeout(() => spawnPeaceDayParticles(), 2000);
                        setTimeout(() => spawnPeaceDayParticles(), 8000);
                    }
                }
            }

            // ===== 记事管理 =====
            const NOTES_KEY = 'calendar_peace_notes';

            function loadAllNotes() { try { const r = localStorage.getItem(NOTES_KEY); return r ? JSON.parse(r) :
                    {}; } catch (e) { return {}; } }

            function saveAllNotes(notes) { try { localStorage.setItem(NOTES_KEY, JSON.stringify(notes)); } catch (e) {} }

            function getNotesForDate(dateKey) { return loadAllNotes()[dateKey] || []; }

            function addNoteToDate(dateKey, text) {
                const all = loadAllNotes();
                if (!all[dateKey]) all[dateKey] = [];
                all[dateKey].push({ id: Date.now(), text: text.trim(), createdAt: new Date().toISOString() });
                saveAllNotes(all);
                return all[dateKey];
            }

            function updateNoteInDate(dateKey, noteId, newText) {
                const all = loadAllNotes();
                if (!all[dateKey]) return;
                const note = all[dateKey].find(n => n.id === noteId);
                if (note) { note.text = newText.trim();
                    note.updatedAt = new Date().toISOString(); }
                saveAllNotes(all);
            }

            function deleteNoteFromDate(dateKey, noteId) {
                const all = loadAllNotes();
                if (!all[dateKey]) return;
                all[dateKey] = all[dateKey].filter(n => n.id !== noteId);
                if (all[dateKey].length === 0) delete all[dateKey];
                saveAllNotes(all);
            }

            function searchNotes(keyword) {
                if (!keyword.trim()) return [];
                const kw = keyword.toLowerCase();
                const all = loadAllNotes();
                const results = [];
                for (const [dateKey, notes] of Object.entries(all)) {
                    for (const note of notes) {
                        if (note.text.toLowerCase().includes(kw)) {
                            results.push({ dateKey, ...note });
                        }
                    }
                }
                return results;
            }

            function hasNotesForDate(dateKey) { return getNotesForDate(dateKey).length > 0; }

            function getSimpleLunar(y, m, d) {
                if (lunarData[y] && lunarData[y][m] && lunarData[y][m][d]) return lunarData[y][m][d];
                return '';
            }

            function isDuplicateName(lunarTxt, holidayName) {
                if (!lunarTxt || !holidayName) return false;
                if (lunarTxt === holidayName) return true;
                if (lunarTxt.includes(holidayName) || holidayName.includes(lunarTxt)) return true;
                if (lunarTxt === '国庆节' && holidayName === '国庆') return true;
                if (lunarTxt === '元旦' && holidayName === '元旦') return true;
                return false;
            }

            function renderWeekRow() {
                const days = currentLang === 'zh' ? I18N.zh.weekDays : I18N.en.weekDays;
                weekRow.innerHTML = '';
                days.forEach((d, i) => {
                    const div = document.createElement('div');
                    div.className = 'week-item' + (i === 5 ? ' weekday-sat' : '') + (i === 6 ? ' weekday-sun' :
                        '');
                    div.setAttribute('role', 'columnheader');
                    div.setAttribute('aria-label', (currentLang === 'zh' ? '' : I18N.en.weekDaysFull[i] + ', ') +
                        d);
                    div.textContent = d;
                    weekRow.appendChild(div);
                });
            }

            function createDayCell(num, holidayName, lunarTxt, isOtherMonth, isTodayFlag, isHoliday, isFestival,
                isSolarTerm, solarTermName, isWorkday, isPeaceDay, weekDay, dateKey) {
                const div = document.createElement('div');
                div.className = 'day-cell';
                div.setAttribute('role', 'gridcell');
                div.setAttribute('tabindex', isOtherMonth ? '-1' : '0');
                if (isOtherMonth) div.classList.add('other-month');
                if (isTodayFlag) div.classList.add('today');
                if (isHoliday && !isOtherMonth) div.classList.add('holiday');
                if (isFestival && !isOtherMonth && !isHoliday && !isSolarTerm) div.classList.add('festival');
                if (isSolarTerm && !isOtherMonth) div.classList.add('solar-term');
                if (isWorkday && !isOtherMonth && !isHoliday) div.classList.add('workday-makeup');
                if (isPeaceDay && !isOtherMonth) div.classList.add('peace-day');
                if (!isOtherMonth) {
                    if (weekDay === 6) div.classList.add('weekday-sat');
                    if (weekDay === 0) div.classList.add('weekday-sun');
                }
                if (!isOtherMonth && dateKey) {
                    div.setAttribute('data-date-key', dateKey);
                    div.setAttribute('aria-label', dateKey + (holidayName ? ' ' + holidayName : '') + ' ' +
                        lunarTxt);
                }
                let inner = `<span class="num">${num}</span>`;
                let displayLunar = lunarTxt;
                if (isHoliday && isDuplicateName(lunarTxt, holidayName)) displayLunar = '';
                if (isSolarTerm && solarTermName && !isOtherMonth) inner +=
                    `<span class="solar-term-name">${solarTermName}</span>`;
                if (isHoliday && holidayName && !isOtherMonth) inner +=
                `<span class="holiday-name">${holidayName}</span>`;
                if (isWorkday && !isOtherMonth && !isHoliday) inner +=
                    `<span class="workday-tag">${currentLang==='zh'?'补班':'Work'}</span>`;
                if (displayLunar) inner += `<span class="lunar">${displayLunar}</span>`;
                else if (!isOtherMonth && !displayLunar && !isHoliday && !isSolarTerm && !isWorkday) inner +=
                    '<span class="lunar" style="visibility:hidden;">·</span>';
                if (!isOtherMonth && dateKey && hasNotesForDate(dateKey)) inner += '<span class="note-dot"></span>';
                div.innerHTML = inner;
                return div;
            }

            function renderYearPanel() {
                yearPanel.innerHTML = '';
                const startY = currentShowYear - 5,
                    endY = currentShowYear + 5;
                for (let y = startY; y <= endY; y++) {
                    const item = document.createElement('div');
                    item.className = 'panel-item' + (y === currentShowYear ? ' active' : '');
                    item.setAttribute('role', 'option');
                    item.textContent = y;
                    item.addEventListener('click', e => {
                        e.stopPropagation();
                        switchMonth(currentShowYear, y, 'none');
                        closeAllPanel();
                    });
                    yearPanel.appendChild(item);
                }
            }

            function renderMonthPanel() {
                monthPanel.innerHTML = '';
                const names = I18N[currentLang].monthNames;
                for (let m = 1; m <= 12; m++) {
                    const item = document.createElement('div');
                    item.className = 'panel-item' + (m === currentShowMonth ? ' active' : '');
                    item.setAttribute('role', 'option');
                    item.textContent = currentLang === 'zh' ? m + '月' : names[m - 1];
                    item.addEventListener('click', e => {
                        e.stopPropagation();
                        switchMonth(currentShowYear, m, 'none');
                        closeAllPanel();
                    });
                    monthPanel.appendChild(item);
                }
            }

            function closeAllPanel() { yearPanel.classList.remove('show');
                monthPanel.classList.remove('show'); }

            function togglePanel(panelToShow, panelToHide, renderFn) {
                const isShowing = panelToShow.classList.contains('show');
                closeAllPanel();
                if (!isShowing) { renderFn();
                    panelToShow.classList.add('show'); }
            }

            function switchMonth(year, month, anim = 'left') {
                const cls = anim === 'left' ? 'slide-left' : anim === 'right' ? 'slide-right' : '';
                dayGrid.classList.remove('slide-left', 'slide-right');
                void dayGrid.offsetWidth;
                if (cls) dayGrid.classList.add(cls);
                if (year !== undefined) currentShowYear = year;
                if (month !== undefined) currentShowMonth = month;
                renderCalendar();
                updateCountdown();
                updateDashboard();
            }

            function renderCalendar() {
                dayGrid.innerHTML = '';
                yearText.textContent = currentShowYear;
                monthText.textContent = currentShowMonth;
                yearText.setAttribute('aria-label', currentLang === 'zh' ? `当前年份 ${currentShowYear}，点击选择` :
                    `Year ${currentShowYear}, click to select`);
                monthText.setAttribute('aria-label', currentLang === 'zh' ? `当前月份 ${currentShowMonth}，点击选择` :
                    `Month ${currentShowMonth}, click to select`);
                const yearHoliday = allYearHolidays[currentShowYear] || {};
                const yearWorkday = allYearWorkdays[currentShowYear] || {};
                const yearSolarTerms = solarTermsData[currentShowYear] || {};
                const firstDay = new Date(currentShowYear, currentShowMonth - 1, 1).getDay();
                const preDays = firstDay === 0 ? 6 : firstDay - 1;
                const thisMonthTotal = new Date(currentShowYear, currentShowMonth, 0).getDate();
                const lastMonthTotal = new Date(currentShowYear, currentShowMonth - 1, 0).getDate();
                for (let i = 0; i < preDays; i++) {
                    const dayNum = lastMonthTotal - preDays + i + 1;
                    dayGrid.appendChild(createDayCell(dayNum, '', '', true, false, false, false, false, '', false, false, -1,
                        null));
                }
                for (let d = 1; d <= thisMonthTotal; d++) {
                    const dateKey = `${currentShowMonth}-${d}`;
                    const fullDateKey = `${currentShowYear}-${currentShowMonth}-${d}`;
                    const weekDay = new Date(currentShowYear, currentShowMonth - 1, d).getDay();
                    const lunarTxt = getSimpleLunar(currentShowYear, currentShowMonth, d);
                    const holidayName = yearHoliday[dateKey] || '';
                    const isHoliday = !!holidayName;
                    const isWorkday = !!yearWorkday[dateKey] && !isHoliday;
                    const solarTermName = yearSolarTerms[dateKey] || '';
                    const isSolarTerm = !!solarTermName;
                    const isFestival = !!festivalMap[dateKey] && !isSolarTerm;
                    const isPeaceDay = peaceDays.includes(dateKey);
                    const isTodayFlag = (currentShowYear === todayYear && currentShowMonth === todayMonth && d ===
                        todayDay);
                    dayGrid.appendChild(createDayCell(d, holidayName, lunarTxt, false, isTodayFlag, isHoliday, isFestival,
                        isSolarTerm, solarTermName, isWorkday, isPeaceDay, weekDay, fullDateKey));
                }
                const totalCells = dayGrid.children.length;
                for (let i = 1; i <= 42 - totalCells; i++) {
                    dayGrid.appendChild(createDayCell(i, '', '', true, false, false, false, false, '', false, false, -1, null));
                }
                bindDayCellEvents();
            }

            function bindDayCellEvents() {
                dayGrid.querySelectorAll('.day-cell:not(.other-month)').forEach(cell => {
                    const dateKey = cell.getAttribute('data-date-key');
                    if (!dateKey) return;
                    cell.addEventListener('mouseenter', e => { if (hasNotesForDate(dateKey))
                            showNoteTooltip(e, dateKey); });
                    cell.addEventListener('mouseleave', hideNoteTooltip);
                    cell.addEventListener('mousemove', e => { if (noteTooltip.classList.contains('show'))
                            positionTooltip(e); });
                    cell.addEventListener('dblclick', e => { e.stopPropagation();
                        openNoteModal(dateKey); });
                    cell.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e
                            .preventDefault();
                            openNoteModal(dateKey); } });
                    cell.addEventListener('focus', e => { if (hasNotesForDate(dateKey)) showNoteTooltip(e,
                            dateKey); });
                    cell.addEventListener('blur', hideNoteTooltip);
                });
            }

            function showNoteTooltip(e, dateKey) {
                const notes = getNotesForDate(dateKey);
                if (!notes.length) return;
                const [y, m, d] = dateKey.split('-');
                let html =
                    `<div class="tooltip-date">📌 ${y}${currentLang==='zh'?'年':'/'}${m}${currentLang==='zh'?'月':'/'}${d}${currentLang==='zh'?'日':''}</div>`;
                notes.slice(0, 3).forEach(n => { html +=
                        `<div class="tooltip-item">${escapeHtml(n.text.length>18?n.text.slice(0,18)+'...':n.text)}</div>`; });
                if (notes.length > 3) html +=
                    `<div class="tooltip-item" style="color:#999;">...${currentLang==='zh'?'共':'Total'} ${notes.length} ${currentLang==='zh'?'条':'items'}</div>`;
                noteTooltip.innerHTML = html;
                noteTooltip.classList.add('show');
                positionTooltip(e);
            }

            function hideNoteTooltip() { noteTooltip.classList.remove('show'); }

            function positionTooltip(e) {
                let x = e.clientX + 14,
                    y = e.clientY - 10;
                const tw = noteTooltip.offsetWidth,
                    th = noteTooltip.offsetHeight;
                if (x + tw > window.innerWidth - 10) x = e.clientX - tw - 14;
                if (y + th > window.innerHeight - 10) y = e.clientY - th - 10;
                if (x < 10) x = 10;
                if (y < 10) y = 10;
                noteTooltip.style.left = x + 'px';
                noteTooltip.style.top = y + 'px';
            }

            let editingNoteId = null;

            function openNoteModal(dateKey) {
                currentModalDateKey = dateKey;
                editingNoteId = null;
                modalNoteInput.value = '';
                btnAddNote.textContent = currentLang === 'zh' ? '添加' : 'Add';
                const [y, m, d] = dateKey.split('-');
                modalDateLabel.textContent =
                    `${y}${currentLang==='zh'?'年':'/'}${m}${currentLang==='zh'?'月':'/'}${d}${currentLang==='zh'?'日':''}`;
                hideSearchResults();
                $('noteSearchRow').style.display = 'none';
                renderModalNotesList();
                modalOverlay.classList.add('show');
                setTimeout(() => modalNoteInput.focus(), 200);
            }

            function closeNoteModal() {
                modalOverlay.classList.remove('show');
                currentModalDateKey = null;
                editingNoteId = null;
                renderCalendar();
            }

            function renderModalNotesList() {
                const notes = getNotesForDate(currentModalDateKey || '');
                modalNotesList.innerHTML = '';
                if (!notes.length) {
                    modalNotesList.innerHTML =
                        `<div class="modal-empty">${currentLang==='zh'?'暂无记事，快来添加吧~':'No notes yet, add one~'}</div>`;
                    return;
                }
                notes.forEach(n => {
                    const div = document.createElement('div');
                    div.className = 'modal-note-item';
                    const timeStr = new Date(n.createdAt).toLocaleString(currentLang === 'zh' ? 'zh-CN' :
                        'en-US', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                    div.innerHTML = `
                <span class="note-text">${escapeHtml(n.text)}</span>
                <span class="note-time">${timeStr}</span>
                <button class="btn-edit-note" data-id="${n.id}" title="${currentLang==='zh'?'修改':'Edit'}" aria-label="${currentLang==='zh'?'修改记事':'Edit note'}">✎</button>
                <button class="btn-del-note" data-id="${n.id}" title="${currentLang==='zh'?'删除':'Delete'}" aria-label="${currentLang==='zh'?'删除记事':'Delete note'}">✕</button>
              `;
                    div.querySelector('.btn-del-note').addEventListener('click', e => {
                        deleteNoteFromDate(currentModalDateKey, n.id);
                        renderModalNotesList();
                        renderCalendar();
                        updateDashboard();
                    });
                    div.querySelector('.btn-edit-note').addEventListener('click', e => {
                        editingNoteId = n.id;
                        modalNoteInput.value = n.text;
                        modalNoteInput.focus();
                        btnAddNote.textContent = currentLang === 'zh' ? '保存' : 'Save';
                    });
                    modalNotesList.appendChild(div);
                });
            }

            function addNoteHandler() {
                if (!currentModalDateKey) return;
                const text = modalNoteInput.value.trim();
                if (!text) return;
                if (editingNoteId) {
                    updateNoteInDate(currentModalDateKey, editingNoteId, text);
                    editingNoteId = null;
                    btnAddNote.textContent = currentLang === 'zh' ? '添加' : 'Add';
                } else {
                    addNoteToDate(currentModalDateKey, text);
                }
                modalNoteInput.value = '';
                renderModalNotesList();
                renderCalendar();
                updateDashboard();
                modalNoteInput.focus();
            }

            function escapeHtml(str) { const d = document.createElement('div');
                d.textContent = str; return d.innerHTML; }

            let isSearchMode = false;

            function toggleSearchMode() {
                isSearchMode = !isSearchMode;
                $('noteSearchRow').style.display = isSearchMode ? 'flex' : 'none';
                hideSearchResults();
                if (isSearchMode) { $('noteSearchInput').focus();
                    modalNotesList.style.display = 'none'; } else { modalNotesList.style.display = ''; }
            }

            function doSearch() {
                const kw = $('noteSearchInput').value.trim();
                if (!kw) { hideSearchResults(); return; }
                const results = searchNotes(kw);
                renderSearchResults(results);
            }

            function hideSearchResults() { $('noteSearchResults').style.display = 'none';
                $('noteSearchResults').innerHTML = ''; }

            function renderSearchResults(results) {
                const box = $('noteSearchResults');
                if (!results.length) { box.innerHTML =
                        `<div class="modal-empty">${currentLang==='zh'?'没有找到匹配的记事':'No matching notes found'}</div>`;
                    box.style.display = ''; return; }
                box.innerHTML = '';
                results.forEach(r => {
                    const [y, m, d] = r.dateKey.split('-');
                    const div = document.createElement('div');
                    div.className = 'note-search-item';
                    div.innerHTML =
                        `<span class="nsi-date">${y}${currentLang==='zh'?'年':'/'}${m}${currentLang==='zh'?'月':'/'}${d}${currentLang==='zh'?'日':''}</span><span class="nsi-text">${escapeHtml(r.text)}</span>`;
                    div.addEventListener('click', () => {
                        const ym = parseInt(y),
                            tm = parseInt(m);
                        if (currentShowYear !== ym || currentShowMonth !== tm) { currentShowYear = ym;
                            currentShowMonth = tm;
                            renderCalendar();
                            updateCountdown();
                            updateDashboard(); }
                        hideSearchResults();
                        isSearchMode = false;
                        $('noteSearchRow').style.display = 'none';
                        modalNotesList.style.display = '';
                        openNoteModal(r.dateKey);
                    });
                    box.appendChild(div);
                });
                box.style.display = '';
            }

            function exportNotes() {
                const all = loadAllNotes();
                const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `peace-calendar-notes-${new Date().toISOString().slice(0,10)}.json`;
                a.click();
            }

            function importNotes(file) {
                const reader = new FileReader();
                reader.onload = e => {
                    try {
                        const data = JSON.parse(e.target.result);
                        if (typeof data === 'object' && data !== null) {
                            const all = loadAllNotes();
                            const merged = { ...all, ...data };
                            saveAllNotes(merged);
                            renderCalendar();
                            updateDashboard();
                            alert(currentLang === 'zh' ? '✅ 导入成功！' : '✅ Imported successfully!');
                        } else throw new Error('Invalid format');
                    } catch (err) { alert(currentLang === 'zh' ? '⚠️ 导入失败，文件格式错误' :
                            '⚠️ Import failed: invalid format'); }
                };
                reader.readAsText(file);
            }

            let lastCountdownMinute = -1;

            function updateCountdown() {
                const now = new Date();
                const minute = now.getMinutes();
                if (minute === lastCountdownMinute) return;
                lastCountdownMinute = minute;
                const nowTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                const allHolidayDates = [];
                for (const [yearStr, holidays] of Object.entries(allYearHolidays)) {
                    const year = parseInt(yearStr);
                    const seen = new Set();
                    for (const [md, name] of Object.entries(holidays)) {
                        if (seen.has(name)) continue;
                        seen.add(name);
                        const [m, d] = md.split('-').map(Number);
                        const dateObj = new Date(year, m - 1, d);
                        if (dateObj.getTime() >= nowTime) allHolidayDates.push({ dateObj, name, year, month: m,
                            day: d });
                    }
                }
                allHolidayDates.sort((a, b) => a.dateObj - b.dateObj);
                const next = allHolidayDates[0];
                if (!next) { countdownText.innerHTML = currentLang === 'zh' ? '🌟 所有节日已过，期待新的一年~' :
                        "🌟 All holidays passed, look forward to the new year~"; return; }
                const diffDays = Math.ceil((next.dateObj.getTime() - nowTime) / 86400000);
                let emoji = '🎉';
                const emap = { '春节': '🧧', '中秋': '🌕', '国庆': '🇨🇳', '端午': '🐲', '清明': '🌿', '劳动节': '💪', '元旦': '🎊',
                    '元宵节': '🏮' };
                if (emap[next.name]) emoji = emap[next.name];
                if (diffDays === 0) countdownText.innerHTML =
                    `${currentLang==='zh'?'今天是':'Today is'} <strong>${next.name}</strong> ${emoji} ${currentLang==='zh'?'节日快乐！':'Happy holiday!'}`;
                else countdownText.innerHTML =
                    `${currentLang==='zh'?'距离':'Until'} <strong>${next.year}${currentLang==='zh'?'年':'/'}${next.month}${currentLang==='zh'?'月':'/'}${next.day} ${next.name}</strong> ${currentLang==='zh'?'还有':'in'} <strong>${diffDays}</strong> ${currentLang==='zh'?'天':'days'} ${emoji}`;
            }

            function updateDashboard() {
                const todayKey = `${todayMonth}-${todayDay}`;
                const st = solarTermsData[todayYear] && solarTermsData[todayYear][todayKey] || '';
                $('dashSolarTerm').textContent = st || (currentLang === 'zh' ? '无' : 'None');
                $('dashSolarTermLabel').textContent = currentLang === 'zh' ? '节气' : 'Solar Term';
                const ny = new Date(todayYear + 1, 0, 1).getTime();
                const nyDays = Math.ceil((ny - new Date(todayYear, todayMonth - 1, todayDay).getTime()) / 86400000);
                $('dashNewYear').textContent = nyDays;
                $('dashNewYearLabel').textContent = currentLang === 'zh' ? '天到元旦' : 'Days to NY';
                const all = loadAllNotes();
                const monthPrefix = `${currentShowYear}-${currentShowMonth}`;
                let count = 0;
                for (const [k, notes] of Object.entries(all)) {
                    if (k.startsWith(monthPrefix)) count += notes.length;
                }
                $('dashNotes').textContent = count;
                $('dashNotesLabel').textContent = currentLang === 'zh' ? '本月记事' : 'Notes/Mo';
            }

            function updateTime() {
                const now = new Date();
                const y = now.getFullYear(),
                    mo = now.getMonth() + 1,
                    d = now.getDate();
                const weekArr = currentLang === 'zh' ? ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'] : [
                    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
                ];
                const week = weekArr[now.getDay()];
                const h = String(now.getHours()).padStart(2, '0');
                const mi = String(now.getMinutes()).padStart(2, '0');
                const s = String(now.getSeconds()).padStart(2, '0');
                timeText.textContent =
                    `${y}${currentLang==='zh'?'年':'/'}${String(mo).padStart(2,'0')}${currentLang==='zh'?'月':'/'}${String(d).padStart(2,'0')} ${week} ${h}:${mi}:${s}`;
                if (now.getMinutes() !== lastMinute) {
                    lastMinute = now.getMinutes();
                    updateCountdown();
                    updateGreeting();
                    updateWorldClocks();
                }
            }

            function updateGreeting() { greetingSub.textContent = tGreeting(); }

            function checkFestivalTip() {
                const todayKey = `${todayYear}-${todayMonth}-${todayDay}`;
                const holidayName = allYearHolidays[todayYear] && allYearHolidays[todayYear][
                    `${todayMonth}-${todayDay}`
                ] || '';
                const solarName = solarTermsData[todayYear] && solarTermsData[todayYear][
                    `${todayMonth}-${todayDay}`
                ] || '';
                const name = holidayName || solarName;
                const tip = I18N[currentLang].festivalTips[name] || I18N[currentLang].festivalTips[holidayName] || I18N[
                    currentLang].festivalTips[solarName];
                if (!tip) return;
                if (sessionStorage.getItem('tip_shown_' + todayKey)) return;
                sessionStorage.setItem('tip_shown_' + todayKey, '1');
                const box = $('festivalTipBox');
                $('festivalTipTitle').textContent = holidayName ? `🎉 ${name}` : `🌿 ${name}`;
                $('festivalTipBody').textContent = tip;
                setTimeout(() => box.classList.add('show'), 1500);
                setTimeout(() => box.classList.remove('show'), 10000);
            }
            $('festivalTipClose').addEventListener('click', () => $('festivalTipBox').classList.remove('show'));

            function spawnDoves() {
                const container = $('doveContainer');
                if (!container) return;
                const msgs = ['🕊️', '☮️', '✌️', '🌍', '🕊️'];
                for (let i = 0; i < 4; i++) {
                    const dove = document.createElement('div');
                    dove.className = 'dove';
                    dove.textContent = msgs[i % msgs.length];
                    dove.style.top = (10 + Math.random() * 60) + '%';
                    dove.style.animationDelay = (i * 4 + Math.random() * 3) + 's';
                    dove.style.animationDuration = (16 + Math.random() * 8) + 's';
                    dove.style.fontSize = (12 + Math.random() * 8) + 'px';
                    container.appendChild(dove);
                }
            }

            function applyTheme(dark) {
                if (dark) { document.body.classList.add('dark-mode');
                    $('themeToggleBtn').textContent = '☀️ 浅色';
                    $('themeToggleBtn').setAttribute('aria-label', currentLang === 'zh' ? '切换到浅色模式' :
                        'Switch to light mode'); } else { document.body.classList.remove('dark-mode');
                    $('themeToggleBtn').textContent = '🌙 深色';
                    $('themeToggleBtn').setAttribute('aria-label', currentLang === 'zh' ? '切换到深色模式' :
                        'Switch to dark mode'); }
            }
            $('themeToggleBtn').addEventListener('click', () => {
                const dark = !document.body.classList.contains('dark-mode');
                try { localStorage.setItem('cal_theme', dark ? 'dark' : 'light'); } catch (e) {}
                applyTheme(dark);
            });

            function applyLang(lang) {
                currentLang = lang;
                try { localStorage.setItem('cal_lang', lang); } catch (e) {}
                $('langToggleBtn').textContent = lang === 'zh' ? '🌐 中文' : '🌐 EN';
                $('langToggleBtn').setAttribute('aria-label', lang === 'zh' ? 'Switch to English' : '切换到中文');
                renderWeekRow();
                renderCalendar();
                updateCountdown();
                updateDashboard();
                updateGreeting();
                renderYearPanel();
                renderMonthPanel();
                $('modalTitle').textContent = currentLang === 'zh' ? '📝 记事本' : '📝 Notes';
                btnAddNote.textContent = editingNoteId ? (currentLang === 'zh' ? '保存' : 'Save') : (currentLang === 'zh' ?
                    '添加' : 'Add');
                modalNoteInput.placeholder = currentLang === 'zh' ? '输入记事内容...' : 'Enter note...';
                $('noteSearchInput').placeholder = currentLang === 'zh' ? '搜索所有记事...' : 'Search all notes...';
                $('btnExportNotes').innerHTML = (currentLang === 'zh' ? '📤 导出' : '📤 Export');
                $('btnImportNotes').innerHTML = (currentLang === 'zh' ? '📥 导入' : '📥 Import');
                $('btnShowSearch').innerHTML = (currentLang === 'zh' ? '🔍 搜索' : '🔍 Search');
                $('btnCloseModal').textContent = currentLang === 'zh' ? '关闭' : 'Close';
                $('btnToday').textContent = currentLang === 'zh' ? '🕊 今天' : '🕊 Today';
                $('weatherCityInput').placeholder = currentLang === 'zh' ? '搜索城市，如：北京' : 'Search city, e.g. Beijing';
                $('btnWeatherGo').textContent = currentLang === 'zh' ? '查看' : 'Go';
                $('btnWeatherCancel').textContent = currentLang === 'zh' ? '取消' : 'Cancel';
                const toggleBtn = $('weatherToggleBtn');
                toggleBtn.innerHTML = '📍 ' + (currentLang === 'zh' ? '天气加载中' : 'Loading...');
                $('wishSubtitle').textContent = currentLang === 'zh' ? '向星空许下心愿，愿世界和平' :
                    'Make a wish upon the stars for world peace';
                $('wishInput').placeholder = currentLang === 'zh' ? '写下你的愿望...' : 'Write your wish...';
                $('btnWishSubmit').textContent = currentLang === 'zh' ? '许愿 ✨' : 'Wish ✨';
                const wishEmpty = $('wishEmpty');
                if (wishEmpty) wishEmpty.textContent = currentLang === 'zh' ? '还没有愿望，快来许下第一个吧~' :
                    'No wishes yet, make your first one~';
                updateWorldClockCityNames();
                updateWorldClocks();
                initQuoteCarousel();
                checkFestivalTip();
            }
            $('langToggleBtn').addEventListener('click', () => { applyLang(currentLang === 'zh' ? 'en' : 'zh'); });
            $('viewMonthBtn').addEventListener('click', () => {
                $('viewMonthBtn').classList.add('active');
                $('viewWeekBtn').classList.remove('active');
                renderWeekRow();
                renderCalendar();
            });
            $('viewWeekBtn').addEventListener('click', () => {
                $('viewWeekBtn').classList.add('active');
                $('viewMonthBtn').classList.remove('active');
                const now = new Date();
                const dayOfWeek = now.getDay();
                const monday = new Date(now);
                monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
                dayGrid.innerHTML = '';
                for (let i = 0; i < 7; i++) {
                    const dd = new Date(monday);
                    dd.setDate(monday.getDate() + i);
                    const y = dd.getFullYear(),
                        m = dd.getMonth() + 1,
                        d = dd.getDate();
                    const dateKey = `${m}-${d}`;
                    const fullDateKey = `${y}-${m}-${d}`;
                    const weekDay = dd.getDay();
                    const lunarTxt = getSimpleLunar(y, m, d);
                    const holidayName = (allYearHolidays[y] || {})[dateKey] || '';
                    const isHoliday = !!holidayName;
                    const solarTermName = (solarTermsData[y] || {})[dateKey] || '';
                    const isSolarTerm = !!solarTermName;
                    const isFestival = !!festivalMap[dateKey] && !isSolarTerm;
                    const isPeaceDay = peaceDays.includes(dateKey);
                    const isTodayFlag = (y === todayYear && m === todayMonth && d === todayDay);
                    const isWorkday = !!(allYearWorkdays[y] && allYearWorkdays[y][dateKey]) && !isHoliday;
                    const cell = createDayCell(d, holidayName, lunarTxt, false, isTodayFlag, isHoliday, isFestival,
                        isSolarTerm, solarTermName, isWorkday, isPeaceDay, weekDay, fullDateKey);
                    dayGrid.appendChild(cell);
                }
                bindDayCellEvents();
            });

            $('prevMonth').addEventListener('click', () => { currentShowMonth--; if (currentShowMonth < 1) { currentShowMonth =
                        12;
                    currentShowYear--; } switchMonth(currentShowYear, currentShowMonth, 'right'); });
            $('nextMonth').addEventListener('click', () => { currentShowMonth++; if (currentShowMonth > 12) { currentShowMonth =
                        1;
                    currentShowYear++; } switchMonth(currentShowYear, currentShowMonth, 'left'); });
            btnToday.addEventListener('click', e => {
                e.stopPropagation();
                if (currentShowYear === todayYear && currentShowMonth === todayMonth) { renderCalendar();
                    updateCountdown();
                    updateDashboard(); return; }
                currentShowYear = todayYear;
                currentShowMonth = todayMonth;
                switchMonth(currentShowYear, currentShowMonth, 'none');
                $('viewMonthBtn').click();
                closeAllPanel();
            });
            yearText.addEventListener('click', e => { e.stopPropagation();
                togglePanel(yearPanel, monthPanel, renderYearPanel); });
            monthText.addEventListener('click', e => { e.stopPropagation();
                togglePanel(monthPanel, yearPanel, renderMonthPanel); });
            yearPanel.addEventListener('click', e => e.stopPropagation());
            monthPanel.addEventListener('click', e => e.stopPropagation());
            document.body.addEventListener('click', () => closeAllPanel());
            calendarBox.addEventListener('wheel', e => {
                if (modalOverlay.classList.contains('show') || yearPanel.classList.contains('show') || monthPanel
                    .classList.contains('show')) return;
                e.preventDefault();
                if (e.deltaY > 0) { currentShowMonth++; if (currentShowMonth > 12) { currentShowMonth = 1;
                        currentShowYear++; } switchMonth(currentShowYear, currentShowMonth, 'left'); } else {
                    currentShowMonth--; if (currentShowMonth < 1) { currentShowMonth = 12;
                        currentShowYear--; } switchMonth(currentShowYear, currentShowMonth, 'right'); }
            }, { passive: false });
            let touchStartX = 0;
            calendarBox.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
            calendarBox.addEventListener('touchend', e => {
                const dx = e.changedTouches[0].clientX - touchStartX;
                if (Math.abs(dx) > 60) {
                    if (dx < 0) { currentShowMonth++; if (currentShowMonth > 12) { currentShowMonth = 1;
                            currentShowYear++; } switchMonth(currentShowYear, currentShowMonth, 'left'); } else {
                        currentShowMonth--; if (currentShowMonth < 1) { currentShowMonth = 12;
                            currentShowYear--; } switchMonth(currentShowYear, currentShowMonth, 'right'); }
                }
            });
            document.addEventListener('keydown', e => {
                if (e.key === 'Escape') { closeAllPanel();
                    closeNoteModal();
                    closeWishModal(); return; }
                if (modalOverlay.classList.contains('show')) {
                    if (e.key === 'Enter' && document.activeElement === modalNoteInput) { e.preventDefault();
                        addNoteHandler(); }
                    return;
                }
                if ($('wishModalOverlay').classList.contains('show')) {
                    if (e.key === 'Enter' && document.activeElement === $('wishInput')) { e.preventDefault();
                        submitWish(); }
                    return;
                }
                if (e.key === 'ArrowLeft' && !e.target.closest('input,textarea,select')) { e.preventDefault();
                    currentShowMonth--; if (currentShowMonth < 1) { currentShowMonth = 12;
                        currentShowYear--; } switchMonth(currentShowYear, currentShowMonth, 'right'); }
                if (e.key === 'ArrowRight' && !e.target.closest('input,textarea,select')) { e.preventDefault();
                    currentShowMonth++; if (currentShowMonth > 12) { currentShowMonth = 1;
                        currentShowYear++; } switchMonth(currentShowYear, currentShowMonth, 'left'); }
                if ((e.key === 't' || e.key === 'T') && !e.target.closest('input,textarea,select') && !e.ctrlKey && !e
                    .metaKey) { e.preventDefault();
                    btnToday.click(); }
            });
            modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeNoteModal(); });
            btnCloseModal.addEventListener('click', closeNoteModal);
            btnAddNote.addEventListener('click', addNoteHandler);
            modalDialog.addEventListener('click', e => e.stopPropagation());
            $('btnShowSearch').addEventListener('click', toggleSearchMode);
            $('btnSearchNotes').addEventListener('click', doSearch);
            $('noteSearchInput').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault();
                    doSearch(); } if (e.key === 'Escape') { hideSearchResults(); } });
            $('btnExportNotes').addEventListener('click', exportNotes);
            $('btnImportNotes').addEventListener('click', () => $('importFileInput').click());
            $('importFileInput').addEventListener('change', e => { if (e.target.files[0]) importNotes(e.target.files[
                0]);
                e.target.value = ''; });
            window.addEventListener('resize', () => closeAllPanel());

            // ===== 天气模块 =====
            const weatherCard = $('weatherCard');
            const weatherContent = $('weatherContent');
            const weatherToggleBtn = $('weatherToggleBtn');
            const weatherRefreshBtn = $('weatherRefreshBtn');
            const weatherSearchBar = $('weatherSearchBar');
            const weatherCityInput = $('weatherCityInput');
            const btnWeatherGo = $('btnWeatherGo');
            const btnWeatherCancel = $('btnWeatherCancel');
            const WEATHER_CITY_KEY = 'weather_city';
            const WEATHER_REFRESH_KEY = 'weather_refresh';
            let weatherTimer = null;
            let currentCity = null;

            function weatherEmoji(code, isDay) {
                const c = code || '';
                const m = {
                    'Sunny': isDay ? '☀️' : '🌙',
                    'Clear': isDay ? '☀️' : '🌙',
                    'Partly cloudy': isDay ? '⛅' : '☁️',
                    'Cloudy': '☁️',
                    'Overcast': '☁️',
                    'Mist': '🌫️',
                    'Fog': '🌫️',
                    'Light drizzle': '🌦️',
                    'Drizzle': '🌧️',
                    'Light rain': '🌧️',
                    'Moderate rain': '🌧️',
                    'Heavy rain': '🌧️',
                    'Light snow': '🌨️',
                    'Snow': '❄️',
                    'Heavy snow': '❄️',
                    'Thunderstorm': '⛈️',
                    'Light shower': '🌦️',
                    'Shower': '🌧️',
                    'Light Rain': '🌧️',
                    'Moderate Rain': '🌧️',
                    'Heavy Rain': '🌧️',
                };
                if (m[c]) return m[c];
                if (c.toLowerCase().includes('rain') || c.toLowerCase().includes('drizzle')) return '🌧️';
                if (c.toLowerCase().includes('snow')) return '❄️';
                if (c.toLowerCase().includes('thunder')) return '⛈️';
                if (c.toLowerCase().includes('fog') || c.toLowerCase().includes('mist')) return '🌫️';
                if (c.toLowerCase().includes('cloud')) return '☁️';
                if (c.toLowerCase().includes('sunny') || c.toLowerCase().includes('clear')) return isDay ? '☀️' :
                    '🌙';
                return '🌡️';
            }

            function renderWeatherCard(city, temp, feelsLike, humidity, wind, condition, isDay, forecast) {
                const emoji = weatherEmoji(condition, isDay);
                let html = `
            <div class="weather-main">
            <span class="weather-emoji">${emoji}</span>
            <div class="weather-temp-block">
            <div class="weather-city" title="${city}">${city}</div>
            <div class="weather-temp">${temp}</div>
            </div>
            </div>
            <div class="weather-detail">
            <span>${currentLang==='zh'?'体感':'Feels'} ${feelsLike}</span>
            <span>💧 ${humidity}</span>
            <span>💨 ${wind}</span>
            </div>`;
                if (forecast && forecast.length) {
                    html += `<div class="weather-forecast">`;
                    forecast.forEach(f => {
                        const dayName = currentLang === 'zh' ? ['', '', '', '', '', '', '六', '日', '', '一', '二',
                            '三', '四', '五'
                        ][new Date(f.date + 'T12:00:00').getDay()] || f.date.slice(-2) + '日' : ['', '', '',
                            '', '', '', 'Sat', 'Sun', '', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'
                        ][new Date(f.date + 'T12:00:00').getDay()] || f.date.slice(-2);
                        html +=
                            `<div class="weather-forecast-item"><span class="f-day">${dayName}</span><span class="f-emoji">${weatherEmoji(f.desc, true)}</span><span>${f.max}°</span></div>`;
                    });
                    html += `</div>`;
                }
                weatherContent.innerHTML = html;
                const btnText = `${emoji} ${temp}`;
                weatherToggleBtn.innerHTML = '📍 ' + btnText;
                weatherToggleBtn.setAttribute('aria-label', `${city} ${temp} ${condition}`);
            }

            function showWeatherLoading() {
                weatherContent.innerHTML =
                    `<div class="weather-loading"><div class="spinner"></div><span>${currentLang==='zh'?'正在获取天气...':'Loading weather...'}</span></div>`;
                weatherToggleBtn.innerHTML = '📍 ' + (currentLang === 'zh' ? '加载中' : 'Loading...');
            }

            function showWeatherError(msg) {
                weatherContent.innerHTML =
                `<div class="weather-error"><span>⚠️</span><span>${msg}</span></div>`;
                weatherToggleBtn.innerHTML = '📍 ' + (currentLang === 'zh' ? '获取失败' : 'Error');
            }
            const cityNameCN = {
                'beijing': '北京',
                'shanghai': '上海',
                'guangzhou': '广州',
                'shenzhen': '深圳',
                'hangzhou': '杭州',
                'chengdu': '成都',
                'xian': '西安',
                "xi'an": '西安',
                'nanjing': '南京',
                'wuhan': '武汉',
                'tianjin': '天津',
                'chongqing': '重庆',
                'suzhou': '苏州',
                'qingdao': '青岛',
                'dalian': '大连',
                'shenyang': '沈阳',
                'jinan': '济南',
                'changsha': '长沙',
                'zhengzhou': '郑州',
                'kunming': '昆明',
                'fuzhou': '福州',
                'xiamen': '厦门',
                'ningbo': '宁波',
                'haerbin': '哈尔滨',
                'harbin': '哈尔滨',
                'shijiazhuang': '石家庄',
                'hefei': '合肥',
                'nanchang': '南昌',
                'nanning': '南宁',
                'guiyang': '贵阳',
                'lanzhou': '兰州',
                'xining': '西宁',
                'yinchuan': '银川',
                'wulumuqi': '乌鲁木齐',
                'taiyuan': '太原',
                'haikou': '海口',
                'sanya': '三亚',
                'hong kong': '香港',
                'macau': '澳门',
                'taipei': '台北',
                'tokyo': '东京',
                'osaka': '大阪',
                'kyoto': '京都',
                'seoul': '首尔',
                'busan': '釜山',
                'singapore': '新加坡',
                'bangkok': '曼谷',
                'london': '伦敦',
                'paris': '巴黎',
                'berlin': '柏林',
                'madrid': '马德里',
                'rome': '罗马',
                'moscow': '莫斯科',
                'new york': '纽约',
                'los angeles': '洛杉矶',
                'san francisco': '旧金山',
                'chicago': '芝加哥',
                'sydney': '悉尼',
                'melbourne': '墨尔本',
                'toronto': '多伦多',
                'vancouver': '温哥华',
                'dubai': '迪拜',
            };

            function translateToCN(name) {
                if (!name || currentLang !== 'zh') return name;
                const lower = name.toLowerCase().trim();
                if (cityNameCN[lower]) return cityNameCN[lower];
                const normalized = lower.replace(/[\s-]/g, '');
                for (const key of Object.keys(cityNameCN)) {
                    if (key.replace(/[\s-]/g, '') === normalized) return cityNameCN[key];
                }
                return name;
            }

            async function fetchWeather(city) {
                showWeatherLoading();
                try {
                    const encodedCity = encodeURIComponent(city || '');
                    const url = city ? `https://wttr.in/${encodedCity}?format=j1&lang=zh` :
                        `https://wttr.in/?format=j1&lang=zh`;
                    const ctrl = new AbortController();
                    const timer = setTimeout(function() { ctrl.abort(); }, 5000);
                    const resp = await fetch(url, { signal: ctrl.signal });
                    clearTimeout(timer);
                    if (!resp.ok) throw new Error('network');
                    const data = await resp.json();
                    const current = data.current_condition && data.current_condition[0];
                    if (!current) throw new Error('no data');
                    const temp = current.temp_C + '°C';
                    const feelsLike = current.FeelsLikeC + '°C';
                    const humidity = current.humidity + '%';
                    const wind = current.windspeedKmph + ' km/h';
                    const condition = current.weatherDesc && current.weatherDesc[0] && current.weatherDesc[0].value || '';
                    const obsTime = current.observation_time ? parseInt(current.observation_time) : 12;
                    const isDay = obsTime >= 6 && obsTime < 20;
                    let cityName;
                    if (city) { cityName = city; } else {
                        const nearestArea = data.nearest_area && data.nearest_area[0];
                        const rawName = (nearestArea && nearestArea.areaName && nearestArea.areaName[0] && nearestArea
                            .areaName[0].value) || '';
                        cityName = translateToCN(rawName) || (currentLang === 'zh' ? '当前位置' : 'Current location');
                    }
                    const forecast = [];
                    if (data.weather && data.weather.length >= 3) {
                        for (let fi = 1; fi <= 2; fi++) {
                            const w = data.weather[fi];
                            if (w) {
                                const desc = w.hourly && w.hourly[4] && w.hourly[4].weatherDesc && w.hourly[4].weatherDesc[
                                    0] && w.hourly[4].weatherDesc[0].value || '';
                                const maxC = w.maxtempC || '';
                                forecast.push({ date: w.date, max: maxC, desc });
                            }
                        }
                    }
                    renderWeatherCard(cityName, temp, feelsLike, humidity, wind, condition, isDay, forecast);
                    weatherCard.classList.add('show');
                } catch (err) {
                    console.warn('Weather fetch failed:', err);
                    showWeatherError(currentLang === 'zh' ? '获取失败，点击重试' : 'Failed, tap to retry');
                    weatherCard.classList.add('show');
                }
            }

            function toggleWeatherCard() { if (weatherSearchBar.classList.contains('show')) { weatherSearchBar.classList
                    .remove('show'); return; } weatherCard.classList.toggle('show'); }

            function showWeatherSearch() { weatherSearchBar.classList.add('show');
                weatherCityInput.value = '';
                setTimeout(() => weatherCityInput.focus(), 50); }

            function hideWeatherSearch() { weatherSearchBar.classList.remove('show');
                weatherCityInput.value = ''; }

            function submitWeatherCity() {
                let city = weatherCityInput.value.trim();
                if (!city) return;
                try { localStorage.setItem(WEATHER_CITY_KEY, city); } catch (e) {}
                currentCity = city;
                fetchWeather(city);
                hideWeatherSearch();
            }
            weatherToggleBtn.addEventListener('click', e => { e.stopPropagation();
                toggleWeatherCard(); });
            weatherRefreshBtn.addEventListener('click', e => { e.stopPropagation();
                fetchWeather(currentCity); });
            btnWeatherGo.addEventListener('click', e => { e.stopPropagation();
                submitWeatherCity(); });
            btnWeatherCancel.addEventListener('click', e => { e.stopPropagation();
                hideWeatherSearch(); });
            weatherCityInput.addEventListener('keydown', e => {
                if (e.key === 'Enter') { e.preventDefault();
                    submitWeatherCity(); }
                if (e.key === 'Escape') { e.stopPropagation();
                    hideWeatherSearch(); }
            });
            let pressTimer = null;
            weatherToggleBtn.addEventListener('touchstart', () => { pressTimer = setTimeout(() => { showWeatherSearch(); },
                    600); });
            weatherToggleBtn.addEventListener('touchend', () => clearTimeout(pressTimer));
            weatherToggleBtn.addEventListener('mousedown', () => { pressTimer = setTimeout(() => { showWeatherSearch(); },
                    600); });
            weatherToggleBtn.addEventListener('mouseup', () => clearTimeout(pressTimer));

            function initWeather() {
                let savedCity = null,
                    refreshInterval = 30;
                try {
                    savedCity = localStorage.getItem(WEATHER_CITY_KEY);
                    refreshInterval = parseInt(localStorage.getItem(WEATHER_REFRESH_KEY) || '30');
                } catch (e) {}
                currentCity = savedCity || null;
                fetchWeather(currentCity);
                if (weatherTimer) clearInterval(weatherTimer);
                const ms = Math.max(5, Math.min(refreshInterval, 120)) * 60 * 1000;
                weatherTimer = setInterval(() => fetchWeather(currentCity), ms);
            }

            // ===== 彩蛋系统 =====
            let easterOpen = false;
            let easterTriggered = false;
            let starAnimId = null;

            function initStarfield() {
                const canvas = document.createElement('canvas');
                canvas.id = 'starCanvas';
                document.body.appendChild(canvas);
                const ctx = canvas.getContext('2d');
                let W, H, stars = [];

                function resize() {
                    W = canvas.width = window.innerWidth;
                    H = canvas.height = window.innerHeight;
                    stars = Array.from({ length: 80 }, () => ({
                        x: Math.random() * W,
                        y: Math.random() * H,
                        r: Math.random() * 1.4 + 0.2,
                        alpha: Math.random() * 0.6 + 0.3,
                        speed: Math.random() * 0.003 + 0.001,
                        phase: Math.random() * Math.PI * 2,
                    }));
                }
                resize();
                window.addEventListener('resize', resize);
                let t = 0;

                function draw() {
                    ctx.clearRect(0, 0, W, H);
                    stars.forEach(s => {
                        s.phase += s.speed;
                        const a = s.alpha * (0.5 + 0.5 * Math.sin(s.phase));
                        ctx.beginPath();
                        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                        ctx.fillStyle = `rgba(200,210,255,${a})`;
                        ctx.fill();
                        if (s.r > 1.0) {
                            ctx.beginPath();
                            ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2);
                            ctx.fillStyle = `rgba(180,200,255,${a * 0.15})`;
                            ctx.fill();
                        }
                    });
                    t++;
                    if (t % 220 === 0) spawnShootingStar();
                    starAnimId = requestAnimationFrame(draw);
                }
                setTimeout(() => { canvas.classList.add('show');
                    draw(); }, 800);
            }

            function spawnParticles(cx, cy, count = 16, emojis) {
                if (!emojis) emojis = ['🕊️', '☮️', '✌️', '🌍', '⭐', '💫', '✨', '🕊', '🌟', '💛'];
                for (let i = 0; i < count; i++) {
                    const el = document.createElement('div');
                    el.className = 'egg-particle';
                    el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
                    const angle = (Math.random() * 360) * Math.PI / 180;
                    const dist = 80 + Math.random() * 160;
                    const tx = Math.cos(angle) * dist;
                    const ty = Math.sin(angle) * dist - 40;
                    const rot = (Math.random() - 0.5) * 720;
                    el.style.cssText =
                        `left:${cx}px;top:${cy}px;--tx:${tx}px;--ty:${ty}px;--rot:${rot}deg;font-size:${12 + Math.random() * 14}px;`;
                    document.body.appendChild(el);
                    setTimeout(() => el.remove(), 1250);
                }
            }

            function spawnShootingStar() {
                const el = document.createElement('div');
                el.className = 'shooting-star';
                const startX = Math.random() * (window.innerWidth * 0.7);
                const startY = Math.random() * (window.innerHeight * 0.4);
                el.style.cssText = `left:${startX}px;top:${startY}px;transform:rotate(35deg);`;
                document.body.appendChild(el);
                setTimeout(() => el.remove(), 1000);
            }

            function checkHolidayConfetti() {
                const todayKey = `${todayYear}-${todayMonth}-${todayDay}`;
                const isHoliday = !!(allYearHolidays[todayYear] && allYearHolidays[todayYear][
                    `${todayMonth}-${todayDay}`
                ]);
                if (!isHoliday) return;
                if (sessionStorage.getItem('holiday_confetti_' + todayKey)) return;
                sessionStorage.setItem('holiday_confetti_' + todayKey, '1');
                const emojis = ['🎊', '🎉', '✨', '⭐', '🧧', '🏮', '🌟', '💫'];
                const countDownBar = $('countdownBar');
                const rect = countDownBar ? countDownBar.getBoundingClientRect() : null;
                const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
                const cy = rect ? rect.top + rect.height / 2 : 100;
                setTimeout(() => spawnParticles(cx, cy, 35, emojis), 1200);
            }

            (function() {
                let clickCount = 0,
                    clickTimer = null;
                document.querySelectorAll('.peace-text').forEach(el => {
                    el.style.cursor = 'pointer';
                    el.addEventListener('click', e => {
                        clickCount++;
                        clearTimeout(clickTimer);
                        clickTimer = setTimeout(() => clickCount = 0, 500);
                        if (clickCount >= 3) {
                            clickCount = 0;
                            const rect = el.getBoundingClientRect();
                            spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, 40);
                            showEaster();
                        }
                    });
                });
            })();

            (function() {
                let lastShoot = 0;
                $('timeText').style.cursor = 'pointer';
                $('timeText').addEventListener('click', () => {
                    const now = Date.now();
                    if (now - lastShoot < 800) return;
                    lastShoot = now;
                    for (let i = 0; i < 3; i++) { setTimeout(() => spawnShootingStar(), i * 300); }
                });
            })();

            (function() {
                $('countdownBar').style.cursor = 'pointer';
                $('countdownBar').addEventListener('click', e => {
                    const rect = $('countdownBar').getBoundingClientRect();
                    const emojis = ['📅', '🎉', '🎊', '✨', '⭐', '💫'];
                    spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, 22, emojis);
                });
            })();

            (function() {
                const dashCard = document.querySelector('.dashboard-card');
                if (dashCard) {
                    dashCard.style.cursor = 'pointer';
                    dashCard.addEventListener('click', () => {
                        const rect = dashCard.getBoundingClientRect();
                        const emojis = ['🌿', '🌱', '🌸', '☀️', '🍃', '✨'];
                        spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, 18, emojis);
                    });
                }
            })();

            window.addEventListener('load', function() { setTimeout(initStarfield, 3000); });  // defer starfield
            setTimeout(checkHolidayConfetti, 2500);

            function showEaster() {
                if (easterOpen) return;
                easterOpen = true;
                const overlay = $('peaceEasterOverlay');
                if (!overlay) return;
                const hearts = $('peaceEasterHearts');
                hearts.innerHTML = '';
                const heartEmojis = ['💛', '🤍', '💜', '🧡', '💙', '🕊', '✨', '🌟', '💫', '⭐'];
                for (let i = 0; i < 30; i++) {
                    const h = document.createElement('span');
                    h.textContent = heartEmojis[Math.floor(Math.random() * heartEmojis.length)];
                    h.style.left = Math.random() * 100 + '%';
                    h.style.animationDelay = (Math.random() * 8) + 's';
                    h.style.animationDuration = (6 + Math.random() * 6) + 's';
                    h.style.fontSize = (16 + Math.random() * 18) + 'px';
                    hearts.appendChild(h);
                }
                overlay.classList.add('show');
                const content = $('peaceEasterContent');
                content.style.animation = 'none';
                void content.offsetWidth;
                content.style.animation = '';
            }

            function hideEaster() {
                if (!easterOpen) return;
                easterOpen = false;
                $('peaceEasterOverlay').classList.remove('show');
            }
            const konamiSeq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft',
                'ArrowRight', 'b', 'a'
            ];
            let konamiPos = 0;
            document.addEventListener('keydown', e => {
                if (e.key === konamiSeq[konamiPos]) {
                    konamiPos++;
                    if (konamiPos === konamiSeq.length) { konamiPos = 0;
                        showEaster();
                        easterTriggered = true; }
                } else { konamiPos = (e.key === konamiSeq[0]) ? 1 : 0; }
                if (e.key === 'Escape' && easterOpen) hideEaster();
            });
            let titleClickTimer = null;
            let titleClickCount = 0;
            const peaceTitle = document.querySelector('.peace-text');
            if (peaceTitle) {
                peaceTitle.style.cursor = 'pointer';
                peaceTitle.addEventListener('click', e => {
                    if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName))
                        return;
                    if (modalOverlay.classList.contains('show')) return;
                    if ($('wishModalOverlay').classList.contains('show')) return;
                    titleClickCount++;
                    clearTimeout(titleClickTimer);
                    titleClickTimer = setTimeout(() => { titleClickCount = 0; }, 1200);
                    if (titleClickCount >= 3) { titleClickCount = 0;
                        showEaster();
                        easterTriggered = true; }
                });
            }

            function bindDoveClick() {
                document.querySelectorAll('.dove').forEach(d => {
                    d.addEventListener('click', e => { e.stopPropagation();
                        showEaster();
                        easterTriggered = true; });
                });
            }
            setInterval(bindDoveClick, 3000);

            function checkPeaceDay() {
                const now = new Date();
                if (now.getMonth() === 8 && now.getDate() === 21) {
                    if (!sessionStorage.getItem('peace_day_2026_shown')) {
                        sessionStorage.setItem('peace_day_2026_shown', '1');
                        setTimeout(() => { showEaster();
                            easterTriggered = true; }, 2500);
                    }
                }
            }

            function showEasterHint() {
                if (easterTriggered) return;
                if (sessionStorage.getItem('easter_hint_shown')) return;
                sessionStorage.setItem('easter_hint_shown', '1');
                setTimeout(() => {
                    if (easterTriggered) return;
                    const hint = document.createElement('div');
                    hint.style.cssText =
                        'position:fixed;top:30%;right:18px;z-index:100;font-size:11px;color:rgba(36,120,224,0.4);animation:hintPulse 2s ease-in-out infinite 3;pointer-events:none;letter-spacing:1px;text-align:right;line-height:1.6;';
                    hint.innerHTML = '🕊 彩蛋提示<br>三连击"和平"<br>或 Konami Code';
                    document.body.appendChild(hint);
                    setTimeout(() => hint.remove(), 8000);
                }, 2000);
            }
            const _easterOverlay = $('peaceEasterOverlay');
            if (_easterOverlay) {
                _easterOverlay.addEventListener('click', e => {
                    if (e.target === _easterOverlay) hideEaster();
                    else if (e.target.closest('.peace-easter-content') === null) hideEaster();
                });
            }

            // ===== 新增：许愿星事件绑定 =====
            $('wishStarFab').addEventListener('click', e => {
                e.stopPropagation();
                openWishModal();
            });
            $('wishModalOverlay').addEventListener('click', e => {
                if (e.target === $('wishModalOverlay')) closeWishModal();
            });
            $('wishModalCard').addEventListener('click', e => e.stopPropagation());
            $('wishCloseBtn').addEventListener('click', closeWishModal);
            $('btnWishSubmit').addEventListener('click', submitWish);
            $('wishInput').addEventListener('keydown', e => {
                if (e.key === 'Enter') { e.preventDefault();
                    submitWish(); }
                if (e.key === 'Escape') { e.stopPropagation();
                    closeWishModal(); }
            });

            // ===== 初始化 =====
            function init() {
                try {
                    const savedTheme = localStorage.getItem('cal_theme');
                    applyTheme(savedTheme === 'dark');
                } catch (e) {}
                try {
                    const savedLang = localStorage.getItem('cal_lang');
                    if (savedLang) { currentLang = savedLang;
                        applyLang(savedLang); }
                } catch (e) {}
                renderWeekRow();
                renderCalendar();
                updateCountdown();
                updateDashboard();
                updateGreeting();
                spawnDoves();
                bindDoveClick();
                setTimeout(initWeather, 2000);  // defer weather
                initQuoteCarousel();
                updateWorldClocks();
                updateWorldClockCityNames();
                setInterval(updateTime, 1000);
                /* countdown handled in updateTime */
                // world clocks update via updateTime
                checkFestivalTip();
                checkPeaceDay();
                setTimeout(checkPeaceDayEnhanced, 3000);
                setTimeout(showEasterHint, 4000);
                console.log('🕊 世界和平！日历 v2.0+ 已就绪 | Ctrl+D 收藏~');
                console.log('💡 快捷键: ←→切换月份 | T回到今天 | ESC关闭弹窗 | 月份年份点击可跳转 | 长按天气按钮搜索城市');
                console.log('🐰 彩蛋: 三连击标题 / Konami Code (↑↑↓↓←→←→BA) / 点击飞鸽 / 9月21日');
                console.log('⭐ 新彩蛋: 许愿星(右下角) / 和平语录轮播 / 世界时钟 / 和平日金色粒子雨');
            }

            // ================================================================