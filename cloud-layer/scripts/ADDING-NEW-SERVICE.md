# Checklist: Adding a New Service to Cloud Layer

เมื่อเพิ่ม service ใหม่เข้าไปใน `cloud-layer` คุณต้องอัปเดตไฟล์ต่อไปนี้:

## 📋 Checklist

### 1. Database Setup

#### ✅ `postgres-init/01-create-cloud-dbs.sql`
เพิ่ม CREATE DATABASE statement สำหรับ service ใหม่:
```sql
SELECT 'CREATE DATABASE cloud_<service_name>'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_<service_name>')\gexec
```

**ตัวอย่าง:**
```sql
SELECT 'CREATE DATABASE cloud_my_new_service'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cloud_my_new_service')\gexec
```

#### ✅ `scripts/01-create-databases.ps1`
เพิ่ม database name ใน array `$DATABASES`:
```powershell
$DATABASES = @(
    # ... existing databases ...
    "cloud_my_new_service"  # เพิ่มบรรทัดนี้
)
```

#### ✅ `scripts/create-databases.sh` (ถ้าใช้ Bash)
เพิ่ม database name ใน array `DATABASES`:
```bash
DATABASES=(
  # ... existing databases ...
  "cloud_my_new_service"  # เพิ่มบรรทัดนี้
)
```

---

### 2. Prisma Services (ถ้า service ใช้ Prisma)

#### ✅ `docker-compose.prisma.yml`
เพิ่ม `prisma-studio-<service-name>` service:
```yaml
prisma-studio-my-new-service:
  image: node:20-alpine  # หรือใช้ service image ถ้ามี
  working_dir: /usr/src/app
  ports:
    - "5567:5555"  # ใช้ port ถัดไป (5566, 5567, ...)
  environment:
    - DATABASE_URL=postgresql://${POSTGRES_USER:-farmiq}:${POSTGRES_PASSWORD:-farmiq_dev}@postgres:5432/cloud_my_new_service
  dns:
    - 8.8.8.8
    - 8.8.4.4
  command: [ "sh", "-c", "npm_config_loglevel=error npm_config_fund=false npm_config_audit=false npx prisma@5.22.0 studio --schema prisma/schema.prisma --hostname 0.0.0.0 --port 5555" ]
  volumes:
    - ./cloud-my-new-service/prisma:/usr/src/app/prisma:ro
  networks:
    - farmiq-net
```

**หมายเหตุ:** 
- ใช้ `node:20-alpine` ถ้า service ไม่มี Docker image
- ใช้ service image ถ้า service มี Dockerfile และต้องการใช้ dependencies จาก image

---

### 3. Seeding Scripts (ถ้า service มี seed data)

#### ✅ `scripts/05-push-and-seed-all.ps1`
เพิ่ม service ใน array `$services`:
```powershell
$services = @(
    # ... existing services ...
    @{ name = "cloud-my-new-service"; hasSeed = $true },  # hasSeed = true ถ้ามี seed, false ถ้าไม่มี
)
```

**ตัวอย่าง:**
```powershell
$services = @(
    @{ name = "cloud-identity-access"; hasSeed = $true },
    @{ name = "cloud-my-new-service"; hasSeed = $true },  # เพิ่มบรรทัดนี้
    # ...
)
```

---

### 4. Docker Compose Files

#### ✅ `docker-compose.dev.yml` และ `docker-compose.yml`
ตรวจสอบว่า service ใหม่มี:
- `DATABASE_URL` ที่ชี้ไปยัง database ที่ถูกต้อง (เช่น `cloud_my_new_service`)
- `depends_on` สำหรับ `postgres` (ถ้าใช้ database)
- Environment variables ที่จำเป็น

**ตัวอย่าง:**
```yaml
cloud-my-new-service:
  # ... other config ...
  environment:
    - DATABASE_URL=postgresql://${POSTGRES_USER:-farmiq}:${POSTGRES_PASSWORD:-farmiq_dev}@postgres:5432/cloud_my_new_service
  depends_on:
    postgres:
      condition: service_healthy
```

