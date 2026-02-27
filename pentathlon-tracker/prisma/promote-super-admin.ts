import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "lucan@rallyad.com";
  const password = "pejtew-sugpog-zyQgy3";
  const name = "Lucan Marsh";

  // Upsert: create if doesn't exist, promote if does
  const user = await prisma.user.upsert({
    where: { email },
    update: { role: "super_admin" },
    create: {
      name,
      email,
      passwordHash: hashSync(password, 10),
      role: "super_admin",
    },
  });

  console.log(`✅ User promoted to super_admin: ${user.email} (id: ${user.id})`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
