// =====================================
// ตัวแปรและฟังก์ชันจัดการสถานะ
// =====================================
window.isPetHiddenByUser = false;
window.isFeeding = false; 
window.isSavingProfile = false;
window.isEquipping = false;
window.feedTimer = null;
window.lastExp = null; 

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
            
            listHtml += `<div class="select-card d-flex justify-content-between align-items-center" onclick="verifyIdentity('${s.id}', '${s.name}', ${s.hasPin})">`;
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
    let unitMs = 3600000; let rate = 0;
    
    if (id.startsWith('bg')) {
        const bgRates = [0, 5, 10, 15, 20, 25, 30, 40, 50, 100, 200, 300, 400, 500, 1000, 1, 2, 3, 4, 5, 10];
        const bgUnits = ['', 'hr','hr','hr','hr','hr','hr','hr','hr','day','day','day','day','day','week','min','min','min','min','min','min'];
        if(num <= 20) { 
            rate = bgRates[num]; 
            let u = bgUnits[num]; 
            if(u==='min') unitMs = 60000;
            else if(u==='day') unitMs = 86400000; 
            else if(u==='week') unitMs = 604800000; 
        }
    } else if (id.startsWith('i')) { 
        if(num <= 20) { rate = num * 2; unitMs = 3600000; } 
        else if(num <= 40) { rate = (num-20) * 20; unitMs = 86400000; } 
        else { rate = (num-40) * 1; unitMs = 60000; } 
    } else if (id.startsWith('m') || id.startsWith('w')) { 
        if(num <= 20) { rate = num * 5; unitMs = 3600000; } 
        else if(num <= 40) { rate = (num-20) * 50; unitMs = 86400000; } 
        else { rate = (num-40) * 2; unitMs = 60000; } 
    } 
    return rate / unitMs;
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
        
        let totalExpPerMs = 0; 
        totalExpPerMs += getExpPerMs(eqBg);

        let myItems = inv.filter(x => x.startsWith('i'));
        if(myItems.length > 0) totalExpPerMs += getExpPerMs(myItems[myItems.length-1]);

        let myClothes = inv.filter(x => x.startsWith('m') || x.startsWith('w')); 
        if(myClothes.length > 0) totalExpPerMs += getExpPerMs(myClothes[myClothes.length-1]);
        
        let now = Date.now();
        let currentBuffMultiplier = 1.0;
        let buffEnd = parseInt(s.buff_end_at) || 0;

        if (now < buffEnd) {
            currentBuffMultiplier = parseFloat(s.buff_multiplier) || 1.0;
        }

        if (totalExpPerMs > 0) {
            let msPassed = now - lastPass;
            let gained = Math.floor((msPassed * totalExpPerMs) * currentBuffMultiplier);
            if (gained > 0) {
                exp += gained;
            }
        }
        
        let pres = 0, abs = 0, lea = 0;
        (atts||[]).forEach(a => { if(a.status==='มา') pres++; else if(a.status==='ขาด') abs++; else if(a.status==='ลา') lea++; });
        
        let tasksDone = 0, allTasks = [], submitted = []; 
        (tasks||[]).forEach(t => {
           let sub = (subs||[]).find(x => x.task_id === t.task_id);
           let st = 'ยังไม่ส่ง', sc = '', u = '';
           if(sub) { 
               st = sub.status; sc = sub.score||''; u = sub.url||''; 
               if(st === 'ส่งแล้ว') tasksDone++;
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
                       if(st==='ส่งแล้ว') tasksDone++;
                   }
               } else { st = 'รออนุมัติกลุ่ม'; }
           }
           allTasks.push({id: t.task_id, title: "[งานกลุ่ม] "+t.title, desc: "สมาชิกสูงสุด "+t.max_members+" คน", due: t.due_date||"", maxScore: t.max_score||0, status: st, score: sc, url: u, isGroup: true, maxMembers: t.max_members, groupId: gId, groupApproval: gApp});
           if(st==='ส่งแล้ว' && sc!=='') submitted.push({title: "[งานกลุ่ม] "+t.title, score: sc});
        });
        
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
                dmHtml += `<div class="dm-alert-card"><div class="dm-icon"><i class="bi bi-envelope-heart-fill"></i></div><h5 class="fw-bold text-danger mb-2">ข้อความจากครู</h5><p class="fs-6 text-dark mb-3" style="white-space: pre-wrap;">${dmMessages[d]}</p><div class="text-end"><button class="btn btn-danger btn-sm rounded-pill fw-bold px-3" onclick="acknowledgeDM(${d})"><i class="bi bi-check-circle-fill"></i> รับทราบ</button></div></div>`;
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

        // จัดการเรื่องคิวรีงาน/เกรด และ UI สัตว์เลี้ยง
        const dragAva = document.getElementById('draggable-avatar');
        if (!window.isPetHiddenByUser) dragAva.classList.remove('hidden');
        else dragAva.classList.add('hidden');

        updatePetStatusLogic();
        makeDraggable(dragAva);

        // เช็คบอสและควิซ
        checkActiveBoss(); 
        checkCurrentLiveQuiz();

    } catch(err) {
        Swal.fire('เกิดข้อผิดพลาด', err.message, 'error');
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
// สิ้นสุดโค้ดหลัก ส่วนที่เหลือคือฟังก์ชันเสริม...
// =====================================

// (คัดลอกฟังก์ชันอื่นๆ จากไฟล์เดิมมาวางต่อที่นี่ได้เลยครับ โดยต้องระวังอย่าให้มีฟังก์ชันชื่อซ้ำกัน)
// ตัวอย่าง: checkActiveBoss, startBossBattle, joinLiveQuiz, ฯลฯ
// =====================================
    // 🌟 ระบบจัดการรูปภาพและกลุ่ม (IMAGE & GROUP LOGIC)
    // =====================================
    window.currentSubmitBase64 = "";

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
                    window.currentSubmitBase64 = compressedBase64;
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
                    html += `<div class="form-check border-bottom py-2"><input class="form-check-input group-member-cb" type="checkbox" value="${s.id}" id="cbGrp_${s.id}" onchange="checkGroupMemberLimit()"><label class="form-check-label w-100" for="cbGrp_${s.id}">${s.id} - ${s.name}</label></div>`;
                    availCount++;
                }
            });
            if (availCount === 0) html = '<div class="text-center text-danger fw-bold py-3"><i class="bi bi-emoji-frown"></i> ตอนนี้ไม่มีเพื่อนที่ว่างเลย</div>';
            document.getElementById('formGroupAvailableStudents').innerHTML = html;
        } catch(e) { document.getElementById('formGroupAvailableStudents').innerHTML = '<div class="text-center text-danger py-3">ดึงข้อมูลไม่สำเร็จ</div>'; }
    }

    window.checkGroupMemberLimit = function() {
        const maxAllowed = parseInt(document.getElementById('formGroupMaxMembers').value) - 1; 
        const checkboxes = document.querySelectorAll('.group-member-cb');
        let checkedCount = 0;
        checkboxes.forEach(function(cb) { if(cb.checked) checkedCount++; });
        if (checkedCount > maxAllowed) {
            event.target.checked = false;
            Swal.fire({ toast: true, position: 'top', icon: 'warning', title: 'เลือกเพื่อนได้อีกสูงสุด ' + maxAllowed + ' คนเท่านั้นนะ', showConfirmButton: false, timer: 3000 });
        }
    };

    window.processFormGroup = function() {
        const taskId = document.getElementById('formGroupTaskId').value;
        const groupName = document.getElementById('formGroupName').value.trim();
        const maxAllowed = parseInt(document.getElementById('formGroupMaxMembers').value);
        if (!groupName) return Swal.fire('เตือน', 'กรุณาตั้งชื่อกลุ่มด้วยครับ!', 'warning');
        let selectedMembers = [globalPortalStudent.id]; 
        document.querySelectorAll('.group-member-cb:checked').forEach(function(cb) { selectedMembers.push(cb.value); });
        const btn = document.getElementById('btnConfirmFormGroup');
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> กำลังส่งคำขอ...';
        btn.disabled = true;
        google.script.run.withSuccessHandler(function(res) {
            btn.innerHTML = 'ส่งขออนุมัติจัดกลุ่ม'; btn.disabled = false;
            if (res.success) {
                Swal.fire('สำเร็จ', 'ส่งคำขออนุมัติกลุ่มเรียบร้อย!', 'success');
                hideAppModal('studentFormGroupModal');
                loadFullDashboard(globalPortalStudent.id, true);
            } else { Swal.fire('ผิดพลาด', res.message, 'error'); }
        }).submitGroupFormation(taskId, groupName, selectedMembers);
    };

    window.openSubmitWorkModal = function(id, title, isEdit = false, isGroup = false, groupId = '') {
        document.getElementById('submitTaskId').value = id;
        document.getElementById('submitTaskTitle').innerText = (isEdit ? "แก้ไข: " : "ส่ง: ") + title;
        document.getElementById('submitLink').value = '';
        document.getElementById('submitIsGroup').value = isGroup;
        document.getElementById('submitGroupId').value = groupId;
        let imgInput = document.getElementById('submitImgFile');
        if(imgInput) imgInput.value = '';
        let imgPreview = document.getElementById('submitImgPreview');
        if(imgPreview) { imgPreview.src = ''; imgPreview.style.display = 'none'; }
        window.currentSubmitBase64 = "";
        showAppModal('submitWorkModal');
    };

    window.processSubmitWork = function() {
        const id = document.getElementById('submitTaskId').value;
        const link = document.getElementById('submitLink').value.trim();
        const isGroup = document.getElementById('submitIsGroup').value === 'true';
        const groupId = document.getElementById('submitGroupId').value;
        const btn = document.getElementById('btnConfirmSubmit');
        if (!link && !window.currentSubmitBase64) return Swal.fire('เตือน', 'กรุณาวางลิงก์ผลงาน หรือแนบรูปภาพครับ', 'warning');
        Swal.fire({ title: 'กำลังส่งผลงาน...', html: 'ระบบกำลังบันทึกข้อมูล กรุณาอย่าเพิ่งปิดหน้าจอ ⏳', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
        btn.disabled = true;
        const payload = { taskId: id, link: link, isGroup: isGroup, groupId: groupId, studentId: globalPortalStudent.id, studentName: globalPortalStudent.name, base64Image: window.currentSubmitBase64 || "" };
        google.script.run.withSuccessHandler(function(res) {
            btn.disabled = false;
            if (res.success) {
                Swal.fire('สำเร็จ!', res.message, 'success');
                hideAppModal('submitWorkModal');
                loadFullDashboard(globalPortalStudent.id, true);
            } else { Swal.fire('เซิร์ฟเวอร์ปฏิเสธ', res.message, 'error'); }
        }).processStudentSubmissionWithImage(payload);
    };

    window.confirmCancelWork = function(id) {
        Swal.fire({ title: 'ยกเลิกส่ง?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'ลบเลย' }).then(function(r) {
            if (r.isConfirmed) {
                Swal.fire({ title: 'ล้างข้อมูล...', didOpen: function() { Swal.showLoading(); } });
                google.script.run.withSuccessHandler(function(res) {
                    if (res.success) { Swal.fire('สำเร็จ', res.message, 'success'); loadFullDashboard(globalPortalStudent.id, true); } 
                    else { Swal.fire('ผิด', res.message, 'error'); }
                }).cancelStudentWork(id, globalPortalStudent.id);
            }
        });
    };

    // =====================================
    // 🎁 กระเป๋าและร้านค้า (INVENTORY & SHOP)
    // =====================================
    window.openInventoryModal = function() { renderInventory(); showAppModal('inventoryModal'); };

    function renderInventory() {
        let inv = globalPortalStudent.inventory || [];
        let myItems = inv.filter(x => x.startsWith('i'));
        let myClothesM = inv.filter(x => x.startsWith('m'));
        let myClothesF = inv.filter(x => x.startsWith('w'));
        let myBgs = inv.filter(x => x.startsWith('bg'));
        let myFoods = inv.filter(x => x.startsWith('f'));
        let currentBg = globalPortalStudent.equippedBg || 'bg0';
        let equippedItem = myItems.length > 0 ? myItems[myItems.length - 1] : null;
        let equippedClothes = null;
        let allMyClothes = inv.filter(x => x.startsWith('m') || x.startsWith('w'));
        if (allMyClothes.length > 0) equippedClothes = allMyClothes[allMyClothes.length - 1];

        const generateInvHtml = (arrIds, dbData, equippedId) => {
            if (arrIds.length === 0) return '<div class="col-12 text-center text-muted">ยังไม่มีของในหมวดนี้</div>';
            let out = '';
            arrIds.forEach(id => {
                let item = dbData.find(i => i.id === id); if (!item) return;
                let isEquipped = (id === equippedId);
                let btn = isEquipped ? '<button class="btn btn-sm btn-success w-100 disabled">กำลังสวมใส่</button>' : `<button class="btn btn-sm btn-primary w-100 fw-bold" onclick="equipGearFromBag('${item.id}')">สวมใส่</button>`;
                out += `<div class="col-md-3 col-6"><div class="shop-item-card"><div class="shop-icon">${item.icon}</div><h6 class="fw-bold text-dark">${item.name}</h6><p class="small text-danger fw-bold mb-2">${item.passive}</p>${btn}</div></div>`;
            });
            return out;
        };

        document.getElementById('invItemList').innerHTML = generateInvHtml(myItems, itemsData, equippedItem);
        document.getElementById('invClothesMList').innerHTML = generateInvHtml(myClothesM, maleClothesData, equippedClothes);
        document.getElementById('invClothesFList').innerHTML = generateInvHtml(myClothesF, femaleClothesData, equippedClothes);

        let htmlBgs = '';
        if (myBgs.length === 0) htmlBgs = '<div class="col-12 text-center text-muted">ยังไม่มีฉากหลัง</div>';
        else {
            myBgs.forEach(id => {
                let b = bgData.find(bg => bg.id === id); if (!b) return;
                let isEquipped = (b.id === currentBg);
                let btn = isEquipped ? '<button class="btn btn-sm btn-success w-100 disabled">กำลังใช้งาน</button>' : `<button class="btn btn-sm btn-info text-white w-100 fw-bold" onclick="equipBg('${b.id}')">เปลี่ยนพื้นหลัง</button>`;
                htmlBgs += `<div class="col-md-4"><div class="shop-item-card"><div class="bg-preview" style="background: ${b.css};"></div><h6 class="fw-bold">${b.name}</h6><p class="small text-danger fw-bold mb-2">${b.passive}</p>${btn}</div></div>`;
            });
        }
        document.getElementById('invBgList').innerHTML = htmlBgs;

        let foodCounts = {}; myFoods.forEach(f => foodCounts[f] = (foodCounts[f] || 0) + 1);
        let htmlFoods = '';
        if (Object.keys(foodCounts).length === 0) htmlFoods = '<div class="col-12 text-center text-muted">ยังไม่มีอาหาร</div>';
        else {
            Object.keys(foodCounts).forEach(id => {
                let f = foodData.find(food => food.id === id); if (!f) return;
                htmlFoods += `<div class="col-md-3 col-6"><div class="shop-item-card"><div class="shop-icon position-relative">${f.icon}<span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-white">x${foodCounts[id]}</span></div><h6 class="fw-bold">${f.name}</h6><p class="small text-primary fw-bold mb-2">คูณ *${f.multiplier}</p><button class="btn btn-sm btn-danger w-100 fw-bold" onclick="useFoodFromBag('${f.id}', '${f.msg}')">ป้อนอาหาร</button></div></div>`;
            });
        }
        document.getElementById('invFoodList').innerHTML = htmlFoods;
    }

    window.equipGearFromBag = function(gearId) {
        window.isEquipping = true; 
        let inv = globalPortalStudent.inventory;
        let idx = inv.indexOf(gearId);
        if (idx > -1) { inv.splice(idx, 1); inv.push(gearId); }
        renderInventory();
        google.script.run.withSuccessHandler(function(res) {
            if (res.success) { loadFullDashboard(globalPortalStudent.id, true); setTimeout(() => { window.isEquipping = false; }, 3000); } 
            else { window.isEquipping = false; }
        }).equipGear(globalPortalStudent.id, gearId);
    };

    window.useFoodFromBag = function(foodId, msg) {
        const foodItem = foodData.find(f => f.id === foodId); if (!foodItem) return;
        hideAppModal('inventoryModal');
        Swal.fire({ title: 'กำลังป้อนอาหาร...', didOpen: () => Swal.showLoading() });
        google.script.run.withSuccessHandler(function(res) {
            if (res.success) {
                Swal.close();
                let idx = globalPortalStudent.inventory.indexOf(foodId); if (idx > -1) globalPortalStudent.inventory.splice(idx, 1);
                const dragAva = document.getElementById('draggable-avatar');
                const dragBubble = document.getElementById('drag-bubble');
                window.isFeeding = true;
                if (window.feedTimer) clearTimeout(window.feedTimer);
                dragAva.classList.remove('anim-happy', 'anim-panic', 'anim-sleepy', 'anim-absent');
                void dragAva.offsetWidth; 
                dragAva.classList.add('anim-feed');
                dragBubble.innerText = msg; dragBubble.className = 'status-bubble text-white bg-danger border-0';
                window.feedTimer = setTimeout(() => { window.isFeeding = false; updatePetStatusLogic(); }, 8000);
                loadFullDashboard(globalPortalStudent.id, true);
            } else { Swal.fire('ผิดพลาด', res.message, 'error'); }
        }).consumePetFood(globalPortalStudent.id, foodId, foodItem.multiplier, (foodItem.durationMin * 60000));
    };

    window.openShopModal = function() { document.getElementById('shopUserExp').innerText = globalPortalStudent.exp; renderShop(); showAppModal('shopModal'); };

    function renderShop() {
        let inv = globalPortalStudent.inventory || [];
        const generateShopHtml = (dbData, typeCode) => {
            let out = '';
            dbData.forEach(item => {
                let isOwned = inv.includes(item.id);
                let btn = isOwned ? '<button class="btn btn-sm btn-success w-100 disabled">มีแล้ว</button>' : `<button class="btn btn-sm btn-primary w-100 fw-bold" onclick="buyItem('${typeCode}', '${item.id}', ${item.price})">แลก ${item.price} EXP</button>`;
                let passiveText = item.passive ? `<p class="small text-danger fw-bold mb-2">${item.passive}</p>` : '';
                out += `<div class="col-md-3 col-6"><div class="shop-item-card ${isOwned ? 'owned' : ''}"><div class="shop-icon">${item.icon}</div><h6 class="text-dark fw-bold">${item.name}</h6>${passiveText}${btn}</div></div>`;
            });
            return out;
        };
        document.getElementById('shopItemList').innerHTML = generateShopHtml(itemsData, 'item');
        document.getElementById('shopClothesMList').innerHTML = generateShopHtml(maleClothesData, 'clothes');
        document.getElementById('shopClothesFList').innerHTML = generateShopHtml(femaleClothesData, 'clothes');

        let htmlBgs = '';
        bgData.forEach(b => {
            let isOwned = inv.includes(b.id);
            let btn = isOwned ? '<button class="btn btn-sm btn-success w-100 disabled">มีแล้ว</button>' : `<button class="btn btn-sm btn-warning w-100 fw-bold" onclick="buyItem('bg', '${b.id}', ${b.price})">แลก ${b.price} EXP</button>`;
            htmlBgs += `<div class="col-md-4"><div class="shop-item-card ${isOwned ? 'owned' : ''}"><div class="bg-preview" style="background: ${b.css};"></div><h6 class="fw-bold">${b.name}</h6><p class="small text-danger fw-bold mb-2">${b.passive}</p>${btn}</div></div>`;
        });
        document.getElementById('shopBgList').innerHTML = htmlBgs;

        let htmlPowerups = '';
        powerupData.forEach(p => {
            let isOwned = inv.includes(p.id);
            let btn = isOwned ? '<button class="btn btn-sm btn-success w-100 disabled">มีแล้ว</button>' : `<button class="btn btn-sm btn-warning text-dark w-100 fw-bold" onclick="buyItem('powerup', '${p.id}', ${p.price})">แลก ${p.price} EXP</button>`;
            htmlPowerups += `<div class="col-md-3 col-6"><div class="shop-item-card"><div class="shop-icon">${p.icon}</div><h6 class="fw-bold">${p.name}</h6><p class="small text-muted mb-2">${p.msg}</p>${btn}</div></div>`;
        });
        document.getElementById('shopPowerupList').innerHTML = htmlPowerups;
    }

    window.buyItem = function(type, id, price) {
        if (globalPortalStudent.exp < price) return Swal.fire('อ๊ะ!', 'EXP ไม่พอนะ!', 'warning');
        let scoreItem = powerupData.find(p => p.id === id && p.type === 'score_exchange');
        if (scoreItem) {
            Swal.fire({ title: 'ยืนยันการแลกคะแนน?', text: `ใช้ ${price} EXP เพื่อแลก +${scoreItem.amount} คะแนน?`, icon: 'question', showCancelButton: true, confirmButtonText: 'ยืนยันแลกเลย!' }).then((result) => {
                if (result.isConfirmed) {
                    Swal.fire({ title: 'กำลังแลกคะแนน...', didOpen: () => Swal.showLoading() });
                    google.script.run.withSuccessHandler(function(res) {
                        if (res.success) { Swal.fire('สำเร็จ!', res.message, 'success'); loadFullDashboard(globalPortalStudent.id, true); } 
                        else { Swal.fire('ผิดพลาด', res.message, 'error'); }
                    }).exchangeExpForScore(globalPortalStudent.id, scoreItem.amount, price);
                }
            });
        } else {
            Swal.fire({ title: 'กำลังแลกไอเท็ม...', didOpen: () => Swal.showLoading() });
            google.script.run.withSuccessHandler(function(res) {
                if (res.success) {
                    globalPortalStudent.exp -= price;
                    if (!globalPortalStudent.inventory) globalPortalStudent.inventory = [];
                    globalPortalStudent.inventory.push(id);
                    document.getElementById('shopUserExp').innerText = globalPortalStudent.exp; 
                    renderShop(); renderInventory();
                    Swal.fire({ toast: true, position: 'top', icon: 'success', title: 'ของเข้ากระเป๋าแล้ว!', timer: 1500 });
                    loadFullDashboard(globalPortalStudent.id, true);
                } else { Swal.fire('ผิดพลาด', res.message, 'error'); }
            }).buyPetItem(globalPortalStudent.id, type, id, price);
        }
    };

    window.equipBg = function(bgId) {
        Swal.fire({ title: 'กำลังเปลี่ยนพื้นหลัง...', didOpen: () => Swal.showLoading() });
        window.isEquipping = true;
        globalPortalStudent.equippedBg = bgId;
        google.script.run.withSuccessHandler(function(res) {
            if (res.success) { Swal.fire({ toast: true, position: 'top', icon: 'success', title: 'เปลี่ยนฉากสำเร็จ', timer: 1500 }); loadFullDashboard(globalPortalStudent.id, true); setTimeout(() => { window.isEquipping = false; }, 3000); } 
            else { window.isEquipping = false; }
        }).equipPetBgOrItem(globalPortalStudent.id, bgId);
    };

    // =====================================
    // 👤 โปรไฟล์และสถิติ (PROFILE & STATS)
    // =====================================
    window.logoutStudent = function() {
        Swal.fire({ title: 'ออกจากระบบ?', icon: 'question', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'ออกจากระบบ' }).then(function(result) {
            if (result.isConfirmed) {
                localStorage.removeItem('studentId');
                document.getElementById('student-dashboard-view').classList.add('hidden');
                document.getElementById('student-search-view').classList.remove('hidden');
                document.getElementById('portalStudentId').value = '';
                document.getElementById('draggable-avatar').classList.add('hidden');
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'ออกจากระบบเรียบร้อย', timer: 1500 });
            }
        });
    };

    window.changeStudentPinFlow = function() {
        Swal.fire({
            title: 'เปลี่ยนรหัสลับ', html: '<input type="password" id="oldStuPin" class="swal2-input" placeholder="รหัสเดิม"><input type="password" id="newStuPin" class="swal2-input" placeholder="รหัสใหม่">', showCancelButton: true,
            preConfirm: () => {
                const o = Swal.getPopup().querySelector('#oldStuPin').value; const n = Swal.getPopup().querySelector('#newStuPin').value;
                if (!o || !n) Swal.showValidationMessage('กรอกให้ครบ'); return { oldPin: o, newPin: n };
            }
        }).then(function(r) {
            if (r.isConfirmed) {
                google.script.run.withSuccessHandler(res => {
                    if (res.success) Swal.fire('สำเร็จ', res.message, 'success'); else Swal.fire('ผิดพลาด', res.message, 'error');
                }).updateStudentPin(globalPortalStudent.id, r.value.oldPin, r.value.newPin);
            }
        });
    };

    window.openStudentLeave = function() {
        document.getElementById('studentLeaveDate').value = getLocalTodayStr(); document.getElementById('studentLeaveEndDate').value = getLocalTodayStr(); document.getElementById('studentLeaveReason').value = '';
        showAppModal('studentLeaveModal');
    };

    window.submitLeave = function() {
        const d1 = document.getElementById('studentLeaveDate').value; const d2 = document.getElementById('studentLeaveEndDate').value; const r = document.getElementById('studentLeaveReason').value;
        if (!d1 || !d2 || !r) return Swal.fire('เตือน', 'กรุณาระบุข้อมูลให้ครบถ้วน', 'warning');
        google.script.run.withSuccessHandler(() => { hideAppModal('studentLeaveModal'); Swal.fire('ส่งคำร้องสำเร็จ!', 'รอคุณครูอนุมัตินะครับ', 'success'); })
        .submitLeaveRequest(globalPortalStudent.id, globalPortalStudent.name, globalPortalStudent.room, d1 === d2 ? d1 : d1 + ' ถึง ' + d2, r);
    };

    window.showLevelModal = function() {
        let lvls = [ { exp: 0, name: "มือใหม่", emoji: "🐣" }, { exp: 300, name: "ฝึกหัด", emoji: "🐹" }, { exp: 800, name: "ผู้ใฝ่รู้", emoji: "🦊" }, { exp: 1500, name: "นักปราชญ์น้อย", emoji: "🦉" }, { exp: 2400, name: "จอมขยัน", emoji: "🐺" }, { exp: 3500, name: "ดาวรุ่ง", emoji: "🦄" }, { exp: 4800, name: "นักสู้กะทิ", emoji: "🦁" }, { exp: 6300, name: "ปรมาจารย์", emoji: "🦅" }, { exp: 8000, name: "ตำนาน", emoji: "👑" }, { exp: 10000, name: "มหาเทพ", emoji: "💎" }, { exp: 12200, name: "ผู้หยั่งรู้", emoji: "🔮" }, { exp: 14600, name: "ทะลุขีดจำกัด", emoji: "🚀" }, { exp: 17200, name: "ผู้พิชิตดวงดาว", emoji: "🌠" }, { exp: 20000, name: "จักรพรรดิ", emoji: "🌌" }, { exp: 23000, name: "ยอดมนุษย์", emoji: "⚡" }, { exp: 26200, name: "มังกรผงาด", emoji: "🐉" }, { exp: 29600, name: "เซียน", emoji: "⚜️" }, { exp: 33200, name: "จอมราชันย์", emoji: "🔱" }, { exp: 37000, name: "เทพเจ้า", emoji: "💠" }, { exp: 41000, name: "จ้าวแห่งจักรวาล", emoji: "♾️" } ];
        let html = ''; lvls.forEach((lv, i) => {
            let isCurrent = globalPortalStudent.level.current === (i + 1);
            html += `<div class="d-flex justify-content-between p-3 mb-2 rounded ${isCurrent ? 'bg-primary text-white' : 'bg-light'}"><div><strong>${lv.emoji} Lv.${i + 1} ${lv.name}</strong></div><div>${lv.exp} EXP</div></div>`;
        });
        document.getElementById('levelListContainer').innerHTML = html;
        showAppModal('levelModal');
    };

    // =====================================
    // ⚔️ ระบบบอส (BOSS FIGHT SYSTEM)
    // =====================================
    let currentBossData = null;
    let currentQuestionIndex = 0;
    let currentCorrectCount = 0;

    window.checkActiveBoss = function() {
        if (!globalPortalStudent) return;
        google.script.run.withSuccessHandler(res => {
            if (res.hasBoss && !res.alreadyFought && res.hp > 0) {
                currentBossData = res; document.getElementById('bossAlertWidget').classList.remove('hidden');
            } else { document.getElementById('bossAlertWidget').classList.add('hidden'); }
        }).getActiveBoss(globalPortalStudent.room, globalPortalStudent.id);
    };

    window.startBossBattle = function() {
        if (!currentBossData) return;
        currentQuestionIndex = 0; currentCorrectCount = 0;
        let parts = currentBossData.bossName.split('|');
        document.getElementById('bbBossIcon').innerText = parts[0] || '👾';
        document.getElementById('bbBossName').innerText = parts[1] || currentBossData.bossName;
        updateBossHpUI(currentBossData.hp, currentBossData.maxHp);
        loadBossQuestion();
        showAppModal('bossBattleModal');
    };

    function loadBossQuestion() {
        const qData = currentBossData.questions[currentQuestionIndex];
        document.getElementById('bbQuestionCounter').innerText = `ข้อที่ ${currentQuestionIndex + 1} / ${currentBossData.questions.length}`;
        document.getElementById('bbQuestionText').innerText = qData.q;
        let html = ''; let shuffled = [...qData.options].sort(() => Math.random() - 0.5);
        shuffled.forEach((opt, idx) => {
            html += `<div class="col-md-6"><button class="btn btn-outline-dark w-100 p-3 boss-opt-btn" onclick="selectBossAnswer(this, '${opt.replace(/'/g, "\\'")}', '${qData.answer.replace(/'/g, "\\'")}')">${idx + 1}. ${opt}</button></div>`;
        });
        document.getElementById('bbOptionsContainer').innerHTML = html;
    }

    window.selectBossAnswer = function(btn, selected, correct) {
        document.querySelectorAll('.boss-opt-btn').forEach(b => b.disabled = true);
        if (selected === correct) { btn.classList.replace('btn-outline-dark', 'btn-success'); currentCorrectCount++; playAttackAnimation(10); } 
        else { btn.classList.replace('btn-outline-dark', 'btn-danger'); }
        setTimeout(() => {
            currentQuestionIndex++;
            if (currentQuestionIndex < currentBossData.questions.length) loadBossQuestion();
            else finishBossBattle();
        }, 1200);
    };

    function playAttackAnimation(damage) {
        const icon = document.getElementById('bbBossIcon');
        icon.style.transform = 'translateX(15px) scale(0.9)'; 
        setTimeout(() => { icon.style.transform = 'translateX(0) scale(1)'; }, 200);
        currentBossData.hp -= damage; updateBossHpUI(currentBossData.hp, currentBossData.maxHp);
    }

    function updateBossHpUI(hp, maxHp) {
        const pct = Math.max(0, Math.round((hp / maxHp) * 100));
        document.getElementById('bbHpBar').style.width = pct + '%';
        document.getElementById('bbHpText').innerText = `${Math.max(0, hp)} / ${maxHp}`;
    }

    function finishBossBattle() {
        let expGain = currentCorrectCount * 100;
        Swal.fire({ title: 'จบการต่อสู้!', text: `โจมตีโดน ${currentCorrectCount} ครั้ง ได้รับ ${expGain} EXP`, icon: 'success' }).then(() => {
            google.script.run.withSuccessHandler(() => { hideAppModal('bossBattleModal'); loadFullDashboard(globalPortalStudent.id, true); })
            .attackBoss(currentBossData.bossId, globalPortalStudent.id, currentCorrectCount);
        });
    }

    // =====================================
    // ⚡ ระบบควิซ (LIVE QUIZ BATTLE)
    // =====================================
    let sqSessionData = null;
    let sqQuestionStartMs = 0;
    let sqHasAnswered = false;
    let sqTimerInterval = null;
    let sqCurrentCorrectAnswer = "";
    let sqHasJoined = false;
    let activePowerUp = null;

    window.checkCurrentLiveQuiz = async function() {
        if (!globalPortalStudent || !supabaseClient) return;
        let { data } = await supabaseClient.from('live_quiz_sessions').select('*').eq('room_name', globalPortalStudent.room).limit(1);
        if (data && data.length > 0) handleLiveQuizChange(data[0]);
    };

    async function handleLiveQuizChange(sessionData) {
        if (typeof sessionData.questions_json === 'string') sessionData.questions_json = JSON.parse(sessionData.questions_json);
        sqSessionData = sessionData;
        const modal = document.getElementById('studentLiveQuizModal');
        if (!modal.classList.contains('show')) bootstrap.Modal.getOrCreateInstance(modal).show();

        if (sessionData.status === 'setup') { showSqScreen('wait'); sqHasJoined = false; }
        else if (sessionData.status === 'show_question') renderSqQuestionOnly(sessionData);
        else if (sessionData.status === 'active') { if (!sqHasAnswered) renderSqQuestion(sessionData); }
        else if (sessionData.status === 'show_answer') { showSqScreen('result'); checkSqResult(); }
        else if (sessionData.status === 'show_leaderboard') { showSqScreen('leaderboard'); calculateAndShowLeaderboard(); }
    }

    function showSqScreen(type) {
        document.getElementById('sqWaitScreen').classList.add('hidden');
        document.getElementById('sqPlayScreen').classList.add('hidden');
        document.getElementById('sqResultScreen').classList.add('hidden');
        if(type === 'wait') document.getElementById('sqWaitScreen').classList.remove('hidden');
        if(type === 'play') document.getElementById('sqPlayScreen').classList.remove('hidden');
        if(type === 'result') document.getElementById('sqResultScreen').classList.remove('hidden');
    }

    function renderSqQuestionOnly(sessionData) {
        showSqScreen('play');
        const q = sessionData.questions_json[sessionData.current_q_index];
        document.getElementById('sqQuestionText').innerText = q.q;
        document.getElementById('sqOptionsContainer').innerHTML = '<h3 class="text-white">เตรียมตัว... ตัวเลือกกำลังจะมา</h3>';
    }

    function renderSqQuestion(sessionData) {
        showSqScreen('play');
        sqHasAnswered = false;
        const q = sessionData.questions_json[sessionData.current_q_index];
        sqCurrentCorrectAnswer = q.answer;
        sqQuestionStartMs = Date.now();
        let html = ''; const colors = ['quiz-color-1', 'quiz-color-2', 'quiz-color-3', 'quiz-color-4'];
        q.options.forEach((opt, i) => {
            html += `<div class="col-6"><button class="quiz-btn-gigantic ${colors[i]}" onclick="submitSqAnswer(this, '${opt.replace(/'/g, "\\'")}')">${opt}</button></div>`;
        });
        document.getElementById('sqOptionsContainer').innerHTML = html;
        let time = 30.0;
        if(sqTimerInterval) clearInterval(sqTimerInterval);
        sqTimerInterval = setInterval(() => {
            time -= 0.1; document.getElementById('sqTimer').innerText = time.toFixed(1);
            if(time <= 0) { clearInterval(sqTimerInterval); if(!sqHasAnswered) submitSqAnswer(null, "TIMEOUT"); }
        }, 100);
    }

    window.submitSqAnswer = async function(btn, ans) {
        if (sqHasAnswered) return; sqHasAnswered = true; clearInterval(sqTimerInterval);
        const correct = (ans === sqCurrentCorrectAnswer);
        await supabaseClient.from('live_quiz_responses').insert({ session_id: sqSessionData.id, q_index: sqSessionData.current_q_index, student_id: globalPortalStudent.id, answer: ans, response_time: Date.now() - sqQuestionStartMs, is_correct: correct });
        showSqScreen('wait'); document.getElementById('sqWaitText').innerText = "ส่งคำตอบแล้ว!";
    };

    // =====================================
    // 💬 ระบบแชท AI (AI CHAT SYSTEM)
    // =====================================
    window.sendAiChatMessage = function() {
        const input = document.getElementById('aiChatInput');
        const text = input.value.trim(); if (!text) return;
        appendChatBubble(text, 'user'); input.value = '';
        const payload = { name: globalPortalStudent.name, exp: globalPortalStudent.exp, userMessage: text, chatHistory: window.aiChatHistory };
        google.script.run.withSuccessHandler(res => { if (res.success) appendChatBubble(res.text, 'bot'); }).analyzeStudentBehaviorWithGemini(payload);
    };

    function appendChatBubble(text, sender) {
        const box = document.getElementById('aiChatHistory');
        const div = document.createElement('div'); div.className = `chat-msg-row ${sender}`;
        div.innerHTML = `<div class="chat-bubble ${sender}">${text}</div>`;
        box.appendChild(div); box.scrollTop = box.scrollHeight;
    }

    // =====================================
    // 🎁 ระบบส่งของขวัญ (GIFT SYSTEM)
    // =====================================
    window.openGiftModal = async function() {
        showAppModal('giftModal');
        let { data } = await supabaseClient.from('students').select('id, name').eq('room', globalPortalStudent.room).neq('id', globalPortalStudent.id);
        let html = '<option value="">-- เลือกเพื่อน --</option>';
        data.forEach(f => html += `<option value="${f.id}">${f.id} - ${f.name}</option>`);
        document.getElementById('giftReceiverId').innerHTML = html;
        renderGiftInventory();
    };

    function renderGiftInventory() {
        const inv = globalPortalStudent.inventory || [];
        let html = ''; inv.filter(id => id.startsWith('i') || id.startsWith('f')).forEach(id => {
            let item = [...itemsData, ...foodData].find(x => x.id === id);
            html += `<div class="col-4"><button class="btn btn-outline-danger w-100" onclick="this.classList.toggle('active')">${item.icon}<br>${item.name}</button></div>`;
        });
        document.getElementById('giftItemList').innerHTML = html;
    }

    // ฟังก์ชันจบงาน E-Portfolio
    window.generateStudentPDF = async function() { 
        Swal.fire('กำลังสร้าง PDF...', 'กรุณารอสักครู่', 'info');
        // Logic สำหรับวาดหน้า E-Portfolio (เหมือนต้นฉบับ)
    };

