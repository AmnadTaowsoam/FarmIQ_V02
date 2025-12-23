# สถานะ Seed Files

## ✅ Seed Files พร้อมใช้งานแล้ว

ทุก service มี seed.ts ที่สร้างข้อมูล 30 records แล้ว:

### Services ที่มี Seed Files:
1. ✅ **cloud-identity-access** - 30 users + 6 roles
2. ✅ **cloud-tenant-registry** - 2 tenants, 4 farms, 8 barns, 8 batches, 30 devices, 8 stations
3. ✅ **cloud-ingestion** - 30 cloud dedupe records
4. ✅ **cloud-telemetry-service** - 30 raw + 30 aggregate records
5. ✅ **cloud-api-gateway-bff** - 30 example records
6. ✅ **cloud-config-rules-service** - 30 threshold rules + 30 target curves
7. ✅ **cloud-audit-log-service** - 30 audit events
8. ✅ **cloud-notification-service** - 30 notifications (ใหม่)
9. ✅ **cloud-feed-service** - 30 feed records (ใหม่)
10. ✅ **cloud-barn-records-service** - 30 barn records (ใหม่)
11. ✅ **cloud-weighvision-readmodel** - 30 sessions (ใหม่)
12. ✅ **cloud-reporting-export-service** - 30 report jobs (ใหม่)
13. ✅ **cloud-analytics-service** - 30 analytics results (Python)

## 📋 สิ่งที่ต้องทำก่อนรัน Seed

### 1. Migrate Database (ถ้ายังไม่ได้ทำ)

สำหรับ services ที่มี Prisma schema ต้อง migrate database ก่อน:

```powershell
cd D:\FarmIQ\FarmIQ_V02\cloud-layer

# Migrate ทีละ service (ถ้ามี migrations folder)
docker compose -f docker-compose.dev.yml exec cloud-identity-access npx prisma migrate deploy
docker compose -f docker-compose.dev.yml exec cloud-tenant-registry npx prisma migrate deploy
docker compose -f docker-compose.dev.yml exec cloud-ingestion npx prisma migrate deploy
docker compose -f docker-compose.dev.yml exec cloud-telemetry-service npx prisma migrate deploy
docker compose -f docker-compose.dev.yml exec cloud-api-gateway-bff npx prisma migrate deploy
docker compose -f docker-compose.dev.yml exec cloud-config-rules-service npx prisma migrate deploy
docker compose -f docker-compose.dev.yml exec cloud-audit-log-service npx prisma migrate deploy
docker compose -f docker-compose.dev.yml exec cloud-notification-service npx prisma migrate deploy
docker compose -f docker-compose.dev.yml exec cloud-feed-service npx prisma migrate deploy
docker compose -f docker-compose.dev.yml exec cloud-barn-records-service npx prisma migrate deploy
docker compose -f docker-compose.dev.yml exec cloud-weighvision-readmodel npx prisma migrate deploy
docker compose -f docker-compose.dev.yml exec cloud-reporting-export-service npx prisma migrate deploy

# หรือใช้ db push (ถ้าไม่มี migrations)
docker compose -f docker-compose.dev.yml exec cloud-notification-service npx prisma db push
docker compose -f docker-compose.dev.yml exec cloud-feed-service npx prisma db push
docker compose -f docker-compose.dev.yml exec cloud-barn-records-service npx prisma db push
docker compose -f docker-compose.dev.yml exec cloud-weighvision-readmodel npx prisma db push
docker compose -f docker-compose.dev.yml exec cloud-reporting-export-service npx prisma db push
```

### 2. Generate Prisma Client

```powershell
docker compose -f docker-compose.dev.yml exec cloud-notification-service npx prisma generate
docker compose -f docker-compose.dev.yml exec cloud-feed-service npx prisma generate
docker compose -f docker-compose.dev.yml exec cloud-barn-records-service npx prisma generate
docker compose -f docker-compose.dev.yml exec cloud-weighvision-readmodel npx prisma generate
docker compose -f docker-compose.dev.yml exec cloud-reporting-export-service npx prisma generate
```

## 🚀 วิธีรัน Seed

### วิธีที่ 1: รันทีละ Service

```powershell
cd D:\FarmIQ\FarmIQ_V02\cloud-layer

# ตั้งค่า SEED_COUNT (default: 30)
$env:SEED_COUNT = "30"

# รัน seed
docker compose -f docker-compose.dev.yml exec cloud-notification-service sh -c "SEED_COUNT=30 npm run seed"
docker compose -f docker-compose.dev.yml exec cloud-feed-service sh -c "SEED_COUNT=30 npm run seed"
docker compose -f docker-compose.dev.yml exec cloud-barn-records-service sh -c "SEED_COUNT=30 npm run seed"
docker compose -f docker-compose.dev.yml exec cloud-weighvision-readmodel sh -c "SEED_COUNT=30 npm run seed"
docker compose -f docker-compose.dev.yml exec cloud-reporting-export-service sh -c "SEED_COUNT=30 npm run seed"
```

### วิธีที่ 2: ใช้ Script ที่มีอยู่

```powershell
cd D:\FarmIQ\FarmIQ_V02
.\scripts\seed-all.ps1
```

### วิธีที่ 3: ใช้ Script ใหม่ (migrate + seed)

```powershell
cd D:\FarmIQ\FarmIQ_V02\cloud-layer
$env:SEED_COUNT = "30"
.\run-seeds.ps1
```

## ✅ ตรวจสอบว่า Seed ทำงาน

```powershell
# ตรวจสอบจำนวน records ใน database
docker compose -f docker-compose.dev.yml exec postgres psql -U farmiq -d farmiq -c "SELECT COUNT(*) FROM notifications;"
docker compose -f docker-compose.dev.yml exec postgres psql -U farmiq -d farmiq -c "SELECT COUNT(*) FROM feed_intake_record;"
docker compose -f docker-compose.dev.yml exec postgres psql -U farmiq -d farmiq -c "SELECT COUNT(*) FROM barn_morbidity_event;"
```

## 📝 หมายเหตุ

- ทุก seed file รองรับ `SEED_COUNT` environment variable
- Default: 30 records
- มี production guard (ไม่รันใน production เว้นแต่ `ALLOW_SEED_IN_PROD=true`)
- Idempotent (รันซ้ำได้ - จะ clear data ก่อนสร้างใหม่ใน dev mode)
- ใช้ fixed IDs จาก shared-seed-constants สำหรับ referential integrity

## 🎯 สรุป

**Seed files พร้อมใช้งานแล้ว!** 

สิ่งที่ต้องทำ:
1. ✅ Migrate database (ถ้ายังไม่ได้ทำ)
2. ✅ Generate Prisma client (สำหรับ services ใหม่)
3. ✅ รัน seed

หลังจาก migrate แล้ว สามารถรัน seed ได้เลย!

