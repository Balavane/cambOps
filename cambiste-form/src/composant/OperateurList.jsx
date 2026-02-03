import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const UPLOADS_BASE_URL = 'http://127.0.0.1:5000/';
const primaryColor = '#ea580c';
const lightOrange = '#fed7aa';
const DOWNLOAD_BATCH_SIZE = 20;

// --- Fonctions Utilitaires ---
const formatKey = (key) => key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
const formatValue = (key, value) => {
    if (value === true || value === 'on') return 'Oui';
    if (value === false || value === 'off') return 'Non';
    if (value === null || value === undefined || value === "") return 'N/A';
    if (key.startsWith('date') && value) {
        try {
            const dateOnly = String(value).split('T')[0];
            return new Date(dateOnly).toLocaleDateString('fr-FR');
        } catch { return value; }
    }
    return value;
};

const SECTIONS_OP = {
    'I. Statut & Localisation': ['statut', 'nomEtablissement', 'numAgent', 'monnaieInternationale'],
    'II. Identité de l’Opérateur': ['nomPrenom', 'sexe', 'lieuNaissance', 'dateNaissance', 'nationalite', 'documentIdentite', 'adresse', 'telephone', 'email'],
    'III. Services de Monnaie Électronique': ['airtelMoney', 'mPesa', 'orangeMoney', 'afrimoney', 'venteTelecom'],
    'IV. Réservé à l’Autorité': ['numEnregistrement', 'agentNom', 'dateAutorite'],
};

/**
 * GÉNÉRATION DU PDF AMÉLIORÉ (AVEC PHOTO)
 */
