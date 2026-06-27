-- Seed mínimo BrandHub: 1 organización + 1 usuario admin
-- Idempotente: usa ON CONFLICT DO NOTHING
INSERT INTO "Organization" (id, name, slug, "createdAt", "updatedAt")
VALUES ('demo_org_brandhub', 'BrandHub Demo', 'brandhub-demo', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- admin@brandhub.local / admin1234
INSERT INTO "User" (id, email, name, password, role, "superAdmin", "organizationId", "createdAt", "updatedAt")
VALUES (
  'demo_user_admin',
  'admin@brandhub.local',
  'Administrador',
  '$2a$10$G4BgFZY/Nbry51Jp0gjefet6f7.3WpUOrcDmuLOhV86.OPHMMGAeG',
  'OWNER',
  true,
  'demo_org_brandhub',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;
