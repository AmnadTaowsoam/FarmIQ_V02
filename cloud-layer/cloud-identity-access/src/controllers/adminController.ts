import { Request, Response } from 'express'
import { Prisma, PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

const formatDisplayName = (email: string): string => {
  const prefix = email.split('@')[0]
  return prefix
    .split(/[._-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const deriveLastLogin = (createdAt: Date, updatedAt: Date): Date | null => {
  // Freshly created users have createdAt ~= updatedAt and should still display "Never".
  return updatedAt.getTime() - createdAt.getTime() > 1000 ? updatedAt : null
}

/**
 * Generate a secure random password for new users
 * Password will be 16 characters, base64url encoded
 */
const generateSecurePassword = (): string => {
  return crypto.randomBytes(16).toString('base64url');
}

const resolveRoleIds = async (roleNames?: string[]) => {
  if (!roleNames || roleNames.length === 0) {
    const defaultRole = await prisma.role.findUnique({ where: { name: 'viewer' } })
    return defaultRole ? [defaultRole.id] : []
  }

  const roles = await prisma.role.findMany({ where: { name: { in: roleNames } } })
  return roles.map((role) => role.id)
}

export async function getAdminUsers(req: Request, res: Response) {
  try {
    const page = Number.parseInt((req.query.page as string) || '0', 10)
    const pageSize = Number.parseInt((req.query.pageSize as string) || '25', 10)
    const search = (req.query.search as string) || undefined
    const status = (req.query.status as string) || undefined
    const role = (req.query.role as string) || undefined
    const tenantId = (req.query.tenantId as string) || undefined

    if (status && status !== 'active') {
      return res.json({
        data: [],
        total: 0,
        page: Number.isNaN(page) ? 0 : page,
        pageSize: Number.isNaN(pageSize) ? 25 : pageSize,
        totalPages: 0,
      })
    }

    const where: Prisma.UserWhereInput = {
      ...(tenantId ? { tenantId } : {}),
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
            ],
          }
        : {}),
      ...(role
        ? {
            roles: {
              some: { name: role },
            },
          }
        : {}),
    }

    const safePage = Number.isNaN(page) ? 0 : page
    const safePageSize = Number.isNaN(pageSize) ? 25 : pageSize

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip: safePage * safePageSize,
        take: safePageSize,
        orderBy: { createdAt: 'desc' },
        include: { roles: true },
      }),
    ])

    const data = users.map((user) => ({
      id: user.id,
      name: formatDisplayName(user.email),
      email: user.email,
      roles: user.roles.map((r) => r.name),
      status: 'active',
      tenantId: user.tenantId,
      tenantName: user.tenantId || '—',
      lastLogin: deriveLastLogin(user.createdAt, user.updatedAt),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }))

    res.json({
      data,
      total,
      page: safePage,
      pageSize: safePageSize,
      totalPages: Math.ceil(total / safePageSize),
    })
  } catch (error) {
    logger.error('Error in getAdminUsers:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch users',
        traceId: res.locals?.traceId || 'unknown',
      },
    })
  }
}

export async function getAdminUserById(req: Request, res: Response) {
  try {
    const { id } = req.params

    const user = await prisma.user.findUnique({
      where: { id },
      include: { roles: true },
    })

    if (!user) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `User with id ${id} not found`,
          traceId: res.locals?.traceId || 'unknown',
        },
      })
    }

    return res.json({
      id: user.id,
      name: formatDisplayName(user.email),
      email: user.email,
      roles: user.roles.map((r) => r.name),
      status: 'active',
      tenantId: user.tenantId,
      tenantName: user.tenantId || '—',
      lastLogin: deriveLastLogin(user.createdAt, user.updatedAt),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
  } catch (error) {
    logger.error('Error in getAdminUserById:', error)
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch user',
        traceId: res.locals?.traceId || 'unknown',
      },
    })
  }
}

export async function createAdminUser(req: Request, res: Response) {
  try {
    const { email, password, roles, tenantId } = req.body || {}

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'email is required',
          traceId: res.locals?.traceId || 'unknown',
        },
      })
    }

    const resolvedRoleIds = await resolveRoleIds(Array.isArray(roles) ? roles : undefined)
    
    // Generate secure password if not provided
    const tempPassword = password || generateSecurePassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 12)

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        tenantId: tenantId || null,
        roles: {
          connect: resolvedRoleIds.map((id) => ({ id })),
        },
      },
      include: { roles: true },
    })

    // Return temporary password if generated (for initial setup)
    const responseData = {
      id: user.id,
      name: formatDisplayName(user.email),
      email: user.email,
      roles: user.roles.map((r) => r.name),
      status: 'active',
      tenantId: user.tenantId,
      tenantName: user.tenantId || '—',
      lastLogin: null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    // Only include temporary password if it was auto-generated
    if (!password) {
      (responseData as any).temporaryPassword = tempPassword;
      logger.info(`Generated temporary password for user ${user.email}`);
    }

    return res.status(201).json(responseData)
  } catch (error: any) {
    logger.error('Error in createAdminUser:', error)
    if (error.code === 'P2002') {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'User with this email already exists',
          traceId: res.locals?.traceId || 'unknown',
        },
      })
    }
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create user',
        traceId: res.locals?.traceId || 'unknown',
      },
    })
  }
}

export async function updateAdminUser(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { email, password, roles, tenantId } = req.body || {}

    const updateData: Prisma.UserUpdateInput = {}
    if (email) updateData.email = email
    if (tenantId !== undefined) updateData.tenantId = tenantId || null

    if (password) {
      updateData.password = await bcrypt.hash(password, 10)
    }

    if (Array.isArray(roles)) {
      const resolvedRoleIds = await resolveRoleIds(roles)
      updateData.roles = {
        set: resolvedRoleIds.map((roleId) => ({ id: roleId })),
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { roles: true },
    })

    return res.json({
      id: user.id,
      name: formatDisplayName(user.email),
      email: user.email,
      roles: user.roles.map((r) => r.name),
      status: 'active',
      tenantId: user.tenantId,
      tenantName: user.tenantId || '—',
      lastLogin: null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
  } catch (error: any) {
    logger.error('Error in updateAdminUser:', error)
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `User with id ${req.params.id} not found`,
          traceId: res.locals?.traceId || 'unknown',
        },
      })
    }
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update user',
        traceId: res.locals?.traceId || 'unknown',
      },
    })
  }
}

export async function deleteAdminUser(req: Request, res: Response) {
  try {
    const { id } = req.params
    await prisma.user.delete({ where: { id } })
    return res.status(204).send()
  } catch (error: any) {
    logger.error('Error in deleteAdminUser:', error)
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `User with id ${req.params.id} not found`,
          traceId: res.locals?.traceId || 'unknown',
        },
      })
    }
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete user',
        traceId: res.locals?.traceId || 'unknown',
      },
    })
  }
}

export async function getAdminRoles(_req: Request, res: Response) {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { users: true } },
      },
    })

    res.json({
      data: roles.map((role) => ({
        id: role.id,
        name: role.name,
        userCount: role._count.users,
      })),
      total: roles.length,
    })
  } catch (error) {
    logger.error('Error in getAdminRoles:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch roles',
        traceId: res.locals?.traceId || 'unknown',
      },
    })
  }
}