export const generatePDFForOperateur = async (op, shouldSave = true) => {
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = '210mm';
    document.body.appendChild(tempContainer);

    const contentHtml = `
        <div id="pdf-template" style="width: 210mm; padding: 15mm; background: white; font-family: 'Helvetica', Arial, sans-serif;">
            <div style="text-align: center; border-bottom: 2px solid ${lightOrange}; padding-bottom: 10px; margin-bottom: 20px;">
                <h1 style="color: ${primaryColor}; margin: 0; font-size: 22px; text-transform: uppercase; font-weight: bold;">FICHE D'IDENTIFICATION OPÉRATEUR</h1>
                <p style="margin: 5px 0; color: #666; font-size: 12px;">Système de Gestion AREFA - Zone Libérée AFC/M23</p>
            </div>

            <div style="text-align: center; margin-bottom: 25px;">
                <h5 style="font-weight: bold; color: ${primaryColor}; font-size: 14px; margin-bottom: 10px;">Photo de l'Opérateur</h5>
                ${op.photoPath ?
            `<img src="${UPLOADS_BASE_URL}${op.photoPath.startsWith('uploads/') ? op.photoPath : 'uploads/' + op.photoPath}" alt="Photo" crossOrigin="anonymous" style="width: 140px; height: 160px; object-fit: cover; border: 2px solid ${lightOrange}; padding: 2px;"/>`
            : `<div style="width: 140px; height: 160px; margin: 0 auto; border: 2px dashed #ccc; display: flex; align-items: center; justify-content: center; color: #999; font-size: 12px;">Photo Non Disponible</div>`}
            </div>

            ${Object.entries(SECTIONS_OP).map(([sectionTitle, keys]) => `
                <div style="margin-bottom: 20px;">
                    <h2 style="font-size: 16px; font-weight: bold; padding-bottom: 5px; color: ${primaryColor}; border-bottom: 2px solid ${lightOrange}; margin-bottom: 10px;">${sectionTitle}</h2>
                    <div style="display: flex; flex-wrap: wrap;">
                        ${keys.map(key => {
                const value = op[key];
                return `
                                <div style="width: 50%; padding-right: 10px; box-sizing: border-box; font-size: 11px; margin-bottom: 6px;">
                                    <strong style="color: #555;">${formatKey(key)} :</strong> <span style="color: #222;">${formatValue(key, value)}</span>
                                </div>
                            `;
            }).join('')}
                    </div>
                </div>
            `).join('')}

            <div style="margin-top: 50px; display: flex; justify-content: space-between; padding: 0 10mm;">
                <div style="text-align: center; width: 40%;">
                    <p style="font-size: 11px; font-weight: bold; border-bottom: 1px solid #333; padding-bottom: 40px; margin-bottom: 5px;">Signature de l'Opérateur</p>
                </div>
                <div style="text-align: center; width: 40%;">
                    <p style="font-size: 11px; font-weight: bold; border-bottom: 1px solid #333; padding-bottom: 40px; margin-bottom: 5px;">Sceau de l'Autorité AREFA</p>
                </div>
            </div>

            <div style="position: absolute; bottom: 15mm; left: 0; width: 100%; text-align: center; font-size: 10px; color: #aaa; border-top: 1px solid #eee; padding-top: 10px;">
                Document officiel AREFA - Généré le ${new Date().toLocaleString('fr-FR')}
            </div>
        </div>
    `;

    tempContainer.innerHTML = contentHtml;
    const element = tempContainer.querySelector('#pdf-template');

    // Attendre que les images soient chargées
    const images = tempContainer.querySelectorAll('img');
    const imagePromises = Array.from(images).map(img => {
        return new Promise(resolve => {
            if (img.complete && img.naturalHeight !== 0) {
                resolve();
            } else {
                img.onload = () => resolve();
                img.onerror = () => {
                    console.error("Erreur chargement image PDF:", img.src);
                    resolve();
                };
            }
        });
    });

    await Promise.all(imagePromises);
    await new Promise(resolve => setTimeout(resolve, 500)); // Petit délai de sécurité

    try {
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight);

        if (shouldSave) {
            // 1. Sauvegarde PDF
            pdf.save(`Fiche_Operateur_${op.nomPrenom.replace(/\s+/g, '_')}.pdf`);

            // 2. TÉLÉCHARGEMENT SÉPARÉ DE LA PHOTO
            if (op.photoPath) {
                const photoSrc = op.photoPath.startsWith('uploads/') ? op.photoPath : 'uploads/' + op.photoPath;
                const photoUrl = `${UPLOADS_BASE_URL}${photoSrc}`;
                const safeName = op.nomPrenom
                    ? op.nomPrenom.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')
                    : 'Photo_Operateur';

                const link = document.createElement('a');
                link.href = photoUrl;
                link.download = `Photo_${safeName}${op.photoPath.lastIndexOf('.') !== -1
                    ? op.photoPath.substring(op.photoPath.lastIndexOf('.'))
                    : '.jpg'
                    }`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } else {
            return pdf.output('arraybuffer');
        }
    } catch (error) {
        console.error("Erreur PDF:", error);
    } finally {
        document.body.removeChild(tempContainer);
    }
};

