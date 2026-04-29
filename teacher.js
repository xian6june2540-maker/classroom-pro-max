    // =====================================
    // TEACHER LOGIC (DIRECT SUPABASE FETCH)
    // =====================================
    let groupTasksData = [];
    let currentGroupsListCache = []; 

    // --- โค้ดหลังแก้ไข ---
    function mapStudentToArr(s) {
        return [
            s.id, s.name, s.nickname||"", s.gender||"", s.room||"", s.accumulated_score||0,
            s.pin||"", s.phone||"", s.disease||"", s.dob||"", s.sport||"", s.talent||"", s.hobby||"",
            s.father||"", s.mother||"", s.house_no||"", s.moo||"", s.sub_district||"", s.district||"",
            s.province||"", s.zipcode||"", s.avatar||"1", s.exp||0, s.last_check_in||"",
            JSON.stringify(s.dm||[]), JSON.stringify(s.inventory||[]), s.equipped_bg||"bg0", s.last_passive_update||0,
            s.parent_token || "" // <--- เพิ่มตรงนี้
        ];
    }

    document.addEventListener('DOMContentLoaded', function() {
        if (localStorage.getItem('teacherLoggedIn') === 'true') {
            let btnConfig = document.getElementById('btnTeacherConfig');
            if (btnConfig) btnConfig.classList.remove('hidden');
        }
    });

    function loginTeacher() {
        Swal.fire({
            title: 'เข้าสู่ระบบครู',
            input: 'password',
            showCancelButton: true,
            confirmButtonText: 'ถัดไป',
            inputValidator: function(v) { return !v && 'ใส่รหัส'; }
        }).then(function(r) {
            if (r.isConfirmed) {
                Swal.fire({ title: 'ตรวจสอบ...', didOpen: function() { Swal.showLoading(); } });
                google.script.run.withSuccessHandler(function(st) {
                    if (st === 'OTP_SENT') {
                        Swal.fire({
                            title: 'ยืนยัน OTP',
                            input: 'text',
                            showCancelButton: true,
                            confirmButtonText: 'เข้าสู่ระบบ'
                        }).then(function(otpR) {
                            if (otpR.isConfirmed) {
                                Swal.fire({ title: 'ยืนยัน...', didOpen: function() { Swal.showLoading(); } });
                                google.script.run.withSuccessHandler(function(isValid) {
                                    if (isValid) {
                                        completeTeacherLogin();
                                    } else {
                                        Swal.fire('ผิดพลาด', 'OTP ผิด', 'error');
                                    }
                                }).verifyOTP(otpR.value);
                            }
                        });
                    } else if (st === 'BYPASS_OTP') {
                        completeTeacherLogin();
                    } else {
                        Swal.fire('PIN ผิด!', '', 'error');
                    }
                }).verifyPIN(r.value);
            }
        });
    }

    async function completeTeacherLogin() {
        localStorage.setItem('teacherLoggedIn', 'true');
        localStorage.removeItem('studentId');
        if (autoRefreshInterval) clearInterval(autoRefreshInterval);
        
        document.getElementById('btnLock').classList.add('hidden');
        document.getElementById('btnTeacherConfig').classList.remove('hidden');
        document.getElementById('btnLogout').classList.remove('hidden');
        document.getElementById('student-search-view').classList.add('hidden');
        document.getElementById('student-dashboard-view').classList.add('hidden');
        document.getElementById('draggable-avatar').classList.add('hidden');
        document.getElementById('teacher-view').classList.remove('hidden');
        document.getElementById('view-rooms').classList.remove('hidden');
        document.getElementById('view-dashboard').classList.add('hidden');
        
        Swal.fire({ title: 'กำลังเตรียมระบบ...', didOpen: function() { Swal.showLoading(); } });
        await initSupabaseAsync();
        
        Swal.close(); 
        Toast.fire({ icon: 'success', title: 'ยินดีต้อนรับ!' });
        loadAllData();
    }

    function logoutTeacher() {
        Swal.fire({
            title: 'ออกจากระบบ?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'ออก'
        }).then(function(r) {
            if (r.isConfirmed) {
                localStorage.removeItem('teacherLoggedIn');
                
                document.getElementById('teacher-view').classList.add('hidden');
                document.getElementById('view-dashboard').classList.add('hidden');
                document.getElementById('view-rooms').classList.add('hidden');
                document.getElementById('btnLogout').classList.add('hidden');
                document.getElementById('btnTeacherConfig').classList.add('hidden');
                document.getElementById('student-search-view').classList.remove('hidden');
                document.getElementById('btnLock').classList.remove('hidden');
                currentRoom = '';
                document.getElementById('portalStudentId').value = '';
                document.getElementById('selectResultBox').classList.add('hidden');
                Toast.fire({ icon: 'success', title: 'ออกเรียบร้อย' });
            }
        });
    }

    // =====================================
    // TEACHER CONFIG SYSTEM (รองรับ Supabase & Gemini)
    // =====================================
    let currentTeacherConfig = {};

    function openTeacherConfigModal() {
        Swal.fire({ title: 'กำลังโหลดข้อมูล...', didOpen: function() { Swal.showLoading(); } });
        google.script.run.withSuccessHandler(function(config) {
            Swal.close();
            currentTeacherConfig = config;
            
            // 🌟 เพิ่ม GEMINI_API_KEY เข้ามาใน List
            const keys = ['SUPABASE_URL', 'SUPABASE_KEY', 'LINE_ACCESS_TOKEN', 'IMGBB_API_KEY', 'GEMINI_API_KEY', 'TEACHER_LINE_UID', 'TEACHER_PIN'];
            keys.forEach(k => {
                if(k !== 'TEACHER_PIN') {
                    document.getElementById('view_' + k).innerText = config[k] || 'ไม่มีข้อมูล';
                    document.getElementById('input_' + k).value = config[k] || '';
                } else {
                    document.getElementById('input_' + k).value = '';
                }
                
                let editDiv = document.getElementById('edit_' + k);
                if(editDiv) editDiv.classList.add('hidden');
                
                let btnEdit = document.getElementById('btnEdit_' + k);
                if(btnEdit) btnEdit.innerHTML = '<i class="bi bi-pencil-square"></i> ' + (k === 'TEACHER_PIN' ? 'เปลี่ยนรหัส' : 'แก้ไข');
                
                let pinInput = document.getElementById('pin_' + k);
                if(pinInput) pinInput.value = '';
            });
            
            showAppModal('teacherConfigModal');
        }).getTeacherConfigMasked();
    }

    function toggleConfigEdit(key) {
        const editDiv = document.getElementById('edit_' + key);
        const btnEdit = document.getElementById('btnEdit_' + key);
        
        if (editDiv.classList.contains('hidden')) {
            editDiv.classList.remove('hidden');
            btnEdit.innerHTML = '<i class="bi bi-x-lg"></i> ปิดหน้าต่าง';
        } else {
            editDiv.classList.add('hidden');
            btnEdit.innerHTML = '<i class="bi bi-pencil-square"></i> ' + (key === 'TEACHER_PIN' ? 'เปลี่ยนรหัส' : 'แก้ไข');
            
            document.getElementById('pin_' + key).value = '';
            if(key !== 'TEACHER_PIN') {
                document.getElementById('input_' + key).value = currentTeacherConfig[key] || '';
            } else {
                document.getElementById('input_' + key).value = '';
            }
        }
    }

    function saveSingleConfig(key) {
        const newValue = document.getElementById('input_' + key).value;
        const oldPin = document.getElementById('pin_' + key).value;
        
        if (!oldPin) {
            return Swal.fire('เตือน', 'กรุณาใส่รหัส PIN ครูเพื่อยืนยันสิทธิ์!', 'warning');
        }
        if (key === 'TEACHER_PIN' && !newValue) {
            return Swal.fire('เตือน', 'กรุณาระบุรหัส PIN ใหม่ที่ต้องการเปลี่ยน!', 'warning');
        }

        Swal.fire({ title: 'กำลังตรวจสอบและบันทึก...', didOpen: function() { Swal.showLoading(); } });
        
        google.script.run.withSuccessHandler(function(res) {
            if (res.success) {
                Swal.fire({ toast: true, position: 'top', icon: 'success', title: res.message, showConfirmButton: false, timer: 2000 });
                if (key !== 'TEACHER_PIN') {
                    currentTeacherConfig[key] = newValue;
                    document.getElementById('view_' + key).innerText = newValue || 'ไม่มีข้อมูล';
                }
                toggleConfigEdit(key); 
            } else {
                Swal.fire('ยืนยันตัวตนล้มเหลว', res.message, 'error');
            }
        }).updateSingleConfigItem(key, newValue, oldPin);
    }

    // =====================================
    // TEACHER FUNCTIONS
    // =====================================
    function promptSendDM(id, name) {
        document.getElementById('dmTargetId').value = id;
        document.getElementById('dmTargetName').innerText = name;
        document.getElementById('dmTextInput').value = '';
        showAppModal('sendDmModal');
    }

    function processSendDM() {
        const id = document.getElementById('dmTargetId').value;
        const msg = document.getElementById('dmTextInput').value.trim();
        if (!msg) return;
        
        Swal.fire({ title: 'กำลังส่งข้อความ...', didOpen: function() { Swal.showLoading(); } });
        google.script.run.withSuccessHandler(function(res) {
            Swal.close();
            if (res.success) {
                Swal.fire('ส่งสำเร็จ', 'ข้อความส่วนตัวส่งถึงเด็กแล้ว', 'success');
                hideAppModal('sendDmModal');
            }
        }).sendDMToStudent(id, msg);
    }

    function openBulkExpModal() {
        const f = studentsData.filter(function(s) { return s[4] === currentRoom; });
        let html = '';
        f.forEach(function(s) {
            html += '<div class="form-check border-bottom py-2"><input class="form-check-input exp-student-cb" type="checkbox" value="' + s[0] + '" id="cbExp_' + s[0] + '"><label class="form-check-label w-100" for="cbExp_' + s[0] + '">' + s[0] + ' - ' + s[1] + '</label></div>';
        });
        document.getElementById('bulkExpStudentList').innerHTML = html;
        document.getElementById('bulkExpAmount').value = '';
        document.getElementById('bulkExpReason').value = '';
        document.getElementById('selectAllExp').checked = false;
        showAppModal('bulkExpModal');
    }

    function toggleSelectAllExp(cb) {
        document.querySelectorAll('.exp-student-cb').forEach(function(el) { el.checked = cb.checked; });
    }

    function submitBulkExp() {
        let amount = parseInt(document.getElementById('bulkExpAmount').value);
        let reason = document.getElementById('bulkExpReason').value.trim();
        let selected = [];
        
        document.querySelectorAll('.exp-student-cb:checked').forEach(function(cb) { selected.push(cb.value); });
        
        if (!amount || !reason || selected.length === 0) return Swal.fire('เตือน', 'กรุณากรอกข้อมูลให้ครบและเลือกนักเรียน', 'warning');
        
        Swal.fire({ title: 'กำลังมอบแต้ม...', didOpen: function() { Swal.showLoading(); } });
        google.script.run.withSuccessHandler(function(res) {
            Swal.close();
            if (res.success) {
                Swal.fire('สำเร็จ', 'มอบแต้มและส่งแจ้งเตือนเรียบร้อยแล้ว!', 'success');
                hideAppModal('bulkExpModal');
                loadAllData(); // จะอัปเดตผ่าน Realtime อัตโนมัติอยู่แล้ว
            }
        }).giveBulkExp(selected, amount, reason);
    }

    function filterTable(id, q) {
        const rows = document.getElementById(id).getElementsByTagName('tr');
        const lq = q.toLowerCase();
        for (let i = 0; i < rows.length; i++) {
            rows[i].style.display = rows[i].innerText.toLowerCase().includes(lq) ? '' : 'none';
        }
    }

    // 🟢 อัปเกรด: ดึงข้อมูลตั้งต้นทั้งหมดตรงจาก Supabase (Direct Fetch)
    async function loadAllData() {
        if (!supabaseClient) return;

        // ดึงข้อมูลห้อง
        let { data: rData } = await supabaseClient.from('rooms').select('room_name').order('room_name', { ascending: true });
        roomsData = rData ? rData.map(r => r.room_name) : [];
        renderRooms();
        
        // ดึงข้อมูลนักเรียนทั้งหมด
        let { data: sData } = await supabaseClient.from('students').select('*').order('id', { ascending: true });
        studentsData = sData ? sData.map(mapStudentToArr) : [];
        
        if (currentRoom) { 
            renderStudents(); 
            loadAttendanceForDate();
            loadPendingLeaves();
        } 
        
        // ดึงข้อมูลงานเดี่ยว
        let { data: tData } = await supabaseClient.from('tasks').select('*').order('task_id', { ascending: true });
        tasksData = tData ? tData.map(t => [t.task_id, t.title, t.description||"", t.due_date||"", t.room||"", t.max_score||0]) : [];
        if (currentRoom) renderAssignments();
        
        // ดึงข้อมูลงานกลุ่ม
        let { data: gtData } = await supabaseClient.from('group_tasks').select('*').order('task_id', { ascending: true });
        groupTasksData = gtData ? gtData.map(t => [t.task_id, t.title, t.max_members, t.due_date||"", t.room||"", t.max_score||0]) : [];
        if (currentRoom) renderGroupAssignments();
    }

    // --- [แก้ไข: ดึงข้อมูลนักเรียนพร้อมคำขอปรึกษาจากผู้ปกครอง] ---
    async function loadStudents() {
        if (!supabaseClient) return;
        
        // 1. ดึงข้อมูลนักเรียน และ ข้อมูลคำขอปรึกษาจากผู้ปกครองที่ยังไม่ได้แก้ไข (is_resolved = false)
        let [sRes, cRes] = await Promise.all([
            supabaseClient.from('students').select('*').order('id', { ascending: true }),
            supabaseClient.from('parent_communications').select('*').eq('target', 'teacher').eq('is_resolved', false)
        ]);

        let sData = sRes.data;
        window.tempConsults = cRes.data || []; // เก็บข้อมูลคำขอปรึกษาไว้ชั่วคราว

        // 2. ดึงข้อมูลโบนัส (การมาเรียน และ การส่งงาน) เพื่อคำนวณหน้าจอให้ตรงกับเด็ก
        let { data: allAtt } = await supabaseClient.from('attendance').select('student_id, status').eq('room', currentRoom);
        let { data: allSubs } = await supabaseClient.from('submissions').select('student_id, status, timestamp, task_id');
        let { data: allTasks } = await supabaseClient.from('tasks').select('task_id, due_date').eq('room', currentRoom);
        let { data: allGSubs } = await supabaseClient.from('group_submissions').select('group_id, status');
        let { data: allGroups } = await supabaseClient.from('groups').select('group_id, members, task_id').eq('status', 'อนุมัติแล้ว');

        window.tempBonusData = {
            atts: allAtt || [],
            subs: allSubs || [],
            tasks: allTasks || [],
            gSubs: allGSubs || [],
            groups: allGroups || []
        };

        studentsData = sData ? sData.map(mapStudentToArr) : [];
        if (currentRoom) {
            renderStudents(); 
            updateDashboardStats();
        }
    }
    
    async function loadAssignments() {
        if (!supabaseClient) return;
        let { data: tData } = await supabaseClient.from('tasks').select('*').order('task_id', { ascending: true });
        tasksData = tData ? tData.map(t => [t.task_id, t.title, t.description||"", t.due_date||"", t.room||"", t.max_score||0]) : [];
        if (currentRoom) renderAssignments();

        let { data: gtData } = await supabaseClient.from('group_tasks').select('*').order('task_id', { ascending: true });
        groupTasksData = gtData ? gtData.map(t => [t.task_id, t.title, t.max_members, t.due_date||"", t.room||"", t.max_score||0]) : [];
        if (currentRoom) renderGroupAssignments();
    }

    async function updateDashboardStats() {
        const f = studentsData.filter(function(s) { return s[4] === currentRoom; });
        document.getElementById('statTotal').innerText = f.length;
        
        let p = 0, a = 0;
        f.forEach(function(s) {
            let st = attendanceData[s[0]];
            if (st === 'มา') p++;
            else if (st === 'ลา' || st === 'ขาด') a++;
        });
        document.getElementById('statPresent').innerText = p;
        document.getElementById('statAbsent').innerText = a;
        
        const t = tasksData.filter(function(x) { return x[4] === currentRoom; });
        const gt = groupTasksData.filter(function(x) { return x[4] === currentRoom; });
        document.getElementById('statTaskName').innerText = 'ส่งงานทั้งหมด (' + (t.length + gt.length) + ' งาน)';
        
        if ((t.length + gt.length) > 0 && f.length > 0) {
            let stIds = f.map(s => s[0]);
            let taskIds = t.map(x => x[0]);
            let count = 0;
            
            if (taskIds.length > 0 && stIds.length > 0) {
                let { count: c } = await supabaseClient.from('submissions')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'ส่งแล้ว')
                    .in('task_id', taskIds)
                    .in('student_id', stIds);
                count = c || 0;
            }
            document.getElementById('statTaskPct').innerText = Math.round((count / (f.length * (t.length + gt.length))) * 100) + "%";
        } else {
            document.getElementById('statTaskPct').innerText = "0%";
        }
    }

    function renderRooms() {
        const c = document.getElementById('roomListContainer');
        if (roomsData.length === 0) return c.innerHTML = '<div class="col-12 text-center text-muted py-5">ยังไม่มีห้อง</div>';
        
        let rHtml = '';
        roomsData.forEach(function(r) {
            rHtml += `
                <div class="col-md-4 col-sm-6">
                    <div class="card room-card h-100 p-3 shadow-sm" onclick="enterRoom('${r}')">
                        <div class="card-body text-center">
                            <i class="bi bi-door-open text-primary" style="font-size:3rem;"></i>
                            <h4 class="mt-3 fw-bold">${r}</h4>
                        </div>
                        <div class="card-footer bg-transparent border-0 text-center d-flex justify-content-center gap-2">
                            <button class="btn btn-outline-warning btn-sm px-3" onclick="event.stopPropagation(); editRoomName('${r}')">
                                <i class="bi bi-pencil-square"></i> แก้ไข
                            </button>
                            <button class="btn btn-outline-danger btn-sm px-3" onclick="event.stopPropagation(); deleteRoom('${r}')">
                                <i class="bi bi-trash"></i> ลบ
                            </button>
                        </div>
                    </div>
                </div>`;
        });
        c.innerHTML = rHtml;
    }

    function openRoomModal() {
        document.getElementById('newRoomName').value = '';
        showAppModal('roomModal');
    }

    async function saveRoom() {
        const r = document.getElementById('newRoomName').value.trim();
        if (!r) return;
        hideAppModal('roomModal');
        
        Swal.fire({ title: 'กำลังสร้างห้อง...', didOpen: function() { Swal.showLoading(); } });
        
        if (supabaseClient) {
            const { error } = await supabaseClient.from('rooms').insert([{ room_name: r }]);
            if (error) {
                Swal.fire('ผิดพลาด', 'ไม่สามารถสร้างห้องได้: ' + error.message, 'error');
            } else {
                Swal.close();
                Toast.fire({ icon: 'success', title: 'เพิ่มห้องแล้ว' });
                loadAllData();
            }
        }
    }

    function deleteRoom(r) {
        Swal.fire({
            title: 'ลบห้อง?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'ลบ'
        }).then(async function(res) {
            if (res.isConfirmed) {
                Swal.fire({ title: 'กำลังลบ...', didOpen: function() { Swal.showLoading(); } });
                
                if (supabaseClient) {
                    const { error } = await supabaseClient.from('rooms').delete().eq('room_name', r);
                    if (error) {
                        Swal.fire('ผิดพลาด', 'ไม่สามารถลบห้องได้: ' + error.message, 'error');
                    } else {
                        Swal.close();
                        Toast.fire({ icon: 'success', title: 'ลบห้องสำเร็จ' });
                        loadAllData();
                    }
                }
            }
        });
    }

    function editRoomName(oldName) {
        Swal.fire({
            title: 'เปลี่ยนชื่อห้องเรียน',
            input: 'text',
            inputValue: oldName,
            showCancelButton: true,
            confirmButtonText: 'บันทึกชื่อใหม่',
            cancelButtonText: 'ยกเลิก',
            inputValidator: (value) => {
                if (!value) return 'กรุณาระบุชื่อห้องด้วยครับ';
                if (value.trim() === oldName) return 'ชื่อห้องต้องไม่ซ้ำกับชื่อเดิมครับ';
            }
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({ 
                    title: 'กำลังเปลี่ยนชื่อห้อง...', 
                    allowOutsideClick: false,
                    didOpen: () => { Swal.showLoading(); } 
                });

                google.script.run
                    .withFailureHandler(function(err) {
                        Swal.close();
                        Swal.fire('เกิดข้อผิดพลาดค้างระบบ', err.message, 'error');
                    })
                    .withSuccessHandler(function(res) {
                        Swal.close();
                        if (res && res.success) {
                            Toast.fire({ icon: 'success', title: 'เปลี่ยนชื่อห้องเป็น "' + result.value + '" สำเร็จ' });
                            loadAllData(); // รีโหลดรายการห้องใหม่
                        } else {
                            Swal.fire('เปลี่ยนชื่อไม่สำเร็จ', res ? res.message : 'ไม่ทราบสาเหตุ', 'error');
                        }
                    }).renameRoom(oldName, result.value.trim());
            }
        });
    }

    function enterRoom(r) {
        currentRoom = r;
        document.getElementById('view-rooms').classList.add('hidden');
        document.getElementById('view-dashboard').classList.remove('hidden');
        document.getElementById('dashboardTitle').innerHTML = '<i class="bi bi-houses-fill"></i> ระดับชั้น/ห้อง: ' + r;
        document.getElementById('attDate').value = getLocalTodayStr();
        
        renderStudents();
        loadAttendanceForDate();
        renderAssignments();
        renderGroupAssignments();
        loadPendingLeaves();
        
        new bootstrap.Tab(document.querySelector('#pills-students-tab')).show();
    }

    function exitRoom() {
        currentRoom = '';
        document.getElementById('view-dashboard').classList.add('hidden');
        document.getElementById('view-rooms').classList.remove('hidden');
    }

    // =====================================
    // PENDING LEAVES (DIRECT FETCH & REAL-TIME)
    // =====================================
    async function checkPendingLeaves() {
        if (!currentRoom || !supabaseClient) return;
        
        let { data: reqs } = await supabaseClient.from('leaves').select('*').eq('status', 'รออนุมัติ').eq('room', currentRoom);
        let formattedReqs = reqs ? reqs.map(r => ({ rowIndex: r.id, date: r.leave_date, name: r.student_name, reason: r.reason, studentId: r.student_id })) : [];
        
        let oldDataStr = JSON.stringify(window.pendingLeavesData || []);
        let newDataStr = JSON.stringify(formattedReqs);
        
        if (oldDataStr !== newDataStr) {
            window.pendingLeavesData = formattedReqs;
            const b = document.getElementById('leaveBadge');
            if (b) {
                b.innerText = formattedReqs.length;
                b.style.display = formattedReqs.length > 0 ? 'inline-block' : 'none';
            }
            
            let modal = document.getElementById('teacherLeaveModal');
            if (modal && modal.classList.contains('show')) {
                openTeacherLeaveModal();
            }
        }
    }

    async function loadPendingLeaves() {
        if(!supabaseClient) return;
        let { data: reqs } = await supabaseClient.from('leaves').select('*').eq('status', 'รออนุมัติ').eq('room', currentRoom);
        let formattedReqs = reqs ? reqs.map(r => ({ rowIndex: r.id, date: r.leave_date, name: r.student_name, reason: r.reason, studentId: r.student_id })) : [];
        
        window.pendingLeavesData = formattedReqs;
        const b = document.getElementById('leaveBadge');
        if (b) {
            b.innerText = formattedReqs.length;
            b.style.display = formattedReqs.length > 0 ? 'inline-block' : 'none';
        }
    }

    function openTeacherLeaveModal() {
        const tb = document.getElementById('teacherLeaveTableBody');
        if (!window.pendingLeavesData || window.pendingLeavesData.length === 0) {
            tb.innerHTML = '<tr><td colspan="4" class="text-center py-4">ไม่มีคำร้อง</td></tr>';
        } else {
            let lHtml = '';
            window.pendingLeavesData.forEach(function(r) {
                lHtml += '<tr><td>' + r.date + '</td><td>' + r.name + '</td><td>' + r.reason + '</td><td class="text-center"><button class="btn btn-success btn-sm me-1" onclick="approveLeave(' + r.rowIndex + ',\'' + r.date + '\',\'' + r.studentId + '\',\'อนุมัติ\')"><i class="bi bi-check-lg"></i></button><button class="btn btn-danger btn-sm" onclick="approveLeave(' + r.rowIndex + ',\'' + r.date + '\',\'' + r.studentId + '\',\'ไม่อนุมัติ\')"><i class="bi bi-x-lg"></i></button></td></tr>';
            });
            tb.innerHTML = lHtml;
        }
        showAppModal('teacherLeaveModal');
    }

    function approveLeave(idx, d, id, st) {
        google.script.run.withSuccessHandler(function() {
            Toast.fire({ icon: 'success', title: st });
            loadPendingLeaves();
            loadAttendanceForDate();
            hideAppModal('teacherLeaveModal');
        }).approveLeaveRequest(idx, d, id, st);
    }
    
    function promptGiveExp(studentId, studentName, currentExp) {
        Swal.fire({
            title: 'จัดการ EXP: ' + studentName,
            html: '<div class="mb-3 text-start"><span class="badge bg-success fs-6"><i class="bi bi-star-fill text-warning"></i> แต้มปัจจุบัน: ' + currentExp + ' EXP</span></div><div class="text-start small fw-bold text-muted mb-1">กรอกจำนวน EXP ที่ต้องการเพิ่ม (ใส่ติดลบเพื่อลดแต้ม)</div>',
            input: 'number',
            inputAttributes: { step: '1' },
            showCancelButton: true,
            confirmButtonColor: '#0d6efd',
            confirmButtonText: '<i class="bi bi-arrow-up-circle-fill"></i> บันทึก',
            cancelButtonText: 'ยกเลิก',
            inputValidator: function(value) {
                if (!value) return 'กรุณากรอกจำนวนแต้ม!';
            }
        }).then(function(result) {
            if (result.isConfirmed) {
                Swal.fire({ title: 'กำลังบันทึก...', didOpen: function() { Swal.showLoading(); } });
                google.script.run.withSuccessHandler(function(res) {
                    Swal.close();
                    if (res.success) {
                        Swal.fire('สำเร็จ', 'อัปเดต EXP เรียบร้อยแล้ว', 'success');
                        loadStudents();
                    } else {
                        Swal.fire('ผิดพลาด', res.message, 'error');
                    }
                }).addManualEXP(studentId, parseInt(result.value));
            }
        });
    }

    // --- [แก้ไข: แสดงไอคอนแจ้งเตือนท้ายชื่อนักเรียน] ---
    function renderStudents() { 
        const tb = document.getElementById('studentTableBody');
        const f = studentsData.filter(function(s) { return s[4] === currentRoom; }); 
        
        if (f.length === 0) {
            tb.innerHTML = '<tr><td colspan="4" class="text-center py-4">ไม่มีรายชื่อนักเรียนในห้องนี้</td></tr>'; 
            return;
        }
        
        const b = window.tempBonusData || { atts:[], subs:[], tasks:[], gSubs:[], groups:[] };
        let sHtml = '';
        const now = Date.now(); 

        f.forEach(function(s) { 
            const studentId = s[0];
            const idx = studentsData.indexOf(s);
            
            // เช็คว่าเด็กคนนี้มีเรื่องที่ผู้ปกครองฝากไว้หรือไม่
            const hasConsult = (window.tempConsults || []).find(c => c.student_id === studentId);
            
            let totalDisplayExp = Math.floor(parseFloat(s[22]) || 0);
            let accScore = parseFloat(s[5]) || 0;
            let displayName = s[1];
            if (s[2] && s[2].trim() !== "") displayName += ' <small class="text-muted">(' + s[2] + ')</small>';
            
            // 🌟 เพิ่มไอคอนแจ้งเตือนท้ายชื่อ (Badge สีแดงกระพริบ)
            if (hasConsult) {
                displayName += ` <span class="badge bg-danger pulse-text ms-1" style="cursor:pointer" onclick="openConsultDetail('${studentId}', '${s[1]}')" title="คลิกเพื่อดูรายละเอียดติดต่อกลับ">
                    <i class="bi bi-telephone-outbound-fill"></i> ผปค. รอครูติดต่อกลับ!</span>`;
            }
            
            sHtml += '<tr>' +
                '<td>' + studentId + '</td>' +
                '<td>' + displayName + '</td>' +
                '<td class="text-center">' +
                    '<span class="badge bg-primary fw-bold px-2 py-2 mb-1 d-block border border-white shadow-sm">' + accScore + ' คะแนน</span>' +
                    '<span class="badge bg-success fw-bold px-2 py-2 d-block border border-white shadow-sm"><i class="bi bi-star-fill text-warning"></i> ' + totalDisplayExp.toLocaleString() + ' EXP</span>' +
                '</td>' +
                '<td class="text-center">' +
                    '<button class="btn btn-outline-danger btn-sm me-1" title="ส่งข้อความส่วนตัว" onclick="promptSendDM(\'' + studentId + '\', \'' + s[1] + '\')"><i class="bi bi-envelope-heart"></i> DM</button>' +
                    '<button class="btn btn-outline-success btn-sm me-1" title="เพิ่ม/ลด EXP" onclick="promptGiveExp(\'' + studentId + '\', \'' + s[1] + '\', ' + totalDisplayExp + ')"><i class="bi bi-arrow-up-circle-fill"></i> EXP</button>' +
                    '<button class="btn btn-outline-info btn-sm me-1" title="สมุดพก" onclick="generateStudentPDF(\'' + studentId + '\', \'' + s[4] + '\')"><i class="bi bi-printer-fill"></i></button>' +
                    '<button class="btn btn-outline-warning btn-sm me-1" title="แก้ไข" onclick="editStudent(' + idx + ')"><i class="bi bi-pencil-square"></i></button>' +
                    '<button class="btn btn-outline-danger btn-sm" title="ลบ" onclick="deleteStudent(' + idx + ')"><i class="bi bi-trash-fill"></i></button>' +
                '</td>' +
            '</tr>'; 
        }); 
        tb.innerHTML = sHtml;
    }
    // --- END UPDATE: SYNCHRONIZED TEACHER VIEW ---

    function openStudentModal() {
        document.getElementById('editIndex').value = -1;
        document.getElementById('stuId').value = '';
        document.getElementById('stuName').value = '';
        showAppModal('studentModal');
    }

    function editStudent(idx) {
        document.getElementById('editIndex').value = idx;
        document.getElementById('stuId').value = studentsData[idx][0];
        document.getElementById('stuName').value = studentsData[idx][1];
        showAppModal('studentModal');
    }

    function saveStudent() {
        const id = document.getElementById('stuId').value;
        const name = document.getElementById('stuName').value;
        const idx = parseInt(document.getElementById('editIndex').value);
        if (!id || !name) return;
        
        google.script.run.withSuccessHandler(function() {
            hideAppModal('studentModal');
            Toast.fire({ icon: 'success', title: 'บันทึกแล้ว' });
            loadAllData();
        }).saveStudent(id, name, currentRoom, idx);
    }

    function deleteStudent(idx) {
        Swal.fire({
            title: 'ลบนักเรียน?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ลบ'
        }).then(function(r) {
            if (r.isConfirmed) {
                Swal.fire({ title: 'กำลังลบ...', didOpen: function() { Swal.showLoading(); } });
                google.script.run.withSuccessHandler(function() {
                    Swal.close();
                    Toast.fire({ icon: 'success', title: 'ลบนักเรียนสำเร็จ' });
                    loadAllData();
                }).deleteStudent(idx);
            }
        });
    }

    // =====================================
    // ATTENDANCE (DIRECT FETCH)
    // =====================================
    async function loadAttendanceForDate() {
        const d = document.getElementById('attDate').value;
        const f = studentsData.filter(function(s) { return s[4] === currentRoom; });
        if (!d || f.length === 0) {
            document.getElementById('attTableBody').innerHTML = '<tr><td colspan="4" class="text-center py-4">ไม่มีรายชื่อนักเรียนในห้องนี้</td></tr>';
            attendanceData = {};
            updateDashboardStats();
            return;
        }
        
        if(!supabaseClient) return;
        
        let { data } = await supabaseClient.from('attendance').select('student_id, status').eq('check_date', d).eq('room', currentRoom);
        attendanceData = {};
        let res = {};
        if(data) data.forEach(r => res[r.student_id] = r.status);
        
        f.forEach(function(s) { attendanceData[s[0]] = res[s[0]] || 'รอเช็ค'; });
        renderAttendanceUI(f);
        updateDashboardStats();
    }

    function renderAttendanceUI(f) {
        let aHtml = '';
        f.forEach(function(s) {
            let st = attendanceData[s[0]];
            let displayName = s[1];
            if (s[2] && s[2].trim() !== "") displayName += ' <small class="text-muted">(' + s[2] + ')</small>';
            aHtml += '<tr><td>' + s[0] + '</td><td>' + displayName + '</td><td class="text-center"><div class="btn-group shadow-sm"><button id="btn-มา-' + s[0] + '" class="btn ' + (st === 'มา' ? 'btn-success text-white' : 'btn-outline-success') + ' btn-sm" onclick="setAtt(\'' + s[0] + '\',\'' + s[1] + '\',\'มา\')">มา</button><button id="btn-ลา-' + s[0] + '" class="btn ' + (st === 'ลา' ? 'btn-warning text-dark' : 'btn-outline-warning') + ' btn-sm" onclick="setAtt(\'' + s[0] + '\',\'' + s[1] + '\',\'ลา\')">ลา</button><button id="btn-ขาด-' + s[0] + '" class="btn ' + (st === 'ขาด' ? 'btn-danger text-white' : 'btn-outline-danger') + ' btn-sm" onclick="setAtt(\'' + s[0] + '\',\'' + s[1] + '\',\'ขาด\')">ขาด</button></div></td><td class="text-center"><span id="badge-' + s[0] + '" class="badge ' + getBadgeColor(st) + ' badge-status text-white">' + st + '</span></td></tr>';
        });
        document.getElementById('attTableBody').innerHTML = aHtml;
    }

    function getBadgeColor(st) {
        if (st === 'มา' || st === 'ส่งแล้ว') return 'bg-success';
        if (st === 'ลา' || st === 'รอตรวจ') return 'bg-warning text-dark'; // เพิ่ม 'รอตรวจ' เป็นสีเหลือง
        if (st === 'ขาด' || st === 'ยังไม่ส่ง') return 'bg-danger';
        return 'bg-secondary';
    }

    function setAtt(id, name, st) {
        const d = document.getElementById('attDate').value;
        attendanceData[id] = st;
        
        ['มา', 'ลา', 'ขาด'].forEach(function(x) {
            let b = document.getElementById('btn-' + x + '-' + id);
            if (b) b.className = 'btn btn-outline-' + (x === 'มา' ? 'success' : (x === 'ลา' ? 'warning' : 'danger')) + ' btn-sm';
        });
        
        let a = document.getElementById('btn-' + st + '-' + id);
        if (a) a.className = 'btn btn-' + (st === 'มา' ? 'success' : (st === 'ลา' ? 'warning text-dark' : 'danger')) + ' btn-sm ' + (st !== 'ลา' ? 'text-white' : '');
        
        let bg = document.getElementById('badge-' + id);
        bg.textContent = "บันทึก...";
        bg.className = 'badge bg-info text-dark';
        
        google.script.run.withSuccessHandler(function() {
            bg.textContent = st;
            bg.className = 'badge ' + getBadgeColor(st) + ' text-white';
            Toast.fire({ icon: 'success', title: st });
            updateDashboardStats();
        }).saveSingleAttendance(d, id, name, currentRoom, st);
    }
    
    // =====================================
    // INDIVIDUAL ASSIGNMENTS
    // =====================================
    function renderAssignments() {
        const l = document.getElementById('assignmentList');
        const f = tasksData.filter(function(t) { return t[4] === currentRoom; });
        if (f.length === 0) { 
            l.innerHTML = '<div class="text-center text-muted py-3">ยังไม่มีงานเดี่ยว</div>'; 
            updateDashboardStats(); 
            return; 
        }
        
        let html = '';
        f.reverse().forEach(function(t) {
            html += '<div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center mb-2 task-item" onclick="openTaskModal(\'' + t[0] + '\',\'' + t[1] + '\',\'' + t[3] + '\',\'' + (t[5] || 0) + '\')"><div><h6 class="mb-1 fw-bold text-primary">' + t[1] + ' <span class="badge bg-secondary ms-2">เต็ม: ' + (t[5] || '-') + '</span></h6><small class="text-muted">' + t[2] + '</small></div><div><span class="badge bg-warning text-dark rounded-pill py-2 px-3 me-2">ส่ง: ' + t[3] + '</span><button class="btn btn-outline-warning btn-sm" onclick="event.stopPropagation(); openEditAssignment(\'' + t[0] + '\',\'' + t[1] + '\',\'' + t[2] + '\',\'' + t[3] + '\',\'' + (t[5] || '') + '\')"><i class="bi bi-pencil-square"></i></button><button class="btn btn-outline-danger btn-sm" onclick="event.stopPropagation(); deleteAssignment(\'' + t[0] + '\')"><i class="bi bi-trash-fill"></i></button></div></div>';
        });
        l.innerHTML = html;
        updateDashboardStats();
    }

    function addAssignment() {
        const t = document.getElementById('taskTitle').value;
        const d = document.getElementById('taskDesc').value;
        const m = document.getElementById('taskMaxScore').value;
        const du = document.getElementById('taskDue').value;
        
        if (!t || !du || !m) return Swal.fire('เตือน', 'กรอกให้ครบ', 'warning');
        
        const id = 'WORK-' + Math.floor(Math.random() * 10000);
        Swal.fire({ title: 'กำลังสั่งงาน...', didOpen: function() { Swal.showLoading(); } });
        google.script.run.withSuccessHandler(function() {
            Swal.close();
            document.getElementById('taskTitle').value = '';
            document.getElementById('taskDesc').value = '';
            document.getElementById('taskDue').value = '';
            document.getElementById('taskMaxScore').value = '';
            window.sendPushNotification("📝 ภารกิจใหม่มาแล้ว!", "งาน: " + t + " (ส่งภายใน " + du + ")");
            Toast.fire({ icon: 'success', title: 'สั่งงานแล้ว' });
            loadAllData();
        }).saveAssignment(id, t, d, du, currentRoom, m);
    }

    function openEditAssignment(id, t, d, du, m) {
        document.getElementById('editTaskId').value = id;
        document.getElementById('editTaskTitle').value = t;
        document.getElementById('editTaskDesc').value = d;
        document.getElementById('editTaskDue').value = du;
        document.getElementById('editTaskMaxScore').value = m;
        showAppModal('editTaskModal');
    }

    function saveEditAssignment() {
        const id = document.getElementById('editTaskId').value;
        const t = document.getElementById('editTaskTitle').value;
        const d = document.getElementById('editTaskDesc').value;
        const du = document.getElementById('editTaskDue').value;
        const m = document.getElementById('editTaskMaxScore').value;
        if (!t || !du) return;
        
        google.script.run.withSuccessHandler(function() {
            hideAppModal('editTaskModal');
            Toast.fire({ icon: 'success', title: 'อัปเดตแล้ว' });
            loadAllData();
        }).updateAssignment(id, t, d, du, m);
    }

    function deleteAssignment(id) {
        Swal.fire({ title: 'ลบงานนี้?', icon: 'warning', showCancelButton: true, confirmButtonText: 'ลบ' }).then(function(r) {
            if (r.isConfirmed) {
                Swal.fire({ title: 'กำลังลบ...', didOpen: function() { Swal.showLoading(); } });
                google.script.run.withSuccessHandler(function() {
                    Swal.close();
                    Toast.fire({ icon: 'success', title: 'ลบงานสำเร็จ' });
                    loadAllData();
                }).deleteAssignment(id);
            }
        });
    }
    
    function openTaskModal(id, t, d, m) {
        currentTaskId = id; currentTaskTitle = t; currentTaskDue = d; currentTaskMax = parseFloat(m) || 0;
        
        document.getElementById('taskModalTitle').innerHTML = t + ' <span class="badge bg-secondary">เต็ม: ' + currentTaskMax + '</span>';
        document.getElementById('taskModalRoom').innerText = 'กำหนดส่ง: ' + d;
        document.getElementById('taskTableBody').innerHTML = '<tr><td colspan="6" class="text-center py-4">โหลด...</td></tr>';
        
        showAppModal('taskModal');
        openTaskSubmissions(id, t, d, m, false);
    }

    // 🟢 อัปเกรด: โหลดหน้าตรวจงานตรงจาก Supabase พร้อมปุ่มพรีวิวรูปภาพ
    async function openTaskSubmissions(id, tTitle, d, m, isGroup) {
        if (!supabaseClient) return;

        if (isGroup) {
            let { data: groups } = await supabaseClient.from('groups').select('*').eq('task_id', id);
            let { data: allStudents } = await supabaseClient.from('students').select('id,name');

            let formattedGroups = (groups || []).map(g => {
                let nms = (g.members || []).map(sid => {
                    let std = (allStudents || []).find(x => x.id === sid);
                    return std ? `${std.id} ${std.name}` : sid;
                });
                return { groupId: g.group_id, groupName: g.group_name, memberIds: g.members || [], memberNames: nms, status: g.status };
            });

            let approvedGroups = formattedGroups.filter(function (g) { return g.status === 'อนุมัติแล้ว'; });
            if (approvedGroups.length === 0) {
                document.getElementById('groupTaskTableBody').innerHTML = '<tr><td colspan="6" class="text-center py-4">ยังไม่มีกลุ่มที่ได้รับอนุมัติให้แสดงในหน้านี้</td></tr>';
                return;
            }

            let { data: subs } = await supabaseClient.from('group_submissions').select('*').eq('task_id', id);
            let res = {};
            if (subs) subs.forEach(r => res[r.group_id] = { status: r.status, score: r.score || "", url: r.url || "", screenshot_url: r.screenshot_url || "", timestamp: r.timestamp || "" });

            groupSubmissionData = {};
            approvedGroups.forEach(function (g) {
                groupSubmissionData[g.groupId] = res[g.groupId] || { status: 'ยังไม่ส่ง', score: '', url: '', screenshot_url: '' };
            });

            let html = '';
            approvedGroups.forEach(function (g) {
                let sub = groupSubmissionData[g.groupId];
                let st = sub.status;
                let sc = sub.score;
                let u = sub.url;
                let imgUrl = sub.screenshot_url;

                let pb = u ? '<button class="btn btn-sm btn-info text-white me-1 shadow-sm" onclick="window.open(\'' + u + '\',\'_blank\')" title="ดูลิงก์ต้นฉบับ"><i class="bi bi-link-45deg"></i></button>' : '';
                
                // 🌟 ปุ่มพรีวิวรูปภาพ (Manual Preview)
                let previewBtn = imgUrl ? `<button class="btn btn-sm btn-outline-info me-1 shadow-sm" onclick="previewWorkImage('${imgUrl}')" title="พรีวิวรูปงาน"><i class="bi bi-image"></i></button>` : '';

                // 🌟 ปุ่ม AI ตรวจงาน
                let aiBtn = imgUrl ? '<button class="btn btn-sm btn-warning text-dark shadow-sm" onclick="triggerAiGrader(\'' + imgUrl + '\', \'' + g.groupId + '\', true)" title="ให้ AI ช่วยตรวจ"><i class="bi bi-magic"></i> AI</button>' : '<span class="text-muted small">ไม่มีรูป</span>';

                let membersShort = g.memberNames.map(function (n) { return n.split(' ')[1] || n; }).join(', ');

                html += '<tr> <td><strong class="text-success">' + g.groupName + '</strong></td> <td style="font-size: 0.8em;" class="text-muted">' + membersShort + '</td> <td class="text-center" id="td-grouplink-' + g.groupId + '">' + pb + previewBtn + aiBtn + '</td> <td class="text-center"><input type="number" id="grouptaskscore-' + g.groupId + '" class="form-control form-control-sm text-center mx-auto" style="width:70px;" value="' + sc + '" onchange="autoSaveGroupScore(\'' + g.groupId + '\')"></td> <td class="text-center"> <div class="btn-group"> <button id="grouptaskbtn-ส่งแล้ว-' + g.groupId + '" class="btn ' + (st === 'ส่งแล้ว' ? 'btn-success text-white' : 'btn-outline-success') + ' btn-sm" onclick="setGroupTaskStatus(\'' + g.groupId + '\',\'ส่งแล้ว\')">ส่งแล้ว</button> <button id="grouptaskbtn-ยังไม่ส่ง-' + g.groupId + '" class="btn ' + (st === 'ยังไม่ส่ง' ? 'btn-danger text-white' : 'btn-outline-danger') + ' btn-sm" onclick="setGroupTaskStatus(\'' + g.groupId + '\',\'ยังไม่ส่ง\')">ยังไม่ส่ง</button> </div> </td> <td class="text-center"><span id="grouptaskbadge-' + g.groupId + '" class="badge ' + getBadgeColor(st) + ' text-white">' + st + '</span></td> </tr>';
            });
            document.getElementById('groupTaskTableBody').innerHTML = html;

        } else {
            let { data: subs } = await supabaseClient.from('submissions').select('*').eq('task_id', id);
            let res = {};
            if (subs) subs.forEach(r => res[r.student_id] = { status: r.status, score: r.score || "", url: r.url || "", screenshot_url: r.screenshot_url || "", timestamp: r.timestamp || "" });

            submissionData = {};
            const f = studentsData.filter(function (s) { return s[4] === currentRoom; });
            f.forEach(function (s) { submissionData[s[0]] = res[s[0]] || { status: 'ยังไม่ส่ง', score: '', url: '', screenshot_url: '' }; });

            let html = '';
            f.forEach(function (s) {
                let sub = submissionData[s[0]];
                let st = sub.status;
                let sc = sub.score;
                let u = sub.url;
                let imgUrl = sub.screenshot_url;

                let pb = u ? '<button class="btn btn-sm btn-info text-white me-1 shadow-sm" onclick="window.open(\'' + u + '\',\'_blank\')" title="ดูลิงก์ต้นฉบับ"><i class="bi bi-link-45deg"></i></button>' : '';
                
                // 🌟 ปุ่มพรีวิวรูปภาพ (Manual Preview)
                let previewBtn = imgUrl ? `<button class="btn btn-sm btn-outline-info me-1 shadow-sm" onclick="previewWorkImage('${imgUrl}')" title="พรีวิวรูปงาน"><i class="bi bi-image"></i></button>` : '';

                // 🌟 ปุ่ม AI ตรวจงาน
                let aiBtn = imgUrl ? '<button class="btn btn-sm btn-warning text-dark shadow-sm" onclick="triggerAiGrader(\'' + imgUrl + '\', \'' + s[0] + '\', false)" title="ให้ AI ช่วยตรวจ"><i class="bi bi-magic"></i> AI</button>' : '<span class="text-muted small">ไม่มีรูป</span>';

                let displayName = s[1];
                if (s[2] && s[2].trim() !== "") displayName += ' <small class="text-muted">(' + s[2] + ')</small>';

                html += '<tr><td>' + s[0] + '</td><td>' + displayName + '</td><td class="text-center" id="td-link-' + s[0] + '">' + pb + previewBtn + aiBtn + '</td><td class="text-center"><input type="number" id="taskscore-' + s[0] + '" class="form-control form-control-sm text-center mx-auto" style="width:70px;" value="' + sc + '" onchange="autoSaveScore(\'' + s[0] + '\',\'' + s[1] + '\')"></td><td class="text-center"><div class="btn-group"><button id="taskbtn-ส่งแล้ว-' + s[0] + '" class="btn ' + (st === 'ส่งแล้ว' ? 'btn-success text-white' : 'btn-outline-success') + ' btn-sm" onclick="setTaskStatus(\'' + s[0] + '\',\'' + s[1] + '\',\'ส่งแล้ว\')">ส่งแล้ว</button><button id="taskbtn-ยังไม่ส่ง-' + s[0] + '" class="btn ' + (st === 'ยังไม่ส่ง' ? 'btn-danger text-white' : 'btn-outline-danger') + ' btn-sm" onclick="setTaskStatus(\'' + s[0] + '\',\'' + s[1] + '\',\'ยังไม่ส่ง\')">ยังไม่ส่ง</button></div></td><td class="text-center"><span id="taskbadge-' + s[0] + '" class="badge ' + getBadgeColor(st) + ' text-white">' + st + '</span></td></tr>';
            });
            document.getElementById('taskTableBody').innerHTML = html;
        }
    }

    function autoSaveScore(id, name) {
        let st = submissionData[id].status;
        let sc = document.getElementById('taskscore-' + id).value;
        if (sc !== '' && st === 'ยังไม่ส่ง') st = 'ส่งแล้ว';
        setTaskStatus(id, name, st, false);
    }

    function setTaskStatus(id, name, st, autoCalc = true) {
        let si = document.getElementById('taskscore-' + id);
        let sc = si.value;
        
        if (st === 'ส่งแล้ว' && autoCalc && sc === '') {
            let ts = getLocalTodayStr();
            if (currentTaskDue && ts > currentTaskDue && currentTaskMax > 0) {
                sc = Math.round(currentTaskMax * 0.8);
                Toast.fire({ icon: 'info', title: 'ส่งช้า หัก 20%' });
            } else { sc = currentTaskMax; }
            si.value = sc;
        } else if (st === 'ยังไม่ส่ง') { sc = ''; si.value = ''; }
        
        submissionData[id] = { status: st, score: sc, url: submissionData[id].url };
        
        ['ส่งแล้ว', 'ยังไม่ส่ง'].forEach(function(x) {
            let b = document.getElementById('taskbtn-' + x + '-' + id);
            if (b) b.className = 'btn btn-outline-' + (x === 'ส่งแล้ว' ? 'success' : 'danger') + ' btn-sm';
        });
        
        let a = document.getElementById('taskbtn-' + st + '-' + id);
        if (a) a.className = 'btn btn-' + (st === 'ส่งแล้ว' ? 'success' : 'danger') + ' btn-sm text-white';
        
        let bg = document.getElementById('taskbadge-' + id);
        bg.textContent = "บันทึก..."; bg.className = 'badge bg-info text-dark';
        
        google.script.run.withSuccessHandler(function() {
            bg.textContent = st; bg.className = 'badge ' + getBadgeColor(st) + ' text-white';
            Toast.fire({ icon: 'success', title: st }); 
            updateDashboardStats();
            loadStudents(); 
        }).saveSingleSubmission(currentTaskId, currentTaskTitle, id, name, st, sc);
    }

    // =====================================
    // GROUP ASSIGNMENTS 
    // =====================================
    function renderGroupAssignments() {
        const l = document.getElementById('groupAssignmentList');
        const f = groupTasksData.filter(function(t) { return t[4] === currentRoom; });
        if (f.length === 0) { 
            l.innerHTML = '<div class="text-center text-muted py-3">ยังไม่มีงานกลุ่ม</div>'; 
            return; 
        }
        
        let html = '';
        f.reverse().forEach(function(t) {
            html += '<div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center mb-2 task-item">';
            html += '<div onclick="openGroupTaskModal(\'' + t[0] + '\',\'' + t[1] + '\',\'' + t[3] + '\',\'' + (t[5] || 0) + '\')" style="cursor:pointer; flex:1;">';
            html += '<h6 class="mb-1 fw-bold text-success">[กลุ่ม] ' + t[1] + ' <span class="badge bg-secondary ms-2">เต็ม: ' + (t[5] || '-') + '</span></h6>';
            html += '<small class="text-muted">สมาชิกสูงสุด ' + t[2] + ' คน | กำหนดส่ง: ' + t[3] + '</small>';
            html += '</div><div>';
            html += '<button class="btn btn-outline-info btn-sm me-2" onclick="event.stopPropagation(); openTeacherManageGroupModal(\'' + t[0] + '\')"><i class="bi bi-person-check-fill"></i> จัดการ/อนุมัติกลุ่ม</button>';
            html += '<button class="btn btn-outline-danger btn-sm" onclick="event.stopPropagation(); deleteGroupAssignment(\'' + t[0] + '\')"><i class="bi bi-trash-fill"></i> ลบ</button>';
            html += '</div></div>';
        });
        l.innerHTML = html;
    }

    function addGroupAssignment() {
        const t = document.getElementById('groupTaskTitle').value;
        const m = document.getElementById('groupTaskMembers').value;
        const max = document.getElementById('groupTaskMaxScore').value;
        const du = document.getElementById('groupTaskDue').value;
        
        if (!t || !m || !du || !max) return Swal.fire('เตือน', 'กรอกข้อมูลให้ครบถ้วน', 'warning');
        
        const id = 'GWORK-' + Math.floor(Math.random() * 10000);
        Swal.fire({ title: 'กำลังสั่งงานกลุ่ม...', didOpen: function() { Swal.showLoading(); } });
        google.script.run.withSuccessHandler(function() {
            Swal.close();
            document.getElementById('groupTaskTitle').value = '';
            document.getElementById('groupTaskMembers').value = '';
            document.getElementById('groupTaskMaxScore').value = '';
            document.getElementById('groupTaskDue').value = '';
            window.sendPushNotification("👥 รวมพลังด่วน!", "ภารกิจกลุ่มใหม่: " + t + " (รีบจัดกลุ่มกันนะ!)");
            Toast.fire({ icon: 'success', title: 'สั่งงานกลุ่มแล้ว' });
            loadAllData();
        }).saveGroupAssignment(id, t, m, du, currentRoom, max);
    }

    function deleteGroupAssignment(id) {
        Swal.fire({ title: 'ลบงานกลุ่มนี้และกลุ่มทั้งหมดของงานนี้?', icon: 'warning', showCancelButton: true, confirmButtonText: 'ลบ' }).then(function(r) {
            if (r.isConfirmed) {
                Swal.fire({ title: 'กำลังลบ...', didOpen: function() { Swal.showLoading(); } });
                google.script.run.withSuccessHandler(function() {
                    Swal.close();
                    Toast.fire({ icon: 'success', title: 'ลบงานกลุ่มสำเร็จ' });
                    loadAllData();
                }).deleteGroupAssignment(id);
            }
        });
    }

    let currentManageGroupTaskId = '';
    function openTeacherManageGroupModal(taskId) {
        currentManageGroupTaskId = taskId;
        document.getElementById('tmGroupListBody').innerHTML = '<tr><td colspan="4" class="text-center">กำลังโหลด...</td></tr>';
        document.getElementById('tmNoGroupList').innerHTML = 'กำลังโหลด...';
        
        showAppModal('teacherManageGroupModal');
        loadManageGroupData(taskId);
    }

    // 🟢 อัปเกรด: ดึงข้อมูลการจัดการกลุ่มตรงจาก Supabase (Direct Fetch)
    async function loadManageGroupData(taskId) {
        if(!supabaseClient) return;
        
        let { data: groups } = await supabaseClient.from('groups').select('*').eq('task_id', taskId);
        let { data: allStudents } = await supabaseClient.from('students').select('id,name');
        
        let resGroups = (groups||[]).map(g => {
            let nms = (g.members||[]).map(sid => { 
                let std = (allStudents||[]).find(x => x.id===sid); 
                return std ? `${std.id} ${std.name}` : sid; 
            });
            return {groupId: g.group_id, groupName: g.group_name, memberIds: g.members||[], memberNames: nms, status: g.status};
        });
        
        currentGroupsListCache = resGroups; 
        let groupsHtml = '';
        resGroups.forEach(function(g) {
            let btn = g.status === 'รออนุมัติ' ? `<button class="btn btn-success btn-sm fw-bold me-1" onclick="approveGroupStatus('${g.groupId}')">อนุมัติ</button><button class="btn btn-danger btn-sm fw-bold" onclick="rejectGroupStatus('${g.groupId}')">ไม่อนุมัติ</button>` : '<span class="badge bg-success">อนุมัติแล้ว</span>';
            groupsHtml += `<tr><td><strong class="text-primary">${g.groupName}</strong></td><td style="font-size:0.85em;">${g.memberNames.join('<br>')}</td><td>${g.status}</td><td class="text-center">${btn}</td></tr>`;
        });
        if (groupsHtml === '') groupsHtml = '<tr><td colspan="4" class="text-center text-muted">นักเรียนยังไม่มีการส่งคำขอจัดตั้งกลุ่ม</td></tr>';
        
        let tbody = document.getElementById('tmGroupListBody');
        if (tbody.innerHTML !== groupsHtml) tbody.innerHTML = groupsHtml; 

        // คำนวณหาคนที่ยังไม่มีกลุ่ม
        let gIds = []; 
        (groups||[]).forEach(g => gIds = gIds.concat(g.members||[]));
        let availStudents = (allStudents||[]).filter(s => !gIds.includes(s.id) && studentsData.some(stu => stu[0] === s.id && stu[4] === currentRoom));
        
        let unassignedHtml = '';
        availStudents.forEach(function(s) {
            unassignedHtml += `<div class="badge bg-white text-dark border border-secondary p-2 d-flex align-items-center gap-2">${s.id} ${s.name} <button class="btn btn-sm btn-primary py-0 px-1" title="จับยัดเข้ากลุ่ม" onclick="assignToGroupPrompt('${s.id}')"><i class="bi bi-plus"></i></button></div>`;
        });
        if (unassignedHtml === '') unassignedHtml = '<span class="text-success fw-bold"><i class="bi bi-check-circle"></i> ทุกคนมีกลุ่มครบแล้ว</span>';
        
        let noGroupDiv = document.getElementById('tmNoGroupList');
        if (noGroupDiv.innerHTML !== unassignedHtml) noGroupDiv.innerHTML = unassignedHtml; 
    }

    function approveGroupStatus(groupId) {
        Swal.fire({ title: 'กำลังอนุมัติ...', didOpen: function() { Swal.showLoading(); } });
        google.script.run.withSuccessHandler(function(res) {
            Swal.close();
            if (res.success) {
                Toast.fire({ icon: 'success', title: 'อนุมัติกลุ่มแล้ว' });
                loadManageGroupData(currentManageGroupTaskId); 
            }
        }).approveGroup(groupId);
    }

    function rejectGroupStatus(groupId) {
        Swal.fire({
            title: 'ไม่อนุมัติกลุ่มนี้?',
            text: 'กลุ่มจะถูกลบทิ้ง เพื่อให้นักเรียนสามารถจัดกลุ่มกันใหม่ได้',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'ลบทิ้ง',
            cancelButtonText: 'ยกเลิก'
        }).then(function(r) {
            if (r.isConfirmed) {
                Swal.fire({ title: 'กำลังลบ...', didOpen: function() { Swal.showLoading(); } });
                google.script.run.withSuccessHandler(function(res) {
                    Swal.close();
                    if (res.success) {
                        Toast.fire({ icon: 'success', title: 'ไม่อนุมัติและลบกลุ่มแล้ว' });
                        loadManageGroupData(currentManageGroupTaskId); 
                    }
                }).rejectGroup(groupId);
            }
        });
    }

    function assignToGroupPrompt(studentId) {
        let options = {};
        currentGroupsListCache.forEach(function(g) { options[g.groupId] = g.groupName; });
        if(Object.keys(options).length === 0) return Swal.fire('เตือน', 'ยังไม่มีการตั้งกลุ่มให้เลือกจับใส่เลยครับ', 'warning');
        
        Swal.fire({
            title: 'จับเข้ากลุ่ม',
            input: 'select',
            inputOptions: options,
            inputPlaceholder: 'เลือกกลุ่มที่ต้องการ...',
            showCancelButton: true
        }).then(function(r) {
            if (r.isConfirmed && r.value) {
                Swal.fire({ title: 'กำลังบันทึก...', didOpen: function() { Swal.showLoading(); } });
                google.script.run.withSuccessHandler(function(res) {
                    Swal.close();
                    if(res.success){
                        Toast.fire({ icon: 'success', title: 'เพิ่มเข้ากลุ่มแล้ว' });
                        loadManageGroupData(currentManageGroupTaskId);
                    }
                }).assignStudentToGroup(studentId, r.value);
            }
        });
    }

    let groupSubmissionData = {};
    function openGroupTaskModal(id, t, d, m) {
        currentTaskId = id; currentTaskTitle = t; currentTaskDue = d; currentTaskMax = parseFloat(m) || 0;
        
        document.getElementById('groupTaskModalTitle').innerHTML = '[กลุ่ม] ' + t + ' <span class="badge bg-warning text-dark ms-2 border border-white">คะแนนเต็ม: ' + currentTaskMax + '</span>';
        document.getElementById('groupTaskModalRoom').innerText = 'กำหนดส่ง: ' + d;
        document.getElementById('groupTaskTableBody').innerHTML = '<tr><td colspan="6" class="text-center py-4">โหลด...</td></tr>';
        
        showAppModal('groupTaskModal');
        openTaskSubmissions(id, t, d, m, true);
    }

    function autoSaveGroupScore(groupId) {
        let st = groupSubmissionData[groupId].status;
        let sc = document.getElementById('grouptaskscore-' + groupId).value;
        if (sc !== '' && st === 'ยังไม่ส่ง') st = 'ส่งแล้ว';
        setGroupTaskStatus(groupId, st, false);
    }

    function setGroupTaskStatus(groupId, st, autoCalc = true) {
        let si = document.getElementById('grouptaskscore-' + groupId);
        let sc = si.value;
        
        if (st === 'ส่งแล้ว' && autoCalc && sc === '') {
            let ts = getLocalTodayStr();
            if (currentTaskDue && ts > currentTaskDue && currentTaskMax > 0) {
                sc = Math.round(currentTaskMax * 0.8);
                Toast.fire({ icon: 'info', title: 'ส่งช้า หัก 20%' });
            } else { sc = currentTaskMax; }
            si.value = sc;
        } else if (st === 'ยังไม่ส่ง') { sc = ''; si.value = ''; }
        
        groupSubmissionData[groupId] = { status: st, score: sc, url: groupSubmissionData[groupId].url };
        
        ['ส่งแล้ว', 'ยังไม่ส่ง'].forEach(function(x) {
            let b = document.getElementById('grouptaskbtn-' + x + '-' + groupId);
            if (b) b.className = 'btn btn-outline-' + (x === 'ส่งแล้ว' ? 'success' : 'danger') + ' btn-sm';
        });
        
        let a = document.getElementById('grouptaskbtn-' + st + '-' + groupId);
        if (a) a.className = 'btn btn-' + (st === 'ส่งแล้ว' ? 'success' : 'danger') + ' btn-sm text-white';
        
        let bg = document.getElementById('grouptaskbadge-' + groupId);
        bg.textContent = "บันทึก..."; bg.className = 'badge bg-info text-dark';
        
        google.script.run.withSuccessHandler(function() {
            bg.textContent = st; bg.className = 'badge ' + getBadgeColor(st) + ' text-white';
            Toast.fire({ icon: 'success', title: st }); 
            updateDashboardStats();
            loadStudents(); 
        }).saveSingleGroupSubmission(currentTaskId, groupId, st, sc);
    }

    // =====================================
    // EXPORT (DIRECT FETCH)
    // =====================================
    function openExportModal() { showAppModal('exportModal'); }

    // 🟢 อัปเกรด: โหลดข้อมูลโหลดไฟล์ Excel แบบ Direct Fetch ดึงตรงจากฐานข้อมูล (ประหยัดเวลาและโควตา)
    async function processExcelExport() {
        if(!supabaseClient) return Swal.fire('เตือน', 'รอโหลดฐานข้อมูลสักครู่', 'warning');
        
        const type = document.querySelector('input[name="exportType"]:checked').value;
        const btn = document.getElementById('btnExport');
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> กำลังสร้างไฟล์...';
        btn.disabled = true;
        
        // ดึงข้อมูลตรงจาก Supabase เพื่อลดภาระ GAS
        let { data: sData } = await supabaseClient.from('students').select('*').eq('room', currentRoom);
        let { data: aData } = await supabaseClient.from('attendance').select('*').eq('room', currentRoom);
        let { data: tData } = await supabaseClient.from('tasks').select('*').eq('room', currentRoom);
        let stIds = (sData||[]).map(s => s.id);
        
        let subData = [];
        if(stIds.length > 0) {
            let { data: sData2 } = await supabaseClient.from('submissions').select('*').in('student_id', stIds);
            subData = sData2 || [];
        }

        let data = {
            students: (sData||[]).map(mapStudentToArr),
            attendance: (aData||[]).map(a => [a.check_date, a.student_id, a.student_name, a.room, a.status, a.timestamp]),
            assignments: (tData||[]).map(t => [t.task_id, t.title, t.description||"", t.due_date||"", t.room||"", t.max_score||0]),
            submissions: subData.map(s => [s.task_id, s.task_title, s.student_id, s.student_name, s.status, s.score||"", s.url||"", s.timestamp])
        };

        generateBeautifulExcel(data, type);
        btn.innerHTML = 'ดาวน์โหลด';
        btn.disabled = false;
        hideAppModal('exportModal');
    }

    function generateBeautifulExcel(data, type) {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('รายงาน', { views: [{ state: 'frozen', xSplit: 2, ySplit: 1 }] });
        const students = data.students;
        const attendance = data.attendance;
        const assignments = data.assignments;
        const submissions = data.submissions;
        const totalTasks = assignments.length + groupTasksData.filter(function(gt) { return gt[4] === currentRoom; }).length; 
        
        let columns = [ { header: 'เลขที่/รหัส', key: 'id', width: 15 }, { header: 'ชื่อ-สกุล', key: 'name', width: 30 } ];
        
        if (type === 'attendance' || type === 'all') {
            columns.push( { header: 'มา', key: 'att_present', width: 10 }, { header: 'ลา', key: 'att_leave', width: 10 }, { header: 'ขาด', key: 'att_absent', width: 10 } );
        }
        if (type === 'work' || type === 'all') {
            columns.push( { header: 'ส่งแล้ว', key: 'work_done', width: 10 }, { header: 'ค้างส่ง', key: 'work_miss', width: 10 }, { header: 'รวมงาน', key: 'work_total', width: 10 }, { header: 'คะแนนรวม', key: 'work_score', width: 15 } );
        }
        
        sheet.columns = columns;
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        headerRow.height = 30;
        
        headerRow.eachCell(function(c, colN) {
            let k = columns[colN - 1].key; let bg = 'FF4F81BD';
            if (k.includes('present') || k.includes('done') || k.includes('score')) bg = 'FF92D050';
            if (k.includes('leave')) bg = 'FFFFC000';
            if (k.includes('absent') || k.includes('miss')) bg = 'FFFF0000';
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
            c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });
        
        students.forEach(function(stu) {
            let rData = { id: stu[0], name: stu[1] };
            if (type === 'attendance' || type === 'all') {
                let p = 0, l = 0, a = 0; let sA = attendance.filter(function(x) { return x[1] === stu[0]; });
                sA.forEach(function(x) { if (x[4] === 'มา') p++; else if (x[4] === 'ลา') l++; else if (x[4] === 'ขาด') a++; });
                rData.att_present = p; rData.att_leave = l; rData.att_absent = a;
            }
            if (type === 'work' || type === 'all') {
                let d = 0, sc = 0; let sS = submissions.filter(function(x) { return x[2] === stu[0]; });
                sS.forEach(function(x) { if (x[4] === 'ส่งแล้ว') d++; if (x[5]) sc += Number(x[5]); });
                rData.work_done = d; rData.work_miss = totalTasks - d; rData.work_total = totalTasks; rData.work_score = sc;
            }
            let nr = sheet.addRow(rData);
            nr.alignment = { vertical: 'middle', horizontal: 'center' }; nr.getCell('name').alignment = { horizontal: 'left' };
            nr.eachCell(function(c) { c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; });
        });
        workbook.xlsx.writeBuffer().then(function(buf) { saveAs(new Blob([buf]), 'รายงาน_' + currentRoom + '_' + getLocalTodayStr() + '.xlsx'); });
    }

    function handleFileImport(input) {
        const file = input.files[0];
        if (!file) return;
        
        const processData = function(data) {
            let clean = data.filter(function(r) { return r.length > 0 && r[0]; }).map(function(r) { return [ r[0] ? String(r[0]).trim() : '', r[1] ? String(r[1]).trim() : '' ]; });
            if (clean.length > 0 && String(clean[0][0]).includes('รหัส')) clean.shift();
            if (clean.length === 0) return;
            
            google.script.run.withSuccessHandler(function() {
                Swal.fire('สำเร็จ', 'นำเข้าสำเร็จ!', 'success');
                loadAllData();
            }).importCSV(clean, currentRoom);
        };
        
        if (file.name.toLowerCase().endsWith('.csv')) {
            const reader = new FileReader();
            reader.onload = function(e) { processData(e.target.result.split('\n').filter(function(r) { return r.trim() !== ''; }).map(function(r) { return r.split(',').map(function(c) { return c.trim().replace(/^"|"$/g, ''); }); })); };
            reader.readAsText(file, 'windows-874');
        } else {
            const reader = new FileReader();
            reader.onload = function(e) { processData(XLSX.utils.sheet_to_json(XLSX.read(new Uint8Array(e.target.result), { type: 'array' }).Sheets[XLSX.read(new Uint8Array(e.target.result), { type: 'array' }).SheetNames[0]], { header: 1 })); };
            reader.readAsArrayBuffer(file);
        }
        input.value = '';
    }

    // =====================================
    // ANNOUNCEMENTS & MESSAGES
    // =====================================
    function openAnnouncementModal() {
        document.getElementById('announceMsgArea').value = '';
        document.getElementById('announceWebMsgArea').value = '';
        document.getElementById('announceLink').value = '';
        document.getElementById('announceImgFile').value = '';
        document.getElementById('announceImgPreview').style.display = 'none';
        currentAnnounceBase64 = "";
        document.getElementById('templateFormArea').classList.add('hidden');
        showAppModal('announcementModal');
    }

    function showTemplateForm(t) {
        document.getElementById('templateFormArea').classList.remove('hidden');
        document.querySelectorAll('.template-subform').forEach(function(el) { el.classList.add('hidden'); });
        document.getElementById('form-' + t).classList.remove('hidden');
        document.getElementById('templateFormArea').dataset.currentType = t;
    }

    function generateTemplateText() {
        const t = document.getElementById('templateFormArea').dataset.currentType;
        let tx = "";
        
        if (t === 'exam') {
            const d = document.getElementById('tmpExDate').value; const t1 = document.getElementById('tmpExTimeStart').value; const t2 = document.getElementById('tmpExTimeEnd').value; const loc = document.getElementById('tmpExLoc').value; const top = document.getElementById('tmpExTopic').value;
            tx = '📌 ประกาศนัดสอบ\n\n📅 วัน: ' + (d || '-') + '\n⏰ เวลา: ' + (t1 || '-') + ' ถึง ' + (t2 || '-') + '\n📍 ที่: ' + (loc || '-') + '\n📚 เนื้อหา: ' + (top || '-');
        } else if (t === 'homework') {
            const hw = document.getElementById('tmpHwName').value; const dl = document.getElementById('tmpHwDeadline').value;
            tx = '⚠️ ตามงานค้าง\n\n📄 งาน: ' + (hw || '-') + '\n⏳ กำหนดส่งช้าสุด: ' + (dl ? dl.replace('T', ' ') : '-');
        } else if (t === 'cancel') {
            const d = document.getElementById('tmpCancelDate').value; const r = document.getElementById('tmpCancelReason').value;
            tx = '❌ งดคลาสเรียน\n\n📅 วัน: ' + (d || '-') + '\n💡 เหตุผล: ' + (r || '-');
        }
        
        const ta = document.getElementById('announceMsgArea');
        if (ta.value.trim() !== "") ta.value += "\n\n" + tx; else ta.value = tx;
        document.getElementById('templateFormArea').classList.add('hidden');
    }

    let currentAnnounceBase64 = "";
    function previewAndCompressImg(input) {
        if (input.files && input.files[0]) {
            document.getElementById('compressStatus').style.display = 'inline-block';
            document.getElementById('announceImgPreview').style.display = 'none';
            let reader = new FileReader();
            reader.onload = function(e) {
                let img = new Image();
                img.onload = function() {
                    let canvas = document.createElement('canvas'); let ctx = canvas.getContext('2d');
                    let maxWidth = 800; let scaleSize = maxWidth / img.width; let newWidth = maxWidth; let newHeight = img.height * scaleSize;
                    if (img.width < maxWidth) { newWidth = img.width; newHeight = img.height; }
                    canvas.width = newWidth; canvas.height = newHeight; ctx.drawImage(img, 0, 0, newWidth, newHeight);
                    let compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                    document.getElementById('announceImgPreview').src = compressedBase64;
                    document.getElementById('announceImgPreview').style.display = 'inline-block';
                    document.getElementById('compressStatus').style.display = 'none';
                    currentAnnounceBase64 = compressedBase64;
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(input.files[0]);
        } else {
            document.getElementById('announceImgPreview').style.display = 'none';
            document.getElementById('compressStatus').style.display = 'none';
            currentAnnounceBase64 = "";
        }
    }
    
    function processBroadcastAnnounce() { 
        let msg = document.getElementById('announceMsgArea').value.trim(); const link = document.getElementById('announceLink').value.trim(); 
        if (!msg) return Swal.fire('เตือน', 'กรุณาพิมพ์ข้อความ', 'warning'); 
        if (!currentRoom) return Swal.fire('เตือน', 'ไม่พบห้อง', 'error'); 
        if (link) msg += '\n\n🔗 ลิงก์เพิ่มเติม:\n' + link; 
        
        Swal.fire({ 
            title: 'ส่งให้ระดับชั้น/ห้อง ' + currentRoom + '?', icon: 'question', showCancelButton: true, confirmButtonText: 'ส่งเลย' 
        }).then(function(r) { 
            if (r.isConfirmed) { 
                const btn = document.getElementById('btnConfirmAnnounce'); 
                btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> กำลังส่ง...'; btn.disabled = true; 
                google.script.run.withSuccessHandler(function(res) { 
                    btn.innerHTML = '<i class="bi bi-send-fill"></i> ส่งประกาศด่วนเข้า LINE กลุ่ม'; btn.disabled = false; 
                    if (res === "ERROR_NO_API_KEY") Swal.fire('เตือน', 'ยังไม่ใส่ API Key ImgBB', 'error'); 
                    else if (res.startsWith("IMG_")) Swal.fire('ข้อผิดพลาดฝากรูป', res, 'error'); 
                    else if(res.includes('สำเร็จ')) { Swal.fire('สำเร็จ', res, 'success'); hideAppModal('announcementModal'); } 
                    else Swal.fire('ระบบ', res, 'info'); 
                }).uploadToImgBBAndBroadcast(msg, currentRoom, currentAnnounceBase64); 
            } 
        }); 
    }

    function applyWebAnnounceTemplate(type) {
        let tx = '';
        if (type === 'buff') tx = '🎉 แจกบัฟพิเศษ! ใครเห็นข้อความนี้ แสดงว่าครูแจกแต้มให้ฟรีๆ เป็นกำลังใจในการเรียนครับ สู้ๆ!';
        else if (type === 'cheer') tx = '💖 ฮึบๆ! ช่วงนี้เรียนหนักหน่อย แต่ครูเป็นกำลังใจให้นะครับ มีอะไรทักหาครูได้ตลอดเลย!';
        else if (type === 'warning') tx = '👀 ก๊อกๆ... แวะมาเตือนคนดองงาน! อย่าลืมเคลียร์ภารกิจที่ค้างอยู่ให้เรียบร้อยด้วยน้า!';
        document.getElementById('announceWebMsgArea').value = tx;
    }

    function processWebAnnounce() {
        const msg = document.getElementById('announceWebMsgArea').value.trim();
        if (!msg) return Swal.fire('เตือน', 'กรุณาพิมพ์ข้อความที่จะประกาศขึ้นเว็บ', 'warning');
        if (!currentRoom) return Swal.fire('เตือน', 'ไม่พบห้อง', 'error');

        Swal.fire({ title: 'ส่งประกาศขึ้นเว็บให้ห้อง ' + currentRoom + '?', icon: 'question', showCancelButton: true, confirmButtonText: 'ส่งเลย' }).then(function(r) {
            if (r.isConfirmed) {
                const btn = document.getElementById('btnConfirmAnnounceWeb');
                btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> กำลังส่ง...'; btn.disabled = true;
                google.script.run.withSuccessHandler(function(res) {
                    btn.innerHTML = '<i class="bi bi-send-fill"></i> ส่งประกาศขึ้นเว็บเลย'; btn.disabled = false;
                    if (res.success) {
                        Swal.fire('สำเร็จ', res.message, 'success'); hideAppModal('announcementModal'); document.getElementById('announceWebMsgArea').value = '';
                    } else { Swal.fire('ผิดพลาด', res.message, 'error'); }
                }).sendWebAnnouncementToRoom(currentRoom, msg);
            }
        });
    }

    // =====================================
    // CONFIG & GROUP ID
    // =====================================
    function openConfigModal() {
        if (!currentRoom) return Swal.fire('ผิดพลาด', 'กรุณาเลือกห้องก่อนครับ', 'error');
        Swal.fire({ title: 'กำลังโหลดข้อมูล...', didOpen: function() { Swal.showLoading(); } });
        google.script.run.withSuccessHandler(function(groupId) {
            Swal.close(); 
            document.getElementById('configGroupId').value = groupId || ''; 
            showAppModal('configModal'); 
        }).getRoomGroupId(currentRoom);
    }

    function saveConfigGroupId() {
        const groupId = document.getElementById('configGroupId').value.trim();
        const btn = document.getElementById('btnSaveConfig');
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> กำลังบันทึก...'; btn.disabled = true;
        google.script.run.withSuccessHandler(function(res) {
            btn.innerHTML = '<i class="bi bi-save"></i> อัปเดตข้อมูล'; btn.disabled = false;
            if(res) { 
                Swal.fire('สำเร็จ', 'บันทึก Group ID เรียบร้อยแล้ว', 'success'); 
                hideAppModal('configModal'); 
            } 
            else { Swal.fire('ผิดพลาด', 'บันทึกไม่สำเร็จ โปรดลองอีกครั้ง', 'error'); }
        }).saveRoomGroupId(currentRoom, groupId);
    }

    // =====================================
    // SQL CODE COPY FUNCTION
    // =====================================
    function copySqlCode() {
        var copyText = document.getElementById("sqlCodeArea");
        copyText.select();
        copyText.setSelectionRange(0, 99999);
        
        navigator.clipboard.writeText(copyText.value).then(function() {
            var btn = document.getElementById("btnCopySql");
            btn.innerHTML = '<i class="bi bi-check-lg"></i> คัดลอกแล้ว!';
            btn.classList.replace('btn-success', 'btn-primary');
            Toast.fire({ icon: 'success', title: 'คัดลอกโค้ด SQL สำเร็จแล้ว!' });
            
            setTimeout(function() { 
                btn.innerHTML = '<i class="bi bi-clipboard"></i> คัดลอกโค้ด'; 
                btn.classList.replace('btn-primary', 'btn-success');
            }, 3000);
        }).catch(function(err) {
            Swal.fire('ผิดพลาด', 'ไม่สามารถคัดลอกข้อความได้: ' + err, 'error');
        });
    }

    // =====================================
    // AI STUDENT SCANNER (Teacher Dashboard) 🤖
    // =====================================
    function openAiScannerModal() {
        if (!currentRoom) return Swal.fire('เตือน', 'กรุณาเลือกห้องเรียนก่อนครับ', 'warning');

        Swal.fire({
            title: '🤖 จีมินกำลังกวาดสายตา...',
            html: 'วิเคราะห์ข้อมูลทั้งห้องและร่างข้อความ DM ทีละคน<br>อาจใช้เวลา 10-15 วินาที กรุณารอสักครู่ครับ ⏳',
            allowOutsideClick: false,
            didOpen: function() { Swal.showLoading(); }
        });

        google.script.run.withSuccessHandler(function(res) {
            Swal.close();
            if (res.success) {
                renderAiScannerResult(res.data);
                showAppModal('aiScannerModal');
            } else {
                Swal.fire('ข้อผิดพลาด AI', res.message, 'error');
            }
        }).scanRoomWithGemini(currentRoom);
    }

    function renderAiScannerResult(aiData) {
        let html = `<div class="alert alert-info border-0 shadow-sm rounded-4 mb-4"><i class="bi bi-lightbulb-fill text-warning fs-5"></i> <strong class="fs-6">สรุปภาพรวมจากจีมิน:</strong><br>${aiData.summary || 'ไม่มีคำแนะนำเพิ่มเติม'}</div>`;

        const buildSection = (title, icon, colorClass, btnClass, dataArray) => {
            if (!dataArray || dataArray.length === 0) return '';
            let sectionHtml = `<h5 class="fw-bold mt-4 mb-3 ${colorClass}">${icon} ${title} (${dataArray.length} คน)</h5>`;
            dataArray.forEach(item => {
                let safeName = item.name.replace(/'/g, "\\'");
                let safeDm = item.dmDraft.replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/"/g, "&quot;");
                sectionHtml += `
                <div class="card mb-2 border-start border-4 border-${btnClass} shadow-sm rounded-3">
                    <div class="card-body py-2 px-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <strong class="text-dark fs-6">${item.name}</strong>
                                <div class="small text-secondary mt-1"><i class="bi bi-info-circle"></i> ${item.reason}</div>
                            </div>
                            <button class="btn btn-sm btn-outline-${btnClass} rounded-pill fw-bold px-3 ms-2 text-nowrap" onclick="openAiDmModal('${item.id}', '${safeName}', '${safeDm}')">
                                <i class="bi bi-send-fill"></i> ทัก DM
                            </button>
                        </div>
                    </div>
                </div>`;
            });
            return sectionHtml;
        };

        html += buildSection('โซนแดง (ต้องรีบตามด่วน!)', '🚨', 'text-danger', 'danger', aiData.red);
        html += buildSection('โซนเหลือง (เฝ้าระวังเริ่มแผ่ว)', '⚠️', 'text-warning', 'warning', aiData.yellow);
        html += buildSection('โซนดาวเด่น (ต้องชมเชยรัวๆ)', '🌟', 'text-success', 'success', aiData.star);

        if ((!aiData.red || aiData.red.length === 0) && (!aiData.yellow || aiData.yellow.length === 0) && (!aiData.star || aiData.star.length === 0)) {
            html += '<div class="text-center py-4 text-muted">ไม่พบนักเรียนที่เข้าเกณฑ์พิเศษในรอบนี้ครับ</div>';
        }

        const bodyEl = document.getElementById('aiScannerBody');
        if(bodyEl) bodyEl.innerHTML = html;
    }

    function openAiDmModal(id, name, draftMsg) {
        document.getElementById('dmTargetId').value = id;
        document.getElementById('dmTargetName').innerText = name;
        
        document.getElementById('dmTextInput').value = draftMsg.replace(/&quot;/g, '"'); 
        
        hideAppModal('aiScannerModal');
        setTimeout(() => showAppModal('sendDmModal'), 400); 
    }

    // =====================================
    // 🪄 AI AUTO GRADER (ระบบช่วยครูตรวจงานด้วย AI)
    // =====================================
    window.triggerAiGrader = function(screenshotUrl, targetId, isGroup) {
        if (!screenshotUrl) return Swal.fire('เตือน', 'นักเรียนไม่ได้แนบรูปภาพพรีวิวมาให้ตรวจครับ', 'info');

        // รีเซ็ตหน้าต่างก่อนเปิด
        document.getElementById('aiGraderResult').classList.add('hidden');
        document.getElementById('aiGraderFooter').style.display = 'none';
        document.getElementById('aiGraderLoading').classList.remove('hidden');
        
        // จำค่าเป้าหมายเอาไว้เผื่อกด "นำไปใช้"
        document.getElementById('aiGraderTargetId').value = targetId;
        document.getElementById('aiGraderIsGroup').value = isGroup ? "true" : "false";

        // แสดงรูปตัวอย่างในกล่องผลลัพธ์
        document.getElementById('aiGraderPreviewImg').src = screenshotUrl;

        showAppModal('aiGraderModal');

        // ดึงข้อมูลไปหาหลังบ้าน
        google.script.run.withSuccessHandler(function(res) {
            document.getElementById('aiGraderLoading').classList.add('hidden');
            
            if (res.success) {
                // แสดงผลลัพธ์ที่ AI วิเคราะห์มา
                document.getElementById('aiGraderSummary').innerText = res.data.summary || '-';
                document.getElementById('aiGraderFeedback').innerText = res.data.feedback || '-';
                document.getElementById('aiGraderScoreText').innerText = res.data.suggestedScore || '0';
                document.getElementById('aiGraderMaxScoreText').innerText = currentTaskMax;
                
                document.getElementById('aiGraderResult').classList.remove('hidden');
                document.getElementById('aiGraderFooter').style.display = 'flex';
            } else {
                hideAppModal('aiGraderModal');
                Swal.fire('วิเคราะห์ไม่สำเร็จ', res.message, 'error');
            }
        }).analyzeWorkWithAi(screenshotUrl, currentTaskTitle, currentTaskMax, isGroup);
    };

    // ฟังก์ชันเมื่อครูกดปุ่ม "นำคะแนนนี้ไปใช้"
    window.applyAiScore = function() {
        const targetId = document.getElementById('aiGraderTargetId').value;
        const isGroup = document.getElementById('aiGraderIsGroup').value === "true";
        const aiScore = document.getElementById('aiGraderScoreText').innerText;

        // นำคะแนนไปหยอดใส่กล่อง Input หน้าตารางตรวจงาน แล้วกระตุ้นให้มัน Save
        if (isGroup) {
            let inputEl = document.getElementById('grouptaskscore-' + targetId);
            if (inputEl) {
                inputEl.value = aiScore;
                autoSaveGroupScore(targetId); // สั่งเซฟทันที
            }
        } else {
            let inputEl = document.getElementById('taskscore-' + targetId);
            if (inputEl) {
                inputEl.value = aiScore;
                
                // ดึงชื่อเด็กมาเพื่อใช้ในฟังก์ชันบันทึก
                let studentName = "";
                let subData = submissionData[targetId];
                let f = studentsData.find(s => s[0] === targetId);
                if (f) studentName = f[1];

                // ถ้าไม่ได้กดส่งไว้ ให้เปลี่ยนสถานะเป็นส่งแล้ว
                let st = (subData && subData.status) ? subData.status : 'ยังไม่ส่ง';
                if (st === 'ยังไม่ส่ง') st = 'ส่งแล้ว';
                
                setTaskStatus(targetId, studentName, st, false);
            }
        }

        hideAppModal('aiGraderModal');
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'นำคะแนนลงตารางแล้ว', showConfirmButton: false, timer: 1500 });
    };

    // =========================================================
    // ⚡ LIVE QUIZ BATTLE - TEACHER LOGIC
    // =========================================================

    let liveQuizSessionId = null;
    let liveQuizQuestions = [];
    let liveQuizCurrentIndex = 0;
    let liveQuizChannel = null;
    let currentLiveQuizFileBase64 = "";
    let currentLiveQuizFileMime = "";
    let joinedPlayersCount = 0; // ตัวแปรเก็บยอดนักเรียนที่กด "เข้าร่วม" จริงๆ
    let teacherQuizTimer = null; // 🌟 เพิ่มตัวแปรเก็บ Timer ฝั่งครู
    let teacherTimeLeft = 30; // 🌟 กำหนดเวลา 30 วิ

    // เปิดหน้าต่างสร้างควิซ
    function openSetupLiveQuizModal() {
        if (!currentRoom) return Swal.fire('เตือน', 'กรุณาเลือกห้องก่อนครับ', 'warning');
        document.getElementById('liveQuizContent').value = '';
        document.getElementById('liveQuizCount').value = '5';
        document.getElementById('liveQuizFile').value = '';
        document.getElementById('liveQuizFileStatus').classList.add('hidden');
        currentLiveQuizFileBase64 = "";
        currentLiveQuizFileMime = "";
        showAppModal('setupLiveQuizModal');
    }

    // โหลดไฟล์เป็น Base64 หรือสกัดข้อความจาก Word
    function previewLiveQuizFile(input) {
        if (input.files && input.files[0]) {
            const file = input.files[0];
            const mime = file.type; 
            const fileName = file.name.toLowerCase();
            
            // ขยายขีดจำกัดขนาดไฟล์เป็น 20MB
            if (file.size > 20 * 1024 * 1024) {
                Swal.fire('เตือน', 'ขนาดไฟล์ใหญ่เกินไป (สูงสุด 20MB)', 'warning');
                input.value = '';
                currentLiveQuizFileBase64 = "";
                document.getElementById('liveQuizFileStatus').classList.add('hidden');
                return;
            }

            // 🌟 ถ้าเป็นไฟล์ Word (.docx) ให้ใช้ Mammoth สกัดข้อความ
            if (fileName.endsWith('.docx')) {
                Swal.fire({ title: 'กำลังสกัดข้อความจาก Word...', didOpen: () => { Swal.showLoading(); } });
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    mammoth.extractRawText({arrayBuffer: e.target.result})
                        .then(function(result) {
                            Swal.close();
                            const text = result.value;
                            
                            // นำข้อความที่สกัดได้ไปต่อท้ายในกล่อง Textarea
                            let currentText = document.getElementById('liveQuizContent').value;
                            document.getElementById('liveQuizContent').value = currentText + (currentText ? "\n\n" : "") + text;
                            
                            document.getElementById('liveQuizFileStatus').innerHTML = '<i class="bi bi-check-circle-fill"></i> สกัดข้อความจาก Word ลงกล่องสำเร็จ!';
                            document.getElementById('liveQuizFileStatus').classList.remove('hidden');
                            
                            // ล้างค่าตัวแปรไฟล์ เพราะแปลงเป็น Text ให้อ่านไปแล้ว
                            currentLiveQuizFileBase64 = "";
                            currentLiveQuizFileMime = "";
                        })
                        .catch(function(err) {
                            Swal.fire('ผิดพลาด', 'ไม่สามารถอ่านไฟล์ Word นี้ได้ กรุณาก๊อปปี้ข้อความมาวางแทนนะครับ', 'error');
                        });
                };
                reader.readAsArrayBuffer(file);
                return; // จบการทำงานสำหรับไฟล์ Word
            }
            
            // ถ้าเป็นไฟล์ PDF หรือ TXT
            if (mime !== "application/pdf" && mime !== "text/plain") {
                Swal.fire('เตือน', 'รองรับเฉพาะไฟล์ .pdf, .txt และ .docx ครับ', 'warning');
                input.value = '';
                currentLiveQuizFileBase64 = "";
                document.getElementById('liveQuizFileStatus').classList.add('hidden');
                return;
            }
            
            // ประมวลผลสำหรับ PDF / TXT
            currentLiveQuizFileMime = mime;
            const reader = new FileReader();
            reader.onload = function(e) {
                currentLiveQuizFileBase64 = e.target.result.split(',')[1];
                document.getElementById('liveQuizFileStatus').innerHTML = '<i class="bi bi-check-circle-fill"></i> ระบบอ่านไฟล์พร้อมแล้ว!';
                document.getElementById('liveQuizFileStatus').classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        } else {
            currentLiveQuizFileBase64 = "";
            currentLiveQuizFileMime = "";
            document.getElementById('liveQuizFileStatus').classList.add('hidden');
        }
    }

    // 1. ให้ AI สร้างคำถามจาก Text และ/หรือ File
    function generateLiveQuiz() {
        const content = document.getElementById('liveQuizContent').value.trim();
        const qCount = parseInt(document.getElementById('liveQuizCount').value) || 5;

        // ต้องมีอย่างใดอย่างหนึ่ง (ข้อความสั่ง หรือ ไฟล์เอกสาร)
        if (!content && !currentLiveQuizFileBase64) {
            return Swal.fire('เตือน', 'กรุณาพิมพ์คำสั่ง หรืออัปโหลดไฟล์เอกสารก่อนครับ', 'warning');
        }

        const btn = document.getElementById('btnGenerateLiveQuiz');
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> กำลังให้จีมินอ่านและวิเคราะห์...';
        btn.disabled = true;

        Swal.fire({
            title: 'เวทมนตร์ AI กำลังทำงาน...',
            html: `จีมินกำลังอ่านข้อมูลและคิดคำถาม <b>${qCount} ข้อ</b><br>ใช้เวลาประมาณ 10-15 วินาที ⏳`,
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        google.script.run
        .withFailureHandler(err => {
            btn.innerHTML = '<i class="bi bi-magic"></i> ให้ AI สร้างคำถามและเปิดห้องรอเลย!';
            btn.disabled = false;
            Swal.fire('Error', err.message, 'error');
        })
        .withSuccessHandler(function(res) {
            btn.innerHTML = '<i class="bi bi-magic"></i> ให้ AI สร้างคำถามและเปิดห้องรอเลย!';
            btn.disabled = false;
            Swal.close();

            if (res.success) {
                hideAppModal('setupLiveQuizModal');
                liveQuizSessionId = res.sessionId;
                
                // 🌟 FIX 4: ป้องกัน AI ส่งกลับมาเป็น Object ซ้อน Array
                liveQuizQuestions = Array.isArray(res.questions) ? res.questions : (res.questions.questions || []);
                liveQuizCurrentIndex = 0;
                
                // เปิดหน้าต่าง Dashboard คุมเกม
                startTeacherLiveQuizControl();
            } else {
                Swal.fire('ผิดพลาด', res.message, 'error');
            }
        }).generateLiveQuizAI(currentRoom, content, qCount, currentLiveQuizFileBase64, currentLiveQuizFileMime);
    }

    // 2. เปิดหน้าต่างควบคุมเกม และดักฟังคนตอบแบบ Real-time
    async function startTeacherLiveQuizControl() {
        showAppModal('teacherQuizControlModal');
        
        // รีเซ็ตตัวนับ
        let { count } = await supabaseClient.from('live_quiz_responses').select('*', { count: 'exact', head: true }).eq('session_id', liveQuizSessionId).eq('q_index', -1);
        joinedPlayersCount = count || 0;
        
        prepareTeacherQuestionUI();
        document.getElementById('tqAnswerCount').innerText = joinedPlayersCount + " คน";
        document.getElementById('tqStatusText').innerText = "รอเด็กๆ กดเข้าร่วมเกม...";
        document.getElementById('btnReleaseQ').classList.remove('hidden');
        document.getElementById('btnReleaseOpt').classList.add('hidden');
        document.getElementById('btnShowAns').classList.add('hidden');
        document.getElementById('btnNextQ').classList.add('hidden');

        if (supabaseClient) {
            if (liveQuizChannel) supabaseClient.removeChannel(liveQuizChannel);
            liveQuizChannel = supabaseClient.channel('teacher-realtime-' + liveQuizSessionId)
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_quiz_responses' }, payload => {
                    if (payload.new.session_id === liveQuizSessionId) {
                        // 🌟 ถ้ามีคนเข้าห้อง (รวมปาร์ตี้) ยอดจะเด้งตามจำนวนจริง
                        if (payload.new.q_index === -1) {
                            joinedPlayersCount++;
                            document.getElementById('tqAnswerCount').innerText = joinedPlayersCount + " คน";
                        } 
                        // 🌟 ถ้ามีคนตอบ (รวมปาร์ตี้)
                        else if (payload.new.q_index === liveQuizCurrentIndex) {
                            updateLiveAnswerCountUI(); // เรียกฟังก์ชันนับยอดตอบจริง
                        }
                    }
                }).subscribe();
        }
    }

    // 🌟 เพิ่มฟังก์ชันช่วยนับยอดตอบจริง (วางไว้ใต้ฟังก์ชันข้างบน)
    async function updateLiveAnswerCountUI() {
        let { count } = await supabaseClient.from('live_quiz_responses')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', liveQuizSessionId)
            .eq('q_index', liveQuizCurrentIndex)
            .neq('student_id', 'DUMMY'); // ไม่นับแถวหลอกถ้ามี
        
        document.getElementById('tqAnswerCount').innerText = count + " / " + joinedPlayersCount + " คน";
    }

    // เตรียมหน้าจอโชว์คำถามฝั่งครู
    function prepareTeacherQuestionUI() {
        const qData = liveQuizQuestions[liveQuizCurrentIndex];
        if (!qData) return;
        const questionText = qData.q || qData.question || "โจทย์หาย";
        const options = qData.options || qData.choices || [];
        const correctAnswer = String(qData.answer).trim(); // ดึงเฉลยมาเตรียมเทียบ

        document.getElementById('tqQuestionNumber').innerText = `ข้อที่ ${liveQuizCurrentIndex + 1} / ${liveQuizQuestions.length}`;
        document.getElementById('tqQuestionText').innerText = questionText;
        
        let html = '';
        options.forEach((opt, idx) => {
            // 🌟 ไฮไลท์สีเขียวที่ข้อถูกเหมือนของเดิม
            let isCorrect = (String(opt).trim() === correctAnswer);
            let bgClass = isCorrect ? 'bg-success text-white shadow-lg scale-up' : 'bg-white text-dark';
            let borderStyle = isCorrect ? 'border: 3px solid #198754;' : 'border: 1px solid #dee2e6;';
            
            html += `
                <div class="col-md-6 mb-3">
                    <div class="p-3 rounded-4 fw-bold d-flex justify-content-between align-items-center ${bgClass}" style="${borderStyle} transition: 0.3s;">
                        <span class="fs-5">${idx+1}. ${opt}</span>
                        ${isCorrect ? '<span class="badge bg-white text-success px-2 py-1"><i class="bi bi-check-circle-fill"></i> เฉลย</span>' : ''}
                    </div>
                </div>`;
        });
        document.getElementById('tqOptionsContainer').innerHTML = html;
    }

    async function releaseLiveQuestion() {
        if (!supabaseClient || !liveQuizSessionId) return;
        
        // 1. หน้าจอครูเปลี่ยนทันทีก่อน
        document.getElementById('btnReleaseQ').classList.add('hidden');
        document.getElementById('btnReleaseOpt').classList.remove('hidden'); 
        document.getElementById('tqStatusText').innerText = "นักเรียนกำลังอ่านคำถาม...";
        document.getElementById('tqStatusText').className = "text-info fw-bold mb-3";

        // 2. ยิงข้อมูลไปให้เด็กเห็นคำถาม (มี await เพื่อให้ชัวร์)
        await supabaseClient.from('live_quiz_sessions').update({ 
            status: 'show_question', 
            current_q_index: liveQuizCurrentIndex 
        }).eq('id', liveQuizSessionId);
    }

    async function releaseLiveOptions() {
        if (!supabaseClient || !liveQuizSessionId) return;

        // 1. หน้าจอครูและเวลานับทันทีก่อน
        let tqAnsCountEl = document.getElementById('tqAnswerCount');
        if (tqAnsCountEl && tqAnsCountEl.previousElementSibling) {
            tqAnsCountEl.previousElementSibling.innerText = "ตอบแล้ว:";
        }
        tqAnsCountEl.innerText = "0 / " + joinedPlayersCount + " คน";
        
        document.getElementById('btnReleaseOpt').classList.add('hidden');
        document.getElementById('btnShowAns').classList.remove('hidden');

        teacherTimeLeft = 30;
        document.getElementById('tqStatusText').innerText = `กำลังรับคำตอบ... (เหลือ ${teacherTimeLeft} วิ)`;
        document.getElementById('tqStatusText').className = "text-success fw-bold mb-3 pulse-text";

        if(teacherQuizTimer) clearInterval(teacherQuizTimer);
        teacherQuizTimer = setInterval(() => {
            teacherTimeLeft--;
            if (teacherTimeLeft > 0) {
                document.getElementById('tqStatusText').innerText = `กำลังรับคำตอบ... (เหลือ ${teacherTimeLeft} วิ)`;
            } else {
                clearInterval(teacherQuizTimer);
                document.getElementById('tqStatusText').innerText = "หมดเวลา! กำลังปิดรับคำตอบ...";
                showLiveAnswer();
            }
        }, 1000);

        // 2. ยิงตัวเลือกไปให้เด็กตอบ
        await supabaseClient.from('live_quiz_sessions').update({ 
            status: 'active' 
        }).eq('id', liveQuizSessionId);
    }

    // ✅ แก้ไข: โชว์เฉลยและเช็คว่ามีข้อต่อไปไหม (ทับของเดิม)
    async function showLiveAnswer() {
        if (!supabaseClient || !liveQuizSessionId) return;
        if(teacherQuizTimer) clearInterval(teacherQuizTimer);

        document.getElementById('tqStatusText').innerText = "กำลังโชว์เฉลย...";
        document.getElementById('tqStatusText').className = "text-primary fw-bold mb-3";
        document.getElementById('btnShowAns').classList.add('hidden');
        
        // 🌟 จุดสำคัญ: เช็คจำนวนข้อที่เหลือจาก Array คำถามจริง
        const totalQuestions = liveQuizQuestions.length;
        
        if (liveQuizCurrentIndex < totalQuestions - 1) {
            // ถ้ายังมีข้อต่อไป
            document.getElementById('btnNextQ').innerHTML = 'ไปข้อถัดไป <i class="bi bi-arrow-right-circle"></i>';
            document.getElementById('btnNextQ').classList.remove('hidden');
            document.getElementById('btnNextQ').classList.replace('btn-warning', 'btn-primary');
            document.getElementById('btnNextQ').onclick = nextLiveQuestion;
        } else {
            // ถ้าหมดแล้วจริงๆ
            let btnNext = document.getElementById('btnNextQ');
            btnNext.innerHTML = 'ดูอันดับคะแนน (Leaderboard) 🏆';
            btnNext.classList.remove('hidden');
            btnNext.classList.replace('btn-primary', 'btn-warning');
            btnNext.classList.add('text-dark');
            btnNext.onclick = triggerLeaderboard; 
        }

        await supabaseClient.from('live_quiz_sessions').update({ 
            status: 'show_answer' 
        }).eq('id', liveQuizSessionId);
    }

    function triggerLeaderboard() {
        if (!supabaseClient || !liveQuizSessionId) return;
        
        // 1. เปลี่ยนข้อความและปุ่มทันที
        document.getElementById('tqStatusText').innerText = "กำลังโชว์แท่นรับรางวัลที่หน้าจอเด็ก...";
        document.getElementById('tqStatusText').className = "text-warning fw-bold mb-3 pulse-text";
        
        let btnNext = document.getElementById('btnNextQ');
        btnNext.innerHTML = 'ปิดห้อง และแจก EXP! <i class="bi bi-stars"></i>';
        btnNext.classList.replace('btn-warning', 'btn-danger');
        btnNext.classList.replace('text-dark', 'text-white');
        btnNext.onclick = finishLiveQuizAndDistribute;

        // 2. ยิงฐานข้อมูลแบบเบื้องหลัง
        supabaseClient.from('live_quiz_sessions').update({ 
            status: 'show_leaderboard' 
        }).eq('id', liveQuizSessionId).catch(e => console.error(e));
    }

    // 5. ครูกด "ไปข้อถัดไป"
    function nextLiveQuestion() {
        // 1. ให้ระบบครูรันเดินหน้าทันที (แก้บั๊กค้างอยู่ข้อ 1 แบบถาวร)
        liveQuizCurrentIndex++;
        prepareTeacherQuestionUI();
        
        document.getElementById('tqStatusText').innerText = "รอนักเรียนเตรียมตัว...";
        document.getElementById('tqStatusText').className = "text-danger fw-bold mb-3";
        
        document.getElementById('btnNextQ').classList.add('hidden');
        document.getElementById('btnReleaseQ').classList.remove('hidden');
        
        let tqAnsCountEl = document.getElementById('tqAnswerCount');
        if (tqAnsCountEl && tqAnsCountEl.previousElementSibling) {
            tqAnsCountEl.previousElementSibling.innerText = "เข้าร่วมแล้ว:";
        }
        tqAnsCountEl.innerText = joinedPlayersCount + " คน";

        // 2. แจ้งหน้านักเรียนให้เปลี่ยนเป็นข้อถัดไปแบบเบื้องหลัง
        if (supabaseClient && liveQuizSessionId) {
            supabaseClient.from('live_quiz_sessions').update({
                status: 'setup',
                current_q_index: liveQuizCurrentIndex
            }).eq('id', liveQuizSessionId).catch(e => console.error(e));
        }
    }

    // 6. ครูกด "จบเกม" (คำนวณคะแนนทั้งหมดและลบห้อง)
    function finishLiveQuizAndDistribute() {
        if(teacherQuizTimer) clearInterval(teacherQuizTimer); // เผื่อไว้
        Swal.fire({ title: 'กำลังคำนวณและแจก EXP...', didOpen: () => Swal.showLoading() });

        google.script.run.withSuccessHandler(function(res) {
            Swal.close();
            if (liveQuizChannel) supabaseClient.removeChannel(liveQuizChannel);
            
            hideAppModal('teacherQuizControlModal');
            
            if (res.success) {
                Swal.fire('จบเกมสำเร็จ!', 'EXP โบนัสถูกโอนเข้าตัวนักเรียนเรียบร้อยแล้ว', 'success');
                loadAllData(); // โหลดหน้าจอ Dashboard ครูใหม่เผื่อแต้มอัปเดต
            }
        }).endLiveQuizAndDistributeEXP(liveQuizSessionId, currentRoom);
    }

    // ถ้าครูกดกากบาทปิดหน้าต่างกลางคัน
    function confirmEndLiveQuiz() {
        Swal.fire({
            title: 'ต้องการปิดเกมกลางคัน?',
            text: 'หากปิดตอนนี้ คำตอบทั้งหมดจะถูกยกเลิกและไม่มีการแจก EXP',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ปิดเกมทิ้ง',
            confirmButtonColor: '#d33'
        }).then(async (result) => {
            if (result.isConfirmed) {
                if (teacherQuizTimer) clearInterval(teacherQuizTimer);
                if (supabaseClient && liveQuizSessionId) {
                    // ลบห้องทิ้ง เด็กจะเด้งออกอัตโนมัติ
                    await supabaseClient.from('live_quiz_sessions').delete().eq('id', liveQuizSessionId);
                    if (liveQuizChannel) supabaseClient.removeChannel(liveQuizChannel);
                }
                hideAppModal('teacherQuizControlModal');
                Swal.fire('ยกเลิกเกมแล้ว', '', 'info');
            }
        });
    }

    // =========================================================
    // 🪄 RPG BOSS FIGHT - TEACHER LOGIC
    // =========================================================

    function openSummonBossModal() {
        if (!currentRoom) return Swal.fire('เตือน', 'กรุณาเลือกห้องก่อนครับ', 'warning');
        
        // 1. นับจำนวนนักเรียนในห้องปัจจุบัน
        const studentsInRoom = studentsData.filter(function(s) { return s[4] === currentRoom; });
        const studentCount = studentsInRoom.length;

        // 2. คำนวณเลือดแนะนำ (เด็กทุกคนตีคนละ 50)
        const recommendedHp = studentCount * 50;

        // 3. แสดงคำแนะนำใน UI (ระบุพลังโจมตีของเด็กด้วย)
        const suggestEl = document.getElementById('bossHpSuggest');
        if (suggestEl) {
            suggestEl.innerHTML = `
                <i class="bi bi-info-circle"></i> แนะนำสายโหด: ${recommendedHp} HP<br>
                <span class="text-muted">(คำนวณจากเด็ก ${studentCount} คน)</span><br>
                <span class="text-danger fw-bold">*เด็ก 1 คน ตีลดประมาณ 10-50 HP</span>
            `;
        }

        // 4. ใส่ค่าเริ่มต้นให้ครู
        document.getElementById('bossHpInput').value = recommendedHp > 0 ? recommendedHp : 500;
        
        document.getElementById('bossTopicInput').value = '';
        showAppModal('summonBossModal');
    }

    function processSummonBoss() {
        const topic = document.getElementById('bossTopicInput').value.trim();
        // ดึงค่าจำนวนคำถามและเลือดบอสที่ครูตั้งไว้
        const qCount = parseInt(document.getElementById('bossQCountInput').value) || 5;
        const hp = parseInt(document.getElementById('bossHpInput').value) || 500;

        if (!topic) return Swal.fire('เตือน', 'กรุณาพิมพ์หัวข้อก่อนอัญเชิญบอส', 'warning');

        const btn = document.getElementById('btnSummonBoss');
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> กำลังร่ายเวทมนตร์ (รอ AI คิดคำถาม)...';
        btn.disabled = true;

        Swal.fire({
            title: 'เวทมนตร์กำลังทำงาน...',
            html: `จีมินกำลังคิดคำถาม <b>${qCount} ข้อ</b> และสร้างบอส<br>ใช้เวลาประมาณ 10-15 วินาที ⏳`,
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        google.script.run
        .withFailureHandler(err => {
            btn.innerHTML = '<i class="bi bi-lightning-charge-fill"></i> อัญเชิญบอสเลย!';
            btn.disabled = false;
            Swal.fire('Error', err.message, 'error');
        })
        .withSuccessHandler(function(res) {
            btn.innerHTML = '<i class="bi bi-lightning-charge-fill"></i> อัญเชิญบอสเลย!';
            btn.disabled = false;
            Swal.close();

            if (res.success) {
                window.sendPushNotification("🐉 บอสปรากฏตัว!", "หัวข้อ: " + topic + " รวมพลังไปสู้บอสกันเร็ว!");
                Swal.fire('สำเร็จ!', res.message, 'success');
                hideAppModal('summonBossModal');
            } else {
                Swal.fire('ผิดพลาด', res.message, 'error');
            }
        }).generateBossWithAI(currentRoom, topic, qCount, hp); // ส่ง qCount กับ hp ไปให้หลังบ้านด้วย
    }

    // =========================================================
    // 🛡️ เช็คสถานะบอส และลบถาวร (เพิ่มใหม่)
    // =========================================================
    async function openBossStatusModal() {
        if (!currentRoom) return Swal.fire('เตือน', 'กรุณาเลือกห้องก่อนครับ', 'warning');
        
        showAppModal('bossStatusModal');
        document.getElementById('bossStatusContainer').innerHTML = '<div class="text-center py-4"><span class="spinner-border text-primary"></span> กำลังโหลดข้อมูลจากมิติ...</div>';
        
        // ดึงข้อมูลบอสทั้งหมดของห้องนี้
        let { data: bosses, error } = await supabaseClient
            .from('boss_quizzes')
            .select('*')
            .eq('room_name', currentRoom)
            .order('id', { ascending: false });
            
        if (error) {
            document.getElementById('bossStatusContainer').innerHTML = '<div class="text-danger text-center">ดึงข้อมูลไม่ได้: ' + error.message + '</div>';
            return;
        }
        
        if (!bosses || bosses.length === 0) {
            document.getElementById('bossStatusContainer').innerHTML = '<div class="text-muted text-center py-4">มิตินี้สงบสุข ยังไม่มีบอสเลยครับ ✨</div>';
            return;
        }
        
        let html = '';
        bosses.forEach(b => {
            let bossParts = b.boss_name.split('|');
            let bIcon = bossParts.length > 1 ? bossParts[0] : '👾';
            let bName = bossParts.length > 1 ? bossParts[1] : b.boss_name;
            
            let statusBadge = b.status === 'active' ? '<span class="badge bg-danger pulse-text">กำลังอาละวาด!</span>' : '<span class="badge bg-secondary">พ่ายแพ้/ถูกลบ</span>';
            
            html += `
            <div class="card mb-2 shadow-sm border-0">
                <div class="card-body d-flex justify-content-between align-items-center">
                    <div>
                        <h5 class="mb-1 fw-bold">${bIcon} ${bName}</h5>
                        <div class="small text-muted">หัวข้อ: ${b.topic} | เลือด: ${b.boss_hp}/${b.boss_max_hp}</div>
                        <div class="mt-1">สถานะ: ${statusBadge}</div>
                    </div>
                    <div>
                        <button class="btn btn-danger btn-sm rounded-pill px-3 shadow-sm" onclick="deleteBossCompletely(${b.id})">
                            <i class="bi bi-trash-fill"></i> ลบถาวร
                        </button>
                    </div>
                </div>
            </div>`;
        });
        document.getElementById('bossStatusContainer').innerHTML = html;
    }

    async function deleteBossCompletely(bossId) {
        Swal.fire({
            title: 'ลบบอสตัวนี้ทิ้งถาวร?',
            text: 'ข้อมูลบอสและประวัติที่เด็กๆ เคยตีบอสตัวนี้ จะหายวับไปกับตาทันที!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'ลบทิ้งถาวร'
        }).then(async (result) => {
            if (result.isConfirmed) {
                Swal.fire({ title: 'กำลังลบความทรงจำ...', didOpen: () => Swal.showLoading() });
                
                // ลบประวัติการตีบอสจากตาราง boss_logs ก่อน (เคลียร์ขยะ)
                await supabaseClient.from('boss_logs').delete().eq('boss_id', bossId);
                
                // ลบตัวบอสออก
                let { error } = await supabaseClient.from('boss_quizzes').delete().eq('id', bossId);
                
                if (error) {
                    Swal.fire('ผิดพลาด', error.message, 'error');
                } else {
                    Swal.fire('ลบสำเร็จ!', 'ล้างข้อมูลบอสเรียบร้อยแล้ว', 'success');
                    openBossStatusModal(); // โหลดข้อมูลให้ดูใหม่
                }
            }
        });
    }

    // 🌟 ฟังก์ชันพรีวิวรูปงานนักเรียน (เพิ่มต่อท้าย)
    window.previewWorkImage = function(url) {
        Swal.fire({
            title: 'พรีวิวผลงานนักเรียน',
            imageUrl: url,
            imageAlt: 'ผลงานนักเรียน',
            confirmButtonText: 'ปิดหน้าต่าง',
            customClass: { popup: 'rounded-4' }
        });
    };

    window.copyParentLink = async function(id, token) {
        // 1. หาชื่อนักเรียนจาก studentsData (Array index ที่ 1 คือชื่อ)
        const student = studentsData.find(s => s[0] === id);
        const studentName = student ? student[1] : "นักเรียน";
    
        let finalToken = token;
        
        // 2. ถ้ายังไม่มีรหัสลับ ให้สร้างใหม่ผ่าน Server
        if (!finalToken || finalToken === "" || finalToken === "null") {
            Swal.fire({ title: 'กำลังสร้างรหัสลับ...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
            finalToken = await new Promise(resolve => {
                google.script.run.withSuccessHandler(resolve).generateParentToken(id);
            });
            Swal.close();
        }
        
        // 3. สร้าง URL โดยอิงจาก "หน้าเว็บปัจจุบันที่ครูเปิดอยู่" (เพื่อให้ลิงก์ชี้มาที่ Vercel เสมอ)
        const baseUrl = window.location.origin + window.location.pathname;
        const url = baseUrl + "?page=parent&token=" + finalToken;
        
        // 4. แสดงหน้าต่าง Popup แจ้งเตือนสวยๆ ตามที่ฟลุ๊คต้องการ
        Swal.fire({
            title: '<i class="bi bi-person-heart text-danger"></i> ลิงก์สำหรับผู้ปกครอง',
            html: `
                <div class="text-start mb-3 p-3 bg-light rounded-3 border">
                    <small class="text-muted fw-bold">นักเรียน:</small>
                    <h5 class="mb-0 text-dark">${studentName}</h5>
                    <small class="text-secondary">รหัสประจำตัว: ${id}</small>
                </div>
                <div class="input-group mb-3">
                    <input type="text" id="parentLinkInput" class="form-control" value="${url}" readonly>
                    <button class="btn btn-primary" onclick="copyToClipboardFromPopup()">
                        <i class="bi bi-copy"></i> คัดลอก
                    </button>
                </div>
                <p class="small text-muted"><i class="bi bi-info-circle"></i> ลิงก์นี้จะใช้เข้าดูข้อมูลของนักเรียนคนนี้ได้โดยตรงครับ</p>
            `,
            showConfirmButton: false,
            showCloseButton: true,
            customClass: { popup: 'rounded-4' }
        });
    };
    
    // ฟังก์ชันเสริมสำหรับปุ่มคัดลอกใน Popup
    window.copyToClipboardFromPopup = function() {
        const copyText = document.getElementById("parentLinkInput");
        copyText.select();
        navigator.clipboard.writeText(copyText.value);
        
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'คัดลอกลิงก์แล้ว!',
            showConfirmButton: false,
            timer: 1500
        });
    };

    // --- [เพิ่มใหม่: ฟังก์ชันสำหรับครูเปิดดูรายละเอียดที่ผู้ปกครองส่งมา] ---
    window.openConsultDetail = function(studentId, studentName) {
        const consults = (window.tempConsults || []).filter(c => c.student_id === studentId);
        let html = consults.map(c => `
            <div class="card border-0 shadow-sm mb-3 rounded-3 overflow-hidden text-start">
                <div class="card-header bg-danger text-white small py-1"><i class="bi bi-clock"></i> ส่งเมื่อ: ${formatThaiDate(c.created_at.split('T')[0])}</div>
                <div class="card-body bg-white">
                    <div class="mb-3">
                        <small class="text-muted fw-bold d-block mb-1">เรื่องที่ต้องการปรึกษา:</small>
                        <div class="p-2 bg-light rounded border" style="font-size: 0.9rem;">${c.message}</div>
                    </div>
                    <div class="p-3 rounded-3" style="background:#fff3cd; border: 1px solid #ffeeba;">
                        <strong class="text-danger"><i class="bi bi-person-lines-fill"></i> ข้อมูลติดต่อกลับผู้ปกครอง:</strong><br>
                        <div class="fs-4 fw-bold mt-1 text-center">${c.parent_contact}</div>
                    </div>
                </div>
            </div>
        `).join('');
    
        Swal.fire({
            title: `<div class="fw-bold text-primary">คำขอปรึกษาจากผู้ปกครอง</div><div class="small text-muted fs-6">${studentName}</div>`,
            html: `<div style="max-height:400px; overflow-y:auto; padding: 5px;">${html}</div>`,
            showCancelButton: true,
            showConfirmButton: true,
            confirmButtonText: '<i class="bi bi-check-circle"></i> แก้ไขปัญหาเรียบร้อยแล้ว (ล้างสถานะ)',
            cancelButtonText: 'ปิดหน้าต่าง (เก็บแจ้งเตือนไว้ก่อน)',
            confirmButtonColor: '#198754',
            cancelButtonColor: '#6c757d',
            customClass: { popup: 'rounded-4' }
        }).then(async (result) => {
            if (result.isConfirmed) {
                // ครูจัดการปัญหาเรียบร้อยแล้ว -> สั่ง Update ฐานข้อมูล
                Swal.fire({ title: 'กำลังบันทึก...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
                
                const { error } = await supabaseClient
                    .from('parent_communications')
                    .update({ is_resolved: true })
                    .eq('student_id', studentId)
                    .eq('target', 'teacher');
                
                if (error) {
                    Swal.fire('ผิดพลาด', error.message, 'error');
                } else {
                    Swal.fire('สำเร็จ', 'ล้างสถานะแจ้งเตือนเรียบร้อยครับ ไอคอนแจ้งเตือนจะหายไป', 'success');
                    loadStudents(); // รีโหลดข้อมูลเพื่ออัปเดตหน้าจอครูให้เป็นปัจจุบัน
                }
            }
        });
    };
