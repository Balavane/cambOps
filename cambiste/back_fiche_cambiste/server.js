// server.js
import 'dotenv/config';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import cors from 'cors';

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 5000;

// --- Configuration du Middleware ---
app.use(cors()); // Autorise toutes les origines en développement
app.use(express.json());

// Logger simple pour debug
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

const __dirname = path.resolve();

// Création du dossier nécessaire s'il n'existe pas
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// *** CORRECTION CRITIQUE CORS POUR LES IMAGES ***
app.use('/uploads', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
}, express.static(uploadDir));

// --- Configuration Multer Unifiée ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const typePrefix = req.path.includes('operateurs') ? 'op-' : 'cambiste-';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, typePrefix + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });
const uploadCambiste = upload.single('photoID');
const uploadOp = upload.single('photoOperateur');

// ==========================================
// ROUTES : FICHES CAMBISTES
// ==========================================

app.post('/api/fiches', (req, res) => {
    uploadCambiste(req, res, async (err) => {
        if (err) return res.status(500).json({ message: "Erreur upload", error: err.message });
        try {
            const formData = req.body;
            // On ne stocke que le nom du fichier pour plus de flexibilité
            const photoIDPath = req.file ? req.file.filename : null;

            const nouvelleFiche = await prisma.ficheCambiste.create({
                data: {
                    ...formData,
                    photoIDPath,
                    dateNaissance: formData.dateNaissance ? new Date(formData.dateNaissance) : null,
                    dateEngagement: formData.dateEngagement ? new Date(formData.dateEngagement) : null,
                    dateAutorite: formData.dateAutorite ? new Date(formData.dateAutorite) : null,
                    changeManuel: formData.changeManuel === 'on',
                    airtelMoney: formData.airtelMoney === 'on',
                    mPesa: formData.mPesa === 'on',
                    orangeMoney: formData.orangeMoney === 'on',
                    afrimoney: formData.afrimoney === 'on',
                    venteTelecom: formData.venteTelecom === 'on',
                }
            });
            res.status(201).json(nouvelleFiche);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Erreur serveur" });
        }
    });
});

app.get('/api/fiches', async (req, res) => {
    const fiches = await prisma.ficheCambiste.findMany({ orderBy: { dateEnregistrement: 'desc' } });
    res.json(fiches);
});

app.get('/api/fiches/:id', async (req, res) => {
    const fiche = await prisma.ficheCambiste.findUnique({ where: { id: parseInt(req.params.id) } });
    res.json(fiche);
});

// ==========================================
// ROUTES : OPÉRATEURS (CORRIGÉES)
// ==========================================

app.post('/api/operateurs', (req, res) => {
    uploadOp(req, res, async (err) => {
        if (err) return res.status(500).json({ message: "Erreur upload Opérateur" });

        try {
            const {
                nomPrenom, sexe, telephone, statut, monnaieInternationale,
                email, adresse, nationalite, documentIdentite, dateNaissance,
                lieuNaissance, nomEtablissement, airtelMoney, mPesa,
                orangeMoney, afrimoney, venteTelecom, numAgent,
                numEnregistrement, agentNom, dateAutorite
            } = req.body;

            // On ne stocke que le nom du fichier
            const photoPath = req.file ? req.file.filename : null;

            const newOp = await prisma.ficheOperateur.create({
                data: {
                    nomPrenom,
                    sexe,
                    telephone,
                    statut,
                    monnaieInternationale: monnaieInternationale === 'true' || monnaieInternationale === 'on',
                    email,
                    adresse,
                    nationalite,
                    documentIdentite,
                    dateNaissance: dateNaissance ? new Date(dateNaissance) : null,
                    lieuNaissance,
                    nomEtablissement,
                    airtelMoney: airtelMoney === 'true' || airtelMoney === 'on',
                    mPesa: mPesa === 'true' || mPesa === 'on',
                    orangeMoney: orangeMoney === 'true' || orangeMoney === 'on',
                    afrimoney: afrimoney === 'true' || afrimoney === 'on',
                    venteTelecom: venteTelecom === 'true' || venteTelecom === 'on',
                    numAgent,
                    numEnregistrement,
                    agentNom,
                    dateAutorite: dateAutorite ? new Date(dateAutorite) : null,
                    photoPath: photoPath,
                    dateEnregistrement: new Date()
                }
            });
            res.status(201).json(newOp);
        } catch (error) {
            console.error("Erreur Opérateur:", error);
            if (req.file) {
                const fullPath = path.join(uploadDir, req.file.filename);
                if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
            }
            res.status(500).json({ message: "Erreur lors de la création de l'opérateur", error: error.message });
        }
    });
});

