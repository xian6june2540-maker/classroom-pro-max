// =========================================================
// 👨‍👩‍👧‍👦 PARENT SYSTEM LOGIC (Dedicated File)
// =========================================================

// ฟังก์ชันโหลด Dashboard ผู้ปกครอง (อัปเกรดแสดงงานกลุ่ม + สมาชิก)
window.loadParentDashboard = async function(token) {
    const content = document.getElementById('parent-content');
    content.innerHTML = '<div class="py-5 text-center"><div class="spinner-border text-primary mb-3"></div><h6 class="text-muted">กำลังดึงข้อมูลล่าสุด...</h6></div>';

    if (!supabaseClient) await initSupabaseAsync();

    try {
        const { data: student, error: stError } = await supabaseClient
            .from('students').select('*').eq('parent_token', token).single();

        if (stError || !student) {
            content.innerHTML = `<div class="alert alert-danger rounded-4 py-4 m-2"><h5>ไม่พบข้อมูลนักเรียน</h5></div>`;
            return;
        }

        const chatHead = document.getElementById('parentChatHead');
        if(chatHead) {
            chatHead.classList.remove('hidden');
            chatHead.dataset.studentId = student.id; 
            localStorage.setItem('parentStudentId', student.id);
            if(student.home_lat && student.home_lng) {
                window.tempHomeLat = student.home_lat;
                window.tempHomeLng = student.home_lng;
            }
        }

        // 🟢 ดึงข้อมูลทั้งหมดที่จำเป็น (เพิ่มตารางกลุ่มและงานกลุ่ม)
        const [attRes, tasksRes, subRes, gTasksRes, groupsRes, gSubRes, studentsRes] = await Promise.all([
            supabaseClient.from('attendance').select('*').eq('student_id', student.id).order('check_date', { ascending: false }).limit(20),
            supabaseClient.from('tasks').select('*').eq('room', student.room),
            supabaseClient.from('submissions').select('*').eq('student_id', student.id),
            supabaseClient.from('group_tasks').select('*').eq('room', student.room),
            supabaseClient.from('groups').select('*').eq('status', 'อนุมัติแล้ว'),
            supabaseClient.from('group_submissions').select('*'),
            supabaseClient.from('students').select('id, name').eq('room', student.room) // ดึงชื่อเพื่อนในห้องมาเทียบ
        ]);

        const attData = attRes.data || [];
        const countAtt = (status) => attData.filter(a => a.status === status).length;

        const roomStudents = studentsRes.data || [];
        const studentGroups = (groupsRes.data || []).filter(g => g.members && g.members.includes(student.id));

        let combinedTasks = [];

        // 1. จัดการข้อมูลงานเดี่ยว
        (tasksRes.data || []).forEach(t => {
            const sub = (subRes.data || []).find(s => s.task_id === t.task_id);
            combinedTasks.push({
                id: t.task_id,
                title: t.title,
                type: 'เดี่ยว',
                due_date: t.due_date,
                status: sub && sub.status === 'ส่งแล้ว' ? 'ส่งแล้ว' : 'ค้างส่ง',
                groupData: null
            });
        });

        // 2. จัดการข้อมูลงานกลุ่ม
        (gTasksRes.data || []).forEach(t => {
            const myGroup = studentGroups.find(g => g.task_id === t.task_id);
            let gStatus = 'ยังไม่มีกลุ่ม';
            let gData = null;

            if (myGroup) {
                const gSub = (gSubRes.data || []).find(s => s.task_id === t.task_id && s.group_id === myGroup.group_id);
                gStatus = gSub && gSub.status === 'ส่งแล้ว' ? 'ส่งแล้ว' : 'ค้างส่ง';
                
                // แปลงรหัสนักเรียนเป็นชื่อ-สกุล
                const memberNames = (myGroup.members || []).map(mid => {
                    const sFound = roomStudents.find(rs => rs.id === mid);
                    return sFound ? `${sFound.name}` : mid;
                });

                gData = {
                    name: myGroup.group_name,
                    memberNames: memberNames
                };
            }

            combinedTasks.push({
                id: t.task_id,
                title: t.title,
                type: 'กลุ่ม',
                due_date: t.due_date,
                status: gStatus,
                groupData: gData
            });
        });

        // 3. เรียงลำดับงานตามวันที่ (ใหม่สุดอยู่บน)
        combinedTasks.sort((a, b) => new Date(b.due_date) - new Date(a.due_date));

        // 4. สร้าง HTML สำหรับรายการงาน
        let tasksHtml = '';
        if (combinedTasks.length > 0) {
            combinedTasks.forEach((t, i) => {
                let badgeColor = t.status === 'ส่งแล้ว' ? 'bg-success' : (t.status === 'ค้างส่ง' ? 'bg-danger' : 'bg-secondary');
                let typeBadge = t.type === 'กลุ่ม' ? '<span class="badge bg-info text-dark me-1">งานกลุ่ม</span>' : '<span class="badge bg-primary me-1">งานเดี่ยว</span>';
                
                let toggleBtn = '';
                let detailsHtml = '';

                // ถ้าเป็นงานกลุ่มและมีกลุ่มแล้ว ให้แสดงปุ่ม Dropdown ดูสมาชิก
                if (t.type === 'กลุ่ม' && t.groupData) {
                    const uniqueId = `group-detail-${i}`;
                    toggleBtn = `<button class="btn btn-sm btn-light border shadow-sm ms-2" onclick="document.getElementById('${uniqueId}').classList.toggle('hidden')"><i class="bi bi-chevron-down"></i></button>`;
                    detailsHtml = `
                        <div id="${uniqueId}" class="hidden mt-2 p-2 rounded-3 small border" style="background-color: #f8f9fa;">
                            <div class="fw-bold text-success mb-1"><i class="bi bi-people-fill"></i> ชื่อกลุ่ม: ${t.groupData.name}</div>
                            <div class="text-muted ms-3">
                                ${t.groupData.memberNames.map(m => `• ${m}`).join('<br>')}
                            </div>
                        </div>
                    `;
                }

                tasksHtml += `
                    <div class="list-group-item py-2 px-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <div class="fw-bold text-dark mb-1" style="font-size: 0.85rem;">${typeBadge}${t.title}</div>
                                <small class="text-muted" style="font-size: 0.75rem;"><i class="bi bi-calendar-event"></i> กำหนดส่ง: ${formatThaiDate(t.due_date)}</small>
                            </div>
                            <div class="text-end d-flex align-items-center">
                                <span class="badge ${badgeColor}" style="font-size:0.7rem;">${t.status}</span>
                                ${toggleBtn}
                            </div>
                        </div>
                        ${detailsHtml}
                    </div>
                `;
            });
        } else {
            tasksHtml = '<div class="p-3 text-center text-muted small">ไม่มีงานที่ต้องส่ง</div>';
        }

        content.innerHTML = `
            <div class="text-center mb-4">
                <img src="https://api.dicebear.com/9.x/adventurer/svg?seed=${student.avatar}" style="width: 90px; height: 90px; border-radius: 50%; border: 4px solid #0d6efd;" class="shadow-sm mb-2 bg-white">
                <h4 class="fw-bold text-dark mb-0">${student.name}</h4>
                <p class="text-muted small">ระดับชั้น/ห้อง: ${student.room}</p>
            </div>

            <div class="row g-2 mb-3">
                <div class="col-6"><div class="p-3 bg-white rounded-4 shadow-sm border-start border-4 border-success text-start"><small class="text-muted d-block fw-bold">คะแนนรวม</small><span class="h3 fw-bold text-success">${student.accumulated_score || 0}</span></div></div>
                <div class="col-6"><div class="p-3 bg-white rounded-4 shadow-sm border-start border-4 border-warning text-start"><small class="text-muted d-block fw-bold">แต้ม EXP</small><span class="h4 fw-bold text-warning">${Math.floor(student.exp || 0).toLocaleString()}</span></div></div>
            </div>

            <div class="card border-0 shadow-sm rounded-4 mb-3 overflow-hidden text-start">
                <div class="card-header bg-success bg-opacity-10 border-0 fw-bold text-success small">ประวัติการเข้าเรียน</div>
                <div class="card-body p-0">
                    <div class="row g-0 text-center py-2 bg-light border-bottom">
                        <div class="col-4"><div class="fw-bold text-success">${countAtt('มา')}</div><small class="text-muted">มา</small></div>
                        <div class="col-4"><div class="fw-bold text-warning text-dark">${countAtt('ลา')}</div><small class="text-muted">ลา</small></div>
                        <div class="col-4"><div class="fw-bold text-danger">${countAtt('ขาด')}</div><small class="text-muted">ขาด</small></div>
                    </div>
                    <div style="max-height: 150px; overflow-y: auto;">
                        <table class="table table-sm table-hover mb-0" style="font-size: 0.85rem;">
                            <tbody>
                                ${attData.length > 0 ? attData.map(a => `<tr><td class="ps-3 py-2">${formatThaiDate(a.check_date)}</td><td class="pe-3 text-end py-2"><span class="badge ${a.status==='มา'?'bg-success':a.status==='ลา'?'bg-warning text-dark':'bg-danger'}">${a.status}</span></td></tr>`).join('') : '<tr><td class="text-center py-3">ไม่มีประวัติ</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden text-start">
                <div class="card-header bg-primary bg-opacity-10 border-0 fw-bold text-primary small">ภารกิจและการส่งงานทั้งหมด</div>
                <div class="card-body p-0" style="max-height: 250px; overflow-y: auto;">
                    <div class="list-group list-group-flush">
                        ${tasksHtml}
                    </div>
                </div>
            </div>

            <div class="px-2">
                <button class="btn btn-warning w-100 rounded-pill fw-bold py-2 mb-2 shadow-sm text-dark" onclick="openLeaveRequestModal('${student.id}')">
                    <i class="bi bi-calendar-check-fill"></i> แจ้งลาหยุดให้ลูก
                </button>
                <button class="btn btn-outline-primary w-100 rounded-pill fw-bold py-2 mb-2" onclick="loadParentDashboard('${token}')">
                    <i class="bi bi-arrow-clockwise"></i> อัปเดตข้อมูลล่าสุด
                </button>
                <button class="btn btn-danger w-100 rounded-pill fw-bold py-2 mb-3 shadow-sm" onclick="logoutParent()">
                    <i class="bi bi-box-arrow-right"></i> ออกจากระบบผู้ปกครอง
                </button>
            </div>
        `;
    } catch (e) {
        content.innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`;
    }
};

window.openCommunicationHubFromHead = function() {
    const studentId = document.getElementById('parentChatHead').dataset.studentId || localStorage.getItem('parentStudentId');
    if(studentId) { window.openCommunicationHub(studentId); } 
};

window.openCommunicationHub = function(studentId) {
    let hasLocation = window.tempHomeLat !== null;
    let locationStatusHtml = hasLocation 
        ? `<div class="badge bg-success px-3 py-2 rounded-pill w-100 mb-3 shadow-sm border-0"><i class="bi bi-check-circle-fill"></i> ส่งพิกัดบ้านล่าสุดเรียบร้อยแล้ว</div>`
        : `<div id="lastLocationStatus" class="small text-muted mb-2 text-center">ยังไม่ได้ระบุตำแหน่งบ้าน</div>`;

    Swal.fire({
        title: '<div class="fw-bold text-danger"><i class="bi bi-chat-heart"></i> ศูนย์การสื่อสาร</div>',
        html: `
            <div class="text-start mt-3">
                <div class="d-flex gap-1 mb-4 bg-light p-1 rounded-pill border shadow-sm">
                    <button class="btn btn-sm flex-grow-1 rounded-pill active" id="btnTabStudent" onclick="switchCommTab('student')">❤️ ส่งใจ</button>
                    <button class="btn btn-sm flex-grow-1 rounded-pill btn-outline-dark" id="btnTabLocation" onclick="switchCommTab('location')">📍 พิกัดบ้าน</button>
                    <button class="btn btn-sm flex-grow-1 rounded-pill btn-outline-primary" id="btnTabTeacher" onclick="switchCommTab('teacher')">👨‍🏫 ปรึกษาครู</button>
                </div>
                <div id="sectionStudent">
                    <label class="small fw-bold text-muted mb-2">เลือกสติกเกอร์ส่งพลังใจ:</label>
                    <div class="d-flex gap-2 mb-3 overflow-auto pb-2">
                        <button class="btn btn-outline-light border shadow-sm p-2" onclick="selectCommSticker('🌟','เก่งมาก!')">🌟</button>
                        <button class="btn btn-outline-light border shadow-sm p-2" onclick="selectCommSticker('❤️','รักนะ')">❤️</button>
                        <button class="btn btn-outline-light border shadow-sm p-2" onclick="selectCommSticker('✌️','สู้ๆ นะ')">✌️</button>
                        <button class="btn btn-outline-light border shadow-sm p-2" onclick="selectCommSticker('🏆','สุดยอด')">🏆</button>
                    </div>
                    <textarea id="hubMsgToStudent" class="form-control mb-3" rows="2" placeholder="พิมพ์ข้อความให้กำลังใจลูก..."></textarea>
                    <button class="btn btn-danger w-100 fw-bold rounded-pill shadow" onclick="processSendToStudent('${studentId}')">ส่งพลังใจให้ลูก</button>
                </div>
                <div id="sectionLocation" class="hidden text-center py-3">
                    <div class="mb-4"><i class="bi bi-geo-alt-fill text-danger" style="font-size: 3.5rem;"></i><h6 class="fw-bold mt-2">ระบุตำแหน่งบ้านนักเรียน</h6></div>
                    ${locationStatusHtml}
                    <button class="btn btn-dark w-100 rounded-pill py-3 shadow-lg fw-bold" onclick="openMapPicker('${studentId}')"><i class="bi bi-pin-map-fill text-warning"></i> เปิดแผนที่ปักหมุดบ้าน</button>
                </div>
                <div id="sectionTeacher" class="hidden">
                    <label class="small fw-bold text-muted mb-2">เรื่องที่ต้องการปรึกษาคุณครู:</label>
                    <textarea id="hubMsgToTeacher" class="form-control mb-3" rows="2" placeholder="พิมพ์ข้อความที่ต้องการแจ้งคุณครู..."></textarea>
                    
                    <label class="small fw-bold text-muted mb-2">ช่องทางให้ครูติดต่อกลับ:</label>
                    <div class="d-flex gap-2 mb-2">
                        <button class="btn btn-sm flex-grow-1 rounded-pill active" id="btnContactPhone" onclick="setContactType('PHONE')" style="background-color: #0d6efd; color: white;">📞 เบอร์โทร</button>
                        <button class="btn btn-sm flex-grow-1 rounded-pill btn-outline-success" id="btnContactLine" onclick="setContactType('LINE')"><i class="bi bi-line"></i> LINE</button>
                        <button class="btn btn-sm flex-grow-1 rounded-pill btn-outline-primary" id="btnContactFB" onclick="setContactType('FB')"><i class="bi bi-facebook"></i> Messenger</button>
                    </div>
                    <input type="hidden" id="hubContactType" value="PHONE">
                    <input type="text" id="hubParentContact" class="form-control mb-3 fw-bold text-center" placeholder="ใส่เบอร์โทรศัพท์ของคุณ">
                    
                    <button class="btn btn-primary w-100 fw-bold rounded-pill shadow-lg py-2" onclick="processSendToTeacher('${studentId}', this)">ยืนยันและส่งข้อความหาครู</button>
                </div>
            </div>
        `,
        showConfirmButton: false,
        showCloseButton: true,
        customClass: { popup: 'rounded-4' }
    });
};

window.switchCommTab = (tab) => {
    ['Student', 'Location', 'Teacher'].forEach(t => {
        const btn = document.getElementById(`btnTab${t}`);
        const sec = document.getElementById(`section${t}`);
        if (btn && sec) {
            btn.classList.toggle('active', t.toLowerCase() === tab);
            sec.classList.toggle('hidden', t.toLowerCase() !== tab);
        }
    });
};

window.openMapPicker = function(studentId) {
    let defaultLat = window.tempHomeLat || 13.7563;
    let defaultLng = window.tempHomeLng || 100.5018;
    Swal.fire({
        title: 'ปักหมุดบ้านนักเรียน',
        html: `<div id="map-wrapper"><div id="map-canvas"></div></div>`,
        customClass: { popup: 'map-popup-square rounded-4' },
        showCancelButton: true,
        confirmButtonText: 'ยืนยันและส่งพิกัดให้ครู',
        didOpen: () => {
            setTimeout(() => {
                if (window.myLeafletMap) window.myLeafletMap.remove();
                window.myLeafletMap = L.map('map-canvas').setView([defaultLat, defaultLng], 18);
                L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}').addTo(window.myLeafletMap);
                window.myMarker = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(window.myLeafletMap);
                window.myLeafletMap.on('click', (e) => { window.myMarker.setLatLng(e.latlng); });
            }, 500);
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            const pos = window.myMarker.getLatLng();
            await supabaseClient.from('students').update({ home_lat: pos.lat, home_lng: pos.lng }).eq('id', studentId);
            Swal.fire({ icon: 'success', title: 'ส่งพิกัดเรียบร้อย!', timer: 1500, showConfirmButton: false });
        }
    });
};

// 1. เพิ่มฟังก์ชันสำหรับพิมพ์สติกเกอร์ลงกล่องข้อความ
window.selectCommSticker = function(emoji, text) {
    const input = document.getElementById('hubMsgToStudent');
    if (input) {
        input.value = input.value ? input.value + ' ' + emoji + ' ' + text : emoji + ' ' + text;
    }
};

// 2. แก้ไขฟังก์ชันส่งข้อความเพื่อป้องกันกดรัว (Spam)
window.processSendToStudent = async function(id, btn) {
    const msgInput = document.getElementById('hubMsgToStudent');
    const msg = msgInput.value.trim();
    if(!msg) return;
    
    // ล็อกปุ่มกันกดเบิ้ล
    if(btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> กำลังส่ง...';
    }

    try {
        await supabaseClient.from('parent_communications').insert([{ student_id: id, target: 'student', type: 'praise', message: msg }]);
        Swal.fire({ icon: 'success', title: 'ส่งเรียบร้อย!', timer: 2000, showConfirmButton: false });
        msgInput.value = ''; // เคลียร์ช่องแชทหลังส่งเสร็จ
    } catch(e) {
        Swal.fire('ผิดพลาด', e.message, 'error');
    } finally {
        // ส่งเสร็จแล้วปลดล็อกปุ่ม
        if(btn) {
            btn.disabled = false;
            btn.innerHTML = 'ส่งพลังใจให้ลูก';
        }
    }
};
window.logoutParent = function() {
    Swal.fire({
        title: 'ออกจากระบบผู้ปกครอง?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'ออกจากระบบ',
        confirmButtonColor: '#d33'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem('parentToken');
            localStorage.removeItem('parentStudentId');
            window.location.href = window.location.origin + window.location.pathname;
        }
    });
};

window.promptParentLogin = function() {
    Swal.fire({
        title: 'เข้าใช้งานสำหรับผู้ปกครอง',
        input: 'text',
        inputPlaceholder: 'กรอก Access Code',
        showCancelButton: true
    }).then((result) => {
        if (result.isConfirmed) loginWithParentToken(result.value.trim().toUpperCase());
    });
};

// ฟังก์ชันตรวจสอบรหัสและเข้าสู่ระบบ (เวอร์ชันโหลดเข้า Dashboard ทันที ไม่เด้งหน้าแรก)
window.loginWithParentToken = async function(token) {
    Swal.fire({ 
        title: 'กำลังตรวจสอบรหัส...', 
        didOpen: () => Swal.showLoading(), 
        allowOutsideClick: false 
    });

    try {
        if (!supabaseClient) await initSupabaseAsync();
        const { data, error } = await supabaseClient.from('students').select('parent_token').eq('parent_token', token).single();
        
        if (data) {
            localStorage.setItem('parentToken', token); // จำรหัสไว้ในเครื่อง
            Swal.close();
            
            // 🚀 แก้ปัญหาหน้าจอเด้ง: สั่งสลับหน้าทันทีโดยไม่ใช้คำสั่ง Reload
            // 1. ซ่อนหน้าอื่นๆ ให้หมด
            document.getElementById('student-search-view').classList.add('hidden');
            if(document.getElementById('student-dashboard-view')) document.getElementById('student-dashboard-view').classList.add('hidden');
            if(document.getElementById('teacher-view')) document.getElementById('teacher-view').classList.add('hidden');
            if(document.querySelector('.header-box')) document.querySelector('.header-box').classList.add('hidden');
            
            // 2. แสดงหน้าผู้ปกครอง
            document.getElementById('parent-view').classList.remove('hidden');
            
            // 3. เรียกโหลดข้อมูล Dashboard มาแสดงผลทันที
            loadParentDashboard(token);
        } else {
            Swal.fire('รหัสไม่ถูกต้อง', 'กรุณาตรวจสอบรหัสอีกครั้ง หรือติดต่อคุณครูครับ', 'error');
        }
    } catch (e) {
        Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้', 'error');
    }
};

// ฟังก์ชันสำหรับสลับแท็บระหว่างนักเรียนและผู้ปกครองในหน้าแรก
window.switchSearchTab = function(role) {
    const studentContext = document.getElementById('student-search-context');
    const parentContext = document.getElementById('parent-login-context');
    const studentBtn = document.getElementById('tab-student-role');
    const parentBtn = document.getElementById('tab-parent-role');
    const resultBox = document.getElementById('selectResultBox');

    if (role === 'student') {
        // แสดงส่วนของนักเรียน ซ่อนส่วนผู้ปกครอง
        studentContext.classList.remove('hidden');
        parentContext.classList.add('hidden');
        studentBtn.classList.add('active');
        parentBtn.classList.remove('active');
    } else {
        // แสดงส่วนของผู้ปกครอง ซ่อนส่วนนักเรียน
        studentContext.classList.add('hidden');
        parentContext.classList.remove('hidden');
        studentBtn.classList.remove('active');
        parentBtn.classList.add('active');
        
        // ล้างผลการค้นหาชื่อนักเรียนทิ้งเพื่อความสะอาดตา
        if(resultBox) resultBox.classList.add('hidden');
    }
};

// =========================================================
// 📝 SYSTEM: SMART PARENT LEAVE (ImgBB + Date Range + Anti-Duplicate)
// =========================================================

window.openLeaveRequestModal = function(studentId) {
    Swal.fire({
        title: '<h5 class="fw-bold m-0 text-warning"><i class="bi bi-pencil-square"></i> แบบฟอร์มแจ้งลาหยุด (สำหรับผู้ปกครอง)</h5>',
        html: `
            <div class="text-start mt-3">
                <div class="row g-2 mb-3">
                    <div class="col-6">
                        <label class="small fw-bold text-muted mb-1">เริ่มต้นวันที่:</label>
                        <input type="date" id="leaveDateStart" class="form-control rounded-3" value="${getLocalTodayStr()}">
                    </div>
                    <div class="col-6">
                        <label class="small fw-bold text-muted mb-1">ถึงวันที่:</label>
                        <input type="date" id="leaveDateEnd" class="form-control rounded-3" value="${getLocalTodayStr()}">
                    </div>
                </div>
                
                <label class="small fw-bold text-muted mb-1">ประเภทการลา:</label>
                <select id="leaveType" class="form-select mb-3 rounded-3" onchange="updateLeaveTemplate()">
                    <option value="ลาป่วย">ลาป่วย</option>
                    <option value="ลากิจ">ลากิจ</option>
                </select>

                <label class="small fw-bold text-muted mb-1">เลือกสาเหตุที่สมเหตุสมผล:</label>
                <select id="leaveTemplate" class="form-select mb-3 rounded-3" onchange="applyLeaveTemplate()">
                    <!-- เทมเพลตจะโหลดที่นี่ -->
                </select>

                <label class="small fw-bold text-muted mb-1">ระบุรายละเอียดเพิ่มเติม (แต่งคำพูดให้อัตโนมัติ):</label>
                <textarea id="leaveReason" class="form-control mb-3 rounded-3" rows="3" placeholder="ระบุรายละเอียดเพิ่มเติมเพื่อความสมบูรณ์..."></textarea>

                <label class="small fw-bold text-muted mb-1">แนบหลักฐาน (ถ้ามี - รองรับรูปภาพสูงสุด 32MB):</label>
                <input type="file" id="leaveFile" class="form-control rounded-3" accept="image/*">
                <p class="text-primary mt-2 mb-0" style="font-size: 0.7rem;">* ระบบจะตรวจสอบความซ้ำซ้อนของวันที่ยื่นลาก่อนบันทึก</p>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'ยืนยันการส่งใบลา',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#ffc107',
        customClass: { popup: 'rounded-4' },
        didOpen: () => updateLeaveTemplate(),
        preConfirm: () => {
            const start = document.getElementById('leaveDateStart').value;
            const end = document.getElementById('leaveDateEnd').value;
            const type = document.getElementById('leaveType').value;
            const reason = document.getElementById('leaveReason').value;
            const file = document.getElementById('leaveFile').files[0];
            
            if (!start || !end || !reason) return Swal.showValidationMessage('กรุณากรอกข้อมูลให้ครบถ้วน');
            if (new Date(start) > new Date(end)) return Swal.showValidationMessage('วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด');
            
            return { start, end, type, reason, file };
        }
    }).then(async (result) => {
        if (result.isConfirmed) processSubmitLeave(studentId, result.value);
    });
};

