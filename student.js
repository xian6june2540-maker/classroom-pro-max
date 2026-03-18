    // =====================================
    // ตัวแปรและฟังก์ชันจัดการสถานะ
    // =====================================
    window.isPetHiddenByUser = false;
    window.isFeeding = false; 
    window.isSavingProfile = false;
    window.isEquipping = false;
    window.feedTimer = null;
    window.lastExp = null; // ตัวแปรใหม่สำหรับจับตาดู EXP เด้งแบบเรียลไทม์

    function showAppModal(id) {
        var el = document.getElementById(id);
        if (el) bootstrap.Modal.getOrCreateInstance(el).show();
    }

    function hideAppModal(id) {
        var el = document.getElementById(id);
        if (el) {
            var inst = bootstrap.Modal.getInstance(el);
            if(inst) inst.hide();
        }
        setTimeout(function() {
            document.querySelectorAll('.modal-backdrop').forEach(function(b) { b.remove(); });
            document.body.classList.remove('modal-open');
            document.body.style.overflow = 'auto';
            document.documentElement.style.overflow = 'auto';
        }, 300);
    }

    // 🌟 ฟังก์ชันจัดการปุ่ม โชว์/ซ่อน สัตว์เลี้ยง
    window.togglePetVisibility = function() {
        window.isPetHiddenByUser = !window.isPetHiddenByUser;
        var el = document.getElementById('draggable-avatar');
        var btn = document.getElementById('btnTogglePet');
        
        if (window.isPetHiddenByUser) {
            if (el) el.classList.add('hidden');
            if (btn) btn.innerHTML = '<i class="bi bi-eye"></i> แสดงสัตว์เลี้ยง';
        } else {
            if (el) el.classList.remove('hidden');
            if (btn) btn.innerHTML = '<i class="bi bi-eye-slash"></i> ซ่อนสัตว์เลี้ยง';
        }
    };

    // ปรับให้ปุ่มในเมนูสัตว์เลี้ยงเรียกใช้ระบบ Toggle แบบใหม่
    window.hidePet = function() {
        if (!window.isPetHiddenByUser) {
            window.togglePetVisibility();
        }
    };

    // =====================================
    // ตัวเลือกโปรไฟล์
    // =====================================
    function populateProfileDropdowns() {
        try {
            let dHtml = '<option value="">วัน</option>';
            for(let i=1; i<=31; i++) dHtml += '<option value="' + String(i).padStart(2, '0') + '">' + i + '</option>';
            if(document.getElementById('profDobDay')) document.getElementById('profDobDay').innerHTML = dHtml;

            let mHtml = '<option value="">เดือน</option>';
            const thMonths = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
            thMonths.forEach(function(m, i) { mHtml += '<option value="' + String(i+1).padStart(2, '0') + '">' + m + '</option>'; });
            if(document.getElementById('profDobMonth')) document.getElementById('profDobMonth').innerHTML = mHtml;

            let yHtml = '<option value="">ปี</option>';
            let currYear = new Date().getFullYear();
            for(let i = currYear; i >= currYear - 30; i--) yHtml += '<option value="' + i + '">' + (i + 543) + '</option>';
            if(document.getElementById('profDobYear')) document.getElementById('profDobYear').innerHTML = yHtml;

            const sports = ['⚽ ฟุตบอล', '🏐 วอลเลย์บอล', '🏀 บาสเกตบอล', '🏸 แบดมินตัน', '🏊 ว่ายน้ำ', '🏓 ปิงปอง', '🏃 วิ่ง/กรีฑา', '🚴 ปั่นจักรยาน', '🎮 E-Sports', '🎳 เปตอง', '🥅 ตะกร้อ', '👟 ฟุตซอล', '🛹 สเก็ตบอร์ด', '🥋 ศิลปะการต่อสู้', '🎾 เทนนิส', '⛳ กอล์ฟ', '🥊 มวยไทย/เทควันโด', '🏋️ ฟิตเนส/ยกน้ำหนัก', '🤸 ยิมนาสติก', '🏹 ยิงธนู', '🏄 กีฬาทางน้ำ', '🚣 เรือพาย', '⛸️ ไอซ์สเก็ต', '🏉 รักบี้', '🏏 คริกเก็ต', '🥍 ลาครอส', '⚾ เบสบอล', '🥎 ซอฟต์บอล', '🥏 จานร่อน', '🧗 ปีนหน้าผา', 'อื่นๆ'];
            let spHtml = '<option value="">-- เลือกกีฬา --</option>';
            sports.forEach(function(s) { spHtml += '<option value="' + s + '">' + s + '</option>'; });
            if(document.getElementById('profSport')) document.getElementById('profSport').innerHTML = spHtml;

            const talentsList = {
                '🎤 ดนตรีและการแสดง': ['ร้องเพลง', 'เล่นกีตาร์', 'เล่นเปียโน/คีย์บอร์ด', 'เล่นเครื่องดนตรีไทย', 'เต้น (Cover/Hip-hop)', 'การแสดง/ละคร'],
                '🎨 ศิลปะและการออกแบบ': ['วาดภาพระบายสี', 'ออกแบบกราฟิก', 'ถ่ายภาพ/แต่งภาพ', 'ตัดต่อวิดีโอ', 'ปั้น/งานประติมากรรม', 'จัดดอกไม้'],
                '🧠 วิชาการและภาษา': ['คณิตศาสตร์คิดเร็ว', 'พูดภาษาอังกฤษ', 'พูดภาษาจีน', 'พูดภาษาเกาหลี/ญี่ปุ่น', 'เขียนเรียงความ/แต่งนิยาย', 'พูดสุนทรพจน์/พิธีกร'],
                '💻 เทคโนโลยี': ['เขียนโปรแกรม/Coding', 'สร้างเว็บไซต์/แอป', 'ซ่อมคอมพิวเตอร์', 'แอนิเมชัน 2D/3D', 'ใช้งาน AI', 'วิเคราะห์ข้อมูล'],
                '🍳 ทักษะชีวิตและอื่นๆ': ['ทำอาหารคาว', 'ทำขนม/เบเกอรี่', 'ชงเครื่องดื่ม/บาริสต้า', 'งานช่าง/ซ่อมแซม', 'ปลูกต้นไม้/เกษตร', 'ทักษะเอาตัวรอด']
            };
            let tHtml = '';
            for (const [category, items] of Object.entries(talentsList)) {
                tHtml += `<div class="mb-2"><strong class="text-primary small">${category}</strong><div class="d-flex flex-wrap gap-2 mt-1">`;
                items.forEach(function(t) {
                    tHtml += `<div class="form-check form-check-inline m-0"><input class="form-check-input talent-checkbox" type="checkbox" id="t_${t}" value="${t}" onchange="checkMaxSelections(this, '.talent-checkbox', 5)"><label class="form-check-label small" for="t_${t}">${t}</label></div>`;
                });
                tHtml += `</div></div>`;
            }
            if(document.getElementById('talentsContainer')) document.getElementById('talentsContainer').innerHTML = tHtml;

            const hobbiesList = {
                '📺 บันเทิงและผ่อนคลาย': ['ดูหนัง/ซีรีส์', 'ฟังเพลง/พอดแคสต์', 'อ่านหนังสือ/นิยาย', 'อ่านการ์ตูน/มังงะ', 'ดูสตรีมมิ่ง/YouTube', 'ดูคอนเสิร์ต'],
                '🎮 เกมและเทคโนโลยี': ['เล่นเกมออนไลน์/มือถือ', 'เล่นบอร์ดเกม/การ์ดเกม', 'ท่องโซเชียล', 'ทดลองโปรแกรมใหม่ๆ', 'จัดสเปคคอม', 'เล่นเกมคอนโซล/PC'],
                '🎨 ศิลปะและงานประดิษฐ์': ['วาดรูปเล่น', 'ทำงานฝีมือ/DIY', 'ต่อเลโก้/โมเดล', 'ถักไหมพรม/เย็บปัก', 'เขียนไดอารี่/Journal', 'ทำ Scrapbook'],
                '🍳 ไลฟ์สไตล์': ['ท่องเที่ยว/แคมป์ปิ้ง', 'ตระเวนกินของอร่อย', 'ไปคาเฟ่/ถ่ายรูป', 'ปลูกต้นไม้/ดูแลสวน', 'เล่นกับสัตว์เลี้ยง', 'ช้อปปิ้ง'],
                '⚽ กิจกรรมแอคทีฟ': ['เล่นกีฬา', 'ออกกำลังกาย/ฟิตเนส', 'วิ่งจ๊อกกิ้ง', 'ปั่นจักรยานเล่น', 'ว่ายน้ำ', 'เดินป่า/ปีนเขา']
            };
            let hHtml = '';
            for (const [category, items] of Object.entries(hobbiesList)) {
                hHtml += `<div class="mb-2"><strong class="text-success small">${category}</strong><div class="d-flex flex-wrap gap-2 mt-1">`;
                items.forEach(function(h) {
                    hHtml += `<div class="form-check form-check-inline m-0"><input class="form-check-input hobby-checkbox" type="checkbox" id="h_${h}" value="${h}" onchange="checkMaxSelections(this, '.hobby-checkbox', 5)"><label class="form-check-label small" for="h_${h}">${h}</label></div>`;
                });
                hHtml += `</div></div>`;
            }
            if(document.getElementById('hobbiesContainer')) document.getElementById('hobbiesContainer').innerHTML = hHtml;
        } catch(err) {
            console.error('Profile form error:', err);
        }
    }

    function checkMaxSelections(checkbox, selector, max) {
        let checkedCount = document.querySelectorAll(selector + ':checked').length;
        if(checkedCount > max) {
            checkbox.checked = false;
            Swal.fire({toast: true, position: 'top', icon: 'warning', title: 'เลือกได้สูงสุด ' + max + ' อย่างครับ', showConfirmButton: false, timer: 2000});
        }
    }

    document.addEventListener('DOMContentLoaded', populateProfileDropdowns);

    // =====================================
    // POST-IT BOARD SYSTEM
    // =====================================
    function openBoard(role) {
        currentBoardRole = role;
        let activeRoom = role === 'teacher' ? currentRoom : (globalPortalStudent ? globalPortalStudent.room : '');
        if (!activeRoom) return Swal.fire('เตือน', 'ไม่พบห้อง', 'warning');
        
        document.getElementById('boardRoomName').innerText = activeRoom;
        if (role === 'teacher') {
            document.getElementById('btnTeacherClearBoard').classList.remove('hidden');
        } else {
            document.getElementById('btnTeacherClearBoard').classList.add('hidden');
        }
        
        renderStylePicker();
        showAppModal('boardModal');
        refreshBoard();
        
        if (typeof boardInterval !== 'undefined' && boardInterval) clearInterval(boardInterval);
        boardInterval = setInterval(refreshBoard, 3000); 
    }

    function renderStylePicker() {
        const container = document.getElementById('postItStylePicker');
        let html = '';
        let unlockedCount = currentBoardRole === 'teacher' ? 200 : (globalPortalStudent.level.current * 10);
        
        postItStyles.forEach(function(style, index) {
            let isUnlocked = index < unlockedCount;
            let activeClass = (style === currentSelectedPostItStyle) ? 'active' : '';
            let lockedClass = isUnlocked ? '' : 'locked';
            let clickAttr = isUnlocked ? 'onclick="selectPostItStyle(' + index + ')"' : '';
            
            let bgStyle = style;
            let innerHtml = '';
            if (style.startsWith('EMOJI:')) {
                let parts = style.split(':');
                bgStyle = parts.slice(2).join(':'); 
                innerHtml = '<div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); opacity:0.5; font-size:1.2rem; pointer-events:none;">' + parts[1] + '</div>';
            }
            
            html += '<div class="style-item ' + activeClass + ' ' + lockedClass + '" style="background: ' + bgStyle + '; position: relative;" ' + clickAttr + '>' + innerHtml + '</div>';
        });
        container.innerHTML = html;
    }

    function selectPostItStyle(index) {
        currentSelectedPostItStyle = postItStyles[index];
        renderStylePicker();
    }

    function refreshBoard() {
        let activeRoom = currentBoardRole === 'teacher' ? currentRoom : globalPortalStudent.room;
        google.script.run.withSuccessHandler(renderBoard).getPostIts(activeRoom);
    }

    function renderBoard(postIts) {
        const container = document.getElementById('boardContainer');
        let html = '';
        postIts.forEach(function(p) {
            let num = parseInt(p.id.replace(/\D/g, '')) || 0;
            let rotate = -5 + (num % 11);
            let delBtn = currentBoardRole === 'teacher' ? '<button class="btn btn-sm btn-danger position-absolute top-0 end-0 m-2" style="border-radius:50%; width:25px; height:25px; padding:0; line-height:0; z-index:5;" onclick="deletePostIt(\'' + p.id + '\')"><i class="bi bi-x fs-6"></i></button>' : '';
            let avatarHtml = '';
            
            if (p.avatar && p.avatar !== 'teacher') {
                avatarHtml = '<img src="https://api.dicebear.com/9.x/adventurer/svg?seed=' + p.avatar + '&backgroundColor=transparent" class="pi-avatar">';
            } else if (p.avatar === 'teacher') {
                avatarHtml = '<div class="pi-avatar d-flex align-items-center justify-content-center bg-primary text-white fs-4"><i class="bi bi-mortarboard-fill"></i></div>';
            }

            let bgStyle = p.style;
            let watermarkHtml = '';
            if (p.style && p.style.startsWith('EMOJI:')) {
                let parts = p.style.split(':');
                bgStyle = parts.slice(2).join(':'); 
                watermarkHtml = '<div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); opacity:0.15; font-size:5rem; pointer-events:none; z-index:0;">' + parts[1] + '</div>';
            }
            
            html += '<div class="post-it" style="background: ' + bgStyle + '; transform: rotate(' + rotate + 'deg);">' + watermarkHtml + avatarHtml + delBtn + '<div class="pi-text" style="position:relative; z-index:1;">' + p.text + '</div><div class="pi-actions" style="position:relative; z-index:1;"><button class="btn-react" onclick="reactPostIt(\'' + p.id + '\', \'heart\')">❤️ <strong class="ms-1" style="color:#d32f2f;">' + p.heart + '</strong></button><button class="btn-react" onclick="reactPostIt(\'' + p.id + '\', \'angry\')">😡 <strong class="ms-1" style="color:#f57c00;">' + p.angry + '</strong></button></div></div>';
        });
        container.innerHTML = html || '<h4 class="text-white opacity-50 w-100 text-center mt-5">ยังไม่มีคนแปะโพสอิทเลย</h4>';
    }

    function submitPostIt() {
        let activeRoom = currentBoardRole === 'teacher' ? currentRoom : globalPortalStudent.room;
        const text = document.getElementById('piText').value.trim();
        if (!text) return;
        
        document.getElementById('piText').value = '';
        let avatarToSave = currentBoardRole === 'teacher' ? 'teacher' : currentSelectedAvatarSeed;
        google.script.run.withSuccessHandler(renderBoard).addPostIt(activeRoom, text, currentSelectedPostItStyle, avatarToSave);
    }

    function reactPostIt(id, type) {
        let activeRoom = currentBoardRole === 'teacher' ? currentRoom : globalPortalStudent.room;
        google.script.run.withSuccessHandler(renderBoard).reactPostIt(activeRoom, id, type);
    }

    function deletePostIt(id) {
        let activeRoom = currentBoardRole === 'teacher' ? currentRoom : globalPortalStudent.room;
        if (!confirm('ลบโพสอิทชิ้นนี้?')) return;
        google.script.run.withSuccessHandler(renderBoard).deletePostIt(activeRoom, id);
    }

    function confirmClearBoard() {
        let activeRoom = currentBoardRole === 'teacher' ? currentRoom : globalPortalStudent.room;
        Swal.fire({
            title: 'ล้างกระดาน?',
            text: 'ลบถาวร ยืนยันไหม?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'ลบทิ้งทั้งหมด'
        }).then(function(r) {
            if (r.isConfirmed) {
                google.script.run.withSuccessHandler(renderBoard).clearBoard(activeRoom);
            }
        });
    }

    // =====================================
    // STUDENT SEARCH & LOGIN
    // =====================================
    window.searchStudent = async function() {
        var queryInput = document.getElementById('portalStudentId');
        if (!queryInput) return;
        
        var query = queryInput.value.trim();
        if (!query) {
            Swal.fire('อ๊ะ!', 'กรุณากรอกเลขที่/รหัส หรือ ชื่อก่อนครับ', 'warning');
            return;
        }
        
        var btn = document.getElementById('btnSearch');
        if (btn) {
            btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> กำลังค้นหา...';
            btn.disabled = true;
        }
        
        try {
            // --- เปลี่ยนจุดนี้ครับ ---
            if (typeof supabaseClient === 'undefined' || supabaseClient === null) {
                if (btn) { btn.innerHTML = '<i class="bi bi-search"></i> ค้นหาข้อมูล'; btn.disabled = false; }
                throw new Error("ระบบกำลังเชื่อมต่อฐานข้อมูล (Supabase) กรุณารอสัก 2 วินาทีแล้วกดใหม่ครับ");
            }
            
            let { data: students, error } = await supabaseClient.from('students').select('id,name,room,pin');
            if (error) throw error;
            
            const cleanText = (text) => (text || "").toString().replace(/^(เด็กชาย|เด็กหญิง|ด\.ช\.|ด\.ญ\.|นาย|นางสาว|นาง|คุณ)/g, '').replace(/\s+/g, '').toLowerCase();
            const cleanQuery = cleanText(query);
            
            let matches = (students || []).filter(r => { 
                const isIdMatch = (r.id || "").toString().includes(query.trim()); 
                const dbNameClean = cleanText(r.name); 
                const isNameMatch = dbNameClean.includes(cleanQuery) || cleanQuery.includes(dbNameClean); 
                return isIdMatch || isNameMatch; 
            }).map(r => ({ 
                id: r.id, 
                name: (r.name || "").toString().replace(/^(เด็กชาย|เด็กหญิง|ด\.ช\.|ด\.ญ\.|นาย|นางสาว|นาง|คุณ)/g, '').trim(), 
                room: r.room, 
                hasPin: (r.pin || "").toString().trim() !== "" 
            }));
            
            if (btn) {
                btn.innerHTML = '<i class="bi bi-search"></i> ค้นหาข้อมูล';
                btn.disabled = false;
            }
            
            if (matches.length === 0) {
                Swal.fire('ไม่พบข้อมูล', 'ไม่พบรายชื่อในระบบ กรุณาลองค้นหาใหม่ครับ', 'error');
                return;
            }
            
            var box = document.getElementById('selectResultBox');
            var list = document.getElementById('matchListContainer');
            var colors = ['bg-primary', 'bg-success', 'bg-danger', 'bg-warning text-dark', 'bg-info text-dark', 'bg-dark'];
            var roomColorMap = {};
            var listHtml = '';
            
            for (var i = 0; i < matches.length; i++) {
                var s = matches[i];
                if (!roomColorMap[s.room]) {
                    roomColorMap[s.room] = colors[Object.keys(roomColorMap).length % colors.length];
                }
                var clr = roomColorMap[s.room];
                
                listHtml += '<div class="select-card d-flex justify-content-between align-items-center" onclick="verifyIdentity(\'' + s.id + '\', \'' + s.name + '\', ' + s.hasPin + ')">';
                listHtml += '<div><h6 class="mb-1 fw-bold text-dark">' + s.name + '</h6>';
                listHtml += '<span class="badge bg-secondary">เลขที่/รหัส: ' + s.id + '</span> ';
                listHtml += '<span class="badge ' + clr + '">ระดับชั้น/ห้อง: ' + s.room + '</span></div>';
                listHtml += '<i class="bi bi-chevron-right text-muted"></i></div>';
            }
            
            list.innerHTML = listHtml;
            box.classList.remove('hidden');
            
        } catch(err) {
            if (btn) {
                btn.innerHTML = '<i class="bi bi-search"></i> ค้นหาข้อมูล';
                btn.disabled = false;
            }
            Swal.fire('เกิดข้อผิดพลาด', err.message, 'error');
        }
    };

    async function verifyIdentity(id, name, hasPin) {
        if (!hasPin) {
            Swal.fire({
                title: 'ยินดีต้อนรับ!',
                html: 'ตั้งรหัสลับใหม่<br><small class="text-danger">*ตั้งไว้กันคนอื่นแอบดู</small>',
                input: 'password',
                showCancelButton: true,
                confirmButtonText: 'บันทึก',
                inputValidator: function(v) { return !v && 'กรุณาใส่รหัส'; }
            }).then(function(r) {
                if (r.isConfirmed) {
                    Swal.fire({ title: 'กำลังบันทึก...', didOpen: function() { Swal.showLoading(); } });
                    google.script.run.withSuccessHandler(function(res) {
                        if (res.success) {
                            localStorage.setItem('studentId', id);
                            loadFullDashboard(id);
                        } else {
                            Swal.fire('ผิดพลาด', res.message, 'error');
                        }
                    }).updateStudentPin(id, "", r.value);
                }
            });
        } else {
            Swal.fire({
                title: 'ยืนยันตัวตน',
                text: 'คุณคือ ' + name + ' ใช่ไหม?',
                input: 'password',
                showCancelButton: true,
                confirmButtonText: 'เข้าสู่ระบบ',
                inputValidator: function(v) { return !v && 'กรุณาใส่รหัส'; }
            }).then(async function(r) {
                if (r.isConfirmed) {
                    Swal.fire({ title: 'ตรวจสอบ...', didOpen: function() { Swal.showLoading(); } });
                    try {
                        let { data } = await supabaseClient.from('students').select('pin').eq('id', id).single();
                        let isValid = data && (data.pin||"").toString().trim() === r.value.toString().trim();
                        
                        if (isValid) {
                            localStorage.setItem('studentId', id);
                            loadFullDashboard(id);
                        } else {
                            Swal.fire('ผิดพลาด', 'รหัสไม่ถูกต้อง!', 'error');
                        }
                    } catch(e) {
                        Swal.fire('ผิดพลาด', 'ไม่สามารถตรวจสอบได้', 'error');
                    }
                }
            });
        }
    }

    function updatePetStatusLogic() {
        if (!globalPortalStudent) return;
        if (window.isFeeding) return; 
        
        const dragAva = document.getElementById('draggable-avatar');
        const dragBubble = document.getElementById('drag-bubble');
        
        let newAnim = '';
        let newText = '';
        let newClass = '';

        if (globalPortalStudent.attendance.absent >= 3) {
            newAnim = 'anim-absent'; newText = 'ขาดบ่อยจัง 😭'; newClass = 'status-bubble text-danger';
        } else if (globalPortalStudent.attendance.leave >= 3) {
            newAnim = 'anim-sleepy'; newText = 'ลาบ่อยจัง 😴'; newClass = 'status-bubble text-warning';
        } else if (globalPortalStudent.pendingCount > 0) {
            newAnim = 'anim-panic'; newText = 'งานค้าง ' + globalPortalStudent.pendingCount + ' ชิ้น! 😱'; newClass = 'status-bubble text-danger border-danger';
        } else {
            newAnim = 'anim-happy'; newText = 'ยอดเยี่ยมเลย! 🌟'; newClass = 'status-bubble text-success border-success';
        }

        if (!dragAva.classList.contains(newAnim)) {
            dragAva.classList.remove('anim-happy', 'anim-panic', 'anim-sleepy', 'anim-absent', 'anim-feed');
            dragAva.classList.add(newAnim);
            dragBubble.innerText = newText;
            dragBubble.className = newClass;
        }
    }

    function getExpPerMs(id) {
        if (!id || id === 'bg0') return 0;
        let num = parseInt(id.replace(/\D/g, '')) || 0;
        let rate = 0;          // 🌟 เพิ่มบรรทัดนี้
        let unitMs = 3600000;
        if (id.startsWith('bg')) {
            const bgRates = [0, 5, 10, 15, 20, 25, 30, 40, 50, 100, 200, 300, 400, 500, 1000, 1, 2, 3, 4, 5, 10];
            const bgUnits = ['', 'hr','hr','hr','hr','hr','hr','hr','hr','day','day','day','day','day','week','min','min','min','min','min','min'];
            if(num <= 20) { rate = bgRates[num]; let u = bgUnits[num]; if(u==='min') unitMs = 60000;
            else if(u==='day') unitMs = 86400000; else if(u==='week') unitMs = 604800000; }
        } else if (id.startsWith('i')) { 
            if(num <= 20) { rate = num * 2; unitMs = 3600000; } else if(num <= 40) { rate = (num-20) * 20; unitMs = 86400000; } else { rate = (num-40) * 1; unitMs = 60000; } 
        } else if (id.startsWith('m') || id.startsWith('w')) { 
            if(num <= 20) { rate = num * 5; unitMs = 3600000; } else if(num <= 40) { rate = (num-20) * 50; unitMs = 86400000; } else { rate = (num-40) * 2; unitMs = 60000; } 
        } return rate / unitMs;
    }

    // =====================================
    // MAIN DASHBOARD LOAD (DIRECT FETCH)
    // =====================================
    async function loadFullDashboard(studentId, isSilent = false) {
        if (!isSilent) {
            Swal.fire({ title: 'กำลังดึงข้อมูลส่วนตัว...', didOpen: function() { Swal.showLoading(); } });
        }
        
        try {
            if(!supabaseClient) throw new Error("ไม่สามารถเชื่อมต่อฐานข้อมูลได้");
            
            let { data: s } = await supabaseClient.from('students').select('*').eq('id', studentId).single();
            if(!s) throw new Error("ไม่พบข้อมูลนักเรียน");
            const roomName = s.room;
            
            const [
                { data: atts },
                { data: tasks },
                { data: subs },
                { data: gTasks },
                { data: anns }
            ] = await Promise.all([
                supabaseClient.from('attendance').select('*').eq('student_id', studentId),
                supabaseClient.from('tasks').select('*').eq('room', roomName),
                supabaseClient.from('submissions').select('*').eq('student_id', studentId),
                supabaseClient.from('group_tasks').select('*').eq('room', roomName),
                supabaseClient.from('announcements').select('*').eq('room', roomName).order('id', {ascending: false}).limit(1)
            ]);

            let taskIds = (gTasks||[]).map(t=>t.task_id);
            let myGroups = [];
            let gSubs = [];
            if(taskIds.length > 0) {
                let {data: allGroups} = await supabaseClient.from('groups').select('*').in('task_id', taskIds);
                myGroups = (allGroups||[]).filter(g => (g.members||[]).includes(studentId));
                if(myGroups.length > 0) {
                    let gIds = myGroups.map(g=>g.group_id);
                    let {data: gs} = await supabaseClient.from('group_submissions').select('*').in('group_id', gIds);
                    gSubs = gs || [];
                }
            }

            const pName = s.name.replace(/^(เด็กชาย|เด็กหญิง|ด\.ช\.|ด\.ญ\.|นาย|นางสาว|นาง|คุณ)/g, '').trim();
            const p = {nickname: s.nickname||"", gender: s.gender||"", phone: s.phone||"", disease: s.disease||"", dob: s.dob||"", sport: s.sport||"", talent: s.talent||"", hobby: s.hobby||"", father: s.father||"", mother: s.mother||"", houseNo: s.house_no||"", moo: s.moo||"", subDistrict: s.sub_district||"", district: s.district||"", province: s.province||"", zipcode: s.zipcode||"", avatar: s.avatar||"1"};
            
            let exp = parseFloat(s.exp)||0; 
            let lastCheck = s.last_check_in||"";
            let dm = JSON.stringify(s.dm||[]); 
            let inv = s.inventory||[]; 
            let eqBg = s.equipped_bg||"bg0";
            let lastPass = parseInt(s.last_passive_update)||Date.now();
            
            // --- แก้ไขการคำนวณให้ตรงตามการสวมใส่จริง ---
            let totalExpPerMs = 0; 
            
            // 1. คำนวณจากฉากหลังที่สวมอยู่ (ถ้าเป็น bg0 ฟังก์ชันจะคืนค่า 0)
            totalExpPerMs += getExpPerMs(eqBg);

            // 2. คำนวณจากไอเทมชิ้นสุดท้ายที่ "สวมใส่" (ดูจาก Inventory ตัวสุดท้ายที่เป็น 'i')
            // หมายเหตุ: หากคุณฟลุ๊คต้องการให้ต้องกดสวมใส่ก่อนถึงจะได้แต้ม โค้ดส่วนนี้ถูกต้องแล้วครับ
            // แต่ต้องระวังว่า getExpPerMs ต้องคืนค่า 0 หาก id ไม่ถูกต้อง
            let myItems = inv.filter(x => x.startsWith('i'));
            if(myItems.length > 0) totalExpPerMs += getExpPerMs(myItems[myItems.length-1]);

            let myClothes = inv.filter(x => x.startsWith('m') || x.startsWith('w')); 
            if(myClothes.length > 0) totalExpPerMs += getExpPerMs(myClothes[myClothes.length-1]);
            // ------------------------------------------
            
// --- เริ่มระบบคำนวณ Passive EXP + บัฟอาหาร ---
            let now = Date.now();
            let currentBuffMultiplier = 1.0;
            let buffEnd = parseInt(s.buff_end_at) || 0;

            // ตรวจสอบว่าปัจจุบันอยู่ในช่วงเวลาบัฟหรือไม่
            if (now < buffEnd) {
                currentBuffMultiplier = parseFloat(s.buff_multiplier) || 1.0;
            }

            if (totalExpPerMs > 0) {
                let msPassed = now - lastPass;
                // สูตรใหม่: (เวลา * อัตราพื้นฐาน) * ตัวคูณจากอาหาร
                let gained = Math.floor((msPassed * totalExpPerMs) * currentBuffMultiplier);
                
                if (gained > 0) {
                    exp += gained;
                }
            }
            // --- จบระบบคำนวณ ---
            
            let pres = 0, abs = 0, lea = 0;
            (atts||[]).forEach(a => { if(a.status==='มา') pres++; else if(a.status==='ขาด') abs++; else if(a.status==='ลา') lea++; });
            
            let tasksDone = 0, allTasks = [], submitted = []; let taskExp = 0;
            (tasks||[]).forEach(t => {
               let sub = (subs||[]).find(x => x.task_id === t.task_id);
               let st = 'ยังไม่ส่ง', sc = '', u = '';
               if(sub) { 
                   st = sub.status; sc = sub.score||''; u = sub.url||''; 
                   if(st === 'ส่งแล้ว') { 
                       tasksDone++; 
                       let dueStr = (t.due_date||"").replace(/-/g, ''); 
                       let pt = (sub.timestamp || "").match(/\d+/g);
                       if (pt && pt.length >= 3) {
                           let year = parseInt(pt[2]); if (year > 2500) year -= 543;
                           let subStr = `${year}${pt[1].padStart(2,'0')}${pt[0].padStart(2,'0')}`;
                           if (subStr <= dueStr) taskExp += 500; else taskExp += 250; 
                       } else { taskExp += 250; }
                   }
               }
               allTasks.push({id: t.task_id, title: t.title, desc: t.description||"", due: t.due_date||"", maxScore: t.max_score||0, status: st, score: sc, url: u, isGroup: false});
               if(st==='ส่งแล้ว' && sc!=='') submitted.push({title: t.title, score: sc});
            });
            
            (gTasks||[]).forEach(t => {
               let g = myGroups.find(x => x.task_id === t.task_id);
               let st = 'ยังไม่จัดกลุ่ม', sc = '', u = '', gId = '', gApp = '';
               if(g) {
                   gId = g.group_id; gApp = g.status;
                   if(gApp === 'อนุมัติแล้ว') {
                       st = 'ยังไม่ส่ง';
                       let sub = gSubs.find(x => x.group_id === gId);
                       if(sub) {
                           st = sub.status; sc = sub.score||''; u = sub.url||'';
                           if(st==='ส่งแล้ว') { tasksDone++; taskExp += 3500; }
                       }
                   } else { st = 'รออนุมัติกลุ่ม'; }
               }
               allTasks.push({id: t.task_id, title: "[งานกลุ่ม] "+t.title, desc: "สมาชิกสูงสุด "+t.max_members+" คน", due: t.due_date||"", maxScore: t.max_score||0, status: st, score: sc, url: u, isGroup: true, maxMembers: t.max_members, groupId: gId, groupApproval: gApp});
               if(st==='ส่งแล้ว' && sc!=='') submitted.push({title: "[งานกลุ่ม] "+t.title, score: sc});
            });
            
            // 🌟 ดึงจากฐานข้อมูลตรงๆ เพราะหลังบ้านคำนวณและเซฟให้แล้ว
            let totExp = Math.floor(exp);
            let lvls = [ { exp: 0, name: "มือใหม่หัดเรียน", emoji: "🐣" }, { exp: 300, name: "นักเรียนฝึกหัด", emoji: "🐹" }, { exp: 800, name: "ผู้ใฝ่รู้", emoji: "🦊" }, { exp: 1500, name: "นักปราชญ์น้อย", emoji: "🦉" }, { exp: 2400, name: "จอมขยัน", emoji: "🐺" }, { exp: 3500, name: "ดาวรุ่งพุ่งแรง", emoji: "🦄" }, { exp: 4800, name: "นักสู้หัวกะทิ", emoji: "🦁" }, { exp: 6300, name: "ปรมาจารย์", emoji: "🦅" }, { exp: 8000, name: "ตำนานเดินดิน", emoji: "👑" }, { exp: 10000, name: "มหาเทพการเรียน", emoji: "💎" }, { exp: 12200, name: "ผู้หยั่งรู้", emoji: "🔮" }, { exp: 14600, name: "ทะลุขีดจำกัด", emoji: "🚀" }, { exp: 17200, name: "ผู้พิชิตดวงดาว", emoji: "🌠" }, { exp: 20000, name: "จักรพรรดิกาแล็กซี", emoji: "🌌" }, { exp: 23000, name: "ยอดมนุษย์", emoji: "⚡" }, { exp: 26200, name: "มังกรผงาด", emoji: "🐉" }, { exp: 29600, name: "เซียนเหนือเซียน", emoji: "⚜️" }, { exp: 33200, name: "จอมราชันย์", emoji: "🔱" }, { exp: 37000, name: "เทพเจ้าจุติ", emoji: "💠" }, { exp: 41000, name: "จ้าวแห่งจักรวาล", emoji: "♾️" } ];
            let currentLv = 1, lvName = lvls[0].name, lvEmoji = lvls[0].emoji, nextExp = lvls[1].exp;
            for(let i=0; i<lvls.length; i++) { if(totExp >= lvls[i].exp) { currentLv = i + 1; lvName = lvls[i].name; lvEmoji = lvls[i].emoji; nextExp = (i+1 < lvls.length) ? lvls[i+1].exp : "Max"; } }

            let pending = allTasks.filter(t => t.status==='ยังไม่ส่ง' || t.status==='ยังไม่จัดกลุ่ม' || (t.status==='ส่งแล้ว'&&t.score==='')).length;
            let fb = pending === 0 && abs === 0 ? "ยอดเยี่ยมมาก! ไม่มีงานค้างและเข้าเรียนครบถ้วน 🎉" : (abs >= 3 ? "ระวัง! สถิติการขาดเรียนเริ่มสูง อย่าลืมตามงานด้วยนะ ⚠️" : (pending > 0 ? `ฮึบๆ! ยังมีงานรอตรวจ/ค้างอีก ${pending} ชิ้น รีบเคลียร์ให้เสร็จนะ ✌️` : "ทำได้ดีมากครับ ตั้งใจเรียนต่อไปนะ! 🌟"));
            let ann = (anns && anns.length > 0) ? anns[0].message : "";
            
            let data = { id: studentId, name: pName, room: s.room, profile: p, announcement: ann, feedback: fb, attendance: { present: pres, absent: abs, leave: lea, total: pres+abs+lea }, work: { done: tasksDone, total: tasks.length + gTasks.length, allTasks: allTasks }, topGrades: submitted.sort((a,b)=>b.score-a.score).slice(0,3), exp: totExp, accumulatedScore: s.accumulated_score||0, lastCheckIn: lastCheck, level: {current: currentLv, name: lvName, emoji: lvEmoji, next: nextExp}, pendingCount: pending, dm: dm, inventory: inv, equippedBg: eqBg };

            if (!isSilent) {
                Swal.close();
                window.lastExp = data.exp; 
            } else {
                if (window.lastExp !== null && data.exp > window.lastExp) {
                    let diff = data.exp - window.lastExp;
                    if (!Swal.isVisible() || Swal.getPopup().classList.contains('swal2-toast')) {
                        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: '✨ ว้าว! ได้รับเพิ่ม ' + diff + ' EXP', showConfirmButton: false, timer: 3000 });
                    }
                }
                window.lastExp = data.exp;
            }
            
            globalPortalStudent = data;
            globalPortalStudent.hasPin = true;
            document.getElementById('student-search-view').classList.add('hidden');
            document.getElementById('student-dashboard-view').classList.remove('hidden');
            document.getElementById('btnLock').classList.add('hidden');

            let dmMessages = [];
            try { dmMessages = JSON.parse(data.dm || "[]"); if (!Array.isArray(dmMessages)) dmMessages = data.dm ? [data.dm] : []; } 
            catch(e) { dmMessages = data.dm ? [data.dm] : []; }

            let dmContainer = document.getElementById('dmContainer');
            let dmHtml = '';
            if (dmMessages.length > 0) {
                for (let d = 0; d < dmMessages.length; d++) {
                    dmHtml += '<div class="dm-alert-card"><div class="dm-icon"><i class="bi bi-envelope-heart-fill"></i></div><h5 class="fw-bold text-danger mb-2">ข้อความจากครู</h5><p class="fs-6 text-dark mb-3" style="white-space: pre-wrap;">' + dmMessages[d] + '</p><div class="text-end"><button class="btn btn-danger btn-sm rounded-pill fw-bold px-3" onclick="acknowledgeDM(' + d + ')"><i class="bi bi-check-circle-fill"></i> รับทราบ</button></div></div>';
                }
            }
            dmContainer.innerHTML = dmHtml;

            let todayStr = getLocalTodayStr();
            if (!isSilent && data.lastCheckIn !== todayStr) {
                Swal.fire({
                    title: '🎉 ยินดีต้อนรับเข้าสู่ชั้นเรียน!', text: 'กดเช็คอินวันนี้เพื่อรับ 200 EXP!', icon: 'info', confirmButtonText: 'เช็คอินรับ EXP', allowOutsideClick: false
                }).then(function(r) {
                    if (r.isConfirmed) {
                        Swal.fire({ title: 'กำลังเช็คอิน...', didOpen: function() { Swal.showLoading(); } });
                        google.script.run.withSuccessHandler(function(res) {
                            if (res.success) {
                                Swal.fire('สำเร็จ!', 'ได้รับ ' + res.gained + ' EXP เยี่ยมมาก!', 'success');
                                loadFullDashboard(globalPortalStudent.id, true);
                            }
                        }).claimDailyEXP(globalPortalStudent.id, todayStr);
                    }
                });
            }

            if (!window.isSavingProfile) {
                currentSelectedAvatarSeed = (data.profile && data.profile.avatar) ? data.profile.avatar : '1';
                let avatarUrl = 'https://api.dicebear.com/9.x/adventurer/svg?seed=' + currentSelectedAvatarSeed;
                document.getElementById('mainAvatarImg').src = avatarUrl;
                const dragImg = document.getElementById('drag-avatar-img');
                if (dragImg) dragImg.src = avatarUrl + '&backgroundColor=transparent';
            }
            
            let nameHtml = data.name;
            if (data.profile && data.profile.nickname) nameHtml += ' <small class="text-muted fs-6 ms-2">(น้อง' + data.profile.nickname + ')</small>';
            document.getElementById('stuNameText').innerHTML = nameHtml;
            document.getElementById('stuLevelBadge').innerHTML = data.level.emoji + ' Lv.' + data.level.current + ' ' + data.level.name;
            
            document.getElementById('stuScoreText').innerText = data.accumulatedScore || 0;
            document.getElementById('expText').innerText = data.exp;
            document.getElementById('nextExpText').innerText = data.level.next;
            
            let expPct = (data.level.next === "Max") ? 100 : Math.min(100, Math.round((data.exp / data.level.next) * 100));
            document.getElementById('expProgressBar').style.width = expPct + '%';

            const isEditingProfile = !document.getElementById('profile-edit-section').classList.contains('hidden');
            
            if (data.profile && !isEditingProfile) {
                document.getElementById('profNickname').value = data.profile.nickname || '';
                document.getElementById('profGender').value = data.profile.gender || '';
                document.getElementById('profDisease').value = data.profile.disease || '';
                if (data.profile.dob) {
                    let dParts = data.profile.dob.split('-');
                    if (dParts.length === 3) {
                        document.getElementById('profDobYear').value = dParts[0]; document.getElementById('profDobMonth').value = dParts[1]; document.getElementById('profDobDay').value = dParts[2];
                    }
                }
                document.getElementById('profSport').value = data.profile.sport || '';
                document.querySelectorAll('.talent-checkbox, .hobby-checkbox').forEach(function(cb) { cb.checked = false; });
                if (data.profile.talent) { let tArr = data.profile.talent.split(', '); tArr.forEach(function(t) { let cb = document.getElementById('t_' + t); if(cb) cb.checked = true; }); }
                if (data.profile.hobby) { let hArr = data.profile.hobby.split(', '); hArr.forEach(function(h) { let cb = document.getElementById('h_' + h); if(cb) cb.checked = true; }); }
                document.getElementById('profHouseNo').value = data.profile.houseNo || ''; document.getElementById('profMoo').value = data.profile.moo || ''; document.getElementById('profSubDistrict').value = data.profile.subDistrict || ''; document.getElementById('profDistrict').value = data.profile.district || ''; document.getElementById('profProvince').value = data.profile.province || ''; document.getElementById('profZipcode').value = data.profile.zipcode || ''; document.getElementById('profFather').value = data.profile.father || ''; document.getElementById('profMother').value = data.profile.mother || ''; document.getElementById('profPhone').value = data.profile.phone || '';
            }

            if (!isSilent) new bootstrap.Tab(document.querySelector('#tab-overview-btn')).show();
            document.getElementById('stuIdText').innerText = 'เลขที่/รหัส: ' + data.id; document.getElementById('stuRoomText').innerText = 'ระดับชั้น/ห้อง: ' + data.room;
            
            let attTotal = data.attendance.total;
            let attPct = attTotal > 0 ? Math.round((data.attendance.present / attTotal) * 100) : 0;
            document.getElementById('attPctText').innerText = attPct + '%'; document.getElementById('attProgressBar').style.width = attPct + '%';
            document.getElementById('stuPresent').innerText = data.attendance.present; document.getElementById('stuLeave').innerText = data.attendance.leave; document.getElementById('stuAbsent').innerText = data.attendance.absent;
            
            let workPct = data.work.total > 0 ? Math.round((data.work.done / data.work.total) * 100) : 0;
            document.getElementById('workPctText').innerText = workPct + '%'; document.getElementById('workProgressBar').style.width = workPct + '%';
            document.getElementById('stuWorkDone').innerText = data.work.done; document.getElementById('stuWorkTotal').innerText = data.work.total;

            if (countdownInterval) clearInterval(countdownInterval);
            const widgetBox = document.getElementById('countdownWidget');
            if (data.pendingCount > 0) {
                let pendingTasks = data.work.allTasks.filter(function(t) { return t.status === 'ยังไม่ส่ง' || t.status === 'ยังไม่จัดกลุ่ม' || (t.status === 'ส่งแล้ว' && t.score === ''); });
                pendingTasks.sort(function(a,b) { return new Date(a.due) - new Date(b.due); });
                if (pendingTasks.length > 0 && pendingTasks[0].due) {
                    const urgentTask = pendingTasks[0];
                    const countDownDate = new Date(urgentTask.due + "T23:59:59").getTime();
                    widgetBox.classList.remove('hidden');
                    document.getElementById('cdTaskName').innerText = urgentTask.title;
                    
                    countdownInterval = setInterval(function() {
                        const distance = countDownDate - new Date().getTime();
                        if (distance < 0) {
                            clearInterval(countdownInterval); document.getElementById('cdTime').innerHTML = "<span class='text-dark bg-warning px-3 rounded'>หมดเวลาส่งแล้ว! 💥</span>"; widgetBox.classList.remove('urgent-pulse'); return;
                        }
                        const d = Math.floor(distance / (1000 * 60 * 60 * 24)); const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)); const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)); const s = Math.floor((distance % (1000 * 60)) / 1000);
                        let cdStr = d > 0 ? d + 'วัน ' : '';
                        cdStr += String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':<span style="color:#ffda79">' + String(s).padStart(2,'0') + '</span>';
                        document.getElementById('cdTime').innerHTML = cdStr;
                        if (d === 0 && h < 24) widgetBox.classList.add('urgent-pulse'); else widgetBox.classList.remove('urgent-pulse');
                    }, 1000);
                } else { widgetBox.classList.add('hidden'); }
            } else { widgetBox.classList.add('hidden'); }

            const tasksBox = document.getElementById('studentTasksList');
            if (data.work.allTasks.length > 0) {
                let allTasksHtml = '';
                data.work.allTasks.forEach(function(t) {
                    let btns = ''; let isGraded = (t.status === 'ส่งแล้ว' && t.score !== ''); let titleHtml = '<h6 class="mb-0 fw-bold ' + (t.isGroup ? 'text-success' : 'text-dark') + '">' + t.title + '</h6>';
                    
                    if (t.isGroup) {
                        if (t.status === 'ยังไม่จัดกลุ่ม') btns = '<button class="btn btn-sm btn-outline-success fw-bold rounded-pill px-3" onclick="openFormGroupModal(\'' + t.id + '\', \'' + t.title.replace(/'/g, "\\'") + '\', ' + t.maxMembers + ')"><i class="bi bi-people-fill"></i> จัดกลุ่ม</button>';
                        else if (t.status === 'รออนุมัติกลุ่ม') btns = '<span class="badge bg-secondary rounded-pill px-2 py-1"><i class="bi bi-hourglass-split"></i> รอครูอนุมัติกลุ่ม</span>';
                        else if (t.status === 'ยังไม่ส่ง') btns = '<button class="btn btn-sm btn-success fw-bold rounded-pill px-3 shadow-sm" onclick="openSubmitWorkModal(\'' + t.id + '\', \'' + t.title.replace(/'/g, "\\'") + '\', false, true, \'' + t.groupId + '\')"><i class="bi bi-cloud-arrow-up-fill"></i> ส่งงานกลุ่ม</button>';
                        else if (t.status === 'ส่งแล้ว' && !isGraded) btns = '<button class="btn btn-sm btn-warning fw-bold text-dark rounded-pill px-3 shadow-sm" onclick="openSubmitWorkModal(\'' + t.id + '\', \'' + t.title.replace(/'/g, "\\'") + '\', true, true, \'' + t.groupId + '\')"><i class="bi bi-pencil-square"></i> แก้ไขลิงก์กลุ่ม</button>';
                        else if (isGraded) btns = '<span class="badge bg-success rounded-pill px-3 py-2 shadow-sm"><i class="bi bi-check-circle-fill"></i> ตรวจแล้ว</span>';
                    } else {
                        if (t.status === 'ยังไม่ส่ง') btns = '<button class="btn btn-sm btn-primary fw-bold rounded-pill px-3 shadow-sm" onclick="openSubmitWorkModal(\'' + t.id + '\', \'' + t.title.replace(/'/g, "\\'") + '\')"><i class="bi bi-link-45deg"></i> ส่ง</button>';
                        else if (t.status === 'ส่งแล้ว' && !isGraded) btns = '<button class="btn btn-sm btn-warning fw-bold text-dark rounded-pill me-1 shadow-sm" onclick="openSubmitWorkModal(\'' + t.id + '\', \'' + t.title.replace(/'/g, "\\'") + '\', true)"><i class="bi bi-pencil-square"></i></button><button class="btn btn-sm btn-outline-danger rounded-pill shadow-sm" onclick="confirmCancelWork(\'' + t.id + '\')"><i class="bi bi-trash"></i></button>';
                        else if (isGraded) btns = '<span class="badge bg-success rounded-pill px-3 py-2 shadow-sm"><i class="bi bi-check-circle-fill"></i> ตรวจแล้ว</span>';
                    }

                    let badgeClass = 'bg-secondary';
                    if (t.status === 'ยังไม่ส่ง' || t.status === 'ยังไม่จัดกลุ่ม') badgeClass = 'bg-danger';
                    else if (t.status === 'รออนุมัติกลุ่ม') badgeClass = 'bg-warning text-dark border border-white';
                    else if (isGraded) badgeClass = 'bg-success';
                    else if (t.status === 'ส่งแล้ว') badgeClass = 'bg-info text-dark border border-white';

                    let badgeText = t.status;
                    if (isGraded) badgeText = 'ได้คะแนน ' + t.score + '/' + t.maxScore;
                    else if (t.status === 'ส่งแล้ว') badgeText = 'รอตรวจ';
                    else if (t.status === 'ยังไม่จัดกลุ่ม' || t.status === 'ยังไม่ส่ง') badgeText = 'ค้างส่ง';

                    let groupNote = t.isGroup ? '<span class="text-success fw-bold ms-1">(งานกลุ่มสูงสุด ' + t.maxMembers + ' คน)</span>' : '';
                    allTasksHtml += '<div class="list-group-item d-flex justify-content-between align-items-center task-item py-3"><div class="d-flex align-items-center"><div class="me-3">' + btns + '</div><div>' + titleHtml + '<small class="text-muted"><i class="bi bi-clock"></i> เดดไลน์: ' + t.due + ' ' + groupNote + '</small></div></div><span class="badge ' + badgeClass + ' rounded-pill px-3 py-2 shadow-sm">' + badgeText + '</span></div>';
                });
                tasksBox.innerHTML = allTasksHtml;
            } else { tasksBox.innerHTML = '<div class="text-center text-success fw-bold py-4"><i class="bi bi-emoji-sunglasses" style="font-size:2.5rem;"><br>ไม่มีงานค้างเลยครับ</div>'; }

            const gradesBox = document.getElementById('latestGradesList');
            if (data.topGrades.length > 0) {
                let gHtml = ''; data.topGrades.forEach(function(g) { gHtml += '<li class="list-group-item d-flex justify-content-between align-items-center"><span>' + g.title + '</span> <span class="badge bg-success rounded-pill px-3">' + g.score + ' คะแนน</span></li>'; });
                gradesBox.innerHTML = gHtml;
            } else { gradesBox.innerHTML = '<li class="list-group-item text-center text-muted py-3">ยังไม่มีผลคะแนน</li>'; }

            let gender = (data.profile && data.profile.gender) ? data.profile.gender : '';
            if (gender === 'หญิง') { document.getElementById('chibi-lower').className = 'chibi-lower female'; } 
            else if (gender === 'ชาย') { document.getElementById('chibi-lower').className = 'chibi-lower male'; } 
            else { document.getElementById('chibi-lower').className = 'chibi-lower casual'; }

            // จัดการเรื่องปุ่ม Toggle สัตว์เลี้ยงใน UI
            const dragAva = document.getElementById('draggable-avatar');
            const btnTogglePet = document.getElementById('btnTogglePet');
            
            if (!window.isPetHiddenByUser) {
                dragAva.classList.remove('hidden');
                if (btnTogglePet) btnTogglePet.innerHTML = '<i class="bi bi-eye-slash"></i> ซ่อนสัตว์เลี้ยง';
            } else {
                dragAva.classList.add('hidden');
                if (btnTogglePet) btnTogglePet.innerHTML = '<i class="bi bi-eye"></i> แสดงสัตว์เลี้ยง';
            }
            
            const chibiContainer = document.getElementById('chibi-container');
            if (!window.isEquipping) {
                let inv = data.inventory || [];
                let equippedItemHtml = ''; let equippedClothesHtml = '';
                if (inv.length > 0) {
                    let myItems = inv.filter(function(x) { return x.startsWith('i'); });
                    if (myItems.length > 0) { let lastItem = myItems[myItems.length - 1]; let foundItem = itemsData.find(function(i) { return i.id === lastItem; }); if (foundItem) equippedItemHtml = foundItem.icon; }
                    let myClothes = inv.filter(function(x) { return x.startsWith('m') || x.startsWith('w'); });
                    if (myClothes.length > 0) {
                        let lastClothes = myClothes[myClothes.length - 1]; let foundClothes = [...maleClothesData, ...femaleClothesData].find(function(c) { return c.id === lastClothes; });
                        if (foundClothes) { equippedClothesHtml = foundClothes.icon; chibiContainer.classList.add('wearing-custom'); } else { chibiContainer.classList.remove('wearing-custom'); }
                    } else { chibiContainer.classList.remove('wearing-custom'); }
                } else { chibiContainer.classList.remove('wearing-custom'); }
                
                document.getElementById('chibi-item').innerHTML = equippedItemHtml; document.getElementById('chibi-clothes-icon').innerHTML = equippedClothesHtml;
                let equippedBg = data.equippedBg;
                if (equippedBg && equippedBg !== 'bg0') { let foundBg = bgData.find(function(b) { return b.id === equippedBg; }); if (foundBg) { document.body.style.background = foundBg.css; }
                } else { document.body.style.background = '#f4f7f6'; }
            }

            if (gender === 'ชาย') {
                document.getElementById('tabShopClothesM').parentElement.classList.remove('hidden'); document.getElementById('tabShopClothesF').parentElement.classList.add('hidden'); document.getElementById('tabInvClothesM').parentElement.classList.remove('hidden'); document.getElementById('tabInvClothesF').parentElement.classList.add('hidden');
                if (!isSilent) { document.getElementById('tabShopClothesM').click(); document.getElementById('tabInvClothesM').click(); }
            } else if (gender === 'หญิง') {
                document.getElementById('tabShopClothesM').parentElement.classList.add('hidden'); document.getElementById('tabShopClothesF').parentElement.classList.remove('hidden'); document.getElementById('tabInvClothesM').parentElement.classList.add('hidden'); document.getElementById('tabInvClothesF').parentElement.classList.remove('hidden');
                if (!isSilent) { document.getElementById('tabShopClothesF').click(); document.getElementById('tabInvClothesF').click(); }
            } else {
                document.getElementById('tabShopClothesM').parentElement.classList.remove('hidden'); document.getElementById('tabShopClothesF').parentElement.classList.remove('hidden'); document.getElementById('tabInvClothesM').parentElement.classList.remove('hidden'); document.getElementById('tabInvClothesF').parentElement.classList.remove('hidden');
                if (!isSilent) { document.getElementById('tabShopClothesM').click(); document.getElementById('tabInvClothesM').click(); }
            }

            updatePetStatusLogic();
            makeDraggable(dragAva);
            
        } catch(err) {
            Swal.fire('เกิดข้อผิดพลาด', err.message, 'error').then(() => {
                // ถ้าหาข้อมูลนักเรียนไม่เจอ ให้ล้างค่าการล็อกอินค้างออก แล้วส่งกลับหน้าค้นหา
                if (err.message.includes("ไม่พบข้อมูลนักเรียน")) {
                    if (typeof autoRefreshInterval !== 'undefined' && autoRefreshInterval !== null) { 
                        clearTimeout(autoRefreshInterval); 
                        autoRefreshInterval = null; 
                    }
                    localStorage.removeItem('studentId');
                    document.getElementById('student-dashboard-view').classList.add('hidden');
                    document.getElementById('student-search-view').classList.remove('hidden');
                    let avatarEl = document.getElementById('draggable-avatar'); 
                    if (avatarEl) avatarEl.classList.add('hidden');
                    let resultBox = document.getElementById('selectResultBox'); 
                    if (resultBox) resultBox.classList.add('hidden');
                    document.getElementById('portalStudentId').value = '';
                    let btnLock = document.getElementById('btnLock'); 
                    if (btnLock) btnLock.classList.remove('hidden');
                }
            });
        }
    }

    window.acknowledgeDM = function(indexToRemove) {
        google.script.run.withSuccessHandler(function(res) {
            if (res.success) {
                Toast.fire({ icon: 'success', title: 'รับทราบข้อความแล้ว' });
                loadFullDashboard(globalPortalStudent.id, true);
            }
        }).clearStudentDM(globalPortalStudent.id, indexToRemove);
    };

    // =====================================
    // FORM GROUP & SUBMIT WORK MODALS (DIRECT FETCH)
    // =====================================
    
    // 🌟 ตัวแปรเก็บภาพแคปจอที่แปลงเป็น Base64 แล้ว
    window.currentSubmitBase64 = "";

    // 🌟 ฟังก์ชันพรีวิวและย่อขนาดรูปภาพก่อนส่ง
    window.previewSubmitImg = function(input) {
        if (input.files && input.files[0]) {
            document.getElementById('submitCompressStatus').style.display = 'inline-block';
            document.getElementById('submitImgPreview').style.display = 'none';
            let reader = new FileReader();
            reader.onload = function(e) {
                let img = new Image();
                img.onload = function() {
                    let canvas = document.createElement('canvas'); 
                    let ctx = canvas.getContext('2d');
                    let maxWidth = 800; 
                    let scaleSize = maxWidth / img.width; 
                    let newWidth = maxWidth; 
                    let newHeight = img.height * scaleSize;
                    if (img.width < maxWidth) { newWidth = img.width; newHeight = img.height; }
                    canvas.width = newWidth; canvas.height = newHeight; 
                    ctx.drawImage(img, 0, 0, newWidth, newHeight);
                    let compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                    document.getElementById('submitImgPreview').src = compressedBase64;
                    document.getElementById('submitImgPreview').style.display = 'inline-block';
                    document.getElementById('submitCompressStatus').style.display = 'none';
                    window.currentSubmitBase64 = compressedBase64; // เก็บไว้เตรียมส่ง
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(input.files[0]);
        } else {
            document.getElementById('submitImgPreview').style.display = 'none';
            document.getElementById('submitCompressStatus').style.display = 'none';
            window.currentSubmitBase64 = "";
        }
    };

    async function openFormGroupModal(taskId, taskTitle, maxMembers) {
        document.getElementById('formGroupTaskId').value = taskId;
        document.getElementById('formGroupMaxMembers').value = maxMembers;
        document.getElementById('formGroupTaskTitle').innerText = taskTitle;
        document.getElementById('formGroupName').value = '';
        document.getElementById('formGroupMaxText').innerText = (maxMembers - 1); 
        document.getElementById('formGroupAvailableStudents').innerHTML = '<div class="text-center py-3"><span class="spinner-border spinner-border-sm text-success"></span> กำลังค้นหารายชื่อเพื่อน...</div>';
        
        showAppModal('studentFormGroupModal');

        try {
            if(!supabaseClient) throw new Error("Database not connected");
            let {data: allStudents} = await supabaseClient.from('students').select('id,name').eq('room', globalPortalStudent.room);
            let {data: groups} = await supabaseClient.from('groups').select('members').eq('task_id', taskId);
            
            let gIds = [];
            (groups||[]).forEach(g => gIds = gIds.concat(g.members||[]));
            let availStudents = (allStudents||[]).filter(s => !gIds.includes(s.id));
            
            let html = '';
            let availCount = 0;
            availStudents.forEach(function(s) {
                if (s.id !== globalPortalStudent.id) { 
                    html += '<div class="form-check border-bottom py-2"><input class="form-check-input group-member-cb" type="checkbox" value="' + s.id + '" id="cbGrp_' + s.id + '" onchange="checkGroupMemberLimit()"><label class="form-check-label w-100" for="cbGrp_' + s.id + '">' + s.id + ' - ' + s.name + '</label></div>';
                    availCount++;
                }
            });
            if (availCount === 0) html = '<div class="text-center text-danger fw-bold py-3"><i class="bi bi-emoji-frown"></i> ตอนนี้ไม่มีเพื่อนที่ว่างเลย (ทุกคนมีกลุ่มหมดแล้ว)</div>';
            document.getElementById('formGroupAvailableStudents').innerHTML = html;
        } catch(e) {
            document.getElementById('formGroupAvailableStudents').innerHTML = '<div class="text-center text-danger py-3">ดึงข้อมูลไม่สำเร็จ</div>';
        }
    }

    function checkGroupMemberLimit() {
        const maxAllowed = parseInt(document.getElementById('formGroupMaxMembers').value) - 1; 
        const checkboxes = document.querySelectorAll('.group-member-cb');
        let checkedCount = 0;
        checkboxes.forEach(function(cb) { if(cb.checked) checkedCount++; });
        if (checkedCount > maxAllowed) {
            event.target.checked = false;
            Swal.fire({ toast: true, position: 'top', icon: 'warning', title: 'เลือกเพื่อนได้อีกสูงสุด ' + maxAllowed + ' คนเท่านั้นนะ', showConfirmButton: false, timer: 3000 });
        }
    }

    function processFormGroup() {
        const taskId = document.getElementById('formGroupTaskId').value;
        const groupName = document.getElementById('formGroupName').value.trim();
        const maxAllowed = parseInt(document.getElementById('formGroupMaxMembers').value);
        
        if (!groupName) return Swal.fire('เตือน', 'กรุณาตั้งชื่อกลุ่มให้เท่ๆ ด้วยครับ!', 'warning');
        
        let selectedMembers = [globalPortalStudent.id]; 
        document.querySelectorAll('.group-member-cb:checked').forEach(function(cb) { selectedMembers.push(cb.value); });
        
        if (selectedMembers.length > maxAllowed) return Swal.fire('เตือน', 'สมาชิกเกินจำนวนที่กำหนด!', 'warning');

        const btn = document.getElementById('btnConfirmFormGroup');
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> กำลังส่งคำขอ...';
        btn.disabled = true;

        google.script.run.withSuccessHandler(function(res) {
            btn.innerHTML = 'ส่งขออนุมัติจัดกลุ่ม'; btn.disabled = false;
            if (res.success) {
                Swal.fire('สำเร็จ', 'ส่งคำขออนุมัติกลุ่มให้คุณครูเรียบร้อยแล้ว!', 'success');
                hideAppModal('studentFormGroupModal');
                loadFullDashboard(globalPortalStudent.id, true);
            } else { Swal.fire('ผิดพลาด', res.message, 'error'); }
        }).submitGroupFormation(taskId, groupName, selectedMembers);
    }

    function openSubmitWorkModal(id, title, isEdit = false, isGroup = false, groupId = '') {
        document.getElementById('submitTaskId').value = id;
        document.getElementById('submitTaskTitle').innerText = (isEdit ? "แก้ไข: " : "ส่ง: ") + title;
        document.getElementById('submitLink').value = '';
        document.getElementById('submitIsGroup').value = isGroup;
        document.getElementById('submitGroupId').value = groupId;
        
        // ล้างค่ารูปภาพเดิมที่เคยอัปโหลดค้างไว้
        let imgInput = document.getElementById('submitImgFile');
        if(imgInput) imgInput.value = '';
        let imgPreview = document.getElementById('submitImgPreview');
        if(imgPreview) { imgPreview.src = ''; imgPreview.style.display = 'none'; }
        window.currentSubmitBase64 = "";

        showAppModal('submitWorkModal');
    }

    function processSubmitWork() {
        const id = document.getElementById('submitTaskId').value;
        const link = document.getElementById('submitLink').value.trim();
        const isGroup = document.getElementById('submitIsGroup').value === 'true';
        const groupId = document.getElementById('submitGroupId').value;
        const btn = document.getElementById('btnConfirmSubmit');
        
        if (!link && !window.currentSubmitBase64) return Swal.fire('เตือน', 'กรุณาวางลิงก์ผลงาน หรือแนบรูปภาพครับ', 'warning');
        
        // 🌟 1. เริ่มแสดง Loading แบบบังหน้าจอ กันเด็กกดซ้อน
        Swal.fire({ 
            title: 'กำลังส่งผลงาน...', 
            html: 'ระบบกำลังอัปโหลดรูปภาพและบันทึกข้อมูล<br>กรุณาอย่าเพิ่งปิดหน้าจอนะครับ ⏳',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); } 
        });

        btn.disabled = true;

        const payload = {
            taskId: id, link: link, isGroup: isGroup, groupId: groupId,
            studentId: globalPortalStudent.id, studentName: globalPortalStudent.name,
            base64Image: window.currentSubmitBase64 || ""
        };

        // 🌟 2. ตั้งตัวนับเวลาถอยหลัง (Timeout) 45 วินาที
        let isFinished = false;
        const timeoutTimer = setTimeout(() => {
            if (!isFinished) {
                isFinished = true;
                btn.disabled = false;
                Swal.fire('ใช้เวลานานเกินไป', 'การเชื่อมต่ออินเทอร์เน็ตอาจมีปัญหา แต่ข้อมูลอาจจะกำลังถูกบันทึก ลองรีเฟรชหน้าจอเช็คสถานะอีกครั้งนะครับ', 'warning');
            }
        }, 45000); 

        google.script.run
            .withSuccessHandler(function(res) {
                if (isFinished) return; // ถ้า Timeout ไปแล้วไม่ต้องทำต่อ
                isFinished = true;
                clearTimeout(timeoutTimer);
                btn.disabled = false;

                if (res.success) {
                    Swal.fire('สำเร็จ!', res.message, 'success');
                    hideAppModal('submitWorkModal');
                    loadFullDashboard(globalPortalStudent.id, true);
                } else {
                    Swal.fire('เซิร์ฟเวอร์ปฏิเสธ', res.message, 'error');
                }
            })
            .withFailureHandler(function(err) {
                // 🌟 3. ดักจับกรณีเน็ตหลุด หรือ Script พัง (Failure Handler)
                if (isFinished) return;
                isFinished = true;
                clearTimeout(timeoutTimer);
                btn.disabled = false;
                console.error("Critical Submit Error:", err);
                Swal.fire('ส่งงานไม่สำเร็จ', 'เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + err.message, 'error');
            })
            .processStudentSubmissionWithImage(payload);
    }

    function confirmCancelWork(id) {
        Swal.fire({
            title: 'ยกเลิกส่ง?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'ลบเลย'
        }).then(function(r) {
            if (r.isConfirmed) {
                Swal.fire({ title: 'ล้างข้อมูล...', didOpen: function() { Swal.showLoading(); } });
                google.script.run.withSuccessHandler(function(res) {
                    if (res.success) {
                        Swal.fire('สำเร็จ', res.message, 'success');
                        loadFullDashboard(globalPortalStudent.id, true);
                    } else { Swal.fire('ผิด', res.message, 'error'); }
                }).cancelStudentWork(id, globalPortalStudent.id);
            }
        });
    }

    // =====================================
    // INVENTORY & SHOP
    // =====================================
    function openInventoryModal() { renderInventory(); showAppModal('inventoryModal'); }

    function renderInventory() {
        let inv = globalPortalStudent.inventory || [];
        let myItems = inv.filter(function(x) { return x.startsWith('i'); });
        let myClothesM = inv.filter(function(x) { return x.startsWith('m'); });
        let myClothesF = inv.filter(function(x) { return x.startsWith('w'); });
        let myBgs = inv.filter(function(x) { return x.startsWith('bg'); });
        let myFoods = inv.filter(function(x) { return x.startsWith('f'); });
        let currentBg = globalPortalStudent.equippedBg || 'bg0';
        let equippedItem = myItems.length > 0 ? myItems[myItems.length - 1] : null;
        let equippedClothes = null;
        let allMyClothes = inv.filter(function(x) { return x.startsWith('m') || x.startsWith('w'); });
        if (allMyClothes.length > 0) equippedClothes = allMyClothes[allMyClothes.length - 1];

        const generateInvHtml = function(arrIds, dbData, equippedId) {
            if (arrIds.length === 0) return '<div class="col-12 text-center text-muted">ยังไม่มีของในหมวดนี้</div>';
            let out = '';
            arrIds.forEach(function(id) {
                let item = dbData.find(function(i) { return i.id === id; });
                if (!item) return;
                let isEquipped = (id === equippedId);
                let btn = isEquipped ? '<button class="btn btn-sm btn-success w-100 disabled">กำลังสวมใส่</button>' : '<button class="btn btn-sm btn-primary w-100 fw-bold" onclick="equipGearFromBag(\'' + item.id + '\')">สวมใส่</button>';
                out += '<div class="col-md-3 col-6"><div class="shop-item-card"><div class="shop-icon">' + item.icon + '</div><h6 class="fw-bold text-dark">' + item.name + '</h6><p class="small text-danger fw-bold mb-2">' + item.passive + '</p>' + btn + '</div></div>';
            });
            return out;
        };

        document.getElementById('invItemList').innerHTML = generateInvHtml(myItems, itemsData, equippedItem);
        document.getElementById('invClothesMList').innerHTML = generateInvHtml(myClothesM, maleClothesData, equippedClothes);
        document.getElementById('invClothesFList').innerHTML = generateInvHtml(myClothesF, femaleClothesData, equippedClothes);

        let htmlBgs = '';
        if (myBgs.length === 0) { htmlBgs = '<div class="col-12 text-center text-muted">ยังไม่มีฉากหลัง</div>';
        } else {
            myBgs.forEach(function(id) {
                let b = bgData.find(function(bg) { return bg.id === id; }); if (!b) return;
                let isEquipped = (b.id === currentBg);
                let btn = isEquipped ? '<button class="btn btn-sm btn-success w-100 disabled">กำลังใช้งาน</button>' : '<button class="btn btn-sm btn-info text-white w-100 fw-bold" onclick="equipBg(\'' + b.id + '\')">เปลี่ยนฉากพื้นหลัง</button>';
                htmlBgs += '<div class="col-md-4"><div class="shop-item-card"><div class="bg-preview" style="background: ' + b.css + ';"></div><h6 class="fw-bold">' + b.name + '</h6><p class="small text-danger fw-bold mb-2">' + b.passive + '</p>' + btn + '</div></div>';
            });
        }
        document.getElementById('invBgList').innerHTML = htmlBgs;

        let foodCounts = {}; myFoods.forEach(function(f) { foodCounts[f] = (foodCounts[f] || 0) + 1; });
        let htmlFoods = '';
        if (Object.keys(foodCounts).length === 0) { htmlFoods = '<div class="col-12 text-center text-muted">ยังไม่มีอาหาร</div>';
        } else {
            Object.keys(foodCounts).forEach(function(id) {
                let f = foodData.find(function(food) { return food.id === id; }); if (!f) return;
                htmlFoods += `
                    <div class="col-md-3 col-6">
                        <div class="shop-item-card">
                            <div class="shop-icon position-relative">${f.icon}
                                <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-white">x${foodCounts[id]}</span>
                            </div>
                            <h6 class="fw-bold">${f.name}</h6>
                            <p class="small text-primary fw-bold mb-2">คูณ *${f.multiplier} (${f.durationMin} นาที)</p>
                            <button class="btn btn-sm btn-danger w-100 fw-bold shadow-sm" onclick="useFoodFromBag('${f.id}', '${f.msg}')">ป้อนอาหาร</button>
                        </div>
                    </div>`;
            });
        }
        document.getElementById('invFoodList').innerHTML = htmlFoods;

        let myPowerups = inv.filter(function(x) { return x.startsWith('p'); });
        let powerupCounts = {}; myPowerups.forEach(function(p) { powerupCounts[p] = (powerupCounts[p] || 0) + 1; });
        let htmlPowerups = '';
        if (Object.keys(powerupCounts).length === 0) { htmlPowerups = '<div class="col-12 text-center text-muted">ยังไม่มีตัวช่วย ไปแลกที่ร้านค้าได้เลย!</div>'; }
        else {
            Object.keys(powerupCounts).forEach(function(id) {
                let p = powerupData.find(function(item) { return item.id === id; }); if (!p) return;
                htmlPowerups += '<div class="col-md-3 col-6"><div class="shop-item-card"><div class="shop-icon position-relative">' + p.icon + '<span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger fs-6 border border-white">x' + powerupCounts[id] + '</span></div><h6>' + p.name + '</h6><p class="small text-muted mb-0">กดใช้ในจอเกม Live Quiz</p></div></div>';
            });
        }
        document.getElementById('invPowerupList').innerHTML = htmlPowerups;
    }

    function equipGearFromBag(gearId) {
        window.isEquipping = true; 
        
        let inv = globalPortalStudent.inventory;
        let idx = inv.indexOf(gearId);
        if (idx > -1) { inv.splice(idx, 1); inv.push(gearId); }
        renderInventory();
        
        let foundItem = itemsData.find(function(i) { return i.id === gearId; });
        if (foundItem) document.getElementById('chibi-item').innerHTML = foundItem.icon;
        
        let foundClothes = [...maleClothesData, ...femaleClothesData].find(function(c) { return c.id === gearId; });
        if (foundClothes) {
            document.getElementById('chibi-clothes-icon').innerHTML = foundClothes.icon;
            document.getElementById('chibi-container').classList.add('wearing-custom');
        }
        
        google.script.run.withSuccessHandler(function(res) {
            if (res.success) {
                loadFullDashboard(globalPortalStudent.id, true);
                setTimeout(function() { window.isEquipping = false; }, 3000);
            } else { window.isEquipping = false; }
        }).equipGear(globalPortalStudent.id, gearId);
    }

    function useFoodFromBag(foodId, msg) {
        // ดึงข้อมูลอาหารจากฐานข้อมูล Global มาเช็คค่าบัฟ
        const foodItem = foodData.find(f => f.id === foodId);
        if (!foodItem) return;

        hideAppModal('inventoryModal');
        Swal.fire({ title: 'กำลังป้อนอาหารและรับบัฟ...', didOpen: function() { Swal.showLoading(); } });
        
        google.script.run.withSuccessHandler(function(res) {
            if (res.success) {
                Swal.close();
                let idx = globalPortalStudent.inventory.indexOf(foodId);
                if (idx > -1) globalPortalStudent.inventory.splice(idx, 1);
                
                const dragAva = document.getElementById('draggable-avatar');
                const dragBubble = document.getElementById('drag-bubble');
                window.isFeeding = true;
                if (window.feedTimer) clearTimeout(window.feedTimer);
                
                dragAva.classList.remove('anim-happy', 'anim-panic', 'anim-sleepy', 'anim-absent');
                void dragAva.offsetWidth; 
                dragAva.classList.add('anim-feed');
                dragBubble.innerText = msg; dragBubble.className = 'status-bubble text-white bg-danger border-0';
                
                window.feedTimer = setTimeout(function() { 
                    window.isFeeding = false; updatePetStatusLogic(); 
                }, 8000);
                
                loadFullDashboard(globalPortalStudent.id, true);
            } else { Swal.fire('ผิดพลาด', res.message, 'error'); }
            // ส่ง multiplier และ duration (แปลงเป็น ms) ไปให้ Backend
        }).consumePetFood(globalPortalStudent.id, foodId, foodItem.multiplier, (foodItem.durationMin * 60000));
    }

    function openShopModal() {
        document.getElementById('shopUserExp').innerText = globalPortalStudent.exp;
        renderShop(); showAppModal('shopModal');
    }

    function renderShop() {
        let inv = globalPortalStudent.inventory || [];
        const generateShopHtml = function(dbData, typeCode) {
            let out = '';
            dbData.forEach(function(item) {
                let isOwned = inv.includes(item.id);
                let btn = isOwned ? '<button class="btn btn-sm btn-success w-100 disabled"><i class="bi bi-check-circle-fill"></i> มีแล้ว</button>' : '<button class="btn btn-sm btn-primary w-100 fw-bold" onclick="buyItem(\'' + typeCode + '\', \'' + item.id + '\', ' + item.price + ')">แลก ' + item.price + ' EXP</button>';
                let passiveText = item.passive ? '<p class="small text-danger fw-bold mb-2">' + item.passive + '</p>' : '';
                out += '<div class="col-md-3 col-6"><div class="shop-item-card ' + (isOwned ? 'owned' : '') + '"><div class="shop-icon">' + item.icon + '</div><h6 class="text-dark fw-bold">' + item.name + '</h6>' + passiveText + btn + '</div></div>';
            });
            return out;
        };

        document.getElementById('shopItemList').innerHTML = generateShopHtml(itemsData, 'item');
        document.getElementById('shopClothesMList').innerHTML = generateShopHtml(maleClothesData, 'clothes');
        document.getElementById('shopClothesFList').innerHTML = generateShopHtml(femaleClothesData, 'clothes');

        let htmlBgs = '';
        bgData.forEach(function(b) {
            let isOwned = inv.includes(b.id);
            let btn = isOwned ? '<button class="btn btn-sm btn-success w-100 disabled">มีแล้ว</button>' : '<button class="btn btn-sm btn-warning w-100 fw-bold" onclick="buyItem(\'bg\', \'' + b.id + '\', ' + b.price + ')">แลก ' + b.price + ' EXP</button>';
            htmlBgs += '<div class="col-md-4"><div class="shop-item-card ' + (isOwned ? 'owned' : '') + '"><div class="bg-preview" style="background: ' + b.css + ';"></div><h6 class="fw-bold">' + b.name + '</h6><p class="small text-danger fw-bold mb-2">' + b.passive + '</p>' + btn + '</div></div>';
        });
        document.getElementById('shopBgList').innerHTML = htmlBgs;

        let htmlFoods = '';
        foodData.forEach(function(f) {
            htmlFoods += `
                <div class="col-md-3 col-6">
                    <div class="shop-item-card">
                        <div class="shop-icon">${f.icon}</div>
                        <h6 class="fw-bold text-dark">${f.name}</h6>
                        <div class="mb-2">
                            <div class="text-success fw-bold small"><i class="bi bi-lightning-charge-fill"></i> คูณ EXP *${f.multiplier}</div>
                            <div class="text-muted small" style="font-size:0.7rem;">ระยะเวลา: ${f.durationMin} นาที</div>
                        </div>
                        <button class="btn btn-sm btn-danger w-100 fw-bold shadow-sm" onclick="buyItem('food', '${f.id}', ${f.price})">แลก ${f.price.toLocaleString()} EXP</button>
                    </div>
                </div>`;
        });
        document.getElementById('shopFoodList').innerHTML = htmlFoods;

        // แยกโซนไอเท็มช่วยเล่นกับโซนแลกคะแนน
        let htmlHelper = '<div class="col-12 mb-2"><div class="badge bg-primary w-100 p-2 fs-6">🚀 ไอเท็มตัวช่วยเล่นเกม (กดใช้ใน Live Quiz)</div></div>';
        let htmlExchange = '<div class="col-12 mt-3 mb-2"><div class="badge bg-success w-100 p-2 fs-6">💰 โซนแลกคะแนนเก็บ (เข้าสมุดพก)</div></div>';
        
        powerupData.forEach(function(p) {
            let isOwned = inv.includes(p.id);
            let btn = isOwned ? '<button class="btn btn-sm btn-success w-100 disabled">มีแล้ว</button>' : '<button class="btn btn-sm btn-warning text-dark w-100 fw-bold" onclick="buyItem(\'powerup\', \'' + p.id + '\', ' + p.price + ')">แลก ' + p.price + ' EXP</button>';
            let cardHtml = '<div class="col-md-3 col-6"><div class="shop-item-card"><div class="shop-icon">' + p.icon + '</div><h6 class="fw-bold">' + p.name + '</h6><p class="small text-muted mb-2" style="min-height:35px;">' + p.msg + '</p>' + btn + '</div></div>';
            
            if(p.type === 'quiz_helper') htmlHelper += cardHtml;
            else if(p.type === 'score_exchange') htmlExchange += cardHtml;
        });
        document.getElementById('shopPowerupList').innerHTML = htmlHelper + htmlExchange;
    }

    function buyItem(type, id, price) {
        if (globalPortalStudent.exp < price) return Swal.fire('อ๊ะ!', 'EXP ไม่พอนะ ไปเรียนเพิ่มก่อนเถอะ!', 'warning');
        
        // 🌟 ตรวจสอบว่าเป็นรายการแลกคะแนนหรือไม่
        let scoreItem = powerupData.find(p => p.id === id && p.type === 'score_exchange');
        
        if (scoreItem) {
            // Logic สำหรับการแลกคะแนน (Hardcore Set)
            Swal.fire({ 
                title: 'ยืนยันการแลกคะแนน?', 
                text: 'คุณต้องการใช้ ' + price + ' EXP เพื่อแลก +' + scoreItem.amount + ' คะแนนใช่หรือไม่?', 
                icon: 'question', 
                showCancelButton: true,
                confirmButtonText: 'ยืนยันแลกเลย!',
                cancelButtonText: 'ยังก่อน'
            }).then((result) => {
                if (result.isConfirmed) {
                    Swal.fire({ title: 'กำลังร่ายเวทมนตร์แลกคะแนน...', didOpen: function() { Swal.showLoading(); } });
                    google.script.run.withSuccessHandler(function(res) {
                        if (res.success) {
                            Swal.fire('สำเร็จ!', res.message, 'success');
                            loadFullDashboard(globalPortalStudent.id, true); // รีโหลดข้อมูลเพื่ออัปเดตคะแนนที่โชว์
                        } else { Swal.fire('ผิดพลาด', res.message, 'error'); }
                    }).exchangeExpForScore(globalPortalStudent.id, scoreItem.amount, price);
                }
            });
        } else {
            // Logic เดิมสำหรับซื้อไอเท็มเข้ากระเป๋า (ห้ามลบ)
            Swal.fire({ title: 'กำลังแลกไอเท็มเข้ากระเป๋า...', didOpen: function() { Swal.showLoading(); } });
            google.script.run.withSuccessHandler(function(res) {
                if (res.success) {
                    globalPortalStudent.exp -= price;
                    if (!globalPortalStudent.inventory) globalPortalStudent.inventory = [];
                    globalPortalStudent.inventory.push(id);
                    document.getElementById('shopUserExp').innerText = globalPortalStudent.exp; 
                    document.getElementById('expText').innerText = globalPortalStudent.exp;
                    renderShop(); renderInventory();
                    Swal.fire({ toast: true, position: 'top', icon: 'success', title: 'ของเข้ากระเป๋าแล้ว!', showConfirmButton: false, timer: 1500 });
                    loadFullDashboard(globalPortalStudent.id, true);
                } else { Swal.fire('ผิดพลาด', res.message, 'error'); }
            }).buyPetItem(globalPortalStudent.id, type, id, price);
        }
    }

    function equipBg(bgId) {
        Swal.fire({ title: 'กำลังเปลี่ยนพื้นหลัง...', didOpen: function() { Swal.showLoading(); } });
        
        window.isEquipping = true;
        globalPortalStudent.equippedBg = bgId;
        let foundBg = bgData.find(function(b) { return b.id === bgId; });
        if (foundBg) { document.body.style.background = foundBg.css; }
        renderInventory();
        
        google.script.run.withSuccessHandler(function(res) {
            if (res.success) {
                Swal.fire({ toast: true, position: 'top', icon: 'success', title: 'เปลี่ยนฉากสำเร็จ', showConfirmButton: false, timer: 1500 });
                loadFullDashboard(globalPortalStudent.id, true);
                setTimeout(function() { window.isEquipping = false; }, 3000);
            } else { window.isEquipping = false; }
        }).equipPetBgOrItem(globalPortalStudent.id, bgId);
    }

    function logoutStudent() {
        Swal.fire({
            title: 'ออกจากระบบ?', icon: 'question', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#6c757d', confirmButtonText: '<i class="bi bi-box-arrow-right"></i> ออกจากระบบ', cancelButtonText: 'ยกเลิก'
        }).then(function(result) {
            if (result.isConfirmed) {
                // 🌟 จุดที่ 5: สั่งหยุด "เรดาร์" และ "Auto-Save" ทันที เพื่อล้างหน่วยความจำ
                if (window.dashboardRadarTimer) { 
                    clearInterval(window.dashboardRadarTimer); 
                    window.dashboardRadarTimer = null; 
                }
                if (window.autoSaveExpTimer) { 
                    clearInterval(window.autoSaveExpTimer); 
                    window.autoSaveExpTimer = null; 
                }

                if (typeof autoRefreshInterval !== 'undefined' && autoRefreshInterval !== null) { 
                    clearTimeout(autoRefreshInterval); 
                    autoRefreshInterval = null; 
                }
                
                localStorage.removeItem('studentId');
                
                // บังคับรีโหลดหน้าเว็บเพื่อล้างตัวแปร global ทั้งหมดให้สะอาด 100%
                location.reload(); 
            }
        });
    }

    function downloadMyReport() {
        if (globalPortalStudent) generateStudentPDF(globalPortalStudent.id, globalPortalStudent.room);
    }

    function changeStudentPinFlow() {
        Swal.fire({
            title: 'เปลี่ยนรหัสลับ', html: '<input type="password" id="oldStuPin" class="swal2-input" placeholder="รหัสเดิม"><input type="password" id="newStuPin" class="swal2-input" placeholder="ใหม่">', showCancelButton: true,
            preConfirm: function() {
                const o = Swal.getPopup().querySelector('#oldStuPin').value; const n = Swal.getPopup().querySelector('#newStuPin').value;
                if (!o || !n) Swal.showValidationMessage('กรอกให้ครบ'); return { oldPin: o, newPin: n };
            }
        }).then(function(r) {
            if (r.isConfirmed) {
                Swal.fire({ title: 'บันทึก...', didOpen: function() { Swal.showLoading(); } });
                google.script.run.withSuccessHandler(function(res) {
                    if (res.success) Swal.fire('สำเร็จ', res.message, 'success'); else Swal.fire('ผิดพลาด', res.message, 'error');
                }).updateStudentPin(globalPortalStudent.id, r.value.oldPin, r.value.newPin);
            }
        });
    }

    function openStudentLeave() {
        document.getElementById('studentLeaveDate').value = getLocalTodayStr(); document.getElementById('studentLeaveEndDate').value = getLocalTodayStr(); document.getElementById('studentLeaveReason').value = '';
        showAppModal('studentLeaveModal');
    }

    function applyLeaveTemplate(text) { document.getElementById('studentLeaveReason').value = text; }

    function submitLeave() {
        const d1 = document.getElementById('studentLeaveDate').value; const d2 = document.getElementById('studentLeaveEndDate').value; const r = document.getElementById('studentLeaveReason').value;
        if (!d1 || !d2 || !r) return Swal.fire('เตือน', 'กรุณาระบุข้อมูลให้ครบถ้วน', 'warning');
        if (d1 > d2) return Swal.fire('เตือน', 'วันที่เริ่มลาต้องไม่มากกว่าถึงวันที่', 'error');
        
        let finalDateStr = d1 === d2 ? d1 : d1 + ' ถึง ' + d2;
        google.script.run.withSuccessHandler(function() {
            hideAppModal('studentLeaveModal');
            Swal.fire('ส่งคำร้องสำเร็จ!', 'ระบบบันทึกแล้ว รอคุณครูอนุมัตินะครับ', 'success');
        }).submitLeaveRequest(globalPortalStudent.id, globalPortalStudent.name, globalPortalStudent.room, finalDateStr, r);
    }

    function showLevelModal() {
        let lvls = [ { exp: 0, name: "มือใหม่หัดเรียน", emoji: "🐣" }, { exp: 300, name: "นักเรียนฝึกหัด", emoji: "🐹" }, { exp: 800, name: "ผู้ใฝ่รู้", emoji: "🦊" }, { exp: 1500, name: "นักปราชญ์น้อย", emoji: "🦉" }, { exp: 2400, name: "จอมขยัน", emoji: "🐺" }, { exp: 3500, name: "ดาวรุ่งพุ่งแรง", emoji: "🦄" }, { exp: 4800, name: "นักสู้หัวกะทิ", emoji: "🦁" }, { exp: 6300, name: "ปรมาจารย์", emoji: "🦅" }, { exp: 8000, name: "ตำนานเดินดิน", emoji: "👑" }, { exp: 10000, name: "มหาเทพการเรียน", emoji: "💎" }, { exp: 12200, name: "ผู้หยั่งรู้", emoji: "🔮" }, { exp: 14600, name: "ทะลุขีดจำกัด", emoji: "🚀" }, { exp: 17200, name: "ผู้พิชิตดวงดาว", emoji: "🌠" }, { exp: 20000, name: "จักรพรรดิกาแล็กซี", emoji: "🌌" }, { exp: 23000, name: "ยอดมนุษย์", emoji: "⚡" }, { exp: 26200, name: "มังกรผงาด", emoji: "🐉" }, { exp: 29600, name: "เซียนเหนือเซียน", emoji: "⚜️" }, { exp: 33200, name: "จอมราชันย์", emoji: "🔱" }, { exp: 37000, name: "เทพเจ้าจุติ", emoji: "💠" }, { exp: 41000, name: "จ้าวแห่งจักรวาล", emoji: "♾️" } ];
        let currentExp = globalPortalStudent.exp; let html = '';
        lvls.forEach(function(lv, i) {
            let isCurrent = globalPortalStudent.level.current === (i + 1); let statusClass = currentExp >= lv.exp ? 'text-success' : 'text-muted'; let bgClass = isCurrent ? 'bg-primary text-white shadow-sm' : 'bg-light';
            let avatarUnlockText = '<br><small class="' + (isCurrent ? 'text-warning' : 'text-secondary') + '"><i class="bi bi-unlock-fill"></i> ปลดล็อคอวตารและลายโพสอิท ' + ((i * 10) + 1) + '-' + ((i + 1) * 10) + '</small>';
            html += '<div class="d-flex justify-content-between align-items-center p-3 mb-2 rounded ' + bgClass + '"><div><strong class="fs-5">' + lv.emoji + ' Lv.' + (i + 1) + ' ' + lv.name + '</strong> ' + avatarUnlockText + '</div><div class="fw-bold ' + (isCurrent ? 'text-white' : statusClass) + '">' + lv.exp + ' EXP</div></div>';
        });
        document.getElementById('levelListContainer').innerHTML = html;
        showAppModal('levelModal');
    }

    function showProfileReadOnly() {
        document.body.classList.remove('modal-open'); document.body.style.overflow = 'auto'; document.documentElement.style.overflow = 'auto';
        document.getElementById('profile-edit-section').style.display = 'none'; document.getElementById('profile-edit-section').classList.add('hidden');
        
        const view = document.getElementById('profile-view-section'); const p = globalPortalStudent.profile || {}; let dobText = '-';
        if (p.dob) { let parts = p.dob.split('-'); if (parts.length === 3) { const thMonths = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']; dobText = parseInt(parts[2]) + ' ' + thMonths[parseInt(parts[1]) - 1] + ' ' + parts[0]; } }
        
        let phtml = '<div class="col-md-6"><div class="profile-info-label">ชื่อเล่น</div><div class="profile-info-value">' + (p.nickname || '-') + '</div></div>';
        phtml += '<div class="col-md-6"><div class="profile-info-label">เพศ</div><div class="profile-info-value">' + (p.gender || '-') + '</div></div>';
        phtml += '<div class="col-md-6"><div class="profile-info-label">โรคประจำตัว</div><div class="profile-info-value text-danger">' + (p.disease || '-') + '</div></div>';
        phtml += '<div class="col-md-6"><div class="profile-info-label">วันเกิด</div><div class="profile-info-value">' + dobText + '</div></div>';
        phtml += '<div class="col-md-12"><div class="profile-info-label">กีฬาที่ชอบ</div><div class="profile-info-value">' + (p.sport || '-') + '</div></div>';
        phtml += '<div class="col-md-12"><div class="profile-info-label">ความสามารถพิเศษ</div><div class="profile-info-value">' + (p.talent || '-') + '</div></div>';
        phtml += '<div class="col-md-12"><div class="profile-info-label">งานอดิเรก</div><div class="profile-info-value">' + (p.hobby || '-') + '</div></div>';
        phtml += '<div class="col-12 mt-2 mb-0"><hr><h6 class="fw-bold text-secondary">ข้อมูลติดต่อและครอบครัว</h6></div>';
        phtml += '<div class="col-md-4"><div class="profile-info-label">เบอร์โทรส่วนตัว</div><div class="profile-info-value">' + (p.phone || '-') + '</div></div>';
        phtml += '<div class="col-md-4"><div class="profile-info-label">ชื่อบิดา</div><div class="profile-info-value">' + (p.father || '-') + '</div></div>';
        phtml += '<div class="col-md-4"><div class="profile-info-label">ชื่อมารดา</div><div class="profile-info-value">' + (p.mother || '-') + '</div></div>';
        phtml += '<div class="col-md-3"><div class="profile-info-label">บ้านเลขที่</div><div class="profile-info-value">' + (p.houseNo || '-') + '</div></div>';
        phtml += '<div class="col-md-3"><div class="profile-info-label">หมู่</div><div class="profile-info-value">' + (p.moo || '-') + '</div></div>';
        phtml += '<div class="col-md-6"><div class="profile-info-label">ตำบล</div><div class="profile-info-value">' + (p.subDistrict || '-') + '</div></div>';
        phtml += '<div class="col-md-4"><div class="profile-info-label">อำเภอ</div><div class="profile-info-value">' + (p.district || '-') + '</div></div>';
        phtml += '<div class="col-md-4"><div class="profile-info-label">จังหวัด</div><div class="profile-info-value">' + (p.province || '-') + '</div></div>';
        phtml += '<div class="col-md-4"><div class="profile-info-label">รหัสไปรษณีย์</div><div class="profile-info-value">' + (p.zipcode || '-') + '</div></div>';
        
        document.getElementById('profileDisplayData').innerHTML = phtml; view.classList.remove('hidden'); view.style.display = 'block';
    }

    function showEditProfile() {
        Swal.fire({ title: 'กำลังเปิดฟอร์มแก้ไข...', allowOutsideClick: false, didOpen: function() { Swal.showLoading(); } });
        setTimeout(function() {
            document.body.classList.remove('modal-open'); document.body.style.overflow = 'auto'; document.documentElement.style.overflow = 'auto';
            document.getElementById('profile-view-section').style.display = 'none'; document.getElementById('profile-view-section').classList.add('hidden');
            document.getElementById('profile-edit-section').classList.remove('hidden'); document.getElementById('profile-edit-section').style.display = 'block';
            Swal.close();
        }, 400); 
    }
    
    function openAvatarModal() {
        let currentLv = globalPortalStudent.level.current; let unlockedCount = currentLv * 10; let html = '';
        avatarSeeds.forEach(function(s, index) {
            if (index < unlockedCount) { let actClass = s === currentSelectedAvatarSeed ? 'active' : ''; html += '<img src="https://api.dicebear.com/9.x/adventurer/svg?seed=' + s + '" loading="lazy" class="avatar-item ' + actClass + '" onclick="selectAvatar(\'' + s + '\')">';
            } else { html += '<div class="avatar-item" style="filter: grayscale(100%); opacity: 0.4; cursor: not-allowed; position: relative;"><img src="https://api.dicebear.com/9.x/adventurer/svg?seed=' + s + '" loading="lazy" style="width:100%; height:100%; border-radius:50%;"><i class="bi bi-lock-fill text-danger position-absolute top-50 start-50 translate-middle fs-3"></i></div>'; }
        });
        document.getElementById('avatarSelectionList').innerHTML = html; showAppModal('avatarModal');
    }

    function selectAvatar(seed) { currentSelectedAvatarSeed = seed; document.querySelectorAll('.avatar-item').forEach(function(el) { el.classList.remove('active'); }); event.target.classList.add('active'); }

    function confirmAvatarChange() {
        window.isSavingProfile = true; 
        let avatarUrl = 'https://api.dicebear.com/9.x/adventurer/svg?seed=' + currentSelectedAvatarSeed;
        document.getElementById('mainAvatarImg').src = avatarUrl; const dragImg = document.getElementById('drag-avatar-img'); if (dragImg) dragImg.src = avatarUrl + '&backgroundColor=transparent';
        if (globalPortalStudent && globalPortalStudent.profile) { globalPortalStudent.profile.avatar = currentSelectedAvatarSeed; }
        saveStudentProfile(); hideAppModal('avatarModal');
    }
    
    function saveStudentProfile() {
        const btn = document.getElementById('btnSaveProfile');
        let y = document.getElementById('profDobYear').value; let m = document.getElementById('profDobMonth').value; let d = document.getElementById('profDobDay').value;
        let dobFormatted = (y && m && d) ? y + '-' + m + '-' + d : "";
        let selectedTalents = []; document.querySelectorAll('.talent-checkbox:checked').forEach(function(cb) { selectedTalents.push(cb.value); });
        let selectedHobbies = []; document.querySelectorAll('.hobby-checkbox:checked').forEach(function(cb) { selectedHobbies.push(cb.value); });
        
        if (btn) { btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> บันทึก...'; btn.disabled = true; }
        
        const pData = {
            nickname: document.getElementById('profNickname').value.trim(), gender: document.getElementById('profGender').value,
            disease: document.getElementById('profDisease').value.trim(), dob: dobFormatted, sport: document.getElementById('profSport').value,
            talent: selectedTalents.join(', '), hobby: selectedHobbies.join(', '), houseNo: document.getElementById('profHouseNo').value.trim(),
            moo: document.getElementById('profMoo').value.trim(), subDistrict: document.getElementById('profSubDistrict').value.trim(),
            district: document.getElementById('profDistrict').value.trim(), province: document.getElementById('profProvince').value.trim(),
            zipcode: document.getElementById('profZipcode').value.trim(), father: document.getElementById('profFather').value.trim(),
            mother: document.getElementById('profMother').value.trim(), phone: document.getElementById('profPhone').value.trim(),
            avatar: currentSelectedAvatarSeed
        };
        
        google.script.run.withSuccessHandler(function(res) {
            if (btn) { btn.innerHTML = '<i class="bi bi-save"></i> บันทึกข้อมูล'; btn.disabled = false; }
            if (res.success) {
                if (globalPortalStudent) globalPortalStudent.profile = pData;
                showProfileReadOnly();
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'บันทึกโปรไฟล์เรียบร้อย!', showConfirmButton: false, timer: 1500 });
                loadFullDashboard(globalPortalStudent.id, true);
                setTimeout(function() { window.isSavingProfile = false; }, 3000); 
            } else { 
                window.isSavingProfile = false; Swal.fire('ผิดพลาด', res.message, 'error'); 
            }
        }).updateStudentProfile(globalPortalStudent.id, pData);
    }
    
// 🟢 ฟังก์ชันดาวน์โหลด Auto E-Portfolio (เวอร์ชันสมบูรณ์ 100% - รวม Score และ Sync EXP)
    async function generateStudentPDF(studentId, roomName) {
        Swal.fire({ 
            title: 'กำลังสร้าง E-Portfolio...', 
            text: 'กำลังรวบรวมแฟ้มสะสมผลงานของคุณ', 
            allowOutsideClick: false, 
            didOpen: () => { Swal.showLoading(); } 
        });
        
        try {
            if(!supabaseClient) throw new Error("ไม่สามารถเชื่อมต่อฐานข้อมูลได้");
            const now = Date.now();

            // 1. ดึงข้อมูลนักเรียน
            let {data: s} = await supabaseClient.from('students').select('*').eq('id', studentId).single();
            if(!s) throw new Error("ไม่พบข้อมูลนักเรียน");

            let totalScore = s.accumulated_score || 0; 
            let baseExp = parseFloat(s.exp) || 0;
            let lastPassUpdate = parseInt(s.last_passive_update) || now;
            let inv = s.inventory || [];
            let eqBg = s.equipped_bg || "bg0";

            // คำนวณ Passive EXP
            let rate = 0;
            rate += getExpPerMs(eqBg);
            let myItems = inv.filter(x => x.startsWith('i'));
            if(myItems.length > 0) rate += getExpPerMs(myItems[myItems.length-1]);
            let myClothes = inv.filter(x => x.startsWith('m') || x.startsWith('w')); 
            if(myClothes.length > 0) rate += getExpPerMs(myClothes[myClothes.length-1]);
            
            let passiveGained = Math.floor((now - lastPassUpdate) * rate);
            if (passiveGained < 0) passiveGained = 0;

            // 2. คำนวณสถิติเข้าเรียนและโบนัส
            let atts = await supabaseClient.from('attendance').select('*').eq('student_id', studentId).then(r=>r.data||[]);
            let pres = 0, abs = 0, lea = 0, bonusAtt = 0;
            atts.forEach(a => { 
                if(a.status==='มา') { pres++; bonusAtt += 250; }
                else if(a.status==='ขาด') abs++; 
                else if(a.status==='ลา') lea++; 
            });

            // 3. ดึงงานเดี่ยวและผลงานที่มีรูปภาพ
            let tasks = await supabaseClient.from('tasks').select('*').eq('room', roomName).then(r=>r.data||[]);
            let subs = await supabaseClient.from('submissions').select('*').eq('student_id', studentId).then(r=>r.data||[]);
            let bonusTask = 0;

            subs.forEach(sub => {
                if (sub.status === 'ส่งแล้ว') {
                    let t = tasks.find(x => x.task_id === sub.task_id);
                    if (t) {
                        let dueStr = (t.due_date || "").replace(/-/g, '');
                        let subTimeParts = (sub.timestamp || "").split(' ')[0].split('-');
                        if (subTimeParts.length === 3) {
                            let subStr = `${subTimeParts[0]}${subTimeParts[1].padStart(2,'0')}${subTimeParts[2].padStart(2,'0')}`;
                            if (subStr <= dueStr) bonusTask += 500; else bonusTask += 250;
                        } else { bonusTask += 250; }
                    }
                }
            });

            // 4. ดึงงานกลุ่ม
            let gTasks = await supabaseClient.from('group_tasks').select('*').eq('room', roomName).then(r=>r.data||[]);
            let myGroups = []; let gSubs = [];
            if(gTasks.length > 0) {
                let tIds = gTasks.map(t=>t.task_id);
                let allGroups = await supabaseClient.from('groups').select('*').in('task_id', tIds).then(r=>r.data||[]);
                myGroups = allGroups.filter(g => (g.members||[]).includes(studentId));
                if(myGroups.length > 0) {
                    let gIds = myGroups.map(g=>g.group_id);
                    gSubs = await supabaseClient.from('group_submissions').select('*').in('group_id', gIds).then(r=>r.data||[]);
                }
            }

            // 5. รวมผล EXP สุทธิ และคำนวณ Level
            let finalExp = Math.floor(baseExp);
            let lvls = [ { exp: 0, name: "มือใหม่หัดเรียน", emoji: "🐣" }, { exp: 300, name: "นักเรียนฝึกหัด", emoji: "🐹" }, { exp: 800, name: "ผู้ใฝ่รู้", emoji: "🦊" }, { exp: 1500, name: "นักปราชญ์น้อย", emoji: "🦉" }, { exp: 2400, name: "จอมขยัน", emoji: "🐺" }, { exp: 3500, name: "ดาวรุ่งพุ่งแรง", emoji: "🦄" }, { exp: 4800, name: "นักสู้หัวกะทิ", emoji: "🦁" }, { exp: 6300, name: "ปรมาจารย์", emoji: "🦅" }, { exp: 8000, name: "ตำนานเดินดิน", emoji: "👑" }, { exp: 10000, name: "มหาเทพการเรียน", emoji: "💎" }, { exp: 12200, name: "ผู้หยั่งรู้", emoji: "🔮" }, { exp: 14600, name: "ทะลุขีดจำกัด", emoji: "🚀" }, { exp: 17200, name: "ผู้พิชิตดวงดาว", emoji: "🌠" }, { exp: 20000, name: "จักรพรรดิกาแล็กซี", emoji: "🌌" }, { exp: 23000, name: "ยอดมนุษย์", emoji: "⚡" }, { exp: 26200, name: "มังกรผงาด", emoji: "🐉" }, { exp: 29600, name: "เซียนเหนือเซียน", emoji: "⚜️" }, { exp: 33200, name: "จอมราชันย์", emoji: "🔱" }, { exp: 37000, name: "เทพเจ้าจุติ", emoji: "💠" }, { exp: 41000, name: "จ้าวแห่งจักรวาล", emoji: "♾️" } ];
            let currentLv = 1, lvName = lvls[0].name, lvEmoji = lvls[0].emoji;
            for(let i=0; i<lvls.length; i++) { if(finalExp >= lvls[i].exp) { currentLv = i + 1; lvName = lvls[i].name; lvEmoji = lvls[i].emoji; } }

            // 6. จัดกลุ่ม Gallery (รวมงานที่มีรูปทั้งหมด)
            let galleryItems = [];
            subs.filter(sub => sub.screenshot_url).forEach(sub => {
                let t = tasks.find(x => x.task_id === sub.task_id);
                galleryItems.push({ title: t ? t.title : 'ภารกิจเดี่ยว', score: sub.score, max: t ? t.max_score : '-', url: sub.screenshot_url });
            });
            gSubs.filter(sub => sub.screenshot_url).forEach(sub => {
                let t = gTasks.find(x => x.task_id === sub.task_id);
                galleryItems.push({ title: "👥 " + (t ? t.title : 'ภารกิจกลุ่ม'), score: sub.score, max: t ? t.max_score : '-', url: sub.screenshot_url });
            });

            // 7. วาด HTML ของ Showcase
            let galleryHtml = '';
            if(galleryItems.length > 0) {
                galleryItems.forEach(item => {
                    let scoreTxt = item.score ? `${item.score} / ${item.max} คะแนน` : `รอตรวจ (เต็ม ${item.max})`;
                    let scoreBg = item.score ? '#dcfce7' : '#fef3c7';
                    let scoreColor = item.score ? '#166534' : '#92400e';
                    galleryHtml += `
                        <div class="port-item">
                            <img src="${item.url}" alt="${item.title}">
                            <div class="port-item-info">
                                <h3 class="port-item-title">${item.title}</h3>
                                <div class="port-item-score" style="background: ${scoreBg}; color: ${scoreColor};"><i class="bi bi-star-fill"></i> ${scoreTxt}</div>
                            </div>
                        </div>`;
                });
            } else {
                galleryHtml = '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #94a3b8; background: #f8fafc; border-radius: 16px; border: 2px dashed #cbd5e1;">ยังไม่มีผลงานที่แนบรูปภาพมาเลยครับ 🖼️</div>';
            }

            let cleanName = s.name.replace(/^(เด็กชาย|เด็กหญิง|ด\.ช\.|ด\.ญ\.|นาย|นางสาว|นาง|คุณ)/g, '').trim();
            let avatarSeed = s.avatar || '1';
            let printDate = new Date().toLocaleDateString('th-TH');

            // 8. ประกอบร่าง HTML (เพิ่มกล่อง Score สีม่วง)
            let html = `
            <div class="portfolio-container">
                <div class="port-header">
                    <img src="https://api.dicebear.com/9.x/adventurer/svg?seed=${avatarSeed}&backgroundColor=transparent" class="port-avatar">
                    <div class="port-info">
                        <h1>${cleanName}</h1>
                        <p>รหัสประจำตัว: <strong>${s.id}</strong> &nbsp;|&nbsp; ระดับชั้น/ห้อง: <strong>${s.room}</strong></p>
                        <div class="port-level-badge">${lvEmoji} Lv.${currentLv} ${lvName} (${finalExp} EXP)</div>
                    </div>
                </div>

                <div class="port-stats">
                    <div class="port-stat-box" style="border-bottom: 4px solid #10b981;">
                        <h4>เข้าเรียน (มา)</h4>
                        <p class="val" style="color: #10b981;">${pres} <span style="font-size: 11pt; color: #64748b;">ครั้ง</span></p>
                    </div>
                    <div class="port-stat-box" style="border-bottom: 4px solid #f59e0b;">
                        <h4>ลากิจ/ป่วย</h4>
                        <p class="val" style="color: #f59e0b;">${lea} <span style="font-size: 11pt; color: #64748b;">ครั้ง</span></p>
                    </div>
                    <div class="port-stat-box" style="border-bottom: 4px solid #ef4444;">
                        <h4>ขาดเรียน</h4>
                        <p class="val" style="color: #ef4444;">${abs} <span style="font-size: 11pt; color: #64748b;">ครั้ง</span></p>
                    </div>
                    <div class="port-stat-box" style="border-bottom: 4px solid #0ea5e9;">
                        <h4>ผลงานในแฟ้ม</h4>
                        <p class="val" style="color: #0ea5e9;">${galleryItems.length} <span style="font-size: 11pt; color: #64748b;">ชิ้น</span></p>
                    </div>
                    <div class="port-stat-box" style="border-bottom: 4px solid #8b5cf6;">
                        <h4>คะแนนเก็บสะสม</h4>
                        <p class="val" style="color: #8b5cf6;">${totalScore} <span style="font-size: 11pt; color: #64748b;">แต้ม</span></p>
                    </div>
                </div>

                <div class="port-title-divider">
                    <h2>ผลงานเด่น (E-Portfolio Showcase)</h2>
                </div>

                <div class="port-gallery">
                    ${galleryHtml}
                </div>

                <div class="port-footer">
                    <p>เอกสารรับรองแฟ้มสะสมผลงาน สร้างอัตโนมัติเมื่อวันที่: ${printDate} โดยระบบ Smart Classroom</p>
                </div>
            </div>`;

            const printArea = document.getElementById('print-area');
            const mainApp = document.getElementById('main-app');
            const dragAva = document.getElementById('draggable-avatar');

            printArea.innerHTML = html;
            mainApp.classList.add('hidden');
            if(dragAva) dragAva.classList.add('hidden');
            printArea.classList.remove('hidden');
            Swal.close();

            Promise.all(Array.from(printArea.querySelectorAll('img')).filter(img => !img.complete).map(img => new Promise(resolve => { img.onload = img.onerror = resolve; }))).then(() => {
                setTimeout(function() {
                    window.print();
                    setTimeout(function() {
                        printArea.classList.add('hidden');
                        printArea.innerHTML = '';
                        mainApp.classList.remove('hidden');
                        if (!window.isPetHiddenByUser && globalPortalStudent && dragAva) {
                            dragAva.classList.remove('hidden');
                        }
                    }, 500);
                }, 300);
            });

        } catch(err) {
            Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถดึงข้อมูลได้: ' + err.message, 'error');
        }
    }

    // =====================================
    // AI CHAT SYSTEM 💬 (ระบบแชทกับเพื่อน จีมิน)
    // =====================================
    window.aiChatHistory = []; // ตัวแปรสำหรับจำประวัติการคุย
    window.isAiChatInit = false; // เช็คว่าเคยให้ AI ทักมาหรือยัง

    // ฟังก์ชันทำงานตอนกางกล่องแชทครั้งแรก
    window.triggerAiChatOnce = function() {
        if (window.isAiChatInit) return;
        window.isAiChatInit = true;
        
        const placeholder = document.getElementById('aiChatPlaceholder');
        if (placeholder) placeholder.style.display = 'none';

        // ส่งข้อความกระตุ้นให้ AI เป็นคนเริ่มทักทายก่อน (ข้อความนี้จะไม่โชว์ในแชทฝั่งเด็ก)
        callAiBackend("ทักทายและดูสถานะการเรียนของฉันให้หน่อย แนะนำตัวด้วยนะว่าชื่อจีมิน", true);
    };

    // ฟังก์ชันสร้างลูกโป่งข้อความ (Bubble) ซ้าย-ขวา
    function appendChatBubble(text, sender) {
        const chatBox = document.getElementById('aiChatHistory');
        if (!chatBox) return;
        const row = document.createElement('div');
        row.className = 'chat-msg-row ' + sender; // 'user' (ขวา) หรือ 'bot' (ซ้าย)
        
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble ' + sender;
        bubble.innerHTML = text;
        
        row.appendChild(bubble);
        chatBox.appendChild(row);
        chatBox.scrollTop = chatBox.scrollHeight; // เลื่อนจอลงล่างสุดอัตโนมัติ
    }

    // แอนิเมชันจุดไข่ปลา
    function showTypingIndicator() {
        const chatBox = document.getElementById('aiChatHistory');
        if (!chatBox) return;
        const row = document.createElement('div');
        row.className = 'chat-msg-row bot typing-row';
        row.id = 'aiTypingIndicator';
        
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble bot';
        bubble.innerHTML = '<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';
        
        row.appendChild(bubble);
        chatBox.appendChild(row);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function removeTypingIndicator() {
        const indicator = document.getElementById('aiTypingIndicator');
        if (indicator) indicator.remove();
    }

    // ฟังก์ชันเมื่อเด็กกดปุ่มส่งข้อความ
    window.sendAiChatMessage = function() {
        const input = document.getElementById('aiChatInput');
        if (!input) return;
        const text = input.value.trim();
        if (!text) return;

        // 1. โชว์ข้อความเด็กในหน้าจอ
        appendChatBubble(text, 'user');
        input.value = ''; // ล้างช่องพิมพ์
        
        // 2. เก็บประวัติไว้ส่งให้ AI รู้ว่าคุยอะไรไป
        window.aiChatHistory.push({ role: 'user', text: text });

        // 3. ซ่อน Placeholder (ถ้ายังมีอยู่)
        const placeholder = document.getElementById('aiChatPlaceholder');
        if (placeholder) placeholder.style.display = 'none';

        // 4. ส่งไปหาหลังบ้าน
        callAiBackend(text, false);
    };

    // ฟังก์ชันส่งข้อมูลไปหา Gemini (รหัส.gs)
    function callAiBackend(userText, isInitial = false) {
        if (!globalPortalStudent) return;
        
        showTypingIndicator(); // โชว์จุดไข่ปลา
        
        const btn = document.getElementById('btnSendAiChat');
        const input = document.getElementById('aiChatInput');
        if(btn) btn.disabled = true;
        if(input) input.disabled = true;

        // 🌟 ส่งข้อมูลโปรไฟล์ส่วนตัวแบบ 100% ไปให้จีมินทำความรู้จัก
        const payload = {
            name: globalPortalStudent.profile.nickname || globalPortalStudent.name.split(' ')[0],
            fullName: globalPortalStudent.name, // ส่งชื่อจริง
            profile: globalPortalStudent.profile, // ส่งข้อมูลโปรไฟล์ทั้งหมด กีฬา, งานอดิเรก
            pres: globalPortalStudent.attendance.present,
            leave: globalPortalStudent.attendance.leave,
            abs: globalPortalStudent.attendance.absent,
            done: globalPortalStudent.work.done,
            pending: globalPortalStudent.pendingCount,
            exp: globalPortalStudent.exp,
            allTasks: globalPortalStudent.work.allTasks, 
            userMessage: userText, 
            chatHistory: window.aiChatHistory 
        };

        google.script.run.withSuccessHandler(function(res) {
            removeTypingIndicator(); // ลบจุดไข่ปลา
            if(btn) btn.disabled = false;
            if(input) { input.disabled = false; input.focus(); } // คืนสถานะให้พิมพ์ต่อได้

            if (res.success) {
                // โชว์คำตอบของจีมิน
                appendChatBubble(res.text, 'bot');
                
                // เก็บคำตอบจีมินลงประวัติ
                window.aiChatHistory.push({ role: 'model', text: res.text });
                
                // ถ้าเป็นการเปิดแชทครั้งแรก ให้แอบเก็บประโยคที่ระบบใช้กระตุ้น AI ลงไปด้วยเพื่อความเนียน
                if (isInitial) {
                    window.aiChatHistory.unshift({ role: 'user', text: "ทักทายและดูสถานะการเรียนของฉันให้หน่อย แนะนำตัวด้วยนะว่าชื่อจีมิน" });
                }
            } else {
                appendChatBubble('<span class="text-danger"><i class="bi bi-wifi-off"></i> ' + res.message + '</span>', 'bot');
                // ถ้าตอบกลับล้มเหลว ให้ลบข้อความของเด็กล่าสุดออกจากประวัติ ป้องกัน AI สับสน
                if(!isInitial) window.aiChatHistory.pop();
            }
        }).analyzeStudentBehaviorWithGemini(payload);
    }

    // =========================================================
    // ⚔️ RPG BOSS FIGHT - STUDENT LOGIC
    // =========================================================

    let currentBossData = null;
    let currentQuestionIndex = 0;
    let currentCorrectCount = 0;

    window.bossRealtimeChannel = null; // ตัวแปรสำหรับเปิด/ปิดท่อดูเลือดบอส
    // =========================================================
    // 🛡️ SYSTEM CORE: RADAR & AUTO-SAVE (ระบบคุมเสถียรภาพ)
    // =========================================================
    window.dashboardRadarTimer = null;
    window.autoSaveExpTimer = null;

    // 1. ระบบเรดาร์ ตรวจจับบอสและควิซทุกๆ 5 วินาที (ไม่จองท่อ Realtime ค้าง)
    function startDashboardRadar() {
        if (!globalPortalStudent || !supabaseClient) return;
        
        checkCurrentLiveQuiz();
        checkActiveBoss();
        
        if (!window.dashboardRadarTimer) {
            window.dashboardRadarTimer = setInterval(() => {
                if (!globalPortalStudent) {
                    clearInterval(window.dashboardRadarTimer);
                    window.dashboardRadarTimer = null;
                    return;
                }
                checkCurrentLiveQuiz();
                checkActiveBoss();
            }, 5000);
        }
    }

    // 2. ระบบ Auto-Save แอบเซฟ EXP ทุกๆ 2 นาที
    function startAutoSaveExp() {
        if (window.autoSaveExpTimer) clearInterval(window.autoSaveExpTimer);
        window.autoSaveExpTimer = setInterval(async () => {
            if (!globalPortalStudent || !supabaseClient) return;
            try {
                let now = Date.now();
                let eqBg = globalPortalStudent.equippedBg || "bg0";
                let inv = globalPortalStudent.inventory || [];
                
                let totalExpPerMs = 0; 
                totalExpPerMs += getExpPerMs(eqBg);
                let myItems = inv.filter(x => x.startsWith('i'));
                if(myItems.length > 0) totalExpPerMs += getExpPerMs(myItems[myItems.length-1]);
                let myClothes = inv.filter(x => x.startsWith('m') || x.startsWith('w')); 
                if(myClothes.length > 0) totalExpPerMs += getExpPerMs(myClothes[myClothes.length-1]);

                if (totalExpPerMs <= 0) return; // ไม่มีของเพิ่มแต้ม ไม่ต้องเซฟ

                let { data: s } = await supabaseClient.from('students').select('exp, last_passive_update, buff_multiplier, buff_end_at').eq('id', globalPortalStudent.id).single();
                if (s) {
                    let dbExp = parseFloat(s.exp) || 0;
                    let dbLastPass = parseInt(s.last_passive_update) || now;
                    let dbBuffMult = parseFloat(s.buff_multiplier) || 1.0;
                    let dbBuffEnd = parseInt(s.buff_end_at) || 0;
                    
                    let timePassed = now - dbLastPass;
                    let currentMult = (now < dbBuffEnd) ? dbBuffMult : 1.0;
                    let addedExp = Math.floor((timePassed * totalExpPerMs) * currentMult);
                    
                    if (addedExp > 0) {
                        let newExp = dbExp + addedExp;
                        await supabaseClient.from('students').update({
                            exp: newExp,
                            last_passive_update: now
                        }).eq('id', globalPortalStudent.id);
                        
                        // อัปเดตหน้าจอเงียบๆ โดยไม่กวนเด็ก
                        globalPortalStudent.exp = newExp;
                        globalPortalStudent.last_passive_update = now;
                        
                        let expEl = document.getElementById('expText');
                        if(expEl) expEl.innerText = newExp;
                        let shopExpEl = document.getElementById('shopUserExp');
                        if(shopExpEl) shopExpEl.innerText = newExp;
                        
                        let expPct = (globalPortalStudent.level.next === "Max") ? 100 : Math.min(100, Math.round((newExp / globalPortalStudent.level.next) * 100));
                        let bar = document.getElementById('expProgressBar');
                        if(bar) bar.style.width = expPct + '%';
                    }
                }
            } catch(e) {}
        }, 120000); // 120000 ms = 2 นาที
    }

    // 3. ฟังก์ชันสแกนหาบอส ดึงข้อมูลตรงจาก Supabase ไร้ดีเลย์
    async function checkActiveBoss() {
        if (!globalPortalStudent || !supabaseClient) return;
        try {
            let { data: bosses } = await supabaseClient.from('boss_quizzes')
                .select('*')
                .eq('room_name', globalPortalStudent.room)
                .eq('status', 'active')
                .order('id', { ascending: false })
                .limit(1);

            const alertWidget = document.getElementById('bossAlertWidget');
            if (bosses && bosses.length > 0) {
                let boss = bosses[0];
                let { data: logs } = await supabaseClient.from('boss_logs')
                    .select('id').eq('boss_id', boss.id).eq('student_id', globalPortalStudent.id).limit(1);
                
                let alreadyFought = (logs && logs.length > 0);
                if (!alreadyFought && boss.boss_hp > 0) {
                    currentBossData = {
                        bossId: boss.id, bossName: boss.boss_name, topic: boss.topic,
                        hp: boss.boss_hp, maxHp: boss.boss_max_hp,
                        questions: typeof boss.questions_json === 'string' ? JSON.parse(boss.questions_json) : boss.questions_json
                    };
                    if(alertWidget) alertWidget.classList.remove('hidden');
                } else {
                    if(alertWidget) alertWidget.classList.add('hidden');
                    currentBossData = null;
                }
            } else {
                if(alertWidget) alertWidget.classList.add('hidden');
                currentBossData = null;
            }
        } catch (e) {}
    }

    // 4. แก้ไข loadFullDashboard ให้สตาร์ทเครื่องยนต์ Radar และ Auto-Save
    const originalLoadFullDashboard = window.loadFullDashboard;
    window.loadFullDashboard = async function(studentId, isSilent) {
        await originalLoadFullDashboard(studentId, isSilent);
        startDashboardRadar();
        startAutoSaveExp();
    };

    window.bossRealtimeChannel = null;

    function startBossBattle() {
        if (!currentBossData) return;
        
        // 🌟 1. เปิดท่อดักฟังเลือดบอสแบบ Real-time ทันทีที่เข้าหน้าตีบอส
        if (supabaseClient) {
            // ถ้ามีท่อเก่าค้างอยู่ให้ปิดก่อน
            if (window.bossRealtimeChannel) supabaseClient.removeChannel(window.bossRealtimeChannel);

            window.bossRealtimeChannel = supabaseClient.channel('realtime-boss-hp')
                .on('postgres_changes', { 
                    event: 'PATCH', 
                    schema: 'public', 
                    table: 'boss_quizzes', 
                    filter: `id=eq.${currentBossData.bossId}` 
                }, payload => {
                    const newHp = payload.new.boss_hp;
                    // อัปเดตหลอดเลือดบนจอเด็กทุกคนทันที
                    updateBossHpUI_Realtime(newHp, currentBossData.maxHp); 
                    
                    // 🌟 2. ถ้าเลือดเหลือ 0 (เพื่อนคนอื่นฆ่าตาย) ให้เด้งออกทันที!
                    if (newHp <= 0) {
                        finishBossBattleEarly("บอสถูกพิชิตแล้ว! ⚔️");
                    }
                })
                .subscribe();
        }

        currentQuestionIndex = 0; 
        currentCorrectCount = 0;
        
        let bossParts = currentBossData.bossName.split('|');
        let bIcon = bossParts.length > 1 ? bossParts[0] : '👾';
        let bName = bossParts.length > 1 ? bossParts[1] : currentBossData.bossName;

        document.getElementById('bbBossName').innerText = bName;
        document.getElementById('bbBossTopic').innerText = "หัวข้อ: " + currentBossData.topic;
        document.getElementById('bbBossIcon').innerText = bIcon;
        
        updateBossHpUI(currentBossData.hp, currentBossData.maxHp);
        loadBossQuestion();
        showAppModal('bossBattleModal');
    }

    // 1. โหลดคำถามขึ้นหน้าจอ (เปลี่ยนจากเลข 5 เป็น นับจำนวนข้อจริง)
    function loadBossQuestion() {
        const qData = currentBossData.questions[currentQuestionIndex];
        const totalQ = currentBossData.questions.length; // นับจำนวนข้อจริงที่ AI สร้างมา
        
        document.getElementById('bbQuestionCounter').innerText = `ข้อที่ ${currentQuestionIndex + 1} / ${totalQ}`;
        document.getElementById('bbQuestionText').innerText = qData.q;
        
        let optionsHtml = '';
        let shuffledOptions = [...qData.options].sort(() => Math.random() - 0.5);
        
        shuffledOptions.forEach((opt, idx) => {
            let safeOpt = opt.replace(/'/g, "\\'").replace(/"/g, "&quot;");
            let safeAns = qData.answer.replace(/'/g, "\\'").replace(/"/g, "&quot;");
            optionsHtml += `
                <div class="col-md-6">
                    <button class="btn btn-outline-light w-100 p-3 fw-bold text-start boss-opt-btn" 
                            style="border: 2px solid #ced4da; color: #333; font-size: 1.1rem; border-radius: 10px;" 
                            onclick="selectBossAnswer(this, '${safeOpt}', '${safeAns}')">
                        ${idx + 1}. ${opt}
                    </button>
                </div>
            `;
        });
        
        document.getElementById('bbOptionsContainer').innerHTML = optionsHtml;
    }

    function selectBossAnswer(btnElement, selected, correct) {
        const allBtns = document.querySelectorAll('.boss-opt-btn');
        allBtns.forEach(b => b.disabled = true);
        
        if (selected === correct) {
            btnElement.classList.replace('btn-outline-light', 'btn-success');
            btnElement.style.color = "#fff";
            currentCorrectCount++;
            playAttackAnimation(10); 
            
            // 🌟 ส่งดาเมจไปหักเลือดในฐานข้อมูลทันที
            google.script.run.withSuccessHandler(function(res) {
                if(res.isDead) {
                    finishBossBattleEarly("คุณปลิดชีพเจ้าบอสตัวนี้สำเร็จ! 🏆");
                    return; 
                }
            }).sendBossHit(currentBossData.bossId, globalPortalStudent.id);
        } else {
            btnElement.classList.replace('btn-outline-light', 'btn-danger');
            btnElement.style.color = "#fff";
            allBtns.forEach(b => {
                if (b.innerText.includes(correct)) {
                    b.classList.replace('btn-outline-light', 'btn-success');
                    b.style.color = "#fff";
                }
            });
            Toast.fire({ icon: 'error', title: 'โจมตีพลาด! 💨' });
        }
        
        setTimeout(() => {
            currentQuestionIndex++;
            if (currentQuestionIndex < currentBossData.questions.length) {
                loadBossQuestion();
            } else {
                finishBossBattle(); // จบกรณีตอบครบแต่บอสไม่ตาย
            }
        }, 1500);
    }

    // เอฟเฟกต์ตีบอส
    function playAttackAnimation(damage) {
        // แอนิเมชันบอสกระตุก (เปลี่ยนมาใช้กับ ID ใหม่ของ Emoji)
        const bossIcon = document.getElementById('bbBossIcon');
        bossIcon.style.transform = 'translateX(20px) scale(0.8)'; 
        bossIcon.style.textShadow = '0 0 30px red, 0 0 50px darkred'; // สั่นสีแดง
        
        const dmgText = document.getElementById('bbDamageText');
        dmgText.innerText = "-" + damage; dmgText.classList.remove('hidden'); dmgText.style.animation = 'jumpFeed 0.5s ease-out';
        
        setTimeout(() => { 
            bossIcon.style.transform = 'translateX(0) scale(1)'; 
            bossIcon.style.textShadow = '0 10px 15px rgba(0,0,0,0.5)';
            dmgText.classList.add('hidden'); dmgText.style.animation = 'none'; 
        }, 500);
        
        currentBossData.hp -= damage; updateBossHpUI(currentBossData.hp, currentBossData.maxHp);
    }

    function updateBossHpUI(hp, maxHp) {
        if (hp < 0) hp = 0;
        const pct = Math.max(0, Math.round((hp / maxHp) * 100));
        document.getElementById('bbHpText').innerText = `${hp} / ${maxHp}`;
        document.getElementById('bbHpBar').style.width = pct + '%';
    }

    function resetBossBattle() {
        checkActiveBoss(); // โหลดใหม่เผื่อปุ่มต้องซ่อน
    }

    // 3. สรุปผลหลังตอบครบทุกข้อ (กรณีบอสยังไม่ตาย)
    function finishBossBattle() {
        if (window.bossRealtimeChannel) {
            supabaseClient.removeChannel(window.bossRealtimeChannel);
            window.bossRealtimeChannel = null;
        }
        
        Swal.fire({
            title: 'จบการต่อสู้!',
            text: 'คุณทำเต็มที่แล้ว! ระบบบันทึก EXP ที่ได้จากการโจมตีเรียบร้อย',
            icon: 'info',
            timer: 2500,
            showConfirmButton: false
        }).then(() => {
            hideAppModal('bossBattleModal');
            loadFullDashboard(globalPortalStudent.id, true);
        });
    }

    // =========================================================
    // ⚡ LIVE QUIZ BATTLE - STUDENT LOGIC
    // =========================================================

    let sqSessionData = null;
    let sqQuestionStartMs = 0;
    let sqHasAnswered = false;
    let sqTimerInterval = null;
    let sqCurrentCorrectAnswer = "";
    let sqLastSeenQIndex = -1; 
    let sqHasJoined = false; // ตัวแปรจำว่ากดเข้าร่วมหรือยัง
    let activePowerUp = null; // ตัวแปรเก็บไอเทมที่กดใช้ในข้อนั้นๆ
    let sqHasChangedAnswer = false; // 🌟 เพิ่มตัวแปรเช็คว่าเคยใช้สิทธิ์เปลี่ยนคำตอบไปหรือยัง

    window.liveQuizSyncTimer = null; 
    window.liveQuizRealtimeChannel = null; // 🌟 เพิ่มตัวแปรเก็บสายตรง Realtime

    // --- ส่วนนี้คือตัวแปรที่ต้องมีไว้ด้านบนสุดของโซน Live Quiz ---
    window.liveQuizRealtimeChannel = null; 

    // ฟังก์ชันที่ 1: "ยามเฝ้าประตู" (เช็คทุก 5 วินาทีว่ามีเกมไหม)
    async function checkCurrentLiveQuiz() {
        if (!globalPortalStudent || !supabaseClient) return;
        try {
            // ดึงข้อมูลล่าสุดจากตาราง live_quiz_sessions
            let { data: syncData } = await supabaseClient.from('live_quiz_sessions')
                .select('*')
                .eq('room_name', globalPortalStudent.room)
                .order('created_at', { ascending: false })
                .limit(1);
            
            if (syncData && syncData.length > 0) {
                // ถ้าข้อมูลเปลี่ยน (เช่น ครูเปลี่ยนข้อ หรือเปลี่ยนสถานะ) ให้ส่งไปจัดการต่อ
                let isChanged = !sqSessionData || 
                                sqSessionData.status !== syncData[0].status || 
                                sqSessionData.current_q_index !== syncData[0].current_q_index;
                
                if (isChanged) handleLiveQuizChange(syncData[0]);
            } else if (sqSessionData) {
                // ถ้าเคยมีเกมแต่ตอนนี้หายไป (ครูลบห้อง) ให้สั่งปิดหน้าจอ
                forceCloseLiveQuiz();
            }
        } catch(e) { console.error("Radar Sync Error:", e); }
    }

    // ฟังก์ชันที่ 2: "ตัวจัดการหน้าจอ" (เปิดท่อ Realtime และโชว์โจทย์)
    async function handleLiveQuizChange(sessionData) {
        // บันทึกข้อมูลเซสชันปัจจุบันไว้ในตัวแปรหลัก
        if (sqSessionData && sqSessionData.id === sessionData.id) {
            if (!sessionData.questions_json) sessionData.questions_json = sqSessionData.questions_json;
        }
        if (typeof sessionData.questions_json === 'string') {
            try { sessionData.questions_json = JSON.parse(sessionData.questions_json); } catch(e) {}
        }
        sqSessionData = sessionData;

        // 🌟 ไฮไลท์: ถ้ายังไม่มีท่อ Realtime ให้เปิดเฉพาะตอนเริ่มเกมนี้เท่านั้น!
        if (!window.liveQuizRealtimeChannel) {
            window.liveQuizRealtimeChannel = supabaseClient.channel('live-quiz-' + sessionData.id)
                .on('postgres_changes', { 
                    event: '*', 
                    schema: 'public', 
                    table: 'live_quiz_sessions', 
                    filter: 'id=eq.' + sessionData.id 
                }, payload => {
                    if (payload.eventType === 'DELETE') forceCloseLiveQuiz();
                    else if (payload.new) handleLiveQuizChange(payload.new);
                })
                .on('postgres_changes', { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'live_quiz_responses', 
                    filter: 'session_id=eq.' + sessionData.id 
                }, payload => {
                    // ดึงรายชื่อปาร์ตี้แบบ Realtime
                    if (payload.new.q_index === -1) {
                        const area = document.getElementById('partySelectionArea');
                        if (area && !sqHasJoined) renderPartySelection(); 
                    }
                })
                .subscribe();
        }

        // --- ส่วนการจัดการแสดงผล Modal (เหมือนเดิม) ---
        const modal = document.getElementById('studentLiveQuizModal');
        const bsModal = bootstrap.Modal.getOrCreateInstance(modal);

        // เช็คว่าเด็กเข้าทันไหม
        if (sessionData.status !== 'setup' && !sqHasJoined) {
            forceCloseLiveQuiz(); 
            return; 
        }

        if (!modal.classList.contains('show')) bsModal.show();

        // รีเซ็ตสถานะเมื่อเปลี่ยนข้อ
        if (sessionData.current_q_index !== sqLastSeenQIndex) {
            sqHasAnswered = false;
            sqHasChangedAnswer = false;
            sqLastSeenQIndex = sessionData.current_q_index;
        }

        // เช็คสถานะเกมแล้วเปลี่ยนหน้าจอ (Play, Result, Leaderboard)
        if (sessionData.status === 'setup') showSqScreen('wait');
        else if (sessionData.status === 'show_question') renderSqQuestionOnly(sessionData);
        else if (sessionData.status === 'active') { if (!sqHasAnswered) renderSqQuestion(sessionData); }
        else if (sessionData.status === 'show_answer') { showSqScreen('result'); checkSqResult(); }
        else if (sessionData.status === 'show_leaderboard') { showSqScreen('leaderboard'); calculateAndShowLeaderboard(); }
    }

    // ฟังก์ชันสลับหน้าจอ (รอ -> เล่น -> เฉลย -> อันดับ)
    function showSqScreen(screenType) {
        document.getElementById('sqWaitScreen').classList.add('hidden');
        document.getElementById('sqPlayScreen').classList.add('hidden');
        document.getElementById('sqResultScreen').classList.add('hidden');
        
        let leadScreen = document.getElementById('sqLeaderboardScreen');
        if(leadScreen) leadScreen.classList.add('hidden');

        if(screenType === 'wait') document.getElementById('sqWaitScreen').classList.remove('hidden');
        if(screenType === 'play') document.getElementById('sqPlayScreen').classList.remove('hidden');
        if(screenType === 'result') document.getElementById('sqResultScreen').classList.remove('hidden');
        if(screenType === 'leaderboard' && leadScreen) leadScreen.classList.remove('hidden');
    }

    function renderSqQuestionOnly(sessionData) {
        if(sqTimerInterval) clearInterval(sqTimerInterval); // 🌟 แก้บั๊กตัวเลขนับถอยหลังผีหลอก
        showSqScreen('play');
        const qIndex = sessionData.current_q_index;
        
        let questions = [];
        if (sessionData && sessionData.questions_json) {
            if (Array.isArray(sessionData.questions_json)) {
                questions = sessionData.questions_json;
            } else if (sessionData.questions_json.questions) {
                questions = sessionData.questions_json.questions;
            } else {
                for (let key in sessionData.questions_json) {
                    if (Array.isArray(sessionData.questions_json[key])) {
                        questions = sessionData.questions_json[key];
                        break;
                    }
                }
            }
        }
        
        const qData = questions[qIndex];
        
        if (!qData) {
            document.getElementById('sqQuestionText').innerHTML = "<span class='text-danger'>เกิดข้อผิดพลาดในการดึงคำถาม<br>กรุณารอคุณครูรีเฟรชคำถามใหม่ครับ</span>";
            document.getElementById('sqTimer').innerText = "0.0";
            return;
        }

        document.getElementById('sqQuestionNumber').innerText = `ข้อที่ ${qIndex + 1} / ${questions.length}`;
        document.getElementById('sqQuestionText').innerText = qData.q;

        document.getElementById('sqOptionsContainer').innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="spinner-grow text-warning mb-3" style="width: 3rem; height: 3rem;" role="status"></div>
                <h3 class="text-white fw-bold">ตั้งใจอ่านโจทย์ให้ดีนะ...<br>ตัวเลือกจะปรากฏเร็วๆ นี้ ⏳</h3>
            </div>
        `;

        document.getElementById('sqTimer').innerText = "READY";
        // --- START: SHOW POWERUPS DURING READING PHASE ---
        let myPowerups = globalPortalStudent.inventory.filter(x => x.startsWith('p'));
        let pCounts = {}; myPowerups.forEach(p => pCounts[p] = (pCounts[p] || 0) + 1);
        
        let puHtml = '';
        powerupData.filter(p => p.type === 'quiz_helper').forEach(p => {
            let count = pCounts[p.id] || 0;
            let btnClass = count > 0 ? 'btn-warning text-dark' : 'btn-secondary text-white opacity-50';
            let clickAttr = count > 0 ? `onclick="activatePowerUp('${p.id}')"` : '';
            puHtml += `<button id="btnPu_${p.id}" class="btn ${btnClass} rounded-pill fw-bold shadow-sm px-3" ${clickAttr} title="${p.msg}">
                ${p.icon} ${p.name} <span class="badge bg-danger ms-1">${count}</span>
            </button>`;
        });
        document.getElementById('sqPowerupsContainer').innerHTML = puHtml;
// --- END: SHOW POWERUPS DURING READING PHASE --- 
    }

    // --- START: OVERWRITE RENDER QUESTION (HIDE ITEMS WHEN CHOICES APPEAR) ---
    function renderSqQuestion(sessionData) {
        showSqScreen('play');
        const qIndex = sessionData.current_q_index;

        let oldAction = document.getElementById('sqAnswerActionArea'); 
        if(oldAction) oldAction.remove();
        
        let questions = [];
        if (sessionData && sessionData.questions_json) {
            if (Array.isArray(sessionData.questions_json)) {
                questions = sessionData.questions_json;
            } else if (sessionData.questions_json.questions) {
                questions = sessionData.questions_json.questions;
            } else {
                for (let key in sessionData.questions_json) {
                    if (Array.isArray(sessionData.questions_json[key])) {
                        questions = sessionData.questions_json[key];
                        break;
                    }
                }
            }
        }
        
        const qData = questions[qIndex];
        
        if (!qData) {
            document.getElementById('sqQuestionText').innerHTML = "<span class='text-danger'>เกิดข้อผิดพลาดในการดึงคำถาม</span>";
            document.getElementById('sqTimer').innerText = "0.0";
            return;
        }

        sqCurrentCorrectAnswer = qData.answer;
        
        document.getElementById('sqQuestionNumber').innerText = `ข้อที่ ${qIndex + 1} / ${questions.length}`;
        document.getElementById('sqQuestionText').innerText = qData.q;

        const shapes = ['▲', '◆', '●', '■'];
        const colors = ['quiz-color-1', 'quiz-color-2', 'quiz-color-3', 'quiz-color-4'];
        
        let html = '';
        qData.options.forEach((opt, idx) => {
            let safeOpt = opt.replace(/'/g, "\\'").replace(/"/g, "&quot;");
            html += `
                <div class="col-6">
                    <button class="quiz-btn-gigantic ${colors[idx]}" onclick="submitSqAnswer(this, '${safeOpt}')">
                        <div class="quiz-shape-icon">${shapes[idx]}</div>
                        ${opt}
                    </button>
                </div>
            `;
        });
        document.getElementById('sqOptionsContainer').innerHTML = html;

        // 🌟 [จุดที่แก้ไข]: ล้างพื้นที่ปุ่มไอเทมออกทันทีเมื่อช้อยส์มา เพื่อเพิ่มพื้นที่หน้าจอ
        // แต่วงจรการทำงานของไอเทม (ขอบจอเรืองแสง/เวลาหยุด) จะยังคงอยู่จากค่าใน activePowerUp
        document.getElementById('sqPowerupsContainer').innerHTML = ""; 

        // รักษาสถานะเอฟเฟกต์ทางสายตา (ถ้ามีการกดใช้ตอนอ่านโจทย์ไปแล้ว)
        if (!activePowerUp) {
            document.getElementById('sqPlayScreen').style.border = "none";
            document.getElementById('sqPlayScreen').style.boxShadow = "none";
            document.getElementById('sqTimer').classList.remove('text-info');
        }

        sqQuestionStartMs = Date.now();
        let sqTimeLeft = 30.0;
        
        // จัดการ Timer ตามสถานะไอเทม
        if (activePowerUp === 'p2') {
            document.getElementById('sqTimer').innerText = "FREEZE";
        } else {
            document.getElementById('sqTimer').innerText = sqTimeLeft.toFixed(1);
        }
        
        if(sqTimerInterval) clearInterval(sqTimerInterval);
        
        if (activePowerUp !== 'p2') {
            sqTimerInterval = setInterval(() => {
                sqTimeLeft -= 0.1;
                if (sqTimeLeft <= 0) {
                    sqTimeLeft = 0;
                    clearInterval(sqTimerInterval);
                    document.getElementById('sqTimer').innerText = "0.0";
                    if (!sqHasAnswered) {
                        submitSqAnswer(null, "TIMEOUT_NO_ANSWER");
                    }
                } else {
                    document.getElementById('sqTimer').innerText = sqTimeLeft.toFixed(1);
                }
            }, 100);
        }
    }
    // --- END: OVERWRITE RENDER QUESTION ---

    window.activatePowerUp = function(pId) {
        if (sqHasAnswered || activePowerUp) return; // กดใช้ได้ทีละ 1 ชิ้น และห้ามกดหลังตอบแล้ว
        
        Swal.fire({
            title: 'ใช้ไอเทม?', text: 'ต้องการใช้งานในข้อนี้ใช่หรือไม่?', icon: 'question', showCancelButton: true, confirmButtonText: 'ใช้เลย!', cancelButtonText: 'เก็บไว้ก่อน'
        }).then((result) => {
            if(result.isConfirmed) {
                // หักไอเทมจากกระเป๋าในหน้าเว็บทันที
                let idx = globalPortalStudent.inventory.indexOf(pId);
                if (idx > -1) {
                    globalPortalStudent.inventory.splice(idx, 1);
                    // สั่งให้ระบบหลังบ้าน (Backend) หักไอเทมในฐานข้อมูลให้ชัวร์ๆ
                    google.script.run.consumePetFood(globalPortalStudent.id, pId);
                }
                
                activePowerUp = pId;
                
                // ล็อกปุ่มไอเทมทั้งหมดไม่ให้กดซ้ำ
                document.querySelectorAll('[id^="btnPu_"]').forEach(b => {
                    b.classList.replace('btn-warning', 'btn-secondary');
                    b.classList.replace('text-dark', 'text-white');
                    b.classList.add('opacity-50');
                    b.onclick = null;
                });
                
                // เอฟเฟกต์การออกฤทธิ์
                if (pId === 'p1') {
                    Toast.fire({ icon: 'success', title: '🗡️ ดาบทำงาน! ตัดช้อยส์ผิด 2 ข้อ' });
                    const allBtns = document.querySelectorAll('.quiz-btn-gigantic');
                    let wrongBtns = [];
                    allBtns.forEach(b => { if (!b.innerText.includes(sqCurrentCorrectAnswer)) wrongBtns.push(b); });
                    wrongBtns.sort(() => 0.5 - Math.random()).slice(0, 2).forEach(b => {
                        b.disabled = true; b.style.opacity = '0.2'; b.innerHTML = '<i class="bi bi-slash-circle fs-1"></i>';
                    });
                } else if (pId === 'p2') {
                    Toast.fire({ icon: 'success', title: '❄️ แช่แข็งเวลา! ได้โบนัสเต็ม' });
                    if(sqTimerInterval) clearInterval(sqTimerInterval);
                    document.getElementById('sqTimer').innerText = "FREEZE"; document.getElementById('sqTimer').classList.add('text-info');
                } else if (pId === 'p3') {
                    Toast.fire({ icon: 'success', title: '🛡️ กางโล่! กันพลาดเรียบร้อย' });
                    document.getElementById('sqPlayScreen').style.border = "4px solid #f1c40f"; document.getElementById('sqPlayScreen').style.boxShadow = "0 0 20px #f1c40f";
                } else if (pId === 'p4') {
                    Toast.fire({ icon: 'success', title: '🚀 คูณสอง! ตอบให้ถูกนะ' });
                    document.getElementById('sqPlayScreen').style.border = "4px solid #00d2ff";
                } else if (pId === 'p5') {
                    Toast.fire({ icon: 'success', title: '💎 ทวีคูณ x3! จัดไปวัยรุ่น' });
                    document.getElementById('sqPlayScreen').style.border = "4px solid #ff00cc";
                } else if (pId === 'p6') {
                    Toast.fire({ icon: 'success', title: '🎫 ใช้บัตรผ่าน! รับ 100 EXP ทันที' });
                    submitSqAnswer(null, "POWERUP_PASS_KEY"); // ส่งคำตอบพิเศษไปที่เบื้องหลัง
                }
            }
        });
    };

// --- แก้ไขจุดที่ 1: กดเข้าคนเดียวแล้วเปลี่ยนหน้าทันที ---
    async function joinLiveQuiz() {
        if (sqHasJoined) return;
        sqHasJoined = true;
        
        // สั่งเปลี่ยนหน้าจอ UI ทันทีไม่ต้องรอฐานข้อมูลตอบกลับ
        document.getElementById('sqWaitText').innerHTML = 'เข้าร่วมคนเดียวเรียบร้อย!<br>เตรียมตัวให้พร้อม... รอสัญญาณจากครู';
        document.getElementById('partyActionArea').innerHTML = ''; // ล้างปุ่มออกทันที
        
        try {
            await supabaseClient.from('live_quiz_responses').insert({
                session_id: sqSessionData.id,
                q_index: -1, 
                student_id: globalPortalStudent.id,
                answer: 'JOINED',
                response_time: 0,
                is_correct: false
            });
        } catch(e) {
            console.error("Error joining quiz:", e);
        }
    }

    // 5. เมื่อนักเรียนกดเลือกคำตอบ
    async function submitSqAnswer(btnElement, selectedAnswer) {
        if (sqHasAnswered) return;
        sqHasAnswered = true;

        let responseTime = Date.now() - sqQuestionStartMs;
        if (activePowerUp === 'p2') responseTime = 0; 
        const isCorrect = (selectedAnswer === sqCurrentCorrectAnswer);

        // จัดการ UI: ไฮไลท์ข้อที่กด และล็อกปุ่มทั้งหมด
        if (btnElement) {
            btnElement.style.border = "6px solid white";
            btnElement.style.transform = "scale(1.05)";
        }
        const allBtns = document.querySelectorAll('.quiz-btn-gigantic');
        allBtns.forEach(b => b.disabled = true);

        try {
            if (!window.windowPartyMembers || window.windowPartyMembers.length === 0) {
                window.windowPartyMembers = [globalPortalStudent.id];
            }

            const partyTasks = window.windowPartyMembers.map(async sid => {
                let finalAnswer = selectedAnswer;
                if (sqHasChangedAnswer && finalAnswer !== "TIMEOUT_NO_ANSWER") {
                    finalAnswer += "|CHANGED";
                }

                if (sqHasChangedAnswer) {
                    return supabaseClient.from('live_quiz_responses').update({
                        answer: finalAnswer,
                        response_time: responseTime,
                        is_correct: isCorrect
                    })
                    .eq('session_id', sqSessionData.id)
                    .eq('q_index', sqSessionData.current_q_index)
                    .eq('student_id', sid);
                } else {
                    return supabaseClient.from('live_quiz_responses').insert({
                        session_id: sqSessionData.id,
                        q_index: sqSessionData.current_q_index,
                        student_id: sid,
                        answer: finalAnswer,
                        response_time: responseTime,
                        is_correct: isCorrect
                    });
                }
            });

            await Promise.all(partyTasks);

            if (!isCorrect && activePowerUp === 'p3' && !sqHasChangedAnswer) {
                window.windowPartyMembers.forEach(sid => google.script.run.addManualEXP(sid, 75));
            }
        } catch(e) { console.error("Party Submit Error:", e); }

        // 🌟 สร้างพื้นที่แจ้งสถานะและปุ่ม "เปลี่ยนคำตอบ" ต่อท้ายกล่องช้อยส์
        let actionArea = document.getElementById('sqAnswerActionArea');
        if (!actionArea) {
            actionArea = document.createElement('div');
            actionArea.id = 'sqAnswerActionArea';
            actionArea.className = 'col-12 text-center mt-3';
            document.getElementById('sqOptionsContainer').appendChild(actionArea);
        }

        let currentTimerText = document.getElementById('sqTimer').innerText;

        if (selectedAnswer === "TIMEOUT_NO_ANSWER") {
            actionArea.innerHTML = `<h5 class="text-danger fw-bold bg-white p-2 rounded shadow"><i class="bi bi-clock-history"></i> หมดเวลาส่งคำตอบ!</h5>`;
        } else {
            let changeBtnHtml = '';
            
            // เช็คว่ายังไม่หมดเวลา และยังไม่เคยเปลี่ยนคำตอบ
            if (!sqHasChangedAnswer && currentTimerText !== "0.0" && currentTimerText !== "TIMEOUT") {
                changeBtnHtml = `
                    <div class="mt-2">
                        <button class="btn btn-warning btn-lg rounded-pill fw-bold px-4 shadow-sm" onclick="allowChangeSqAnswer()">
                            <i class="bi bi-arrow-repeat"></i> เปลี่ยนใจตอบข้ออื่น
                        </button>
                        <div class="small text-white mt-2" style="text-shadow: 1px 1px 2px #000;">
                            (กดได้แค่ 1 ครั้ง/ข้อ | EXP จะถูกหัก 50%)
                        </div>
                    </div>
                `;
            }

            actionArea.innerHTML = `
                <div class="p-3 bg-dark bg-opacity-50 rounded-4 shadow-sm border border-white">
                    <h5 class="text-success fw-bold text-white mb-0"><i class="bi bi-check-circle-fill"></i> ส่งคำตอบแล้ว! รอดูเฉลย</h5>
                    ${changeBtnHtml}
                </div>
            `;
        }
    }

    window.allowChangeSqAnswer = function() {
        sqHasAnswered = false; 
        sqHasChangedAnswer = true; 
        
        // ลบกล่องปุ่มเปลี่ยนคำตอบทิ้งไปเลย (ใช้ได้แค่ครั้งเดียว)
        let actionArea = document.getElementById('sqAnswerActionArea');
        if(actionArea) actionArea.remove();

        // ปลดล็อกปุ่มช้อยส์ให้กลับมากดใหม่ได้
        const allBtns = document.querySelectorAll('.quiz-btn-gigantic');
        allBtns.forEach(b => {
            b.disabled = false;
            b.style.border = "none";
            b.style.transform = "scale(1)";
        });
    };

// 6. เมื่อครูกดโชว์เฉลย ให้เช็คผลลัพธ์ของตัวเอง
    async function checkSqResult() {
        const screen = document.getElementById('sqResultScreen');
        const icon = document.getElementById('sqResultIcon');
        const text = document.getElementById('sqResultText');
        const sub = document.getElementById('sqResultSubText');

        screen.className = 'w-100'; // รีเซ็ตคลาสสีเก่า

        // 🌟 ดึงข้อมูลคำถามและคำอธิบาย (Explanation) จาก Session ปัจจุบัน
        const questions = Array.isArray(sqSessionData.questions_json) ? sqSessionData.questions_json : (sqSessionData.questions_json.questions || []);
        const qData = questions[sqSessionData.current_q_index];
        
        // ดึงข้อความเฉลย และ คำอธิบาย
        const explanationText = (qData && qData.explanation) ? qData.explanation : "ไม่มีคำอธิบายเพิ่มเติม";
        const correctAnswerText = (qData && qData.answer) ? qData.answer : "-";

        // ดึงผลลัพธ์ที่ตัวเองตอบไว้จาก Database
        let { data } = await supabaseClient.from('live_quiz_responses')
            .select('is_correct, response_time')
            .eq('session_id', sqSessionData.id)
            .eq('q_index', sqSessionData.current_q_index)
            .eq('student_id', globalPortalStudent.id)
            .single();

        let expAndBonusHtml = '';
        
        // แทรกกล่องเฉลยเข้าไปใน HTML
        let explanationHtml = `
            <div class="mt-3 p-2 bg-white rounded shadow-sm text-dark text-center" style="font-size: 1rem; max-width: 90%; margin: 0 auto; border: 2px solid #198754;">
                <b class="text-success"><i class="bi bi-check-circle-fill"></i> เฉลย:</b> ${correctAnswerText}
            </div>
            <div class="mt-2 p-3 bg-white rounded shadow-sm text-dark text-start" style="font-size: 0.95rem; max-width: 90%; margin: 0 auto; border-left: 5px solid #0d6efd;">
                <b class="text-primary"><i class="bi bi-lightbulb-fill text-warning"></i> คำอธิบาย:</b><br>${explanationText}
            </div>
        `;

        if (data) {
            if (data.is_correct) {
                screen.style.background = '';
                screen.classList.add('anim-correct');
                icon.innerText = '✅';
                text.innerText = 'ยอดเยี่ยม! ตอบถูกต้อง';
                
                // จำลองคำนวณโบนัสเวลา
                let timeBonus = 0;
                if (data.response_time < 10000) timeBonus = Math.floor((10000 - data.response_time) / 66.6);
                if (timeBonus < 0) timeBonus = 0; if (timeBonus > 150) timeBonus = 150;
                
                expAndBonusHtml = `<span class="badge bg-warning text-dark mt-3 fs-5 shadow-sm">+150 EXP | โบนัสความเร็ว +${timeBonus}</span>`;
                sub.innerHTML = `ตอบใน ${(data.response_time/1000).toFixed(2)} วินาที<br>${expAndBonusHtml}${explanationHtml}`;
            } else {
                if (activePowerUp === 'p3') {
                    screen.classList.add('anim-correct');
                    screen.style.background = 'linear-gradient(135deg, #f1c40f 0%, #e67e22 100%)';
                    icon.innerText = '🛡️';
                    text.innerText = 'รอดหวุดหวิด!';
                    expAndBonusHtml = `<span class="badge bg-dark text-white mt-3 fs-5 shadow-sm">+75 EXP (ปลอบใจ)</span>`;
                    sub.innerHTML = `ตอบผิด แต่โล่ทำงาน!<br>${expAndBonusHtml}${explanationHtml}`;
                } else {
                    screen.style.background = ''; // รีเซ็ตสี
                    screen.classList.add('anim-wrong');
                    icon.innerText = '❌';
                    text.innerText = 'ว้า... ผิดไปนิดเดียว';
                    sub.innerHTML = `ตั้งสติแล้วพยายามใหม่ในข้อถัดไปนะ!<br>${explanationHtml}`;
                }
            }
        } else {
            // กรณีหมดเวลา หรือหลุด
            screen.classList.add('anim-wrong');
            icon.innerText = '⏳';
            text.innerText = 'หมดเวลา!';
            sub.innerHTML = `คุณไม่ได้ส่งคำตอบในข้อนี้<br>${explanationHtml}`;
        }
    }

    // 7. นักเรียนกดปุ่ม "รอลุยข้อต่อไป" (หลังดูเฉลยเสร็จ)
    function backToWaitScreen() {
        showSqScreen('wait');
        document.getElementById('sqWaitText').innerHTML = 'เตรียมลุยข้อต่อไป...<br>รอสัญญาณจากครู';
        sqHasAnswered = false; // ปลดล็อกให้พร้อมรับข้อใหม่
    }

    // 8. จบเกมและปิดหน้าจอ
    function forceCloseLiveQuiz() {
        sqSessionData = null;
        sqHasAnswered = false;
        sqLastSeenQIndex = -1;
        sqHasJoined = false; 
        if(sqTimerInterval) clearInterval(sqTimerInterval);
        
        // 🌟 จุดที่ 4: สั่งทำลายท่อ Realtime ทันทีเมื่อจบเกม เพื่อคืนโควตาให้เพื่อนห้องอื่น
        if (window.liveQuizRealtimeChannel) {
            supabaseClient.removeChannel(window.liveQuizRealtimeChannel);
            window.liveQuizRealtimeChannel = null;
        }
        
        hideAppModal('studentLiveQuizModal');
    }

    // =========================================================
    // 🛡️ ระบบป้องกันเด็กสลับแอป / พับหน้าจอ (Auto-Sync)
    // =========================================================
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
            // ทันทีที่เด็กเปิดแอป/แท็บนี้กลับขึ้นมา ให้ดึงข้อมูลสถานะล่าสุดทันที
            if (globalPortalStudent && typeof checkCurrentLiveQuiz === 'function') {
                checkCurrentLiveQuiz(); 
            }
            // สั่งอัปเดตบอสเผื่อไว้ด้วยเลย จะได้ไม่พลาดอะไรทั้งนั้น
            if (globalPortalStudent && typeof checkActiveBoss === 'function') {
                checkActiveBoss();
            }
        }
    });

    // ฟังก์ชันวาดแท่นรางวัล Top 5 (คำนวณแบบ Real-time ตรงจาก DB)
    async function calculateAndShowLeaderboard() {
        if (!supabaseClient || !sqSessionData) return;

        document.getElementById('podiumContainer').innerHTML = '<div class="spinner-border text-light mt-5"></div>';
        document.getElementById('runnerUpContainer').innerHTML = '';

        // 1. ดึงคำตอบทั้งหมดของรอบนี้
        let { data: responses } = await supabaseClient.from('live_quiz_responses').select('*').eq('session_id', sqSessionData.id);
        
        let scores = {};
        if(responses) {
            responses.forEach(r => {
                if(r.is_correct && r.q_index >= 0) {
                    let timeBonus = 0;
                    if (r.response_time < 10000) timeBonus = Math.floor((10000 - r.response_time) / 100);
                    if (timeBonus < 0) timeBonus = 0; if (timeBonus > 100) timeBonus = 100;
                    let pts = 100 + timeBonus;
                    if(!scores[r.student_id]) scores[r.student_id] = 0;
                    scores[r.student_id] += pts;
                }
            });
        }

        // เรียงอันดับคนคะแนนเยอะสุด 5 อันดับแรก
        let sortedIds = Object.keys(scores).sort((a,b) => scores[b] - scores[a]).slice(0, 5);

        if (sortedIds.length === 0) {
            document.getElementById('podiumContainer').innerHTML = '<h4 class="text-white mt-5">ไม่มีใครได้คะแนนเลยในรอบนี้ 😅</h4>';
            return;
        }

        // 2. ดึงรูปและชื่อของคนที่ติด Top 5
        let { data: topStudents } = await supabaseClient.from('students').select('id, name, nickname, avatar').in('id', sortedIds);
        
        let topMap = {};
        if(topStudents) {
            topStudents.forEach(s => {
                let dName = s.nickname ? s.nickname : s.name.split(' ')[0];
                topMap[s.id] = { name: dName, avatar: s.avatar || '1' };
            });
        }

        let first = sortedIds[0] ? { id: sortedIds[0], ...topMap[sortedIds[0]], score: scores[sortedIds[0]] } : null;
        let second = sortedIds[1] ? { id: sortedIds[1], ...topMap[sortedIds[1]], score: scores[sortedIds[1]] } : null;
        let third = sortedIds[2] ? { id: sortedIds[2], ...topMap[sortedIds[2]], score: scores[sortedIds[2]] } : null;

        // 3. วาดแท่นรับรางวัล (เรียงซ้ายไปขวา: 2 -> 1 -> 3)
        let podiumHtml = '';
        
        if (second && second.name) {
            podiumHtml += `
            <div class="podium-step podium-2 shadow">
                <img src="https://api.dicebear.com/9.x/adventurer/svg?seed=${second.avatar}&backgroundColor=transparent" class="podium-avatar">
                <div class="podium-name">${second.name}</div>
                <div class="podium-score">${second.score}</div>
                <div class="fs-2 mb-1">2</div>
            </div>`;
        }
        if (first && first.name) {
            podiumHtml += `
            <div class="podium-step podium-1 shadow">
                <i class="bi bi-crown-fill text-white" style="position:absolute; top:-35px; font-size:2.5rem; animation: floatHappy 2s infinite;"></i>
                <img src="https://api.dicebear.com/9.x/adventurer/svg?seed=${first.avatar}&backgroundColor=transparent" class="podium-avatar" style="border-color:#ffd700; width:70px; height:70px;">
                <div class="podium-name">${first.name}</div>
                <div class="podium-score">${first.score}</div>
                <div class="fs-1 fw-bold mb-1">1</div>
            </div>`;
        }
        if (third && third.name) {
            podiumHtml += `
            <div class="podium-step podium-3 shadow">
                <img src="https://api.dicebear.com/9.x/adventurer/svg?seed=${third.avatar}&backgroundColor=transparent" class="podium-avatar">
                <div class="podium-name">${third.name}</div>
                <div class="podium-score">${third.score}</div>
                <div class="fs-3 mb-1">3</div>
            </div>`;
        }

        document.getElementById('podiumContainer').innerHTML = podiumHtml;

        // 4. วาดอันดับ 4-5 (Runner up) แบบลิสต์ด้านล่าง
        let runnerHtml = '';
        for(let i = 3; i < sortedIds.length; i++) {
            let p = sortedIds[i];
            let info = topMap[p];
            if(info && info.name) {
                runnerHtml += `
                <div class="runner-up-item">
                    <div class="d-flex align-items-center gap-3">
                        <span class="badge bg-secondary rounded-pill fs-6">${i+1}</span>
                        <img src="https://api.dicebear.com/9.x/adventurer/svg?seed=${info.avatar}&backgroundColor=transparent" style="width:35px; height:35px; border-radius:50%; background:#e2e8f0;">
                        <span class="fw-bold text-dark fs-6">${info.name}</span>
                    </div>
                    <span class="fw-bold text-primary fs-6">${scores[p]} pts</span>
                </div>`;
            }
        }
        document.getElementById('runnerUpContainer').innerHTML = runnerHtml;
    }

// --- START GIFT FEATURE LOGIC ---
window.openGiftModal = async function() {
    if (!globalPortalStudent) return;
    
    // รีเซ็ตค่าเริ่มต้น
    document.getElementById('giftReceiverId').innerHTML = '<option value="">-- กำลังโหลดรายชื่อเพื่อน... --</option>';
    document.getElementById('giftItemList').innerHTML = '';
    document.getElementById('giftExpAmount').value = '';
    document.getElementById('giftMyCurrentExp').innerText = globalPortalStudent.exp;
    
    showAppModal('giftModal');

    try {
        // 1. ดึงรายชื่อเพื่อนในห้องเดียวกัน
        let { data: friends } = await supabaseClient
            .from('students')
            .select('id, name, nickname')
            .eq('room', globalPortalStudent.room)
            .neq('id', globalPortalStudent.id) // ไม่เอาตัวเอง
            .order('id', { ascending: true });

        let html = '<option value="">-- เลือกชื่อเพื่อนที่นี่ --</option>';
        (friends || []).forEach(f => {
            let dName = f.name.replace(/^(เด็กชาย|เด็กหญิง|ด\.ช\.|ด\.ญ\.|นาย|นางสาว|นาง|คุณ)/g, '').trim();
            if (f.nickname) dName += ` (${f.nickname})`;
            html += `<option value="${f.id}">${f.id} - ${dName}</option>`;
        });
        document.getElementById('giftReceiverId').innerHTML = html;

        // 2. โหลดไอเทมในกระเป๋าเตรียมไว้
        renderGiftInventory();

    } catch (e) {
        console.error("Gift error:", e);
    }
};

window.renderGiftInventory = function() {
    const container = document.getElementById('giftItemList');
    let inv = globalPortalStudent.inventory || [];
    
    // กรองเฉพาะไอเทม (i) และอาหาร (f)
    let giftables = inv.filter(id => id.startsWith('i') || id.startsWith('f'));
    
    if (giftables.length === 0) {
        container.innerHTML = '<div class="col-12 text-center py-4 text-muted">ไม่มีไอเทมที่ส่งได้ในกระเป๋า</div>';
        return;
    }

    let html = '';
    giftables.forEach((id, index) => {
        let item = [...itemsData, ...foodData].find(x => x.id === id);
        if (!item) return;
        
        html += `
            <div class="col-4 col-md-3">
                <input type="radio" class="btn-check" name="selectedGiftItem" id="gift_${index}" value="${id}" data-name="${item.name}" data-icon="${item.icon}">
                <label class="btn btn-outline-danger w-100 p-2 gift-item-label h-100" for="gift_${index}">
                    <div class="fs-2">${item.icon}</div>
                    <div style="font-size: 0.75rem;" class="fw-bold">${item.name}</div>
                </label>
            </div>
        `;
    });
    container.innerHTML = html;
};

window.processFinalGift = function() {
    const receiverId = document.getElementById('giftReceiverId').value;
    const activeTab = document.querySelector('#giftTabs .nav-link.active').innerText.includes('ไอเทม') ? 'item' : 'exp';
    const btn = document.getElementById('btnConfirmGift');

    if (!receiverId) return Swal.fire('เตือน', 'เลือกเพื่อนผู้รับด้วยนะครับ', 'warning');

    let payload = {
        senderId: globalPortalStudent.id,
        receiverId: receiverId,
        type: activeTab,
        room: globalPortalStudent.room
    };

    if (activeTab === 'item') {
        const selected = document.querySelector('input[name="selectedGiftItem"]:checked');
        if (!selected) return Swal.fire('เตือน', 'กรุณาเลือกไอเทม 1 ชิ้นที่จะส่งครับ', 'warning');
        payload.itemId = selected.value;
        payload.itemName = selected.dataset.name;
        payload.itemIcon = selected.dataset.icon;
    } else {
        const amount = Math.floor(Number(document.getElementById('giftExpAmount').value));
        const myExp = Math.floor(Number(globalPortalStudent.exp));

        if (!amount || amount <= 0) return Swal.fire('เตือน', 'ระบุจำนวน EXP ให้ถูกต้องนะครับ', 'warning');
        if (amount > myExp) return Swal.fire('เตือน', 'EXP ของคุณมีไม่พอนะครับ', 'error');

        payload.amount = amount;
    }

    Swal.fire({
        title: 'ยืนยันการส่งของขวัญ?',
        text: 'เมื่อส่งแล้วจะไม่สามารถเรียกคืนได้นะครับ',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#ff4757',
        confirmButtonText: 'ส่งเลย!'
    }).then((result) => {
        if (result.isConfirmed) {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> กำลังนำส่งของขวัญ...';
            
            google.script.run.withSuccessHandler(function(res) {
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-send-check-fill"></i> ยืนยันการส่งของขวัญ';
                if (res.success) {
                    Swal.fire('สำเร็จ!', res.message, 'success');
                    hideAppModal('giftModal');
                    loadFullDashboard(globalPortalStudent.id, true);
                } else {
                    Swal.fire('ผิดพลาด', res.message, 'error');
                }
            }).handleGiftTransfer(payload);
        }
    });
};

window.openPartySetup = function() {
    // 🌟 บังคับให้หัวหน้าปาร์ตี้อยู่ในรายชื่อคนแรกเสมอ
    window.windowPartyMembers = [globalPortalStudent.id];

    document.getElementById('sqWaitText').innerHTML = `
        <div class="p-3 bg-white rounded-4 shadow-sm mb-3 text-dark mx-auto" style="max-width:400px;">
            <h5 class="fw-bold text-primary"><i class="bi bi-person-plus-fill"></i> ดึงเพื่อนเข้าปาร์ตี้</h5>
            <p class="small text-muted mb-2">เลือกเพื่อนที่ยังไม่ได้เข้าห้องเท่านั้น</p>
            <div id="partySelectionArea" class="d-flex flex-column gap-2 text-start" style="height:250px; overflow-y:auto; padding:5px;">
                <div class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary"></div></div>
            </div>
        </div>
        <div class="d-flex gap-2 justify-content-center pb-5"> 
             <button class="btn btn-secondary rounded-pill px-4" onclick="checkCurrentLiveQuiz()">กลับ</button>
             <button class="btn btn-success rounded-pill px-4 fw-bold shadow" onclick="joinWithParty()">เริ่มแบบปาร์ตี้</button>
        </div>
    `;
    document.getElementById('partyActionArea').innerHTML = '';
    renderPartySelection();
}

window.toggleSelectMember = function(el, id) {
    if (!window.windowPartyMembers) window.windowPartyMembers = [globalPortalStudent.id];

    if (window.windowPartyMembers.includes(id)) {
        window.windowPartyMembers = window.windowPartyMembers.filter(m => m !== id);
        el.classList.remove('active-party');
        el.querySelector('i').className = 'bi bi-plus-circle';
    } else {
        if (window.windowPartyMembers.length >= 6) { 
             return Toast.fire({ icon: 'warning', title: 'ปาร์ตี้เต็มแล้วน้า' });
        }
        window.windowPartyMembers.push(id);
        el.classList.add('active-party');
        el.querySelector('i').className = 'bi bi-check-circle-fill';
    }
}

async function joinWithParty() {
    if (sqHasJoined) return;
    
    // ตรวจสอบว่ามีสมาชิกปาร์ตี้มากกว่าแค่ตัวเองหรือไม่
    if (!window.windowPartyMembers || window.windowPartyMembers.length < 2) {
        return Swal.fire('เตือน', 'กรุณาเลือกเพื่อนเข้าปาร์ตี้อย่างน้อย 1 คนครับ', 'warning');
    }

    sqHasJoined = true;
    document.getElementById('sqWaitText').innerHTML = '<div class="spinner-border text-light"></div><br>กำลังพาทุกคนเข้าห้อง...';

    try {
        const joinTasks = window.windowPartyMembers.map(sid => {
            return supabaseClient.from('live_quiz_responses').insert({
                session_id: sqSessionData.id,
                q_index: -1,
                student_id: sid,
                answer: 'JOINED_PARTY',
                response_time: 0,
                is_correct: false
            });
        });

        await Promise.all(joinTasks);
        document.getElementById('sqWaitText').innerHTML = `ปาร์ตี้ ${window.windowPartyMembers.length} คน เข้าห้องแล้ว!<br>รอสัญญาณจากครูน้า`;
        document.getElementById('partyActionArea').innerHTML = '';
    } catch(e) {
        sqHasJoined = false;
        Swal.fire('Error', 'ไม่สามารถพาปาร์ตี้เข้าห้องได้', 'error');
    }
}

// --- ฟังก์ชันดึงรายชื่อเพื่อน เวอร์ชั่น "ล็อกจอนิ่ง" (แก้ไขระบบแก้ค้างและกรองชื่อ) ---
async function renderPartySelection() {
    const area = document.getElementById('partySelectionArea');
    if (!area) return;

    const currentScrollPos = area.scrollTop;

    try {
        // ตรวจสอบความพร้อมระบบ
        if (!supabaseClient) {
            area.innerHTML = '<div class="text-center text-danger py-4 small">ระบบฐานข้อมูลยังไม่พร้อม<br>กรุณารอสักครู่แล้วลองใหม่ครับ</div>';
            return;
        }
        if (!globalPortalStudent || !globalPortalStudent.room) {
            area.innerHTML = '<div class="text-center text-danger py-4 small">ไม่พบข้อมูลห้องเรียนของคุณ</div>';
            return;
        }

        // 1. ดึงรายชื่อเพื่อน (ทำความสะอาดชื่อห้องก่อนค้นหา)
        const myRoom = globalPortalStudent.room.toString().trim();
        let { data: friends, error: err1 } = await supabaseClient.from('students')
            .select('id, name')
            .eq('room', myRoom)
            .neq('id', globalPortalStudent.id)
            .order('id', { ascending: true });

        if (err1) throw err1;

        // 2. ดึงรายชื่อคนที่เข้าห้องไปแล้ว
        let { data: joined, error: err2 } = await supabaseClient.from('live_quiz_responses')
            .select('student_id')
            .eq('session_id', sqSessionData.id)
            .eq('q_index', -1);

        if (err2) throw err2;

        let joinedIds = (joined || []).map(j => j.student_id);
        let availableFriends = (friends || []).filter(f => !joinedIds.includes(f.id));

        let html = '';
        if (availableFriends.length > 0) {
            availableFriends.forEach(f => {
                let cleanName = f.name.replace(/^(เด็กชาย|เด็กหญิง|ด\.ช\.|ด\.ญ\.|นาย|นางสาว|นาง|คุณ)/g, '').trim();
                let isChecked = (window.windowPartyMembers && window.windowPartyMembers.includes(f.id)) ? 'active-party' : '';
                
                html += `
                    <div class="party-item-row ${isChecked}" 
                         data-id="${f.id}" 
                         onclick="toggleSelectMember(this, '${f.id}')">
                        <div class="d-flex justify-content-between align-items-center w-100">
                            <span><b>${f.id}</b> - ${cleanName}</span>
                            <i class="bi ${isChecked ? 'bi-check-circle-fill' : 'bi-plus-circle'}"></i>
                        </div>
                    </div>
                `;
            });
        } else {
            if (friends && friends.length === 0) {
                html = '<div class="text-center text-muted py-4 small">ไม่พบเพื่อนคนอื่นในห้อง ' + myRoom + '</div>';
            } else {
                html = '<div class="text-center text-success py-4 small">เพื่อนทุกคนในห้องเข้าเกมหมดแล้วครับ 🚀</div>';
            }
        }
        
        area.innerHTML = html;
        area.scrollTop = currentScrollPos;

    } catch(e) { 
        console.error("Party List Error:", e);
        area.innerHTML = `
            <div class="text-center py-4">
                <div class="text-danger small mb-2">โหลดข้อมูลไม่สำเร็จ: ${e.message}</div>
                <button class="btn btn-sm btn-outline-primary rounded-pill" onclick="renderPartySelection()">
                    <i class="bi bi-arrow-clockwise"></i> ลองโหลดใหม่
                </button>
            </div>
        `;
    }
}

    function finishBossBattleEarly(message) {
        if (window.bossRealtimeChannel) {
            supabaseClient.removeChannel(window.bossRealtimeChannel);
            window.bossRealtimeChannel = null;
        }
        Swal.fire({ title: message, timer: 2500, showConfirmButton: false, icon: 'success' });
        hideAppModal('bossBattleModal'); 
        loadFullDashboard(globalPortalStudent.id, true); 
    }

    // ฟังก์ชันอัปเดตหลอดเลือดบอสแบบ Real-time บนหน้าจอ
    function updateBossHpUI_Realtime(hp, maxHp) {
        if (hp < 0) hp = 0;
        const pct = Math.max(0, Math.round((hp / maxHp) * 100));
        const hpText = document.getElementById('bbHpText');
        const hpBar = document.getElementById('bbHpBar');
        
        if(hpText) hpText.innerText = `${hp} / ${maxHp}`;
        if(hpBar) {
            hpBar.style.width = pct + '%';
            // ถ้าเลือดเหลือน้อยกว่า 30% ให้หลอดเป็นสีแดงกระพริบ
            if (pct < 30) hpBar.classList.add('bg-danger');
        }
    }
