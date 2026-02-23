การอัปเดตสเปก

อัปเดตใน 06-application.md แล้ว ทั้ง stack, endpoints, data source, runbook และ flow ใหม่
วิธีรัน (Dev)

1. API server
cd iot-layer/ui-application/server
npm install
npx prisma generate
npm run prisma:migrate
npm run dev

2. UI
cd iot-layer/ui-application
npm install
npm run dev

เข้าจากเครื่องอื่นในวง LAN (ตอนรันแบบ local dev):
- UI: `npm run dev -- --host 0.0.0.0 --port 5173`
- API: ตั้ง `HOST=0.0.0.0` ก่อนรัน `npm run dev` ที่ `ui-application/server`

หมายเหตุสำคัญ

API นี้เป็นตัวกลางที่อ่านข้อมูลจากไฟล์ใน iot-layer แล้ว cache ด้วย ORM
- ถ้าคุณต้องการให้ backend ต่อกับ MQTT/HTTP จริง ๆ หรือควบคุม service (start/stop) แจ้งได้เลย - - ผมจะเพิ่ม endpoint ให้

ถ้าต้องการต่อไป ผมแนะนำ
1. ระบุว่าจะให้ API ต่อกับ service แบบ runtime จริง (เช่น MQTT, systemd, docker) หรือใช้ไฟล์อย่างเดียว
2. เพิ่ม auth/role สำหรับ Operator/Technician ตามสเปก
