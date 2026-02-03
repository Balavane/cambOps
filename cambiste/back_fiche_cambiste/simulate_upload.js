
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

async function testUpload() {
    console.log("--- Simulation d'Upload ---");
    const form = new FormData();
    form.append('nomPrenom', 'Test Automatique');
    form.append('sexe', 'Masculin');
    form.append('telephone', '0000000000');

    const photoPath = 'C:/Users/PC/.gemini/antigravity/brain/a6c25c23-f907-4bb9-895e-15f8bc9f5821/dummy_operator_photo_1770117655969.png';
    form.append('photoOperateur', fs.createReadStream(photoPath));

    try {
        const response = await axios.post('http://localhost:5000/api/operateurs', form, {
            headers: form.getHeaders(),
        });
        console.log("Réponse du serveur:", response.data);

        const savedPath = response.data.photoPath;
        console.log("Chemin enregistré:", savedPath);

        // Vérifier si le fichier existe physiquement
        const absolutePath = path.resolve('c:/Users/PC/Desktop/formulaire/cambiste/back_fiche_cambiste', savedPath);
        console.log("Vérification physique à:", absolutePath);

        if (fs.existsSync(absolutePath)) {
            console.log("SUCCÈS: Le fichier existe sur le disque !");
        } else {
            console.log("ÉCHEC: Le fichier n'existe pas sur le disque.");
        }
    } catch (error) {
        console.error("Erreur durant le test:", error.message);
    }
}

testUpload();
