// ===== 增强版功能 v3.0 =====
            // ================================================================

            // ===== 增强版：主题色系统 =====
            const THEME_KEY = 'cal_theme_color';
            function applyThemeColor(color) {
                document.documentElement.setAttribute('data-theme', color || 'ocean');
                try { localStorage.setItem(THEME_KEY, color || 'ocean'); } catch(e) {}
                document.querySelectorAll('.color-dot').forEach(function(d) {
                    d.classList.toggle('active', d.getAttribute('data-color') === (color || 'ocean'));
                });
            }
            $('themeColorBtn').addEventListener('click', function(e) {
                e.stopPropagation();
                $('themeColorPicker').classList.toggle('show');
            });
            $('themeColorPicker').addEventListener('click', function(e) {
                e.stopPropagation();
                var dot = e.target.closest('.color-dot');
                if (dot) applyThemeColor(dot.getAttribute('data-color'));
            });

            // ===== 增强版：纪念日系统 =====
            var ANNIV_KEY = 'cal_anniversaries';
            function loadAnniversaries() {
                try { var r = localStorage.getItem(ANNIV_KEY); return r ? JSON.parse(r) : []; } catch(e) { return []; }
            }
            function saveAnniversaries(list) {
                try { localStorage.setItem(ANNIV_KEY, JSON.stringify(list)); } catch(e) {}
            }
            function addAnniversary(dateKey, text, repeatYearly) {
                var list = loadAnniversaries();
                list.push({ dateKey: dateKey, text: text.trim(), repeatYearly: !!repeatYearly, createdAt: new Date().toISOString() });
                saveAnniversaries(list);
            }
            function isAnniversaryDate(dateKey) {
                var parts = dateKey.split('-');
                var mdKey = parts[1] + '-' + parts[2];
                return loadAnniversaries().some(function(a) {
                    if (a.repeatYearly) {
                        var ap = a.dateKey.split('-');
                        return ap[1] + '-' + ap[2] === mdKey;
                    }
                    return a.dateKey === dateKey;
                });
            }
            function getAnniversariesForDate(dateKey) {
                var parts = dateKey.split('-');
                var mdKey = parts[1] + '-' + parts[2];
                return loadAnniversaries().filter(function(a) {
                    if (a.repeatYearly) {
                        var ap = a.dateKey.split('-');
                        return ap[1] + '-' + ap[2] === mdKey;
                    }
                    return a.dateKey === dateKey;
                });
            }
            function getNextAnniversaryDays() {
                var annivs = loadAnniversaries();
                if (!annivs.length) return null;
                var now = new Date();
                var nowTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                var minDays = Infinity;
                annivs.forEach(function(a) {
                    var ap = a.dateKey.split('-').map(Number);
                    var nextDate = new Date(now.getFullYear(), ap[1] - 1, ap[2]);
                    if (nextDate.getTime() < nowTime) nextDate.setFullYear(nextDate.getFullYear() + 1);
                    var diff = Math.ceil((nextDate.getTime() - nowTime) / 86400000);
                    if (diff < minDays) minDays = diff;
                });
                return minDays === Infinity ? null : minDays;
            }

            // Enhance openNoteModal to show anniversary checkboxes
            var _origOpenNoteModal2 = openNoteModal;
            openNoteModal = function(dateKey) {
                _origOpenNoteModal2(dateKey);
                var annivs = getAnniversariesForDate(dateKey);
                $('anniversaryCheck').checked = annivs.length > 0;
                $('repeatYearlyCheck').checked = annivs.length > 0 && annivs[0].repeatYearly;
            };

            // Enhance addNoteHandler to save anniversary
            var _origAddNoteHandler2 = addNoteHandler;
            addNoteHandler = function() {
                var isAnniv = $('anniversaryCheck').checked;
                var isRepeat = $('repeatYearlyCheck').checked;
                var noteText = modalNoteInput.value.trim();
                _origAddNoteHandler2();
                if (isAnniv && currentModalDateKey && noteText) {
                    var existing = loadAnniversaries();
                    var already = existing.some(function(a) { return a.dateKey === currentModalDateKey; });
                    if (!already) {
                        addAnniversary(currentModalDateKey, noteText, isRepeat);
                    }
                }
            };

            // Enhance renderCalendar to mark anniversaries
            var _origRenderCalendar2 = renderCalendar;
            renderCalendar = function() {
                _origRenderCalendar2();
                dayGrid.querySelectorAll('.day-cell:not(.other-month)').forEach(function(cell) {
                    var dk = cell.getAttribute('data-date-key');
                    if (dk && isAnniversaryDate(dk)) {
                        cell.classList.add('anniversary');
                    }
                });
            };

            // ===== 增强版：晚安模式 =====
            var goodnightActive = false;
            var goodnightTimer = null;
            function showGoodnight() {
                if (goodnightActive) return;
                goodnightActive = true;
                $('goodnightOverlay').classList.add('show');
                var canvas = $('goodnightCanvas');
                var ctx = canvas.getContext('2d');
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                var stars = [];
                for (var i = 0; i < 200; i++) {
                    stars.push({
                        x: Math.random() * canvas.width,
                        y: Math.random() * canvas.height,
                        r: Math.random() * 1.5 + 0.3,
                        alpha: Math.random() * 0.7 + 0.3,
                        speed: Math.random() * 0.004 + 0.001,
                        phase: Math.random() * Math.PI * 2
                    });
                }
                var frame = 0;
                function drawStars() {
                    if (!goodnightActive) return;
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    stars.forEach(function(s) {
                        s.phase += s.speed;
                        var a = s.alpha * (0.5 + 0.5 * Math.sin(s.phase));
                        ctx.beginPath();
                        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                        ctx.fillStyle = 'rgba(200,210,255,' + a + ')';
                        ctx.fill();
                    });
                    frame++;
                    if (frame % 180 === 0) {
                        var sx = Math.random() * canvas.width * 0.7;
                        var sy = Math.random() * canvas.height * 0.4;
                        ctx.beginPath();
                        ctx.moveTo(sx, sy);
                        ctx.lineTo(sx + 80, sy + 50);
                        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
                        ctx.lineWidth = 1.5;
                        ctx.stroke();
                    }
                    requestAnimationFrame(drawStars);
                }
                drawStars();
                goodnightTimer = setTimeout(hideGoodnight, 10000);
            }
            function hideGoodnight() {
                goodnightActive = false;
                clearTimeout(goodnightTimer);
                $('goodnightOverlay').classList.remove('show');
            }
            $('goodnightBtn').addEventListener('click', function(e) { e.stopPropagation(); showGoodnight(); });
            $('goodnightOverlay').addEventListener('click', hideGoodnight);

            // ===== 增强版：统计面板 =====
            function showStats() {
                var all = loadAllNotes();
                var wishes = loadWishes();
                var annivs = loadAnniversaries();
                var totalNotes = 0;
                var monthCounts = {};
                for (var k in all) {
                    var parts = k.split('-');
                    if (parts.length >= 2 && parseInt(parts[0]) === todayYear) {
                        totalNotes += all[k].length;
                        var mo = parts[1];
                        monthCounts[mo] = (monthCounts[mo] || 0) + all[k].length;
                    }
                }
                var activeMonth = '---';
                var maxCount = 0;
                for (var mo in monthCounts) {
                    if (monthCounts[mo] > maxCount) { maxCount = monthCounts[mo]; activeMonth = mo + (currentLang === 'zh' ? '月' : ''); }
                }
                $('statTotalNotes').textContent = totalNotes;
                $('statActiveMonth').textContent = activeMonth;
                $('statAnniversaries').textContent = annivs.length;
                $('statWishes').textContent = wishes.length;
                $('statsOverlay').classList.add('show');
            }
            $('statsBtn').addEventListener('click', function(e) { e.stopPropagation(); showStats(); });
            $('statsOverlay').addEventListener('click', function(e) { if (e.target === $('statsOverlay')) $('statsOverlay').classList.remove('show'); });
            $('statsCard').addEventListener('click', function(e) { e.stopPropagation(); });
            $('statsCloseBtn').addEventListener('click', function() { $('statsOverlay').classList.remove('show'); });

            // ===== 增强版：和平语录打字机效果 =====
            var typewriterRunning = false;
            function typewriterQuote(text) {
                var quoteEl = $('quoteText');
                if (!quoteEl || typewriterRunning) return;
                typewriterRunning = true;
                quoteEl.classList.remove('fade-out');
                quoteEl.textContent = '';
                var cursor = document.createElement('span');
                cursor.className = 'typewriter-cursor';
                var i = 0;
                function typeNext() {
                    if (i >= text.length || !typewriterRunning) {
                        setTimeout(function() { cursor.remove(); typewriterRunning = false; }, 2000);
                        return;
                    }
                    quoteEl.textContent = text.slice(0, i + 1);
                    quoteEl.appendChild(cursor);
                    i++;
                    setTimeout(typeNext, 80);
                }
                typeNext();
            }
            // Override rotateQuote
            var _origRotateQuote2 = rotateQuote;
            rotateQuote = function() {
                var quotes = getQuotes();
                quoteIndex = (quoteIndex + 1) % quotes.length;
                typewriterQuote(quotes[quoteIndex]);
            };

            // ===== 增强版：许愿删除功能 =====
            var _origRenderWishHistory2 = renderWishHistory;
            renderWishHistory = function() {
                var wishes = loadWishes();
                var historyEl = $('wishHistory');
                var emptyEl = $('wishEmpty');
                if (!historyEl) return;
                historyEl.innerHTML = '';
                if (wishes.length === 0) {
                    if (emptyEl) emptyEl.style.display = '';
                    return;
                }
                if (emptyEl) emptyEl.style.display = 'none';
                wishes.slice(0, 8).forEach(function(w) {
                    var div = document.createElement('div');
                    div.className = 'wish-history-item';
                    div.style.paddingRight = '28px';
                    div.innerHTML = '<span class="wh-star">\u2b50</span><span>' + escapeHtml(w.text) + '</span>';
                    var delBtn = document.createElement('button');
                    delBtn.className = 'wish-del-btn';
                    delBtn.textContent = '\u2715';
                    delBtn.title = currentLang === 'zh' ? '删除' : 'Delete';
                    delBtn.addEventListener('click', function() {
                        var ws = loadWishes().filter(function(x) { return x.id !== w.id; });
                        saveWishes(ws);
                        renderWishHistory();
                    });
                    div.appendChild(delBtn);
                    historyEl.appendChild(div);
                });
            };

            // ===== 增强版：提醒检查 =====
            function checkReminders() {
                var todayKey = todayYear + '-' + todayMonth + '-' + todayDay;
                var notes = getNotesForDate(todayKey);
                var reminders = notes.filter(function(n) { return n.text.indexOf('\u23f0') >= 0; });
                if (!reminders.length) return;
                if (sessionStorage.getItem('reminder_shown_' + todayKey)) return;
                sessionStorage.setItem('reminder_shown_' + todayKey, '1');
                var container = $('reminderContainer');
                var badge = document.createElement('div');
                badge.className = 'reminder-badge';
                var listHtml = reminders.map(function(r) { return escapeHtml(r.text); }).join('<br>');
                badge.innerHTML = '<h4>\u23f0 ' + (currentLang === 'zh' ? '今日提醒' : 'Today Reminder') + '</h4><p>' + listHtml + '</p><button id="dismissReminder">' + (currentLang === 'zh' ? '知道了' : 'OK') + '</button>';
                container.appendChild(badge);
                badge.querySelector('#dismissReminder').addEventListener('click', function() { badge.remove(); });
            }

            // ===== 增强版：事件委托替代 setInterval(bindDoveClick) =====
            var doveContainerEl = $('doveContainer');
            if (doveContainerEl) {
                doveContainerEl.addEventListener('click', function(e) {
                    var dove = e.target.closest('.dove');
                    if (dove) {
                        showEaster();
                        easterTriggered = true;
                    }
                });
            }

            // ===== 增强版：仪表盘纪念日卡片 =====
            function updateDashboardEnhanced() {
                var days = getNextAnniversaryDays();
                var cards = document.querySelectorAll('.dashboard-card');
                cards.forEach(function(card) {
                    if (card.getAttribute('title') && card.getAttribute('title').indexOf('\u7eaa\u5ff5\u65e5') >= 0) {
                        card.querySelector('.dash-value').textContent = days !== null ? days : '---';
                    }
                });
            }

            // ===== 增强版：主题色初始化 =====
            try {
                var savedColor = localStorage.getItem(THEME_KEY);
                if (savedColor) applyThemeColor(savedColor);
                else applyThemeColor('ocean');
            } catch(e) { applyThemeColor('ocean'); }

            // ===== 增强版：提醒检查 =====
            checkReminders();

            // ===== 增强版：统计面板更新 =====
            updateDashboardEnhanced();

            // ===== 增强版：晚安按钮时段显示 =====
            var _hour = new Date().getHours();
            if (_hour >= 22 || _hour < 6) {
                $('goodnightBtn').style.display = '';
            } else {
                $('goodnightBtn').style.display = 'none';
            }

            // ESC 也关闭新增弹窗
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    hideGoodnight();
                    $('statsOverlay').classList.remove('show');
                    $('themeColorPicker').classList.remove('show');
                }
            });

            // Close theme picker on body click
            document.body.addEventListener('click', function() {
                $('themeColorPicker').classList.remove('show');
            }, true);

            console.log('\ud83c\udfaf \u589e\u5f3a\u7248\u529f\u80fd\u5df2\u52a0\u8f7d: \u7eaa\u5ff5\u65e5\u7cfb\u7edf / \u665a\u5b89\u6a21\u5f0f / \u4e3b\u9898\u8272\u5207\u6362 / \u5e74\u5ea6\u7edf\u8ba1 / \u8bb0\u4e8b\u63d0\u9192 / \u6253\u5b57\u673a\u8bed\u5f55 / \u8bb8\u613f\u5220\u9664');

            init();