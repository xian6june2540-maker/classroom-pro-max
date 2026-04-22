// api/main.js - New Unified Backend for Vercel
export default async function handler(req, res) {
    // 1. ตั้งค่าพื้นฐานสำหรับ CORS และความปลอดภัย
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { action, params } = req.body || {};
    const { SUPABASE_URL, SUPABASE_KEY } = process.env;

    // --- ตัวช่วยคุยกับ Supabase REST API ---
    const sb = async (path, method = 'GET', body = null) => {
        const options = {
            method,
            headers: { 
                'apikey': SUPABASE_KEY, 
                'Authorization': `Bearer ${SUPABASE_KEY}`, 
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
        };
        if (body) options.body = JSON.stringify(body);
        const response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${path}`, options);
        const text = await response.text();
        return text ? JSON.parse(text) : null;
    };

    // --- ตัวช่วยคุยกับ Gemini AI ---
    const callGemini = async (apiKey, payload) => {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return await response.json();
    };

    try {
        // --- [ Action 1: ระบบ Config & Security ] ---
        if (action === "getTeacherConfigMasked") {
            const data = await sb('system_config?select=*');
            const config = {};
            data.forEach(item => config[item.key] = item.value);
            return res.json({ success: true, data: config });
        }

        if (action === "verifyPIN") {
            const [inputPin] = params;
            const data = await sb(`system_config?key=eq.TEACHER_PIN&select=value`);
            if (data && data[0] && inputPin === data[0].value) return res.json({ success: true, data: 'BYPASS_OTP' });
            return res.json({ success: true, data: 'INVALID_PIN' });
        }

        if (action === "updateSingleConfigItem") {
            const [key, value, oldPin] = params;
            const pinData = await sb(`system_config?key=eq.TEACHER_PIN&select=value`);
            if (oldPin !== pinData[0].value) return res.json({ success: false, message: 'รหัส PIN ยืนยันไม่ถูกต้อง!' });
            await sb(`system_config?key=eq.${key}`, 'PATCH', { value: value.trim() });
            return res.json({ success: true, message: 'อัปเดตข้อมูลสำเร็จแล้ว!' });
        }

        // --- [ Action 2: ระบบ AI (ตรวจงาน/สร้างบอส/สแกนเด็ก) ] ---
        if (action === "analyzeWorkWithAi") {
            const [screenshotUrl, taskTitle, maxScore, isGroup] = params;
            const configData = await sb('system_config?select=*');
            const apiKey = configData.find(c => c.key === 'GEMINI_API_KEY')?.value;
            
            // ดึงรูปภาพเป็น base64
            const imgRes = await fetch(screenshotUrl);
            const buffer = await imgRes.arrayBuffer();
            const base64Img = Buffer.from(buffer).toString('base64');
            
            const payload = {
                systemInstruction: { parts: [{ text: `คุณคือผู้ช่วยครูตรวจงานศิลปะและคอมพิวเตอร์ สรุปผลเป็น JSON {summary, feedback, suggestedScore}` }] },
                contents: [{ role: "user", parts: [
                    { inlineData: { mimeType: "image/jpeg", data: base64Img } },
                    { text: `ตรวจงานหัวข้อ: "${taskTitle}" คะแนนเต็ม ${maxScore} (${isGroup ? 'งานกลุ่ม' : 'งานเดี่ยว'})` }
                ]}]
            };
            const result = await callGemini(apiKey, payload);
            const aiText = result.candidates[0].content.parts[0].text;
            return res.json({ success: true, data: JSON.parse(aiText.match(/\{.*\}/s)[0]) });
        }

        // --- [ Action 3: ระบบ RPG Boss & Live Quiz ] ---
        if (action === "generateBossWithAI") {
            const [roomName, topic, numQuestions, bossHp] = params;
            const configData = await sb('system_config?select=*');
            const apiKey = configData.find(c => c.key === 'GEMINI_API_KEY')?.value;

            const payload = {
                contents: [{ role: 'user', parts: [{ text: `สร้างบอสและคำถามควิซ ${numQuestions} ข้อ หัวข้อ ${topic} เป็น JSON {bossName, bossIcon, questions:[{q, options, answer}]}` }] }],
                generationConfig: { responseMimeType: "application/json" }
            };
            const result = await callGemini(apiKey, payload);
            const aiData = JSON.parse(result.candidates[0].content.parts[0].text);
            
            await sb('boss_quizzes', 'POST', {
                room_name: roomName, topic, boss_name: `${aiData.bossIcon}|${aiData.bossName}`,
                boss_hp: bossHp, boss_max_hp: bossHp, questions_json: aiData.questions, status: 'active'
            });
            return res.json({ success: true, message: `อัญเชิญบอส ${aiData.bossName} สำเร็จ!` });
        }

        // --- [ Action 4: ระบบโอน EXP & ของขวัญ (Gift Transfer) ] ---
        if (action === "handleGiftTransfer") {
            const { senderId, receiverId, type, itemId, itemName, itemIcon, amount } = params[0];
            const sender = await sb(`students?id=eq.${encodeURIComponent(senderId)}&select=*`);
            const receiver = await sb(`students?id=eq.${encodeURIComponent(receiverId)}&select=*`);

            let senderUpdate = {}; let receiverUpdate = {};
            if (type === 'item') {
                let inv = sender[0].inventory || [];
                const idx = inv.indexOf(itemId);
                inv.splice(idx, 1);
                senderUpdate.inventory = inv;
                receiverUpdate.inventory = [...(receiver[0].inventory || []), itemId];
            } else if (type === 'exp') {
                senderUpdate.exp = (sender[0].exp || 0) - amount;
                receiverUpdate.exp = (receiver[0].exp || 0) + amount;
            }

            await sb(`students?id=eq.${encodeURIComponent(senderId)}`, 'PATCH', senderUpdate);
            await sb(`students?id=eq.${encodeURIComponent(receiverId)}`, 'PATCH', receiverUpdate);
            return res.json({ success: true, message: "ส่งของขวัญเรียบร้อย!" });
        }

        // --- [ Action 5: ระบบ Post-it Board (เขียนทับระบบ GAS) ] ---
        if (action === "getPostIts") {
            const [room] = params;
            const data = await sb(`post_its?room_name=eq.${encodeURIComponent(room)}&order=timestamp.asc`);
            return res.json({ success: true, data: data || [] });
        }

        if (action === "addPostIt") {
            const [room, text, style, avatar] = params;
            const newItem = { id: `PI-${Date.now()}`, room_name: room, text, style, avatar, timestamp: Date.now() };
            await sb('post_its', 'POST', newItem);
            const data = await sb(`post_its?room_name=eq.${encodeURIComponent(room)}&order=timestamp.asc`);
            return res.json({ success: true, data: data });
        }

        if (action === "clearBoard") {
            const [room] = params;
            await sb(`post_its?room_name=eq.${encodeURIComponent(room)}`, 'DELETE');
            return res.json({ success: true, data: [] });
        }

        // --- [ Action 6: การแจ้งเตือน & อื่นๆ ] ---
        if (action === "sendOneSignalNotification") {
            const [title, message] = params;
            const response = await fetch("https://onesignal.com/api/v1/notifications", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": "Basic os_v2_app_l3cibhqmmvfnpn4nrgrs4uphvaem22hdepsu6rv5u4xprq4gofcgcwiaamztiwxp2gnoivqff7utidflwc2dfrln7rxnuwlgktkyg7q" },
                body: JSON.stringify({
                    app_id: "5ec4809e-0c65-4ad7-b78d-89a32e51e7a8",
                    included_segments: ["Total Subscriptions"],
                    headings: { en: title },
                    contents: { en: message }
                })
            });
            return res.json({ success: true, data: await response.text() });
        }

        res.json({ success: false, error: `Action "${action}" not implemented.` });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
}
