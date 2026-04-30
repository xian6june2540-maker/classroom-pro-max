// =========================================================
// 👨‍👩‍👧‍👦 PARENT SYSTEM LOGIC (Dedicated File)
// =========================================================

// ฟังก์ชันโหลด Dashboard ผู้ปกครอง
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

        const [attRes, tasksRes, subRes] = await Promise.all([
            supabaseClient.from('attendance').select('*').eq('student_id', student.id).order('check_date', { ascending: false }).limit(20),
            supabaseClient.from('tasks').select('*').eq('room', student.room).order('due_date', { ascending: false }).limit(20),
            supabaseClient.from('submissions').select('*').eq('student_id', student.id)
        ]);

        const attData = attRes.data || [];
        const tasks = tasksRes.data || [];
        const submissions = subRes.data || [];
        const countAtt = (status) => attData.filter(a => a.status === status).length;

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
                <div class="card-header bg-primary bg-opacity-10 border-0 fw-bold text-primary small">ภารกิจและการส่งงาน</div>
                <div class="card-body p-0" style="max-height: 180px; overflow-y: auto;">
                    <div class="list-group list-group-flush">
                        ${tasks.length > 0 ? tasks.map(t => {
                            const sub = submissions.find(s => s.task_id === t.task_id);
                            const isDone = sub && sub.status === 'ส่งแล้ว';
                            return `<div class="list-group-item py-2 px-3"><div class="d-flex justify-content-between align-items-center"><div><div class="fw-bold text-dark" style="font-size: 0.8rem;">${t.title}</div><small class="text-muted" style="font-size: 0.7rem;">กำหนด: ${formatThaiDate(t.due_date)}</small></div><div class="text-end">${isDone ? `<span class="badge bg-success mb-1" style="font-size:0.65rem;">ส่งแล้ว</span>` : `<span class="badge bg-danger" style="font-size:0.65rem;">ค้างส่ง</span>`}</div></div></div>`;
                        }).join('') : '<div class="p-3 text-center text-muted small">ไม่มีงาน</div>'}
                    </div>
                </div>
            </div>

            <div class="px-2">
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
                    <input type="text" id="hubParentContact" class="form-control mb-1 fw-bold text-center" placeholder="ข้อมูลติดต่อกลับ">
                    <button class="btn btn-primary w-100 fw-bold rounded-pill shadow-lg py-2" onclick="processSendToTeacher('${studentId}')">ยืนยันและส่งข้อความหาครู</button>
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

window.processSendToStudent = async function(id) {
    const msg = document.getElementById('hubMsgToStudent').value.trim();
    if(!msg) return;
    await supabaseClient.from('parent_communications').insert([{ student_id: id, target: 'student', type: 'praise', message: msg }]);
    Swal.fire({ icon: 'success', title: 'ส่งเรียบร้อย!', timer: 2000, showConfirmButton: false });
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

window.acknowledgeParentMsg = async function(msgId) {
    await supabaseClient.from('parent_communications').delete().eq('id', msgId);
    window.location.reload();
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