export default function OperateurList() {
    const navigate = useNavigate();
    const [operateurs, setOperateurs] = useState([]);
    const [loading, setLoading] = useState(true);

    // ÉTATS DES FILTRES
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatut, setFilterStatut] = useState('all');
    const [filterMonnaieInternationale, setFilterMonnaieInternationale] = useState(false); // Le nouveau filtre Change

    const [isBatchDownloading, setIsBatchDownloading] = useState(false);
    const [selectedBatchIndex, setSelectedBatchIndex] = useState(0);
    const [currentDownloadIndex, setCurrentDownloadIndex] = useState(0);

    useEffect(() => {
        fetch('http://127.0.0.1:5000/api/operateurs')
            .then(res => res.json())
            .then(data => {
                data.sort((a, b) => new Date(b.dateEnregistrement) - new Date(a.dateEnregistrement));
                setOperateurs(data);
                setLoading(false);
            })
            .catch(err => console.error(err));
    }, []);

    // LOGIQUE DE FILTRAGE CUMULATIVE
    const filteredOperateurs = operateurs.filter(op => {
        const matchSearch = !searchTerm || op.nomPrenom?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatut = filterStatut === 'all' || op.statut === filterStatut;
        // Si le switch est activé, on ne garde que ceux qui font la monnaie étrangère
        const matchMonnaie = !filterMonnaieInternationale || op.monnaieInternationale === true;

        return matchSearch && matchStatut && matchMonnaie;
    });

    const totalFiltered = filteredOperateurs.length;
    const totalBatches = Math.ceil(totalFiltered / DOWNLOAD_BATCH_SIZE);

    const handleDownloadBatch = async () => {
        if (totalFiltered === 0) return;
        setIsBatchDownloading(true);
        const startIndex = selectedBatchIndex * DOWNLOAD_BATCH_SIZE;
        const currentBatch = filteredOperateurs.slice(startIndex, startIndex + DOWNLOAD_BATCH_SIZE);

        const zip = new JSZip();
        try {
            for (let i = 0; i < currentBatch.length; i++) {
                setCurrentDownloadIndex(i + 1);
                const op = currentBatch[i];
                const pdfBuffer = await generatePDFForOperateur(op, false);
                const safeName = op.nomPrenom.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
                // Ajout du PDF
                zip.file(`Fiche_${safeName}.pdf`, pdfBuffer, { binary: true });

                // Ajout de la photo dans le ZIP (si disponible)
                if (op.photoPath) {
                    try {
                        const photoSrc = op.photoPath.startsWith('uploads/') ? op.photoPath : 'uploads/' + op.photoPath;
                        const photoUrl = `${UPLOADS_BASE_URL}${photoSrc}`;
                        const response = await fetch(photoUrl);
                        if (response.ok) {
                            const blob = await response.blob();
                            const buffer = await blob.arrayBuffer();
                            const ext = op.photoPath.lastIndexOf('.') !== -1
                                ? op.photoPath.substring(op.photoPath.lastIndexOf('.'))
                                : '.jpg';
                            zip.file(`Photo_${safeName}${ext}`, buffer, { binary: true });
                        }
                    } catch (err) {
                        console.error('Erreur lors de l\'ajout de la photo opérateur au ZIP :', err);
                    }
                }
            }
            const blob = await zip.generateAsync({ type: "blob" });
            saveAs(blob, `Lot_${selectedBatchIndex + 1}_Operateurs.zip`);
        } catch (error) {
            console.error(error);
        } finally {
            setIsBatchDownloading(false);
            setCurrentDownloadIndex(0);
        }
    };

    if (loading) return <div className="text-center mt-5">Chargement...</div>;

    return (
        <div className="min-vh-100 bg-light p-4 animate-fade-in">
            <div className="container-fluid p-0 mx-auto" style={{ maxWidth: '1200px' }}>
                {/* Header Premium */}
                <div className="card border-0 shadow-md mb-4" style={{ borderRadius: '24px', overflow: 'hidden' }}>
                    <div className="card-header bg-white p-4 border-0">
                        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                            <div>
                                <h4 className="fw-bold mb-1" style={{ color: 'var(--text-main)' }}>Base de Données Opérateurs</h4>
                                <p className="text-muted small mb-0">{operateurs.length} enregistrements filtrés</p>
                            </div>
                            <div className="d-flex gap-3">
                                <button className="btn btn-light rounded-pill d-flex align-items-center shadow-sm" onClick={() => navigate('/')}>
                                    🏠 Dashboard
                                </button>
                                <button className="btn btn-primary rounded-pill d-flex align-items-center" onClick={() => navigate('/enregistrement_operateur')}>
                                    + Nouvel Opérateur
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Zone de filtres intégrée */}
                    <div className="card-body bg-light border-top p-4">
                        <div className="row g-3 align-items-end">
                            <div className="col-md-3">
                                <label className="form-label small fw-bold text-muted uppercase">Recherche</label>
                                <input type="text" className="form-control border-0 shadow-sm rounded-pill px-3" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Nom de l'opérateur..." />
                            </div>
                            <div className="col-md-3">
                                <label className="form-label small fw-bold text-muted uppercase">Statut</label>
                                <select className="form-select border-0 shadow-sm rounded-pill px-3" value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}>
                                    <option value="all">Tous les statuts</option>
                                    <option value="Shop">Shop</option>
                                    <option value="Grande cabine">Grande cabine</option>
                                    <option value="Petite cabine">Petite cabine</option>
                                </select>
                            </div>
                            <div className="col-md-2">
                                <div className="form-check form-switch pb-2">
                                    <input className="form-check-input" type="checkbox" id="filterMonnaie" checked={filterMonnaieInternationale} onChange={(e) => setFilterMonnaieInternationale(e.target.checked)} />
                                    <label className="form-check-label fw-bold small text-muted" htmlFor="filterMonnaie">CHANGE</label>
                                </div>
                            </div>
                            <div className="col-md-4 text-end">
                                <div className="d-flex gap-2 justify-content-end">
                                    <select className="form-select border-0 shadow-sm rounded-pill px-3 w-50" value={selectedBatchIndex} onChange={(e) => setSelectedBatchIndex(parseInt(e.target.value))}>
                                        {Array.from({ length: totalBatches }, (_, i) => (
                                            <option key={i} value={i}>Lot {i + 1}</option>
                                        ))}
                                    </select>
                                    <button onClick={handleDownloadBatch} className="btn btn-success rounded-pill px-4 shadow-sm" disabled={isBatchDownloading || totalFiltered === 0}>
                                        {isBatchDownloading ? `Génération ${currentDownloadIndex}...` : `ZIP PDF Lot`}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tableau Premium */}
                <div className="card border-0 shadow-md" style={{ borderRadius: '24px', overflow: 'hidden' }}>
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="bg-white">
                                <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                                    <th className="px-4 py-3 text-muted small fw-bold uppercase">Photo</th>
                                    <th className="py-3 text-muted small fw-bold uppercase">Statut</th>
                                    <th className="py-3 text-muted small fw-bold uppercase text-center">Change</th>
                                    <th className="py-3 text-muted small fw-bold uppercase">Nom & Prénom</th>
                                    <th className="py-3 text-muted small fw-bold uppercase">Téléphone</th>
                                    <th className="py-3 text-muted small fw-bold uppercase">Services</th>
                                    <th className="px-4 py-3 text-muted small fw-bold uppercase text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOperateurs.map((op) => (
                                    <tr key={op._id || op.id} className="border-bottom" style={{ borderColor: '#f8fafc' }}>
                                        <td className="px-4">
                                            <div className="shadow-sm rounded-3 d-flex align-items-center justify-content-center bg-white" style={{ width: '48px', height: '56px', overflow: 'hidden', border: '1px solid #f1f5f9' }}>
                                                {op.photoPath ? (
                                                    <img
                                                        src={`${UPLOADS_BASE_URL}${op.photoPath.startsWith('uploads/') ? op.photoPath : 'uploads/' + op.photoPath}`}
                                                        alt=""
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    />
                                                ) : (
                                                    <span className="text-muted" style={{ fontSize: '10px' }}>N/A</span>
                                                )}
                                            </div>
                                        </td>
                                        <td><span className="badge rounded-pill bg-light text-dark border px-3">{op.statut}</span></td>
                                        <td className="text-center">
                                            {op.monnaieInternationale ?
                                                <span className="badge rounded-pill bg-warning text-dark px-3 shadow-sm">OUI</span> :
                                                <span className="text-muted small">---</span>
                                            }
                                        </td>
                                        <td className="fw-semibold text-main">{op.nomPrenom}</td>
                                        <td className="text-muted">{op.telephone}</td>
                                        <td>
                                            <div className="d-flex gap-1 flex-wrap">
                                                {op.airtelMoney && <span className="badge bg-danger rounded-pill" style={{ fontSize: '9px' }}>Airtel</span>}
                                                {op.mPesa && <span className="badge bg-success rounded-pill" style={{ fontSize: '9px' }}>M-Pesa</span>}
                                                {op.orangeMoney && <span className="badge bg-warning text-dark rounded-pill" style={{ fontSize: '9px' }}>Orange</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 text-center">
                                            <button onClick={() => generatePDFForOperateur(op)} className="btn btn-sm btn-outline-primary rounded-pill px-3 shadow-sm">
                                                Exporter PDF
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredOperateurs.length === 0 && (
                        <div className="text-center py-5 bg-white">
                            <p className="text-muted mb-0">Aucun opérateur ne correspond à vos critères.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
