-- CreateTable
CREATE TABLE "FicheOperateur" (
    "id" SERIAL NOT NULL,
    "dateEnregistrement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "photoPath" TEXT,
    "statut" TEXT,
    "monnaieInternationale" BOOLEAN NOT NULL DEFAULT false,
    "nomPrenom" TEXT NOT NULL,
    "sexe" TEXT NOT NULL,
    "dateNaissance" TIMESTAMP(3),
    "lieuNaissance" TEXT,
    "nationalite" TEXT,
    "documentIdentite" TEXT,
    "adresse" TEXT,
    "telephone" TEXT NOT NULL,
    "email" TEXT,
    "nomEtablissement" TEXT,
    "airtelMoney" BOOLEAN NOT NULL DEFAULT false,
    "mPesa" BOOLEAN NOT NULL DEFAULT false,
    "orangeMoney" BOOLEAN NOT NULL DEFAULT false,
    "afrimoney" BOOLEAN NOT NULL DEFAULT false,
    "venteTelecom" BOOLEAN NOT NULL DEFAULT false,
    "numAgent" TEXT,
    "numEnregistrement" TEXT,
    "agentNom" TEXT,
    "dateAutorite" TIMESTAMP(3),

    CONSTRAINT "FicheOperateur_pkey" PRIMARY KEY ("id")
);
