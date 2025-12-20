CREATE TABLE IF NOT EXISTS roles (
    id TEXT NOT NULL,
    name TEXT NOT NULL,
    CONSTRAINT roles_pkey PRIMARY KEY (id),
    CONSTRAINT roles_name_key UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT NOT NULL,
    email TEXT NOT NULL,
    password TEXT NOT NULL,
    tenant_id TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_email_key UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS "_RoleToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_RoleToUser_A_fkey" FOREIGN KEY ("A") REFERENCES roles(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_RoleToUser_B_fkey" FOREIGN KEY ("B") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "_RoleToUser_AB_unique" ON "_RoleToUser"("A", "B");
CREATE INDEX IF NOT EXISTS "_RoleToUser_B_index" ON "_RoleToUser"("B");

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'Role'
    ) THEN
        INSERT INTO roles (id, name)
        SELECT id, name
        FROM "Role"
        ON CONFLICT DO NOTHING;
        DROP TABLE "Role";
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'User'
    ) THEN
        INSERT INTO users (id, email, password, tenant_id, created_at, updated_at)
        SELECT id, email, password, "tenantId", "createdAt", "updatedAt"
        FROM "User"
        ON CONFLICT DO NOTHING;
        DROP TABLE "User";
    END IF;
END $$;
