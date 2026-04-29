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

    // 🟢 อัปเดต: รอให้โหลด Supabase Client เสร็จก่อน ค่อยดึงข้อมูลมาแสดงผล
    document.addEventListener('DOMContentLoaded', async function() {
        // 1. เชื่อมต่อฐานข้อมูล (ขอ Key รอบเดียวจบ)
        await initSupabaseAsync();

        // --- [เพิ่มส่วนตรวจสอบลิงก์ผู้ปกครอง] ---
        const urlParams = new URLSearchParams(window.location.search);
        const page = urlParams.get('page');
        const token = urlParams.get('token');

        if (page === 'parent' && token) {
            // ซ่อนหน้าจออื่นและแสดงหน้าผู้ปกครองทันที
            if(document.querySelector('.header-box')) document.querySelector('.header-box').classList.add('hidden'); // <-- เพิ่มบรรทัดนี้
            document.getElementById('btnLock').classList.add('hidden');
            document.getElementById('student-search-view').classList.add('hidden');
            document.getElementById('parent-view').classList.remove('hidden');
            
            // สั่งโหลดแดชบอร์ดผู้ปกครอง
            if (typeof loadParentDashboard === 'function') {
                loadParentDashboard(token);
            } else {
                console.error("Function loadParentDashboard not found.");
            }
            return; // จบการทำงานที่นี่ (ไม่ไปเช็ค Login ครู/นักเรียนต่อ)
        }
        // ------------------------------------

        // 2. เช็คสถานะการเข้าสู่ระบบปกติ (สำหรับครูและนักเรียน)
        if (localStorage.getItem('teacherLoggedIn') === 'true') {
            document.getElementById('btnLock').classList.add('hidden');
            document.getElementById('btnTeacherConfig').classList.remove('hidden'); 
            document.getElementById('btnLogout').classList.remove('hidden');
            document.getElementById('student-search-view').classList.add('hidden');
            document.getElementById('teacher-view').classList.remove('hidden');
            document.getElementById('view-rooms').classList.remove('hidden');
            
            Toast.fire({ icon: 'info', title: 'กู้คืนเซสชันครู...' });
            
            loadAllData();
        }
        else if (localStorage.getItem('studentId')) {
            let savedStudentId = localStorage.getItem('studentId');
            document.getElementById('btnLock').classList.add('hidden');
            document.getElementById('student-search-view').classList.add('hidden');
            
            Toast.fire({ icon: 'info', title: 'เข้าสู่ระบบอัตโนมัติ...' });
            
            loadFullDashboard(savedStudentId, true);
        }
    });

window.sendPushNotification = function(title, message) {
    // ใช้ Proxy ตัวเดิมที่มึงทำไว้ แต่แก้เรื่อง CORS ให้แล้ว
    google.script.run.sendOneSignalNotification(title, message);
};

// =====================================
// 👨‍👩‍👧‍👦 PARENT DASHBOARD LOGIC (เพิ่มใหม่)
// =====================================
window.loadParentDashboard = async function(token) {
    const content = document.getElementById('parent-content');
    if (!supabaseClient) await initSupabaseAsync();

    try {
        // 1. ดึงข้อมูลนักเรียนจาก Token
        let { data: student, error } = await supabaseClient
            .from('students')
            .select('*')
            .eq('parent_token', token)
            .single();

        if (error || !student) {
            content.innerHTML = `
                <div class="alert alert-danger rounded-4 py-4 m-2">
                    <i class="bi bi-exclamation-octagon fs-1 d-block mb-3"></i>
                    <h5 class="fw-bold">ไม่พบข้อมูลนักเรียน</h5>
                    <p class="mb-0">ลิงก์อาจไม่ถูกต้อง หรือถูกยกเลิกโดยคุณครูแล้วครับ</p>
                    <button class="btn btn-secondary mt-3 rounded-pill" onclick="window.location.href=window.location.pathname">กลับหน้าหลัก</button>
                </div>`;
            return;
        }

        // 2. แสดงผลหน้า Dashboard ผู้ปกครอง
        content.innerHTML = `
            <div class="text-center mb-4 pt-2">
                <div class="position-relative d-inline-block mb-3">
                    <img src="https://api.dicebear.com/9.x/adventurer/svg?seed=${student.avatar}" 
                         style="width: 110px; height: 110px; border-radius: 50%; border: 5px solid #0d6efd; background:#fff;" class="shadow">
                    <div class="position-absolute bottom-0 end-0 bg-success text-white rounded-circle p-1 px-2 small shadow border border-white">
                        Online
                    </div>
                </div>
                <h3 class="fw-bold text-dark mb-1">${student.name}</h3>
                <p class="text-muted mb-3"><i class="bi bi-geo-alt-fill text-danger"></i> ระดับชั้น/ห้อง: <span class="badge bg-primary">${student.room}</span></p>
                <hr class="mx-5">
            </div>
            
            <div class="row g-3 px-2">
                <div class="col-6">
                    <div class="p-3 bg-white rounded-4 border-0 shadow-sm">
                        <i class="bi bi-award-fill text-primary fs-3 d-block mb-1"></i>
                        <small class="text-muted d-block fw-bold">คะแนนรวม</small>
                        <h2 class="fw-bold text-dark mb-0">${student.accumulated_score || 0}</h2>
                    </div>
                </div>
                <div class="col-6">
                    <div class="p-3 bg-white rounded-4 border-0 shadow-sm">
                        <i class="bi bi-stars text-warning fs-3 d-block mb-1"></i>
                        <small class="text-muted d-block fw-bold">แต้ม EXP</small>
                        <h2 class="fw-bold text-dark mb-0">${Math.floor(student.exp || 0).toLocaleString()}</h2>
                    </div>
                </div>
            </div>

            <div class="mt-4 mx-2 p-3 bg-primary bg-opacity-10 rounded-4 text-start border border-primary border-opacity-10 shadow-sm">
                <h6 class="fw-bold text-primary mb-2"><i class="bi bi-shield-check"></i> ระบบติดตามความเคลื่อนไหว</h6>
                <div class="small text-dark opacity-75">
                    <p class="mb-1"><i class="bi bi-check2-circle text-success"></i> ข้อมูลเชื่อมต่อกับระบบโรงเรียนแบบ Real-time</p>
                    <p class="mb-0"><i class="bi bi-check2-circle text-success"></i> คุณครูสามารถอัปเดตคะแนนและเช็คชื่อได้ทันที</p>
                </div>
            </div>
            
            <div class="d-grid gap-2 mt-4 px-2 pb-3">
                <button class="btn btn-primary btn-lg rounded-pill fw-bold shadow" onclick="window.location.reload()">
                    <i class="bi bi-arrow-clockwise"></i> รีเฟรชข้อมูลล่าสุด
                </button>
            </div>
        `;
    } catch (e) {
        content.innerHTML = `<div class="alert alert-danger m-3">เกิดข้อผิดพลาดในการโหลดข้อมูล: ${e.message}</div>`;
    }
};