window.updateLeaveTemplate = function() {
    const type = document.getElementById('leaveType').value;
    const templateSelect = document.getElementById('leaveTemplate');
    
    const templates = {
        'ลาป่วย': [
            'มีอาการไข้สูงและตัวร้อนจัด ไม่สามารถลุกเดินมาเรียนได้ตามปกติ',
            'มีอาการปวดท้องอย่างรุนแรงและท้องเสีย คาดว่าเกิดจากอาหารเป็นพิษ',
            'ประสบอุบัติเหตุเล็กน้อยระหว่างเดินทาง ทำให้ได้รับบาดเจ็บต้องพักฟื้น',
            'พบแพทย์แล้ว แพทย์มีความเห็นให้หยุดพักรักษาตัวเพื่อเฝ้าดูอาการ',
            'มีอาการปวดหัวอย่างหนักและวิงเวียนศีรษะ จำเป็นต้องพักผ่อนในที่มืด'
        ],
        'ลากิจ': [
            'มีความจำเป็นต้องติดตามผู้ปกครองไปทำธุระสำคัญที่ต่างจังหวัด ซึ่งไม่สามารถเลื่อนได้',
            'เข้าร่วมพิธีทางศาสนาและงานสำคัญของครอบครัวที่จัดขึ้นตามประเพณี',
            'ต้องไปดำเนินการด้านเอกสารสำคัญ ณ หน่วยงานราชการร่วมกับผู้ปกครอง',
            'สมาชิกในครอบครัวประสบเหตุฉุกเฉิน จำเป็นต้องอยู่ดูแลอย่างใกล้ชิด',
            'มีความจำเป็นส่วนตัวที่สำคัญยิ่งในการเข้าร่วมงานสังคมของครอบครัว'
        ]
    };

    templateSelect.innerHTML = `<option value="">-- เลือกเทมเพลตคำพูด --</option>` + 
        templates[type].map(t => `<option value="${t}">${t}</option>`).join('');
};