// =====================================
// 🛠️ ฟังก์ชันเสริมและตัวช่วย (UTILITIES)
// =====================================

// 1. ระบบทำให้สัตว์เลี้ยงลากวางได้ (Draggable Logic)
function makeDraggable(el) {
    if (!el) return;
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    el.onmousedown = dragMouseDown;
    el.ontouchstart = dragMouseDown;

    function dragMouseDown(e) {
        e = e || window.event;
        if (e.type === 'touchstart') {
            pos3 = e.touches[0].clientX;
            pos4 = e.touches[0].clientY;
        } else {
            pos3 = e.clientX;
            pos4 = e.clientY;
        }
        document.onmouseup = closeDragElement;
        document.ontouchend = closeDragElement;
        document.onmousemove = elementDrag;
        document.ontouchmove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        var clientX, clientY;
        if (e.type === 'touchmove') {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        pos1 = pos3 - clientX;
        pos2 = pos4 - clientY;
        pos3 = clientX;
        pos4 = clientY;
        el.style.top = (el.offsetTop - pos2) + "px";
        el.style.left = (el.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        document.ontouchend = null;
        document.ontouchmove = null;
    }
}

// 2. ฟังก์ชันดึงวันที่ปัจจุบัน (รูปแบบ YYYY-MM-DD)
function getLocalTodayStr() {
    let now = new Date();
    let y = now.getFullYear();
    let m = String(now.getMonth() + 1).padStart(2, '0');
    let d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// 3. การตั้งค่า SweetAlert Toast (ใช้บ่อยในระบบ)
const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
});

// 4. ระบบตรวจผล Quiz (ใช้ใน Live Quiz)
async function checkSqResult() {
    if (!sqSessionData) return;
    const qIndex = sqSessionData.current_q_index;
    const q = sqSessionData.questions_json[qIndex];
    
    let { data: myAns } = await supabaseClient
        .from('live_quiz_responses')
        .select('*')
        .eq('session_id', sqSessionData.id)
        .eq('q_index', qIndex)
        .eq('student_id', globalPortalStudent.id)
        .single();

    let resIcon = document.getElementById('sqResultIcon');
    let resText = document.getElementById('sqResultText');
    let resMsg = document.getElementById('sqResultMsg');

    if (myAns && myAns.is_correct) {
        resIcon.innerHTML = '<i class="bi bi-check-circle-fill text-success" style="font-size: 5rem;"></i>';
        resText.innerText = "ถูกต้อง! เก่งมาก";
        resText.className = "display-5 fw-bold text-success";
    } else {
        resIcon.innerHTML = '<i class="bi bi-x-circle-fill text-danger" style="font-size: 5rem;"></i>';
        resText.innerText = "พลาดไปนิดเดียว!";
        resText.className = "display-5 fw-bold text-danger";
    }
    resMsg.innerText = q.explanation || "";
}

// 5. ระบบ Leaderboard ท้ายเกม Quiz
async function calculateAndShowLeaderboard() {
    let { data: allRes } = await supabaseClient
        .from('live_quiz_responses')
        .select('student_id, is_correct, response_time')
        .eq('session_id', sqSessionData.id);

    let scores = {};
    (allRes || []).forEach(r => {
        if (!scores[r.student_id]) scores[r.student_id] = 0;
        if (r.is_correct) {
            let bonus = Math.floor((10000 - r.response_time) / 100);
            scores[r.student_id] += (100 + (bonus > 0 ? bonus : 0));
        }
    });

    let sorted = Object.keys(scores).map(id => ({ id: id, score: scores[id] })).sort((a, b) => b.score - a.score);
    let html = '<div class="list-group">';
    sorted.slice(0, 5).forEach((s, i) => {
        let isMe = (s.id === globalPortalStudent.id);
        html += `<div class="list-group-item d-flex justify-content-between ${isMe ? 'bg-warning' : ''}">
                    <span>${i + 1}. ${s.id}</span>
                    <span class="fw-bold">${s.score} แต้ม</span>
                 </div>`;
    });
    html += '</div>';
    document.getElementById('sqLeaderboardContainer').innerHTML = html;
}

// =====================================
// 🚀 เริ่มการทำงานเมื่อโหลดหน้าเว็บ
// =====================================
window.onload = function() {
    // ตรวจสอบเซสชันเก่า
    let savedId = localStorage.getItem('studentId');
    if (savedId) {
        // ถ้าเคยล็อกอินไว้ ให้ดึงข้อมูลทันที
        setTimeout(() => {
            if (typeof loadFullDashboard === 'function') {
                loadFullDashboard(savedId, true);
            }
        }, 1000);
    }
    
    // ตั้งเวลาอัปเดตสถานะสัตว์เลี้ยงทุกๆ 30 วินาที
    setInterval(() => {
        if (typeof updatePetStatusLogic === 'function' && !window.isFeeding) {
            updatePetStatusLogic();
        }
    }, 30000);
};

// =====================================
// 📝 ส่วนที่ 4: ระบบบันทึกโปรไฟล์ และระบบปาร์ตี้ (The Final Pieces)
// =====================================

// 1. ระบบบันทึกข้อมูลโปรไฟล์ (Profile Save)
window.saveStudentProfile = function() {
    const p = {
        nickname: document.getElementById('profNickname').value.trim(),
        gender: document.getElementById('profGender').value,
        phone: document.getElementById('profPhone').value.trim(),
        disease: document.getElementById('profDisease').value.trim(),
        dob: document.getElementById('profDobDay').value + '/' + document.getElementById('profDobMonth').value + '/' + document.getElementById('profDobYear').value,
        sport: document.getElementById('profSport').value,
        talent: Array.from(document.querySelectorAll('.talent-checkbox:checked')).map(cb => cb.value).join(','),
        hobby: Array.from(document.querySelectorAll('.hobby-checkbox:checked')).map(cb => cb.value).join(','),
        father: document.getElementById('profFather').value.trim(),
        mother: document.getElementById('profMother').value.trim(),
        houseNo: document.getElementById('profHouseNo').value.trim(),
        moo: document.getElementById('profMoo').value.trim(),
        subDistrict: document.getElementById('profSubDistrict').value.trim(),
        district: document.getElementById('profDistrict').value.trim(),
        province: document.getElementById('profProvince').value.trim(),
        zipcode: document.getElementById('profZipcode').value.trim(),
        avatar: currentSelectedAvatarSeed
    };

    window.isSavingProfile = true;
    Swal.fire({ title: 'กำลังบันทึกโปรไฟล์...', didOpen: () => Swal.showLoading() });

    google.script.run.withSuccessHandler(function(res) {
        window.isSavingProfile = false;
        if (res.success) {
            Swal.fire('สำเร็จ', 'บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว!', 'success');
            hideAppModal('studentProfileModal');
            loadFullDashboard(globalPortalStudent.id, true);
        } else {
            Swal.fire('ผิดพลาด', res.message, 'error');
        }
    }).updateStudentProfile(globalPortalStudent.id, p);
};

// 2. ระบบเลือกสมาชิกปาร์ตี้ (Party Selection Logic)
// ป้องกันปัญหาจอกระตุก/ดีดบนมือถือ เวลาเลือกเพื่อนเข้ากลุ่ม
window.toggleSelectMember = function(el, studentId) {
    const maxAllowed = parseInt(document.getElementById('formGroupMaxMembers').value) - 1;
    const checkbox = document.getElementById('cbGrp_' + studentId);
    
    if (!checkbox) return;

    // ตรวจสอบจำนวนที่เลือกไปแล้ว
    let checkedCount = document.querySelectorAll('.group-member-cb:checked').length;

    if (!checkbox.checked && checkedCount >= maxAllowed) {
        Swal.fire({ toast: true, position: 'top', icon: 'warning', title: 'เลือกเพื่อนได้อีกสูงสุด ' + maxAllowed + ' คนครับ', showConfirmButton: false, timer: 2000 });
        return;
    }

    // สลับสถานะ (Toggle)
    checkbox.checked = !checkbox.checked;
    
    // อัปเดต UI ของแถวที่เลือก
    if (checkbox.checked) {
        el.classList.add('active');
        el.querySelector('i').className = 'bi bi-check-circle-fill';
    } else {
        el.classList.remove('active');
        el.querySelector('i').className = 'bi bi-plus-circle';
    }
};

// 3. ฟังก์ชันอัปเดตอวตาร (Avatar Selection)
window.changeAvatar = function(step) {
    let current = parseInt(currentSelectedAvatarSeed) || 1;
    let next = current + step;
    if (next < 1) next = 50; // สมมติว่ามี 50 แบบ
    if (next > 50) next = 1;
    
    currentSelectedAvatarSeed = String(next);
    let url = 'https://api.dicebear.com/9.x/adventurer/svg?seed=' + currentSelectedAvatarSeed;
    document.getElementById('mainAvatarImg').src = url;
    
    // อัปเดตตัวพรีวิวในหน้าโปรไฟล์ด้วยถ้าเปิดอยู่
    const profImg = document.getElementById('profileAvatarPreview');
    if (profImg) profImg.src = url;
};

// 4. ระบบแจ้งเตือน OneSignal (เรียกใช้จาก global.js)
window.setupOneSignal = function(userId) {
    if (typeof OneSignal !== 'undefined') {
        OneSignal.push(function() {
            OneSignal.setExternalUserId(userId);
        });
    }
};

// =====================================
// 🚀 ส่วนที่ 5: ระบบ Realtime และ EXP Ticker (ส่วนปิดท้าย)
// =====================================

// 1. ตัวแปรเก็บประวัติแชท (ป้องกัน Error เวลาคุยกับจีมิน)
window.aiChatHistory = [];

// 2. ระบบเลขวิ่ง (EXP Ticker) - ทำให้เด็กเห็นแต้มงอกแบบ Realtime ทุกวินาที
setInterval(() => {
    if (!globalPortalStudent || window.isEquipping || window.isSavingProfile) return;

    let now = Date.now();
    let lastPass = parseInt(globalPortalStudent.lastPassiveUpdate) || now;
    let eqBg = globalPortalStudent.equippedBg || 'bg0';
    let inv = globalPortalStudent.inventory || [];

    // คำนวณ Rate ต่อ ms
    let totalRate = 0;
    totalRate += getExpPerMs(eqBg);

    let myItems = inv.filter(x => x.startsWith('i'));
    if(myItems.length > 0) totalRate += getExpPerMs(myItems[myItems.length - 1]);

    let myClothes = inv.filter(x => x.startsWith('m') || x.startsWith('w'));
    if(myClothes.length > 0) totalRate += getExpPerMs(myClothes[myClothes.length - 1]);

    if (totalRate > 0) {
        let msPassed = now - lastPass;
        // ตรวจสอบ Buff อาหาร
        let currentBuff = 1.0;
        if (globalPortalStudent.buffEndAt && now < globalPortalStudent.buffEndAt) {
            currentBuff = parseFloat(globalPortalStudent.buffMultiplier) || 1.0;
        }

        let gained = Math.floor((msPassed * totalRate) * currentBuff);
        let displayExp = Math.floor(globalPortalStudent.exp + gained);
        
        // อัปเดตตัวเลขบนหน้าจอ
        const expEl = document.getElementById('expText');
        if (expEl) expEl.innerText = displayExp.toLocaleString();

        // อัปเดต Progress Bar เลเวล
        if (globalPortalStudent.level.next !== "Max") {
            let pct = Math.min(100, Math.round((displayExp / globalPortalStudent.level.next) * 100));
            const bar = document.getElementById('expProgressBar');
            if (bar) bar.style.width = pct + '%';
        }
    }
}, 1000);

// 3. ระบบเชื่อมต่อ Realtime (Supabase Subscription)
// ฟังก์ชันนี้จะทำให้หน้าจอเด็กเปลี่ยนตามที่คุณครูกดสั่งทันที
window.initStudentRealtime = function() {
    if (!supabaseClient || !globalPortalStudent) return;

    // A) ติดตามการประกาศ (Announcements)
    supabaseClient
        .channel('public:announcements')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements', filter: `room=eq.${globalPortalStudent.room}` }, payload => {
            Toast.fire({ icon: 'info', title: 'ประกาศใหม่: ' + payload.new.message });
            loadFullDashboard(globalPortalStudent.id, true);
        })
        .subscribe();

    // B) ติดตามการสู้บอส (Boss Events)
    supabaseClient
        .channel('public:boss_quizzes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'boss_quizzes', filter: `room_name=eq.${globalPortalStudent.room}` }, payload => {
            checkActiveBoss();
        })
        .subscribe();

    // C) ติดตาม Live Quiz ( Kahoot Style)
    supabaseClient
        .channel('public:live_quiz_sessions')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'live_quiz_sessions', filter: `room_name=eq.${globalPortalStudent.room}` }, payload => {
            if (payload.eventType === 'DELETE') {
                hideAppModal('studentLiveQuizModal');
                sqHasJoined = false;
            } else {
                handleLiveQuizChange(payload.new);
            }
        })
        .subscribe();
};

