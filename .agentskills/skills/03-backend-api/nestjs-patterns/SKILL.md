---
name: NestJS Patterns
description: Comprehensive patterns for building scalable Node.js applications with NestJS framework including modules, providers, controllers, and enterprise patterns.
---

# NestJS Patterns

## Overview

NestJS เป็น progressive Node.js framework ที่ใช้ TypeScript เป็นหลัก ออกแบบมาสำหรับ building scalable server-side applications โดยใช้ architectural patterns จาก Angular รวมถึง Dependency Injection, Modules, และ Decorators

## Why This Matters

- **Scalability**: Modular architecture ทำให้จัดการ codebase ขนาดใหญ่ได้ง่าย
- **Type Safety**: Built-in TypeScript support ลด runtime errors
- **Enterprise Ready**: มี patterns สำหรับ microservices, GraphQL, WebSocket out-of-the-box
- **Testability**: DI system ทำให้ unit testing ง่าย

---

## Core Concepts

### 1. Module Architecture

```typescript
// feature.module.ts
@Module({
  imports: [DatabaseModule, CacheModule],
  controllers: [FeatureController],
  providers: [FeatureService, FeatureRepository],
  exports: [FeatureService], // expose to other modules
})
export class FeatureModule {}
```

**Best Practices:**
- แบ่ง module ตาม domain/feature
- ใช้ shared module สำหรับ common utilities
- Export เฉพาะ services ที่จำเป็น

### 2. Dependency Injection

```typescript
// ใช้ constructor injection
@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly paymentService: PaymentService,
    @Inject('CONFIG') private config: AppConfig,
  ) {}
}

// Custom providers
const configProvider = {
  provide: 'CONFIG',
  useFactory: (configService: ConfigService) => configService.get('app'),
  inject: [ConfigService],
};
```

### 3. Controllers & DTOs

```typescript
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: User,
  ): Promise<OrderResponseDto> {
    return this.orderService.create(dto, user.id);
  }

  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.orderService.findOne(id);
  }
}
```

### 4. Exception Handling

```typescript
// Custom exception filter
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.message
      : 'Internal server error';

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### 5. Interceptors & Pipes

```typescript
// Transform response interceptor
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map(data => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}

// Validation pipe (global)
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}));
```

## Quick Start

1. **Create new project:**
   ```bash
   nest new my-project
   cd my-project
   ```

2. **Generate resources:**
   ```bash
   nest g module users
   nest g controller users
   nest g service users
   ```

3. **Setup validation:**
   ```bash
   npm install class-validator class-transformer
   ```

4. **Configure global pipes in main.ts:**
   ```typescript
   app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
   ```

5. **Add Swagger documentation:**
   ```bash
   npm install @nestjs/swagger swagger-ui-express
   ```

## Production Checklist

- [ ] Global exception filter configured
- [ ] Validation pipes enabled globally
- [ ] Health check endpoint (`/health`)
- [ ] Swagger documentation enabled (dev only)
- [ ] Rate limiting configured
- [ ] Helmet security headers
- [ ] CORS properly configured
- [ ] Environment config validated on startup
- [ ] Graceful shutdown handling
- [ ] Request logging with correlation IDs

## Anti-patterns

1. **Fat Controllers**: Controllers should only handle HTTP concerns, delegate logic to services
2. **Circular Dependencies**: Use `forwardRef()` sparingly, refactor module structure instead
3. **Skipping DTOs**: Always validate input with DTOs and class-validator
4. **God Modules**: Break large modules into smaller, focused modules

## Integration Points

- **Database**: `@nestjs/typeorm`, `@nestjs/mongoose`, `@nestjs/prisma`
- **Caching**: `@nestjs/cache-manager` with Redis
- **Queue**: `@nestjs/bull` for job processing
- **GraphQL**: `@nestjs/graphql` with Apollo
- **Microservices**: `@nestjs/microservices` for distributed systems

## Further Reading

- [NestJS Documentation](https://docs.nestjs.com/)
- [NestJS Course (Official)](https://courses.nestjs.com/)
- [Awesome NestJS](https://github.com/nestjs/awesome-nestjs)
