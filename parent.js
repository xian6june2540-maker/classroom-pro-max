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
                <!-- 🌟 ปุ่มใหม่: แจ้งลาหยุด -->
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
    Swal.fire({ title: 'กำลังตรวจสอบและบันทึกข้อมูล...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });

    try {
        // 1. สร้าง Array ของวันที่ทั้งหมดที่ต้องการลา
        let currentDate = new Date(data.start);
        const endDate = new Date(data.end);
        let dateArray = [];
        
        while (currentDate <= endDate) {
            dateArray.push(currentDate.toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // 2. Cross-Check: ตรวจสอบข้อมูลซ้ำซ้อน
        const { data: existingLeaves, error: checkError } = await supabaseClient
            .from('leaves')
            .select('leave_date')
            .eq('student_id', studentId)
            .in('leave_date', dateArray);

        if (checkError) throw checkError;

        if (existingLeaves && existingLeaves.length > 0) {
            const duplicateDates = existingLeaves.map(d => formatThaiDate(d.leave_date)).join(', ');
            throw new Error(`ไม่สามารถทำรายการได้: วันที่ [${duplicateDates}] มีการยื่นใบลาไว้ในระบบเรียบร้อยแล้วครับ`);
        }

        // 3. ดึง API KEY ของ ImgBB จากฝั่งเซิร์ฟเวอร์ (GAS) ที่คุณครูตั้งค่าไว้
        let myImgbbKey = await new Promise((resolve) => {
            google.script.run
                .withSuccessHandler(function(config) {
                    resolve(config && config.IMGBB_API_KEY ? config.IMGBB_API_KEY : "");
                })
                .withFailureHandler(function() {
                    resolve("");
                })
                .getTeacherConfigMasked(); 
        });

        // 4. จัดการอัปโหลดไฟล์ไปที่ ImgBB
        let finalUrl = "";
        if (data.file) {
            if (!myImgbbKey) {
                throw new Error('ไม่พบข้อมูล API Key สำหรับอัปโหลดรูปภาพ กรุณาแจ้งครูให้ตั้งค่าระบบครับ');
            }

            Swal.fire({ title: 'กำลังอัปโหลดรูปภาพ...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
            const formData = new FormData();
            formData.append('image', data.file);
            
            const res = await fetch(`https://api.imgbb.com/1/upload?key=${myImgbbKey}`, {
                method: 'POST',
                body: formData
            });
            const resData = await res.json();
            
            if (resData.success) {
                finalUrl = resData.data.url;
            } else {
                throw new Error('อัปโหลดรูปภาพไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
            }
        }

        // 5. บันทึกข้อมูลลงฐานข้อมูล (ทำทีละวันจนครบ)
        Swal.fire({ title: 'กำลังอัปเดตระบบตารางเรียน...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
        for (const date of dateArray) {
            const { error: insertError } = await supabaseClient.from('leaves').insert([{
                student_id: studentId,
                leave_date: date,
                type: data.type,
                reason: data.reason,
                proof_url: finalUrl,
                status: 'อนุมัติแล้ว'
            }]);
            
            if (insertError) throw insertError;

            await supabaseClient.from('attendance').upsert({
                student_id: studentId,
                check_date: date,
                status: 'ลา'
            }, { onConflict: 'student_id,check_date' });
        }

        await Swal.fire({ icon: 'success', title: 'แจ้งลาสำเร็จ!', text: `บันทึกการลาจำนวน ${dateArray.length} วัน เรียบร้อยแล้ว`, timer: 2000, showConfirmButton: false });
        loadParentDashboard(localStorage.getItem('parentToken'));

    } catch (e) {
        Swal.fire('แจ้งเตือนการทำรายการ', e.message, 'warning');
    }
}
