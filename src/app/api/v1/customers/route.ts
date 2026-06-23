import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const ctx = await authenticateApiRequest(req, ['READ_CUSTOMERS']);
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10), 0);
  const search = searchParams.get('q') ?? '';

  const where = {
    organizationId: ctx.organizationId,
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
            { companyName: { contains: search, mode: 'insensitive' as const } },
            { taxId: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [customers, total] = await Promise.all([
    prisma.endCustomer.findMany({ where, orderBy: { updatedAt: 'desc' }, skip: offset, take: limit }),
    prisma.endCustomer.count({ where }),
  ]);

  return NextResponse.json({ data: customers, pagination: { total, limit, offset } });
}

const createSchema = z.object({
  isCompany: z.boolean(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyName: z.string().optional(),
  taxId: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  province: z.string().optional(),
  country: z.string().default('España'),
  gdprConsent: z.boolean(),
  marketingConsent: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  const ctx = await authenticateApiRequest(req, ['WRITE_CUSTOMERS']);
  if (ctx instanceof NextResponse) return ctx;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }); }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'bad_request', issues: parsed.error.issues }, { status: 400 });
  }
  if (!parsed.data.gdprConsent) {
    return NextResponse.json({ error: 'gdpr_required', message: 'gdprConsent must be true' }, { status: 422 });
  }

  const customer = await prisma.endCustomer.create({
    data: {
      ...parsed.data,
      gdprConsentAt: new Date(),
      organizationId: ctx.organizationId,
    },
  });
  return NextResponse.json(customer, { status: 201 });
}
