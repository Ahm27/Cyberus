import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { challengeCatalog } from "../src/lib/challenge-catalog";

const prisma = new PrismaClient();

async function main() {
  const slug = process.env.EVENT_SLUG || "orientation-2026";
  const event = await prisma.event.upsert({
    where: { slug },
    update: { name: process.env.EVENT_NAME || "Cyberus Orientation Day" },
    create: {
      slug,
      name: process.env.EVENT_NAME || "Cyberus Orientation Day",
      config: { create: {} },
    },
  });
  for (const item of challengeCatalog) {
    await prisma.challenge.upsert({
      where: { eventId_number: { eventId: event.id, number: item.number } },
      update: { ...item, hints: item.hints },
      create: { eventId: event.id, ...item, hints: item.hints },
    });
  }
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    await prisma.adminUser.upsert({
      where: { email: process.env.ADMIN_EMAIL.toLowerCase() },
      update: {
        name: process.env.ADMIN_NAME || "Cyberus Admin",
        passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12),
      },
      create: {
        email: process.env.ADMIN_EMAIL.toLowerCase(),
        name: process.env.ADMIN_NAME || "Cyberus Admin",
        passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12),
      },
    });
  }
  console.log(
    `Seeded ${challengeCatalog.length} challenges for ${event.name}.`,
  );
}

main().finally(() => prisma.$disconnect());