---

## 🔍 How to Determine What to Update

### Service ใช้ Database หรือไม่?
- ✅ ใช้ Database → ต้องอัปเดต: `01-create-cloud-dbs.sql`, `01-create-databases.ps1`, `create-databases.sh`
- ❌ ไม่ใช้ Database → ข้ามขั้นตอน Database Setup

### Service ใช้ Prisma หรือไม่?
- ✅ ใช้ Prisma → ต้องอัปเดต: `docker-compose.prisma.yml`
- ❌ ไม่ใช้ Prisma → ข้ามขั้นตอน Prisma Studio

### Service มี Seed Data หรือไม่?
- ✅ มี Seed → ต้องอัปเดต: `05-push-and-seed-all.ps1` (ถ้าใช้ script นี้)
- ❌ ไม่มี Seed → ข้ามขั้นตอน Seeding Scripts

---

## 📝 Database Naming Convention

Database name ควรเป็น:
- Format: `cloud_<service_name>` (ใช้ underscore แทน hyphen)
- Lowercase only
- Example: `cloud-my-new-service` → `cloud_my_new_service`

---

## 🧪 Testing After Adding Service

หลังจากเพิ่ม service ใหม่ ให้ทดสอบ:

1. **สร้าง Database:**
   ```powershell
   .\scripts\01-create-databases.ps1
   ```

2. **ตรวจสอบ Database ถูกสร้าง:**
   ```powershell
   docker compose -f docker-compose.dev.yml exec postgres psql -U farmiq -d postgres -c "SELECT datname FROM pg_database WHERE datname LIKE 'cloud_%' ORDER BY datname;"
   ```

3. **ทดสอบ Prisma Studio (ถ้าใช้ Prisma):**
   ```powershell
   docker compose -f docker-compose.prisma.yml up -d prisma-studio-<service-name>
   ```

4. **ทดสอบ Service:**
   ```powershell
   docker compose -f docker-compose.dev.yml up -d cloud-<service-name>
   ```

---

## 📚 Related Files Reference

- `cloud-layer/postgres-init/01-create-cloud-dbs.sql` - Database initialization
- `cloud-layer/scripts/01-create-databases.ps1` - Database creation script
- `cloud-layer/scripts/create-databases.sh` - Database creation script (Bash)
- `cloud-layer/docker-compose.prisma.yml` - Prisma Studio services
- `cloud-layer/scripts/05-push-and-seed-all.ps1` - Schema push and seeding
- `cloud-layer/docker-compose.dev.yml` - Development services
- `cloud-layer/docker-compose.yml` - Production services

---

## ⚠️ Common Mistakes

1. **ลืมเพิ่ม database ใน `01-create-cloud-dbs.sql`** → Database จะไม่ถูกสร้างอัตโนมัติ
2. **ใช้ชื่อ database ผิด format** → ควรเป็น `cloud_<service_name>` (underscore)
3. **ลืมเพิ่ม Prisma Studio service** → จะไม่สามารถใช้ Prisma Studio ได้
4. **Port conflict ใน Prisma Studio** → ตรวจสอบว่า port ไม่ซ้ำกับ service อื่น
5. **ลืมอัปเดต `depends_on`** → Service อาจ start ก่อน database พร้อม

---

## 💡 Quick Reference: Service Types

### Node.js Service with Prisma
- ✅ Database setup
- ✅ Prisma Studio
- ✅ Seeding (ถ้ามี)

### Node.js Service without Prisma
- ✅ Database setup (ถ้าใช้ database)
- ❌ Prisma Studio
- ✅ Seeding (ถ้ามี)

### Python Service
- ✅ Database setup (ถ้าใช้ database)
- ❌ Prisma Studio (Python ใช้ SQLAlchemy หรือ asyncpg)
- ✅ Seeding (ถ้ามี)

### Service without Database
- ❌ Database setup
- ❌ Prisma Studio
- ❌ Seeding
