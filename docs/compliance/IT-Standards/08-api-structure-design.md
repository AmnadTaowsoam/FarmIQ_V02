# API Structure Design (Backend Node.js Template)

ใช้โครงสร้างจาก `Backend_nodejs-Template/Backend_nodejs-Template` เพื่อเป็นมาตรฐานอ้างอิงสำหรับออกแบบ API ในโครงการอื่น ๆ

## Base & Documentation
- Base path ทุกบริการ: `/api`
- Swagger UI: `/api-docs` (โหลดจาก `openapi.yaml`)
- Health check: `GET /api/health` → `OK`

## Standard Endpoints (ต้องมี/ควรมี)
- **ต้องมี** `GET /api/health` → ใช้ได้ทั้ง uptime probe และ blocklist ใน APM
- **ควรมี** `GET /api-docs` → Swagger UI จาก `openapi.yaml`
- **ควรมี** `GET /api/public-variable-frontend` → ถ้ามี frontend ต้องการค่า runtime (เช่น `datadog_rum_env`)
- **ควรมี** Error response format กลาง (เช่น `{ message, code, traceId }`) เพื่อลดงานฝั่ง consumer

## Routing & Resources (ตัวอย่างจากเทมเพลต)
- `GET /api/example` → คืนรายการตัวอย่างข้อมูล
- `POST /api/example` → สร้างข้อมูลใหม่ (รับ `name`, `email`, `age`)
- `GET /api/public-variable-frontend` → ส่งค่าที่ frontend ใช้ได้ เช่น `datadog_rum_env`

## Pattern สำหรับราย Service
- โครงสร้างแนะนำ: `/api/<service>/<resource>` หรือ `/api/<resource>` ถ้าเป็น single service
- ใช้คำนามพหูพจน์ เช่น `/api/orders`, `/api/users`
- เพิ่มเวอร์ชันเมื่อจำเป็น: `/api/v1/orders` (หรือ `/api/orders` + header versioning)
- แยก read/write ชัดเจน: `GET /api/orders` (list), `POST /api/orders` (create), `GET /api/orders/:id` (detail), `PATCH /api/orders/:id` (partial update)
- ถ้ามี public config ให้แยก endpoint เช่น `/api/<service>/public-config` คล้าย `public-variable-frontend`

## Request Validation
- ใช้ `zod` ตรวจสอบ payload (`name:string`, `email:email`, `age:number>=0`) ที่ middleware `validateExampleMiddleware` ก่อนเข้าสู่ handler

## Middlewares (Cross-cutting)
- `transactionIdMiddleware` ติด `uuid` ต่อคำขอทุกครั้ง
- `helmet()` สำหรับ security headers
- `express.json()` สำหรับ JSON body
- CORS: เปิดเฉพาะ dev กับ origin ที่อนุญาต
- Header เพิ่มเติม: `X-commit-ID` จาก env `COMMIT_ID`

## Observability
- Logging: `winston` โครงสร้าง JSON → Console (handle exceptions/rejections)
- Tracing: `dd-trace` เปิดอัตโนมัติ และ blocklist `/api/health`
- Datadog Frontend: endpoint `public-variable-frontend` ใช้จ่ายค่า `DATADOG_RUM_ENV`

## Error Handling & Shutdown
- Handler/Service มี try/catch ส่ง status code ที่เหมาะสม (เช่น 400 สำหรับ validation, 500 สำหรับข้อผิดพลาดภายใน)
- Graceful shutdown: ปิด HTTP server และ `Prisma` connection พร้อม timeout

## Folder Reference (Template)
```
src/
  index.ts                 # bootstrap app, middlewares, swagger, health
  routes/                  # route definitions
  controllers/             # request handlers
  services/                # business logic
  middlewares/             # validation, transactionId
  utils/logger.ts          # winston JSON logger
  utils/datadog.ts         # dd-trace init + http blocklist
  utils/swagger.ts         # swagger ui setup (/api-docs)
```

## Usage Guideline
- คงรูปแบบ base path `/api` และประกาศ Swagger ให้ครบทุก endpoint
- เพิ่ม resource ใหม่ให้มีทั้ง `GET`/`POST` (หรือ verbs ที่ตรงกับ use case) พร้อม validation ที่ middleware
- ทุก endpoint ควร log ด้วย `logger` และเคารพ `transactionId` สำหรับการติดตาม
- อย่าลืม block health-check ใน APM เพื่อลด noise และรักษา JSON logging format เดิม