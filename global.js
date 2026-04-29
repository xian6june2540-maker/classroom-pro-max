// =====================================
// สะพานเชื่อม Vercel -> Google Apps Script
// =====================================
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbx8vuQbirpiRHJm8QwmypPQ9cJpFPeC0YoqZPBYXg0VO6ByRJX44sGN6L6SSYmg-SSY/exec";

const createGASProxy = (successHandler, failureHandler) => {
    return new Proxy({}, {
        get: function(target, prop) {
            if (prop === 'withSuccessHandler') return (cb) => createGASProxy(cb, failureHandler);
            if (prop === 'withFailureHandler') return (cb) => createGASProxy(successHandler, cb);
            
            return function(...args) {
                // 🛠️ ดักจับ: ถ้าเป็นการยิงแจ้งเตือน ให้ข้ามกำแพง CORS (no-cors)
                const isNotify = (prop === 'sendOneSignalNotification');

                fetch(GAS_WEB_APP_URL, {
                    method: 'POST',
                    mode: isNotify ? 'no-cors' : 'cors', 
                    body: JSON.stringify({ action: prop, params: args })
                })
                .then(r => {
                    if (isNotify) return { success: true }; // no-cors อ่าน json ไม่ได้อยู่แล้ว ให้ข้ามไปเลย
                    return r.json();
                })
                .then(res => {
                    if (res && res.success) {
                        if (successHandler) successHandler(res.data);
                    } else if (res && !isNotify) {
                        if (failureHandler) failureHandler(new Error(res.message));
                        else console.error("API Error:", res.message);
                    }
                })
                .catch(err => {
                    if (!isNotify && failureHandler) failureHandler(err);
                });
            }
        }
    });
};

