import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/utils';

const schema = z.object({
  organizationName: z.string().min(2).max(80),
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    const { organizationName, name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Este correo ya está registrado' }, { status: 409 });
    }

    const baseSlug = slugify(organizationName);
    let slug = baseSlug;
    let attempt = 0;
    while (await prisma.organization.findUnique({ where: { slug } })) {
      attempt++;
      slug = `${baseSlug}-${attempt}`;
    }

    const hashed = await bcrypt.hash(password, 10);

    const organization = await prisma.organization.create({
      data: {
        name: organizationName,
        slug,
        users: {
          create: {
            email,
            name,
            password: hashed,
            role: 'OWNER',
          },
        },
        pipelines: {
          create: {
            name: 'Pipeline principal',
            isDefault: true,
            stages: {
              create: [
                { name: 'Nuevo', order: 0, probability: 10, color: '#94a3b8' },
                { name: 'Contactado', order: 1, probability: 25, color: '#3b82f6' },
                { name: 'Propuesta', order: 2, probability: 50, color: '#8b5cf6' },
                { name: 'Negociación', order: 3, probability: 75, color: '#f59e0b' },
                { name: 'Cerrado ganado', order: 4, probability: 100, color: '#10b981' },
              ],
            },
          },
        },
      },
    });

    return NextResponse.json({ ok: true, organizationId: organization.id });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Error al crear la cuenta' }, { status: 500 });
  }
}