app.get('/api/operateurs', async (req, res) => {
    try {
        const operateurs = await prisma.ficheOperateur.findMany({
            orderBy: { dateEnregistrement: 'desc' }
        });
        res.json(operateurs);
    } catch (error) {
        res.status(500).json({ message: "Erreur de récupération" });
    }
});

app.get('/api/operateurs/:id', async (req, res) => {
    try {
        const op = await prisma.ficheOperateur.findUnique({
            where: { id: parseInt(req.params.id) }
        });
        if (!op) return res.status(404).json({ message: "Non trouvé" });
        res.json(op);
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur" });
    }
});

// ==========================================
// ROUTE : STATISTIQUES DASHBOARD
// ==========================================

app.get('/api/stats', async (req, res) => {
    try {
        // Compter les cambistes et opérateurs
        const totalCambistes = await prisma.ficheCambiste.count();
        const totalOperateurs = await prisma.ficheOperateur.count();

        // Enregistrements du jour
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayCambistes = await prisma.ficheCambiste.count({
            where: { dateEnregistrement: { gte: today } }
        });
        const todayOperateurs = await prisma.ficheOperateur.count({
            where: { dateEnregistrement: { gte: today } }
        });

        // Répartition par activité (Cambistes)
        const activitiesCambistes = await prisma.ficheCambiste.findMany({
            select: {
                changeManuel: true,
                airtelMoney: true,
                mPesa: true,
                orangeMoney: true,
                afrimoney: true,
                venteTelecom: true
            }
        });

        const activityStats = {
            changeManuel: activitiesCambistes.filter(f => f.changeManuel).length,
            airtelMoney: activitiesCambistes.filter(f => f.airtelMoney).length,
            mPesa: activitiesCambistes.filter(f => f.mPesa).length,
            orangeMoney: activitiesCambistes.filter(f => f.orangeMoney).length,
            afrimoney: activitiesCambistes.filter(f => f.afrimoney).length,
            venteTelecom: activitiesCambistes.filter(f => f.venteTelecom).length
        };

        // Associations actives et statistiques
        const associationCounts = await prisma.ficheCambiste.groupBy({
            by: ['associationNom'],
            _count: {
                _all: true
            },
            where: {
                associationNom: { not: null, not: "" }
            }
        });

        const associationStats = associationCounts.map(assoc => ({
            name: assoc.associationNom || 'INDÉPENDANT',
            count: assoc._count._all
        })).sort((a, b) => b.count - a.count);

        // Activités récentes (5 dernières)
        const recentCambistes = await prisma.ficheCambiste.findMany({
            take: 3,
            orderBy: { dateEnregistrement: 'desc' },
            select: {
                id: true,
                nomPrenom: true,
                dateEnregistrement: true,
                photoIDPath: true
            }
        });

        const recentOperateurs = await prisma.ficheOperateur.findMany({
            take: 2,
            orderBy: { dateEnregistrement: 'desc' },
            select: {
                id: true,
                nomPrenom: true,
                dateEnregistrement: true,
                photoPath: true
            }
        });

        res.json({
            totalCambistes,
            totalOperateurs,
            todayTotal: todayCambistes + todayOperateurs,
            activeAssociations: associationStats.length,
            activityStats,
            associationStats,
            recentActivities: [
                ...recentCambistes.map(c => ({ ...c, type: 'Cambiste' })),
                ...recentOperateurs.map(o => ({ ...o, type: 'Opérateur', photoIDPath: o.photoPath }))
            ].sort((a, b) => new Date(b.dateEnregistrement) - new Date(a.dateEnregistrement)).slice(0, 5)
        });
    } catch (error) {
        console.error('Erreur stats:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des statistiques' });
    }
});

// --- Lancement ---
app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur : http://localhost:${PORT}`);
});