window.google = { script: { run: createGASProxy(null, null) } };
// =====================================    // =====================================
    // GLOBAL VARIABLES & UTILS
    // =====================================
    
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer)
            toast.addEventListener('mouseleave', Swal.resumeTimer)
        }
    });

    let roomsData = [];
    let studentsData = [];
    let attendanceData = {};
    let tasksData = [];
    let submissionData = {};
    let currentRoom = '';
    let currentTaskId = '';
    let currentTaskTitle = '';
    let currentTaskDue = '';
    let currentTaskMax = 0;

    let globalPortalStudent = null;
    let windowPartyMembers = []; // เพิ่มตัวแปรนี้เพื่อเก็บ ID ทุกคนในกลุ่ม (รวมตัวเอง)
    let autoRefreshInterval = null;
    let countdownInterval = null;

    let currentSelectedAvatarSeed = '1';
    let currentSelectedPostItStyle = '#fff9b1';
    let currentBoardRole = 'student';
    let boardInterval = null;

    // --- SUPABASE REALTIME & CLIENT VARIABLES ---
    let supabaseClient = null;
    let globalRealtimeChannel = null;

    function getLocalTodayStr() {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    // =====================================
    // INIT SUPABASE (ASYNC)
    // =====================================
    // 🟢 เปลี่ยนจากฟังก์ชันธรรมดา เป็น Promise เพื่อให้ระบบ "รอ" จนกว่าจะเชื่อมต่อเสร็จ
    function initSupabaseAsync() {
        return new Promise((resolve) => {
            if(supabaseClient) {
                resolve(true);
                return;
            }
            
            // ขอ URL และ Key จาก Backend (ยอมใช้โควตา GAS แค่ 1 ครั้งตอนโหลดเว็บแรกสุด)
            google.script.run.withSuccessHandler(function(creds) {
                if(!creds || !creds.url || !creds.key) {
                    console.warn("Supabase credentials missing.");
                    resolve(false);
                    return;
                }
                
                // สร้าง Supabase Client สำหรับให้หน้าเว็บดึงข้อมูลโดยตรง!
                supabaseClient = supabase.createClient(creds.url, creds.key);
                
                // สร้าง Channel ดักฟังระบบ Realtime
                globalRealtimeChannel = supabaseClient.channel('custom-all-channel')
                  .on(
                    'postgres_changes',
                    { event: '*', schema: 'public' },
                    (payload) => {
                      console.log('Realtime Change received!', payload);
                      handleRealtimeEvent(payload);
                    }
                  )
                  .subscribe((status) => {
                    if(status === 'SUBSCRIBED') {
                       console.log('Connected to Supabase Realtime');
                    }
                  });
                  
                resolve(true); // แจ้งว่าเชื่อมต่อสำเร็จแล้ว
            }).getPublicSupabaseCreds();
        });
    }

    // ฟังก์ชันจัดการเมื่อมีข้อมูลเปลี่ยนแปลง (Realtime Payload)
    function handleRealtimeEvent(payload) {
        const table = payload.table;
        const eventType = payload.eventType;

        // 1. ถ้าครูกำลังล็อกอิน และอยู่ในหน้าห้องเรียน
        if (localStorage.getItem('teacherLoggedIn') === 'true' && currentRoom !== "") {
            
            if (table === 'attendance') {
                let checkDate = document.getElementById('attDate').value;
                if(checkDate) loadAttendanceForDate(); 
            }
            
            if (table === 'tasks' || table === 'submissions' || table === 'group_tasks' || table === 'groups' || table === 'group_submissions') {
                 loadAssignments(); 
                 if(document.getElementById('taskModal').classList.contains('show') && currentTaskId) openTaskSubmissions(currentTaskId, currentTaskTitle, currentTaskDue, currentTaskMax, false);
                 if(document.getElementById('groupTaskModal').classList.contains('show') && currentTaskId) openTaskSubmissions(currentTaskId, currentTaskTitle, currentTaskDue, currentTaskMax, true);
            }
            
            if (table === 'leaves') {
                 checkPendingLeaves();
            }
            
            if (table === 'students' && document.getElementById('tab-students').classList.contains('active')) {
                 loadStudents();
            }
        }

        // 2. ถ้านักเรียนกำลังล็อกอินอยู่
        if (globalPortalStudent && globalPortalStudent.id) {
            if ( (table === 'students' && payload.new && payload.new.id === globalPortalStudent.id) ||
                 (table === 'attendance' && payload.new && payload.new.student_id === globalPortalStudent.id) ||
                 (table === 'submissions' && payload.new && payload.new.student_id === globalPortalStudent.id) ||
                 (table === 'tasks') || (table === 'group_tasks') || (table === 'announcements') ) {
                 
                 clearTimeout(autoRefreshInterval);
                 autoRefreshInterval = setTimeout(() => {
                     loadFullDashboard(globalPortalStudent.id, true);
                 }, 2000);
            }
        }
    }


    // =====================================
    // สร้างอวตาร 200 ตัว
    // =====================================
    let avatarSeeds = [];
    for(let i = 1; i <= 200; i++) {
        avatarSeeds.push("StudentModelProMax_" + i + "_Avatar");
    }

    // =====================================
    // สร้างโพสอิท 200 ลาย (ระบบ 10 เลเวล สวยงาม ว้าว และปลอดภัย 100%)
    // =====================================
    let postItStyles = [];
    const pColors = ['#fff9b1', '#ffcce5', '#b2f0e6', '#cce5ff', '#e6ccff', '#d9f2d9', '#ffebd9', '#fff0b3', '#e0e0eb', '#ffb3b3', '#fdfd96', '#ffb7b2', '#ffdac1', '#e2f0cb', '#b5ead7', '#c7ceea', '#f1cbff', '#e8b3fa', '#c3aed6', '#aee1e1'];
    
    // ชุด Emoji ลายน้ำ แบ่งตามหมวด
    const emojiAnimals = ['🐱','🐶','🐰','🦊','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐥','🦆','🦉','🦄','🐝','🦋','🐌','🐞'];
    const emojiFoods = ['🍎','🍉','🍇','🍓','🍒','🍑','🍍','🥝','🍅','🥑','🍔','🍟','🍕','🌭','🍿','🍩','🍦','🍰','🍫','🍬'];
    const emojiSports = ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🎱','🪀','🏓','🏸','🏒','🏑','🥍','🏏','🪃','🥅','⛳','🪁'];
    const emojiSky = ['🌈','☀️','🌤️','⛅','🌥️','☁️','🌦️','🌧️','⛈️','🌩️','🌨️','❄️','☃️','⛄','🌬️','💨','🌪️','🌫️','☂️','☔'];
    const emojiHearts = ['❤️','🧡','💛','💚','💙','💜','🤎','🖤','🤍','💖','💗','💓','💞','💕','💘','💝','💟','💌','😘','🥰'];

    for(let i = 0; i < 200; i++) {
        let c1 = pColors[i % 20];
        let c2 = pColors[(i + 5) % 20];
        let c3 = pColors[(i + 10) % 20];
        let tier = Math.floor(i / 20); // แบ่งเป็น 10 หมวดหมู่ (หมวดละ 20 ลาย)
        
        if (tier === 0) {
            postItStyles.push(c1); // เลเวล 1-20: สีพื้นพาสเทลน่ารักๆ
        } else if (tier === 1) {
            postItStyles.push(`linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`); // เลเวล 21-40: ไล่สี 2 โทน
        } else if (tier === 2) {
            postItStyles.push(`EMOJI:${emojiAnimals[i % 20]}:${c1}`); // เลเวล 41-60: ลายน้ำน้องสัตว์
        } else if (tier === 3) {
            postItStyles.push(`radial-gradient(rgba(255,255,255,0.6) 15%, transparent 16%) 0 0 / 20px 20px, ${c2}`); // เลเวล 61-80: ลายจุด Polka Dot
        } else if (tier === 4) {
            postItStyles.push(`EMOJI:${emojiFoods[i % 20]}:${c2}`); // เลเวล 81-100: ลายน้ำของกิน
        } else if (tier === 5) {
            postItStyles.push(`repeating-linear-gradient(45deg, rgba(255,255,255,0.4), rgba(255,255,255,0.4) 10px, transparent 10px, transparent 20px), ${c1}`); // เลเวล 101-120: ลายทาง
        } else if (tier === 6) {
            postItStyles.push(`EMOJI:${emojiSports[i % 20]}:${c1}`); // เลเวล 121-140: ลายน้ำกีฬา
        } else if (tier === 7) {
            postItStyles.push(`linear-gradient(rgba(255,255,255,0.5) 2px, transparent 2px) 0 0 / 20px 20px, linear-gradient(90deg, rgba(255,255,255,0.5) 2px, transparent 2px) 0 0 / 20px 20px, ${c2}`); // เลเวล 141-160: ลายตาราง Grid
        } else if (tier === 8) {
            postItStyles.push(`EMOJI:${emojiSky[i % 20]}:${c3}`); // เลเวล 161-180: ลายน้ำท้องฟ้า/สภาพอากาศ
        } else {
            postItStyles.push(`EMOJI:${emojiHearts[i % 20]}:linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`); // เลเวล 181-200: ลายหัวใจสุดพรีเมียมบนพื้นหลังไล่สี
        }
    }

// 1. หมวดเครื่องประดับ & อุปกรณ์ (Accessories) - 30 ชิ้น (ไม่มีแขนขาคนถือ)
    const itemsData = [
        { id: 'i1', name: 'แว่นตากรอบใส', price: 500, icon: '👓', passive: '+1 EXP/ชม.' },
        { id: 'i2', name: 'หน้ากากอนามัย', price: 1000, icon: '😷', passive: '+1 EXP/ชม.' },
        { id: 'i3', name: 'หูฟังไร้สาย', price: 2000, icon: '🎧', passive: '+2 EXP/ชม.' },
        { id: 'i4', name: 'หมวกไหมพรมหูแมว', price: 3500, icon: '🧶', passive: '+2 EXP/ชม.' },
        { id: 'i5', name: 'แว่นกันแดดสีชา', price: 5500, icon: '🕶️', passive: '+3 EXP/ชม.' },
        { id: 'i6', name: 'นาฬิกาสมาร์ทวอทช์', price: 8000, icon: '⌚', passive: '+3 EXP/ชม.' },
        { id: 'i7', name: 'สร้อยคอพลอยฟ้า', price: 11000, icon: '💎', passive: '+4 EXP/ชม.' },
        { id: 'i8', name: 'กระเป๋าเป้เดินทาง', price: 15000, icon: '🎒', passive: '+4 EXP/ชม.' },
        { id: 'i9', name: 'คทาเวทย์ฝึกหัด', price: 20000, icon: '🪄', passive: '+5 EXP/ชม.' },
        { id: 'i10', name: 'ดาบเหล็กกล้า', price: 26000, icon: '⚔️', passive: '+5 EXP/ชม.' },
        { id: 'i11', name: 'โล่ป้องกันทองแดง', price: 33000, icon: '🛡️', passive: '+6 EXP/ชม.' },
        { id: 'i12', name: 'มงกุฎดอกไม้สด', price: 41000, icon: '🌸', passive: '+6 EXP/ชม.' },
        { id: 'i13', name: 'ธนูไม้โอ๊ค', price: 50000, icon: '🏹', passive: '+7 EXP/ชม.' },
        { id: 'i14', name: 'หน้ากากแฟนซี', price: 60000, icon: '🎭', passive: '+7 EXP/ชม.' },
        { id: 'i15', name: 'เข็มขัดนิรภัยทองคำ', price: 72000, icon: '🎗️', passive: '+8 EXP/ชม.' },
        { id: 'i16', name: 'ค้อนศึกยักษ์', price: 85000, icon: '🔨', passive: '+8 EXP/ชม.' },
        { id: 'i17', name: 'ขวานพยุหะ', price: 100000, icon: '🪓', passive: '+9 EXP/ชม.' },
        { id: 'i18', name: 'ลูกแก้ววิญญาณ', price: 118000, icon: '🔮', passive: '+9 EXP/ชม.' },
        { id: 'i19', name: 'ปีกผีเสื้อเวทย์', price: 138000, icon: '🦋', passive: '+10 EXP/ชม.' },
        { id: 'i20', name: 'มงกุฎทองคำแท้', price: 160000, icon: '👑', passive: '+10 EXP/ชม.' },
        { id: 'i21', name: 'ร่มมนตรา', price: 185000, icon: '☂️', passive: '+12 EXP/ชม.' },
        { id: 'i22', name: 'คทาสามง่ามน้ำแข็ง', price: 215000, icon: '🔱', passive: '+12 EXP/ชม.' },
        { id: 'i23', name: 'กล่องดนตรีปริศนา', price: 245000, icon: '📻', passive: '+14 EXP/ชม.' },
        { id: 'i24', name: 'พัดโบราณลงอาคม', price: 275000, icon: '🪭', passive: '+14 EXP/ชม.' },
        { id: 'i25', name: 'กระดิ่งเรียกโชค', price: 310000, icon: '🔔', passive: '+16 EXP/ชม.' },
        { id: 'i26', name: 'ปีกเทวทูตขาว', price: 345000, icon: '🕊️', passive: '+16 EXP/ชม.' },
        { id: 'i27', name: 'มงกุฎรัตติกาล', price: 385000, icon: '🖤', passive: '+18 EXP/ชม.' },
        { id: 'i28', name: 'ดาบแสงเลเซอร์', price: 425000, icon: '🔦', passive: '+18 EXP/ชม.' },
        { id: 'i29', name: 'วงแหวนศักดิ์สิทธิ์', price: 470000, icon: '✨', passive: '+20 EXP/ชม.' },
        { id: 'i30', name: 'อัญมณีไร้ขอบเขต', price: 550000, icon: '💎', passive: '+20 EXP/ชม.' }
    ];

// 2. หมวดชุดชาย (Men Apparel) - 30 ชิ้น (เฉพาะตัวเสื้อผ้า)
    const maleClothesData = [
        { id: 'm1', name: 'เสื้อยืดขาวหม่น', price: 1500, icon: '👕', passive: '+2 EXP/ชม.' },
        { id: 'm2', name: 'เสื้อยืดลายทาง', price: 3000, icon: '👕', passive: '+3 EXP/ชม.' },
        { id: 'm3', name: 'เสื้อเชิ้ตลายสก็อต', price: 6000, icon: '👔', passive: '+4 EXP/ชม.' },
        { id: 'm4', name: 'เสื้อโปโลน้ำเงิน', price: 10000, icon: '👕', passive: '+5 EXP/ชม.' },
        { id: 'm5', name: 'เสื้อเชิ้ตขาวเนี๊ยบ', price: 15000, icon: '👔', passive: '+6 EXP/ชม.' },
        { id: 'm6', name: 'กางเกงยีนส์ฟอก', price: 22000, icon: '👖', passive: '+7 EXP/ชม.' },
        { id: 'm7', name: 'เสื้อกั๊กตกปลา', price: 30000, icon: '🦺', passive: '+8 EXP/ชม.' },
        { id: 'm8', name: 'เสื้อหนาวสีเข้ม', price: 40000, icon: '🧥', passive: '+9 EXP/ชม.' },
        { id: 'm9', name: 'เสื้อแจ็คเก็ตหนัง', price: 52000, icon: '🧥', passive: '+10 EXP/ชม.' },
        { id: 'm10', name: 'ชุดวอร์มกีฬา', price: 65000, icon: '👟', passive: '+11 EXP/ชม.' },
        { id: 'm11', name: 'ชุดสูททักซิโด้', price: 80000, icon: '🕴️', passive: '+12 EXP/ชม.' },
        { id: 'm12', name: 'เสื้อกาวน์สีขาว', price: 98000, icon: '🥼', passive: '+13 EXP/ชม.' },
        { id: 'm13', name: 'ชุดเอี๊ยมยีนส์', price: 120000, icon: '👖', passive: '+14 EXP/ชม.' },
        { id: 'm14', name: 'เสื้อคลุมอาบน้ำ', price: 145000, icon: '👘', passive: '+15 EXP/ชม.' },
        { id: 'm15', name: 'กางเกงขาสั้นบีช', price: 175000, icon: '🩳', passive: '+16 EXP/ชม.' },
        { id: 'm16', name: 'ชุดยูโดขาว', price: 210000, icon: '🥋', passive: '+17 EXP/ชม.' },
        { id: 'm17', name: 'ชุดกิโมโนชาย', price: 250000, icon: '👘', passive: '+18 EXP/ชม.' },
        { id: 'm18', name: 'เสื้อคลุมลอร์ด', price: 295000, icon: '🧣', passive: '+19 EXP/ชม.' },
        { id: 'm19', name: 'เสื้อเกราะหนังสัตว์', price: 345000, icon: '🪵', passive: '+20 EXP/ชม.' },
        { id: 'm20', name: 'ชุดนักรบพเนจร', price: 400000, icon: '🗡️', passive: '+21 EXP/ชม.' },
        { id: 'm21', name: 'เสื้อคลุมนักเวทย์มืด', price: 450000, icon: '🪄', passive: '+22 EXP/ชม.' },
        { id: 'm22', name: 'เกราะเหล็กอัศวิน', price: 500000, icon: '🛡️', passive: '+23 EXP/ชม.' },
        { id: 'm23', name: 'ชุดออกผจญภัย', price: 550000, icon: '🎒', passive: '+24 EXP/ชม.' },
        { id: 'm24', name: 'เกราะมังกรแดง', price: 600000, icon: '🔥', passive: '+25 EXP/ชม.' },
        { id: 'm25', name: 'ชุดเกราะจักรกล', price: 650000, icon: '🤖', passive: '+26 EXP/ชม.' },
        { id: 'm26', name: 'เสื้อคลุมเทพเจ้า', price: 680000, icon: '✨', passive: '+27 EXP/ชม.' },
        { id: 'm27', name: 'เกราะศักดิ์สิทธิ์ทองคำ', price: 700000, icon: '🔱', passive: '+28 EXP/ชม.' },
        { id: 'm28', name: 'ชุดจักรพรรดิสูงสุด', price: 720000, icon: '👑', passive: '+29 EXP/ชม.' },
        { id: 'm29', name: 'เกราะทลายมิติ', price: 740000, icon: '🌀', passive: '+30 EXP/ชม.' },
        { id: 'm30', name: 'อาภรณ์มหาเทพนิรันดร์', price: 750000, icon: '🌌', passive: '+30 EXP/ชม.' }
    ];

// 3. หมวดชุดหญิง (Women Apparel) - 30 ชิ้น (เฉพาะตัวเสื้อผ้า)
    const femaleClothesData = [
        { id: 'w1', name: 'เสื้อสายเดี่ยวขาว', price: 1500, icon: '👚', passive: '+2 EXP/ชม.' },
        { id: 'w2', name: 'กระโปรงพลีทสั้น', price: 3000, icon: '👗', passive: '+3 EXP/ชม.' },
        { id: 'w3', name: 'เดรสหน้าร้อนดอกไม้', price: 6000, icon: '👗', passive: '+4 EXP/ชม.' },
        { id: 'w4', name: 'เสื้อยืดคอปาด', price: 10000, icon: '👚', passive: '+5 EXP/ชม.' },
        { id: 'w5', name: 'ชุดกระโปรงเอี๊ยม', price: 15000, icon: '👗', passive: '+6 EXP/ชม.' },
        { id: 'w6', name: 'ชุดนักเรียนญี่ปุ่น', price: 22000, icon: '🎀', passive: '+7 EXP/ชม.' },
        { id: 'w7', name: 'ชุดออกกำลังกายรัดรูป', price: 30000, icon: '👟', passive: '+8 EXP/ชม.' },
        { id: 'w8', name: 'เสื้อคลุมผ้าพันคอ', price: 40000, icon: '🧣', passive: '+9 EXP/ชม.' },
        { id: 'w9', name: 'ชุดว่ายน้ำสีสดใส', price: 52000, icon: '🩱', passive: '+10 EXP/ชม.' },
        { id: 'w10', name: 'ชุดราตรีเรียบหรู', price: 65000, icon: '👗', passive: '+11 EXP/ชม.' },
        { id: 'w11', name: 'กิโมโนลายซากุระ', price: 80000, icon: '👘', passive: '+12 EXP/ชม.' },
        { id: 'w12', name: 'ชุดกี่เพ้าสีแดงสด', price: 98000, icon: '🧧', passive: '+13 EXP/ชม.' },
        { id: 'w13', name: 'ชุดเมดลูกไม้ขาว', price: 120000, icon: '🧹', passive: '+14 EXP/ชม.' },
        { id: 'w14', name: 'เสื้อคลุมกันหนาวหนา', price: 145000, icon: '🧥', passive: '+15 EXP/ชม.' },
        { id: 'w15', name: 'ชุดระบำบัลเล่ต์', price: 175000, icon: '🩰', passive: '+16 EXP/ชม.' },
        { id: 'w16', name: 'ชุดราตรีประดับพลอย', price: 210000, icon: '💃', passive: '+17 EXP/ชม.' },
        { id: 'w17', name: 'เสื้อคลุมแม่มดน้อย', price: 250000, icon: '🧙‍♀️', passive: '+18 EXP/ชม.' },
        { id: 'w18', name: 'ชุดเกราะหนังนักรบสาว', price: 295000, icon: '🏹', passive: '+19 EXP/ชม.' },
        { id: 'w19', name: 'ชุดนินจาสาวเงา', price: 345000, icon: '🥷', passive: '+20 EXP/ชม.' },
        { id: 'w20', name: 'ชุดเดรสหางเงือก', price: 400000, icon: '🧜‍♀️', passive: '+21 EXP/ชม.' },
        { id: 'w21', name: 'ชุดนางฟ้าผ้าพริ้ว', price: 450000, icon: '🧚‍♀️', passive: '+22 EXP/ชม.' },
        { id: 'w22', name: 'เกราะอัศวินหญิงเหล็ก', price: 500000, icon: '🛡️', passive: '+23 EXP/ชม.' },
        { id: 'w23', name: 'ชุดราชินีแห่งป่า', price: 550000, icon: '🍃', passive: '+24 EXP/ชม.' },
        { id: 'w24', name: 'เกราะเพชรประดับทอง', price: 600000, icon: '💎', passive: '+25 EXP/ชม.' },
        { id: 'w25', name: 'อาภรณ์สตรีศักดิ์สิทธิ์', price: 650000, icon: '✨', passive: '+26 EXP/ชม.' },
        { id: 'w26', name: 'เดรสราชินีหิมะ', price: 680000, icon: '❄️', passive: '+27 EXP/ชม.' },
        { id: 'w27', name: 'ชุดเกราะเทพธิดา', price: 700000, icon: '👼', passive: '+28 EXP/ชม.' },
        { id: 'w28', name: 'อาภรณ์จันทราลี้ลับ', price: 720000, icon: '🌙', passive: '+29 EXP/ชม.' },
        { id: 'w29', name: 'เกราะมหาเทวีพิโรธ', price: 740000, icon: '🔥', passive: '+30 EXP/ชม.' },
        { id: 'w30', name: 'ชุดเทพีผู้สร้างมิติ', price: 750000, icon: '🌌', passive: '+30 EXP/ชม.' }
    ];

// 5. หมวดฉากหลังเวทมนตร์ (Backgrounds) - 15 ชิ้น
    const bgData = [
        { id: 'bg1', name: 'ทุ่งหญ้าสงบสุข', price: 5000, passive: '+5 EXP/ชม.', css: 'linear-gradient(to top, #d299c2 0%, #fef9d7 100%)' },
        { id: 'bg2', name: 'ริมหาดสีคราม', price: 12000, passive: '+7 EXP/ชม.', css: 'linear-gradient(to top, #4facfe 0%, #00f2fe 100%)' },
        { id: 'bg3', name: 'ป่าไผ่ซามูไร', price: 25000, passive: '+9 EXP/ชม.', css: 'linear-gradient(to top, #13547a 0%, #80d0c7 100%)' },
        { id: 'bg4', name: 'หมู่บ้านลอยน้ำ', price: 45000, passive: '+11 EXP/ชม.', css: 'linear-gradient(to right, #43e97b 0%, #38f9d7 100%)' },
        { id: 'bg5', name: 'สวนลาเวนเดอร์มินิมอล', price: 75000, passive: '+13 EXP/ชม.', css: 'linear-gradient(to top, #f8049c 0%, #fdd100 100%)' },
        { id: 'bg6', name: 'อาณาจักรทราย', price: 110000, passive: '+15 EXP/ชม.', css: 'linear-gradient(to right, #f6d365 0%, #fda085 100%)' },
        { id: 'bg7', name: 'ขั้วโลกแสงเหนือ', price: 155000, passive: '+18 EXP/ชม.', css: 'linear-gradient(to right, #243949 0%, #517fa4 100%)' },
        { id: 'bg8', name: 'ถ้ำรัตนชาติ', price: 210000, passive: '+21 EXP/ชม.', css: 'linear-gradient(to right, #6a11cb 0%, #2575fc 100%)' },
        { id: 'bg9', name: 'มหานครลอยฟ้า', price: 280000, passive: '+25 EXP/ชม.', css: 'linear-gradient(to top, #96fbc4 0%, #f9f586 100%)' },
        { id: 'bg10', name: 'วังมังกรใต้ทะเล', price: 370000, passive: '+30 EXP/ชม.', css: 'linear-gradient(to right, #00c6fb 0%, #005bc5 100%)' },
        { id: 'bg11', name: 'วิหารแห่งกาลเวลา', price: 480000, passive: '+35 EXP/ชม.', css: 'linear-gradient(to top, #09203f 0%, #537895 100%)' },
        { id: 'bg12', name: 'ห้วงจักรวาลสีรุ้ง', price: 620000, passive: '+40 EXP/ชม.', css: 'linear-gradient(to top, #ff0844 0%, #ffb199 100%)' },
        { id: 'bg13', name: 'วิหารเทพโอลิมปัส', price: 800000, passive: '+45 EXP/ชม.', css: 'linear-gradient(120deg, #f093fb 0%, #f55555 100%)' },
        { id: 'bg14', name: 'บัลลังก์เทพนิรันดร์', price: 1100000, passive: '+50 EXP/ชม.', css: 'linear-gradient(to top, #fccf31 0%, #f55555 100%)' },
        { id: 'bg15', name: 'พหุจักรวาล (Infinity)', price: 1500000, passive: '+50 EXP/ชม.', css: 'radial-gradient(circle, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)' }
    ];

// 4. หมวดอาหาร (Consume) - 30 ชิ้น
    const foodData = [
        { id: 'f1', name: 'ลูกอมเปรี้ยวจี๊ด', price: 100, icon: '🍬', multiplier: 1.2, durationMin: 720, msg: 'รับบัฟ EXP *1.2 นาน 12 ชั่วโมง 🍬' },
        { id: 'f2', name: 'ช็อกโกแลตบาร์', price: 150, icon: '🍫', multiplier: 1.2, durationMin: 720, msg: 'รับบัฟ EXP *1.2 นาน 12 ชั่วโมง 🍫' },
        { id: 'f3', name: 'เพรทเซลโรยเกลือ', price: 250, icon: '🥨', multiplier: 1.3, durationMin: 720, msg: 'รับบัฟ EXP *1.3 นาน 12 ชั่วโมง 🥨' },
        { id: 'f4', name: 'คัพเค้กวนิลา', price: 350, icon: '🧁', multiplier: 1.3, durationMin: 720, msg: 'รับบัฟ EXP *1.3 นาน 12 ชั่วโมง 🧁' },
        { id: 'f5', name: 'ครัวซองต์เนยโฮมเมด', price: 500, icon: '🥐', multiplier: 1.4, durationMin: 720, msg: 'รับบัฟ EXP *1.4 นาน 12 ชั่วโมง 🥐' },
        { id: 'f6', name: 'แพนเค้กราดไซรับ', price: 700, icon: '🥞', multiplier: 1.4, durationMin: 720, msg: 'รับบัฟ EXP *1.4 นาน 12 ชั่วโมง 🥞' },
        { id: 'f7', name: 'ชีสเค้กหน้าไหม้', price: 900, icon: '🍰', multiplier: 1.5, durationMin: 720, msg: 'รับบัฟ EXP *1.5 นาน 12 ชั่วโมง 🍰' },
        { id: 'f8', name: 'น่องไก่พริกไทยดำ', price: 1200, icon: '🍗', multiplier: 1.5, durationMin: 720, msg: 'รับบัฟ EXP *1.5 นาน 12 ชั่วโมง 🍗' },
        { id: 'f9', name: 'แฮมเบอร์เกอร์ชิ้นโต', price: 1600, icon: '🍔', multiplier: 1.7, durationMin: 720, msg: 'รับบัฟ EXP *1.7 นาน 12 ชั่วโมง 🍔' },
        { id: 'f10', name: 'เฟรนช์ฟรายส์จัมโบ้', price: 2000, icon: '🍟', multiplier: 1.7, durationMin: 720, msg: 'รับบัฟ EXP *1.7 นาน 12 ชั่วโมง 🍟' },
        { id: 'f11', name: 'พิซซ่าหน้าเปปเปอร์โรนี', price: 2500, icon: '🍕', multiplier: 2.0, durationMin: 720, msg: 'รับบัฟ EXP *2.0 นาน 12 ชั่วโมง 🍕' },
        { id: 'f12', name: 'ฮอทด็อกซอสมัสตาร์ด', price: 3000, icon: '🌭', multiplier: 2.0, durationMin: 720, msg: 'รับบัฟ EXP *2.0 นาน 12 ชั่วโมง 🌭' },
        { id: 'f13', name: 'ทาโก้กุ้งสไปซี่', price: 3800, icon: '🌮', multiplier: 2.2, durationMin: 720, msg: 'รับบัฟ EXP *2.2 นาน 12 ชั่วโมง 🌮' },
        { id: 'f14', name: 'ข้าวปั้นแซลมอน', price: 4600, icon: '🍙', multiplier: 2.2, durationMin: 720, msg: 'รับบัฟ EXP *2.2 นาน 12 ชั่วโมง 🍙' },
        { id: 'f15', name: 'เซตซูชิพรีเมียม', price: 5500, icon: '🍣', multiplier: 2.5, durationMin: 720, msg: 'รับบัฟ EXP *2.5 นาน 12 ชั่วโมง 🍣' },
        { id: 'f16', name: 'ราเมนซุปเข้มข้น', price: 6500, icon: '🍜', multiplier: 2.5, durationMin: 720, msg: 'รับบัฟ EXP *2.5 นาน 12 ชั่วโมง 🍜' },
        { id: 'f17', name: 'สเต็กเนื้อวากิว', price: 7800, icon: '🥩', multiplier: 2.8, durationMin: 720, msg: 'รับบัฟ EXP *2.8 นาน 12 ชั่วโมง 🥩' },
        { id: 'f18', name: 'กุ้งมังกรอบชีส', price: 9000, icon: '🦞', multiplier: 2.8, durationMin: 720, msg: 'รับบัฟ EXP *2.8 นาน 12 ชั่วโมง 🦞' },
        { id: 'f19', name: 'ชาบูหม้อไฟเดือด', price: 10500, icon: '🥘', multiplier: 3.0, durationMin: 720, msg: 'รับบัฟ EXP *3.0 นาน 12 ชั่วโมง 🥘' },
        { id: 'f20', name: 'เบนโตะมื้อพิเศษ', price: 12500, icon: '🍱', multiplier: 3.0, durationMin: 720, msg: 'รับบัฟ EXP *3.0 นาน 12 ชั่วโมง 🍱' },
        { id: 'f21', name: 'เค้กฉลองชัยชนะ', price: 15000, icon: '🎂', multiplier: 3.5, durationMin: 720, msg: 'รับบัฟ EXP *3.5 นาน 12 ชั่วโมง 🎂' },
        { id: 'f22', name: 'น้ำผึ้งจากยอดเขา', price: 18000, icon: '🍯', multiplier: 3.5, durationMin: 720, msg: 'รับบัฟ EXP *3.5 นาน 12 ชั่วโมง 🍯' },
        { id: 'f23', name: 'แอปเปิ้ลทองคำ', price: 21500, icon: '🍎', multiplier: 4.0, durationMin: 720, msg: 'รับบัฟ EXP *4.0 นาน 12 ชั่วโมง 🍎' },
        { id: 'f24', name: 'ไวน์องุ่นศักดิ์สิทธิ์', price: 25000, icon: '🍷', multiplier: 4.0, durationMin: 720, msg: 'รับบัฟ EXP *4.0 นาน 12 ชั่วโมง 🍷' },
        { id: 'f25', name: 'สลัดผักสวนสวรรค์', price: 29000, icon: '🥗', multiplier: 4.5, durationMin: 720, msg: 'รับบัฟ EXP *4.5 นาน 12 ชั่วโมง 🥗' },
        { id: 'f26', name: 'ลูกชิ้นเทพมังกร', price: 34000, icon: '🍢', multiplier: 4.5, durationMin: 720, msg: 'รับบัฟ EXP *4.5 นาน 12 ชั่วโมง 🍢' },
        { id: 'f27', name: 'สตูว์เนื้อสัตว์อสูร', price: 40000, icon: '🍲', multiplier: 5.0, durationMin: 720, msg: 'รับบัฟ EXP *5.0 นาน 12 ชั่วโมง 🍲' },
        { id: 'f28', name: 'ยาอมฤตชุบตัว', price: 46000, icon: '🧪', multiplier: 5.0, durationMin: 720, msg: 'รับบัฟ EXP *5.0 นาน 12 ชั่วโมง 🧪' },
        { id: 'f29', name: 'ผลไม้ปีศาจลึกลับ', price: 53000, icon: '🍇', multiplier: 5.0, durationMin: 720, msg: 'รับบัฟ EXP *5.0 นาน 12 ชั่วโมง 🍇' },
        { id: 'f30', name: 'อาหารทิพย์มหาเทพ', price: 60000, icon: '🍛', multiplier: 5.0, durationMin: 720, msg: 'รับบัฟ EXP *5.0 นาน 12 ชั่วโมง 🍛' }
    ];

    const powerupData = [
        // --- โซนไอเท็มตัวช่วยเล่นเกม (quiz_helper) ---
        { id: 'p1', name: 'ดาบตัดช้อยส์ (50/50)', price: 300, icon: '🗡️', msg: 'ใช้ตอนตอบ: ตัดตัวเลือกที่ผิดออก 2 ข้อ', type: 'quiz_helper' },
        { id: 'p2', name: 'นาฬิกาหยุดเวลา', price: 500, icon: '❄️', msg: 'ใช้ตอนตอบ: แช่แข็งเวลา รับโบนัสความเร็วสูงสุดเสมอ', type: 'quiz_helper' },
        { id: 'p3', name: 'โล่ประกาศิต', price: 400, icon: '🛡️', msg: 'ใช้ตอนตอบ: ถ้าตอบผิดจะยังได้รับ 75 EXP ปลอบใจ', type: 'quiz_helper' },
        { id: 'p4', name: 'คูณสอง (Double EXP) 🚀', price: 1500, icon: '🚀', msg: 'ใช้ตอนตอบ: ถ้าตอบถูกรับ EXP x2 ในข้อนั้นทันที!', type: 'quiz_helper' },
        { id: 'p5', name: 'เพชรทวีคูณ (Triple Score) 💎', price: 4000, icon: '💎', msg: 'ใช้ตอนตอบ: ถ้าตอบถูกรับ EXP x3 ในข้อนั้นทันที!', type: 'quiz_helper' },
        { id: 'p6', name: 'บัตรผ่านทาง (Pass Key) 🎫', price: 2000, icon: '🎫', msg: 'กดใช้: ผ่านข้อนั้นทันที ได้ 150 EXP โดยไม่ต้องตอบ', type: 'quiz_helper' },
        { id: 'p7', name: 'นักล่าแต้มต่อเนื่อง 🔥', price: 800, icon: '🔥', msg: 'ติดตัว: ป้องกัน Combo หลุดเมื่อตอบผิด (ช่วยรักษาลำดับ)', type: 'quiz_helper' },

        // --- โซนแลกคะแนนเก็บ (score_exchange) ---
        { 
            id: 's1', 
            name: 'แลกคะแนน +1', 
            icon: '<span style="color: #0d6efd; font-size: 2.2rem; font-weight: bold; text-shadow: 0 0 5px rgba(13, 110, 253, 0.2);">①</span>', 
            price: 10000, 
            type: 'score_exchange', 
            amount: 1, 
            msg: 'ใช้ 10,000 EXP แลก 1 แต้ม (ความพยายามอยู่ที่ไหน คะแนนอยู่ที่นั่น!)' 
        },
        { 
            id: 's5', 
            name: 'แลกคะแนน +5', 
            icon: '<span style="color: #0d6efd; font-size: 2.2rem; font-weight: bold; text-shadow: 0 0 5px rgba(13, 110, 253, 0.2);">⑤</span>', 
            price: 45000, 
            type: 'score_exchange', 
            amount: 5, 
            msg: 'แพ็กเกจขยัน! ประหยัดทันที 5,000 EXP' 
        },
        { 
            id: 's10', 
            name: 'แลกคะแนน +10', 
            icon: '<span style="color: #0d6efd; font-size: 2.2rem; font-weight: bold; text-shadow: 0 0 5px rgba(13, 110, 253, 0.2);">⑩</span>', 
            price: 85000, 
            type: 'score_exchange', 
            amount: 10, 
            msg: 'แพ็กเกจสุดคุ้ม! ประหยัดมหาศาล 15,000 EXP' 
        },
        { 
            id: 's20', 
            name: 'แลกคะแนน +20', 
            icon: '<span style="color: #0d6efd; font-size: 2.2rem; font-weight: bold; text-shadow: 0 0 5px rgba(13, 110, 253, 0.2);">⑳</span>', 
            price: 150000, 
            type: 'score_exchange', 
            amount: 20, 
            msg: 'แพ็กเกจจอมเทพ! ประหยัดสุดขีด 50,000 EXP (สำหรับสุดยอดนักฟาร์ม)' 
        }
    ];

    function makeDraggable(elmnt) {
        var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        elmnt.onmousedown = dragMouseDown;
        elmnt.ontouchstart = dragMouseDown;

        function dragMouseDown(e) {
            if (e.target.tagName.toLowerCase() === 'button' || e.target.closest('.pet-menu') || e.target.closest('button')) return;
            e = e || window.event;
            if (e.type === 'touchstart') { pos3 = e.touches[0].clientX; pos4 = e.touches[0].clientY; } 
            else { e.preventDefault(); pos3 = e.clientX; pos4 = e.clientY; }
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
            document.ontouchend = closeDragElement;
            document.ontouchmove = elementDrag;
        }

        function elementDrag(e) {
            e = e || window.event; let clientX, clientY;
            if (e.type === 'touchmove') { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; } 
            else { e.preventDefault(); clientX = e.clientX; clientY = e.clientY; }
            pos1 = pos3 - clientX; pos2 = pos4 - clientY; pos3 = clientX; pos4 = clientY;
            elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
            elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
            elmnt.style.bottom = "auto"; elmnt.style.right = "auto";
        }

        function closeDragElement() {
            document.onmouseup = null; document.onmousemove = null; document.ontouchend = null; document.ontouchmove = null;
        }
    }

    function togglePetMenu() {
        const menu = document.getElementById('petMenu');
        menu.classList.toggle('show');
        setTimeout(() => { if (menu.classList.contains('show')) menu.classList.remove('show'); }, 4000);
    }

    // 🟢 อัปเกรด: ระบบ Routing ด่วนพิเศษสำหรับผู้ปกครอง
    document.addEventListener('DOMContentLoaded', async function() {
        const urlParams = new URLSearchParams(window.location.search);
        const page = urlParams.get('page');
        const token = urlParams.get('token');

        // ⚡ จุดแก้: ถ้าเป็นหน้าผู้ปกครอง ให้สั่งซ่อนทุกอย่างทันทีแบบ "เงียบกริบ"
        if (page === 'parent' && token) {
            if(document.querySelector('.header-box')) document.querySelector('.header-box').classList.add('hidden');
            document.getElementById('btnLock').classList.add('hidden');
            document.getElementById('student-search-view').classList.add('hidden');
            document.getElementById('parent-view').classList.remove('hidden');
        }

        // เชื่อมต่อฐานข้อมูล (Supabase)
        await initSupabaseAsync();

        // 👨‍👩‍👧‍👦 กรณีหน้าผู้ปกครอง: สั่งโหลดข้อมูลและจบการทำงานส่วนนี้ทันที
        if (page === 'parent' && token) {
            loadParentDashboard(token);
            return; 
        }

        // 2. เช็คสถานะการเข้าสู่ระบบปกติ (สำหรับครูและนักเรียน)
        if (localStorage.getItem('teacherLoggedIn') === 'true') {
            document.getElementById('btnLock').classList.add('hidden');
            document.getElementById('btnTeacherConfig').classList.remove('hidden'); 
            document.getElementById('btnLogout').classList.remove('hidden');
            document.getElementById('student-search-view').classList.add('hidden');
            document.getElementById('teacher-view').classList.remove('hidden');
            document.getElementById('view-rooms').classList.remove('hidden');
            loadAllData();
        }
        else if (localStorage.getItem('studentId')) {
            loadFullDashboard(localStorage.getItem('studentId'), true);
        }
    });

window.sendPushNotification = function(title, message) {
    // ใช้ Proxy ตัวเดิมที่มึงทำไว้ แต่แก้เรื่อง CORS ให้แล้ว
    google.script.run.sendOneSignalNotification(title, message);
};

// =====================================
// 🇹🇭 ฟังก์ชันแปลงวันที่เป็นภาษาไทย (พ.ศ.)
// =====================================
function formatThaiDate(dateStr) {
    if (!dateStr) return "-";
    const months = ["", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    // รองรับทั้ง 2024-01-31 และ 2024/01/31
    const parts = dateStr.includes('-') ? dateStr.split('-') : dateStr.split('/');
    if (parts.length < 3) return dateStr;
    const y = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    const d = parseInt(parts[2]);
    return `${d} ${months[m]} ${y + 543}`;
}

// =====================================
// 👨‍👩‍👧‍👦 PARENT DASHBOARD LOGIC (V.2 ความเร็วสูง + วันที่ไทย)
// =====================================
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

        // 🟢 โชว์ปุ่ม Chat Head ที่มุมจอ และเก็บ ID เด็กไว้ส่งข้อมูล
        const chatHead = document.getElementById('parentChatHead');
        if(chatHead) {
            chatHead.classList.remove('hidden');
            chatHead.dataset.studentId = student.id; // เก็บ ID ไว้ที่ตัวปุ่ม
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
                <button class="btn btn-outline-primary w-100 rounded-pill fw-bold py-2 mb-3" onclick="loadParentDashboard('${token}')">
                    <i class="bi bi-arrow-clockwise"></i> อัปเดตข้อมูลล่าสุด
                </button>
            </div>
        `;
    } catch (e) {
        content.innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`;
    }
};

// =========================================================
// 👨‍👩‍👧‍👦 SYSTEM: PARENT COMMUNICATION HUB (MODAL VERSION)
// =========================================================

// 🔘 ฟังก์ชันเชื่อมต่อ: เมื่อกดที่ปุ่มวงกลม (Chat Head)
window.openCommunicationHubFromHead = function() {
    const studentId = document.getElementById('parentChatHead').dataset.studentId;
    if(studentId) {
        window.openCommunicationHub(studentId);
    } else {
        console.error("Student ID not found in Chat Head");
    }
};
// 1. ฟังก์ชันเปิดหน้าต่างศูนย์การสื่อสาร
// 1. ฟังก์ชันเปิดหน้าต่างศูนย์การสื่อสาร (เวอร์ชันอัจฉริยะ Idea 1, 3, 4)
window.openCommunicationHub = function(studentId) {
    // ดึงข้อมูลที่เคยกรอกไว้ล่าสุดจากเครื่อง
    const lastContact = localStorage.getItem('parentLastContact') || '';
    const lastType = localStorage.getItem('parentLastContactType') || 'phone';

    Swal.fire({
        title: '<div class="fw-bold text-danger"><i class="bi bi-chat-heart"></i> ศูนย์การสื่อสาร</div>',
        html: `
            <div class="text-start mt-3">
                <div class="d-flex gap-2 mb-4">
                    <button class="btn btn-sm btn-outline-danger flex-grow-1 active" id="btnTabStudent" onclick="switchCommTab('student')">ส่งใจให้ลูก</button>
                    <button class="btn btn-sm btn-outline-primary flex-grow-1" id="btnTabTeacher" onclick="switchCommTab('teacher')">ปรึกษาคุณครู</button>
                </div>

                <div id="sectionToStudent">
                    <label class="small fw-bold text-muted mb-2">เลือกสติกเกอร์ส่งพลังใจ:</label>
                    <div class="d-flex gap-2 mb-3 overflow-auto pb-2">
                        <button class="btn btn-outline-light border shadow-sm p-2" onclick="selectCommSticker('🌟','เก่งมาก!')">🌟</button>
                        <button class="btn btn-outline-light border shadow-sm p-2" onclick="selectCommSticker('❤️','รักนะ')">❤️</button>
                        <button class="btn btn-outline-light border shadow-sm p-2" onclick="selectCommSticker('✌️','สู้ๆ นะ')">✌️</button>
                        <button class="btn btn-outline-light border shadow-sm p-2" onclick="selectCommSticker('🏆','สุดยอด')">🏆</button>
                    </div>
                    <textarea id="hubMsgToStudent" class="form-control mb-3" rows="2" placeholder="พิมพ์ข้อความให้กำลังใจลูกที่นี่..."></textarea>
                    <button class="btn btn-danger w-100 fw-bold rounded-pill shadow" onclick="processSendToStudent('${studentId}')">ส่งพลังใจให้ลูก</button>
                </div>

                <div id="sectionToTeacher" class="hidden">
                    <label class="small fw-bold text-muted mb-2">เรื่องที่ต้องการปรึกษาคุณครู:</label>
                    <textarea id="hubMsgToTeacher" class="form-control mb-3" rows="2" placeholder="เช่น ขอปรึกษาเรื่องพฤติกรรม..."></textarea>
                    
                    <label class="small fw-bold text-muted mb-2 d-block">ข้อมูลติดต่อกลับของคุณ:</label>
                    <div class="btn-group w-100 mb-2" role="group">
                        <input type="radio" class="btn-check" name="contactType" id="typePhone" value="phone" ${lastType === 'phone' ? 'checked' : ''} onchange="updateContactUI()">
                        <label class="btn btn-outline-primary btn-sm" for="typePhone"><i class="bi bi-telephone"></i> เบอร์โทร</label>
                        <input type="radio" class="btn-check" name="contactType" id="typeLine" value="line" ${lastType === 'line' ? 'checked' : ''} onchange="updateContactUI()">
                        <label class="btn btn-outline-success btn-sm" for="typeLine"><i class="bi bi-line"></i> LINE ID</label>
                    </div>

                    <input type="text" id="hubParentContact" class="form-control mb-1 fw-bold text-center" 
                           value="${lastContact}" placeholder="กรอกข้อมูลติดต่อ">
                    
                    <div id="contactPreview" class="small fw-bold mb-4 text-center" style="min-height: 20px;"></div>

                    <button class="btn btn-primary w-100 fw-bold rounded-pill shadow" onclick="processSendToTeacher('${studentId}')">
                        <i class="bi bi-telephone-outbound"></i> ส่งข้อมูลให้ครูติดต่อกลับ
                    </button>
                </div>
            </div>
        `,
        showConfirmButton: false,
        showCloseButton: true,
        customClass: { popup: 'rounded-4' },
        didOpen: () => {
            // ผูก Event สำหรับระบบ Auto Format และ Preview
            const contactInput = document.getElementById('hubParentContact');
            contactInput.addEventListener('input', updateContactUI);
            updateContactUI(); // เรียกครั้งแรกเพื่อโชว์ข้อมูลเดิม (ถ้ามี)
        }
    });
};

// 2. ฟังก์ชันสลับ Tab ภายในหน้าต่าง Popup
window.switchCommTab = (tab) => {
    const sBtn = document.getElementById('btnTabStudent');
    const tBtn = document.getElementById('btnTabTeacher');
    const sSec = document.getElementById('sectionToStudent');
    const tSec = document.getElementById('sectionToTeacher');

    if(tab === 'student') {
        sBtn.classList.add('active'); tBtn.classList.remove('active');
        sSec.classList.remove('hidden'); tSec.classList.add('hidden');
    } else {
        tBtn.classList.add('active'); sBtn.classList.remove('active');
        tSec.classList.remove('hidden'); sSec.classList.add('hidden');
    }
};

// 3. ฟังก์ชันเลือกสติกเกอร์
window.selectCommSticker = (icon, text) => {
    const input = document.getElementById('hubMsgToStudent');
    if(input) input.value = icon + " " + text;
};

// 4. ฟังก์ชันส่งหาลูก (เข้า DM เด็ก)
window.processSendToStudent = async function(id) {
    const msg = document.getElementById('hubMsgToStudent').value.trim();
    if(!msg) return Swal.showValidationMessage('กรุณาพิมพ์ข้อความด้วยครับ');
    
    Swal.fire({ title: 'กำลังส่งพลังใจ...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
    
    // บันทึกลงฐานข้อมูลสื่อสาร
    await supabaseClient.from('parent_communications').insert([{ student_id: id, target: 'student', type: 'praise', message: msg }]);
    
    // สร้างรูปแบบข้อความสำหรับเด้งหน้าจอเด็ก
    const displayMsg = `
        <div style="border: 2px solid #ff9a9e; background: #fff5f5; padding: 15px; border-radius: 20px; text-align: center;">
            <h5 style="color: #ff0844; font-weight: bold;"><i class="bi bi-heart-fill"></i> ข้อความจากผู้ปกครอง</h5>
            <p style="margin-bottom: 0; font-size: 1.1rem; color: #333; font-weight: 500;">${msg}</p>
        </div>`;
    
    // ยิงเข้า Google Script Proxy เพื่อส่ง DM
    google.script.run.withSuccessHandler(() => {
        Swal.fire({ icon: 'success', title: 'ส่งเรียบร้อย!', text: 'ลูกจะเห็นข้อความนี้ทันทีที่เข้าสู่ระบบครับ', timer: 2000, showConfirmButton: false });
    }).sendDMToStudent(id, displayMsg);
};

// 5. ฟังก์ชันส่งหาครู (เก็บเข้า DB รอครูเปิดดู)
// ⚡ ระบบอัจฉริยะ: จัดการ Format เบอร์โทร และ Preview LINE ลิงก์
window.updateContactUI = function() {
    const input = document.getElementById('hubParentContact');
    const preview = document.getElementById('contactPreview');
    const type = document.querySelector('input[name="contactType"]:checked').value;
    let value = input.value;

    if (type === 'phone') {
        input.type = 'tel';
        input.placeholder = '0xx-xxx-xxxx';
        // Auto Format: 0812345678 -> 081-234-5678
        let numbers = value.replace(/\D/g, ''); // เอาเฉพาะตัวเลข
        if (numbers.length > 10) numbers = numbers.substring(0, 10);
        
        let formatted = '';
        if (numbers.length > 0) formatted += numbers.substring(0, 3);
        if (numbers.length > 3) formatted += '-' + numbers.substring(3, 6);
        if (numbers.length > 6) formatted += '-' + numbers.substring(6, 10);
        
        input.value = formatted;
        preview.innerHTML = formatted ? `<span class="text-primary"><i class="bi bi-telephone-fill"></i> ครูจะโทรหาที่เบอร์นี้</span>` : '';
    } else {
        input.type = 'text';
        input.placeholder = 'กรอก LINE ID ของท่าน';
        // Preview LINE Link
        let cleanId = value.trim();
        if (cleanId) {
            preview.innerHTML = `<span class="text-success"><i class="bi bi-line"></i> ลิงก์ของท่าน: line.me/ti/p/~${cleanId}</span>`;
        } else {
            preview.innerHTML = '';
        }
    }
};

// --- [วางทับฟังก์ชันเดิม] ---
window.processSendToTeacher = async function(id) {
    const msg = document.getElementById('hubMsgToTeacher').value.trim();
    const contact = document.getElementById('hubParentContact').value.trim();
    const type = document.querySelector('input[name="contactType"]:checked').value;
    
    if(!msg || !contact) return Swal.fire('ข้อมูลไม่ครบ', 'กรุณากรอกเรื่องที่ปรึกษาและข้อมูลติดต่อกลับครับ', 'warning');
    
    // ตรวจสอบความถูกต้องเบื้องต้นสำหรับเบอร์โทร
    if(type === 'phone' && contact.replace(/\D/g, '').length < 10) {
        return Swal.fire('เบอร์โทรไม่ครบ', 'กรุณากรอกเบอร์โทรศัพท์ให้ครบ 10 หลักครับ', 'warning');
    }

    Swal.fire({ title: 'กำลังส่งข้อมูล...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
    
    // บันทึกลงเครื่องเพื่อใช้ครั้งหน้า (Idea 2)
    localStorage.setItem('parentLastContact', contact);
    localStorage.setItem('parentLastContactType', type);

    // ส่งข้อมูลเข้า Supabase (เก็บข้อมูลแบบมีระบุประเภทเพื่อให้ครูกดใช้ง่าย)
    const finalContact = type === 'phone' ? contact : `LINE:${contact}`;
    const { error } = await supabaseClient.from('parent_communications').insert([{ 
        student_id: id, target: 'teacher', type: 'consult', message: msg, parent_contact: finalContact 
    }]);

    if(error) {
        Swal.fire('ผิดพลาด', error.message, 'error');
    } else {
        Swal.fire({ icon: 'success', title: 'ส่งสำเร็จ!', text: 'ครูได้รับการแจ้งเตือนแล้ว และจะติดต่อกลับหาท่านครับ', timer: 3000, showConfirmButton: false });
    }
};
