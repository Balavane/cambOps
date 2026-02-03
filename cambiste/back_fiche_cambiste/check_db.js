
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("--- Liste des Opérateurs ---");
    const operateurs = await prisma.ficheOperateur.findMany();
    operateurs.forEach(op => {
        console.log(`ID: ${op.id}, Nom: ${op.nomPrenom}, PhotoPath: ${op.photoPath}`);
    });
    console.log("----------------------------");
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