// 4. ฟังก์ชันรีเฟรชรายชื่อเพื่อนในกลุ่ม (ที่ฟลุ๊คเคยเขียนไว้ในไฟล์เดิม)
window.renderPartySelection = async function() {
    const area = document.getElementById('partySelectionArea');
    if (!area) return;
    
    try {
        let { data: allStudents } = await supabaseClient.from('students').select('id,name').eq('room', globalPortalStudent.room);
        let { data: groups } = await supabaseClient.from('groups').select('members').eq('task_id', document.getElementById('formGroupTaskId').value);
        
        let gIds = [];
        (groups || []).forEach(g => gIds = gIds.concat(g.members || []));
        
        let availStudents = (allStudents || []).filter(s => !gIds.includes(s.id) && s.id !== globalPortalStudent.id);
        
        let html = '';
        availStudents.forEach(s => {
            html += `
                <div class="party-item-row" onclick="toggleSelectMember(this, '${s.id}')">
                    <div class="d-flex justify-content-between align-items-center w-100">
                        <span><b>${s.id}</b> - ${s.name}</span>
                        <input type="checkbox" class="group-member-cb d-none" id="cbGrp_${s.id}" value="${s.id}">
                        <i class="bi bi-plus-circle"></i>
                    </div>
                </div>`;
        });
        area.innerHTML = html || '<div class="text-center py-3">ไม่พบเพื่อนที่ว่างในขณะนี้</div>';
    } catch(e) {
        area.innerHTML = 'เกิดข้อผิดพลาดในการโหลดรายชื่อ';
    }
};

// แก้ไขฟังก์ชัน onload เดิมให้เรียกใช้ Realtime ด้วย
const originalOnload = window.onload;
window.onload = function() {
    if (originalOnload) originalOnload();
    
    // ตรวจสอบถ้าล็อคอินอยู่ให้เปิด Realtime ทันที
    let savedId = localStorage.getItem('studentId');
    if (savedId) {
        setTimeout(() => {
            initStudentRealtime();
        }, 2000);
    }
};