window.applyLeaveTemplate = function() {
    const template = document.getElementById('leaveTemplate').value;
    const reasonInput = document.getElementById('leaveReason');
    if (template) {
        reasonInput.value = `เนื่องจากบุตรหลาน${template} จึงใคร่ขอลาหยุดเรียนตามวันที่ระบุไว้ข้างต้น`;
    } else {
        reasonInput.value = '';
    }
};

async function processSubmitLeave(studentId, data) {
    Swal.fire({ title: 'กำลังตรวจสอบ...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });

    try {
        const { data: stuData, error: stuErr } = await supabaseClient.from('students').select('name, room').eq('id', studentId).single();
        if (stuErr || !stuData) throw new Error('ดึงข้อมูลนักเรียนไม่สำเร็จ');

        // 1. สร้าง Array วันที่กำลังจะยื่นลา
        let currentDate = new Date(data.start);
        const endDate = new Date(data.end);
        let requestedDates = [];
        while (currentDate <= endDate) {
            requestedDates.push(currentDate.toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // 2. ดึงประวัติการลา "ทั้งหมด" ของนักเรียนคนนี้มาเช็ค
        const { data: allLeaves, error: checkError } = await supabaseClient.from('leaves').select('leave_date').eq('student_id', studentId);
        if (checkError) throw checkError;

        let existingDates = [];
        (allLeaves || []).forEach(l => {
            let parts = l.leave_date.split(' ถึง ');
            let d1 = new Date(parts[0]);
            let d2 = new Date(parts[parts.length - 1]);
            while (d1 <= d2) {
                existingDates.push(d1.toISOString().split('T')[0]);
                d1.setDate(d1.getDate() + 1);
            }
        });

        // ตรวจสอบว่าวันที่ขอลา มีอยู่ในระบบแล้วหรือยัง
        const overlaps = requestedDates.filter(d => existingDates.includes(d));
        if (overlaps.length > 0) {
            throw new Error(`ไม่สามารถยื่นซ้ำได้: วันที่ [${overlaps.map(d => formatThaiDate(d)).join(', ')}] มีการยื่นใบลาในระบบไปแล้วครับ`);
        }

        // 3. เตรียมรูปภาพ
        let myImgbbKey = await new Promise((resolve) => {
            google.script.run.withSuccessHandler(config => resolve(config && config.IMGBB_API_KEY ? config.IMGBB_API_KEY : "")).withFailureHandler(() => resolve("")).getTeacherConfigMasked(); 
        });

        let finalUrl = "";
        if (data.file) {
            if (!myImgbbKey) throw new Error('ไม่พบ API Key สำหรับอัปโหลดรูปภาพ');
            Swal.fire({ title: 'กำลังแนบหลักฐาน...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
            const formData = new FormData();
            formData.append('image', data.file);
            const res = await fetch(`https://api.imgbb.com/1/upload?key=${myImgbbKey}`, { method: 'POST', body: formData });
            const resData = await res.json();
            if (resData.success) finalUrl = resData.data.url;
            else throw new Error('อัปโหลดรูปภาพไม่สำเร็จ');
        }

        // 4. มัดรวมวันลาและส่งเข้าหลังบ้าน 1 รายการ
        let finalReason = `<b class="text-danger">[ผู้ปกครองแจ้ง]</b><br>[${data.type}] ${data.reason}`;
        if (finalUrl) finalReason += `<br><a href="${finalUrl}" target="_blank" class="btn btn-sm btn-info text-dark mt-2 shadow-sm fw-bold"><i class="bi bi-image"></i> ดูรูป/ใบรับรองแพทย์</a>`;
        
        let finalDateStr = data.start === data.end ? data.start : `${data.start} ถึง ${data.end}`; // มัดรวมวันที่
        
        Swal.fire({ title: 'กำลังส่งคำร้องให้คุณครู...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
        
        const { error: insertError } = await supabaseClient.from('leaves').insert([{
            student_id: studentId,
            student_name: stuData.name,
            room: stuData.room,
            leave_date: finalDateStr, 
            reason: finalReason, 
            status: 'รออนุมัติ'
        }]);
        
        if (insertError) throw insertError;

        await Swal.fire({ icon: 'success', title: 'ส่งคำร้องสำเร็จ!', text: `รอคุณครูอนุมัติการลานะครับ`, timer: 2500, showConfirmButton: false });
        loadParentDashboard(localStorage.getItem('parentToken'));

    } catch (e) {
        Swal.fire('แจ้งเตือน', e.message, 'warning');
    }
}

// ฟังก์ชันสำหรับสลับสีปุ่มและเปลี่ยนข้อความแนะนำ (Placeholder)
window.setContactType = function(type) {
    document.getElementById('hubContactType').value = type;
    const input = document.getElementById('hubParentContact');
    
    const btnPhone = document.getElementById('btnContactPhone');
    const btnLine = document.getElementById('btnContactLine');
    const btnFB = document.getElementById('btnContactFB');
    
    // ล้างสถานะปุ่มทั้งหมดก่อน
    btnPhone.className = 'btn btn-sm flex-grow-1 rounded-pill btn-outline-primary';
    btnPhone.style = '';
    btnLine.className = 'btn btn-sm flex-grow-1 rounded-pill btn-outline-success';
    btnFB.className = 'btn btn-sm flex-grow-1 rounded-pill btn-outline-primary';
    
    // เช็คว่าผู้ปกครองเลือกช่องทางไหน
    if (type === 'PHONE') {
        btnPhone.className = 'btn btn-sm flex-grow-1 rounded-pill active';
        btnPhone.style = 'background-color: #0d6efd; color: white;';
        input.placeholder = 'ใส่เบอร์โทรศัพท์ของคุณ';
    } else if (type === 'LINE') {
        btnLine.className = 'btn btn-sm flex-grow-1 rounded-pill active btn-success text-white';
        input.placeholder = 'ใส่ไอดี LINE ของคุณ';
    } else if (type === 'FB') {
        btnFB.className = 'btn btn-sm flex-grow-1 rounded-pill active text-white';
        btnFB.style = 'background-color: #1877f2; border-color: #1877f2;';
        input.placeholder = 'ใส่ชื่อ Facebook (หรือลิงก์ m.me)';
    }
};

// ฟังก์ชันส่งเรื่องปรึกษาครู (มีระบบ Lock ปุ่มกันสแปม)
window.processSendToTeacher = async function(id, btn) {
    const msg = document.getElementById('hubMsgToTeacher').value.trim();
    let contact = document.getElementById('hubParentContact').value.trim();
    const contactType = document.getElementById('hubContactType').value;
    
    if(!msg) return Swal.fire('เตือน', 'กรุณาพิมพ์เรื่องที่ต้องการปรึกษาครูครับ', 'warning');
    if(!contact) return Swal.fire('เตือน', 'กรุณาระบุข้อมูลติดต่อกลับครับ', 'warning');

    // ใส่ Prefix (LINE: / FB:) เพื่อให้ระบบฝั่งครูรู้ว่าต้องสร้างเป็นปุ่มแอปไหน
    if (contactType === 'LINE') {
        contact = 'LINE:' + contact;
    } else if (contactType === 'FB') {
        contact = 'FB:' + contact;
    }

    // ล็อกปุ่มกันผู้ปกครองกดเบิ้ล
    if(btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> กำลังส่ง...';
    }

    try {
        await supabaseClient.from('parent_communications').insert([{ 
            student_id: id, 
            target: 'teacher', 
            type: 'consult', 
            message: msg,
            parent_contact: contact 
        }]);
        
        Swal.fire({ icon: 'success', title: 'ส่งเรื่องถึงคุณครูแล้ว!', timer: 2500, showConfirmButton: false });
        
        // ส่งเสร็จแล้วให้ล้างกล่องข้อความ
        document.getElementById('hubMsgToTeacher').value = '';
        document.getElementById('hubParentContact').value = '';
    } catch(e) {
        Swal.fire('ผิดพลาด', e.message, 'error');
    } finally {
        // คืนชีพปุ่มให้กลับมากดได้เหมือนเดิม
        if(btn) {
            btn.disabled = false;
            btn.innerHTML = 'ยืนยันและส่งข้อความหาครู';
        }
    }
};
