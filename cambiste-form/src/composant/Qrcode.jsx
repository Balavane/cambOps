// App.jsx

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from 'react-router-dom'; 
import Image from "./assets/image.jpg"; 

// Importez le composant par défaut et la nouvelle fonction exportée pour le téléchargement
import FicheDetail, { generatePDFForFiche } from "./composant/cambiste"; 

// NOUVEAUX IMPORTS : pour le téléchargement en masse
import JSZip from 'jszip';
import { saveAs } from 'file-saver';


// URL de base de votre API
const API_URL = 'http://localhost:5000/api/fiches';
const UPLOADS_BASE_URL = 'http://localhost:5000/'; 

// Styles pour la cohérence visuelle
const primaryColor = '#ea580c';
const lightOrange = '#fed7aa';

// --- CONSTANTE POUR LA TAILLE DES LOTS DE TÉLÉCHARGEMENT ---
const DOWNLOAD_BATCH_SIZE = 20;


// App reçoit maintenant une prop 'view' (soit "form", "list" ou "detail")
export default function App({ view = "form" }) {
    const navigate = useNavigate();
    
    // Récupération du paramètre de route 'ficheId'
    const { ficheId } = useParams(); 
    
    const { register, handleSubmit, reset, formState: { errors } } = useForm();
    
    const [photoIDURL, setPhotoIDURL] = useState(null); 
    const [fiches, setFiches] = useState([]); 
    const [selectedFiche, setSelectedFiche] = useState(null); 
    const [isLoading, setIsLoading] = useState(false);
    
    // --- ÉTATS POUR LE FILTRAGE ET LE TÉLÉCHARGEMENT ---
    const [downloadDate, setDownloadDate] = useState('');
    const [searchTerm, setSearchTerm] = useState(''); // Filtre par Nom
    const [filterAssociation, setFilterAssociation] = useState(''); // Filtre par Association
    const [filterActivity, setFilterActivity] = useState('all'); // Filtre par Activité
    
    const [isBatchDownloading, setIsBatchDownloading] = useState(false);
    const [fichesToDownloadFullList, setFichesToDownloadFullList] = useState([]);
    const [totalBatches, setTotalBatches] = useState(0); 
    const [selectedBatchIndex, setSelectedBatchIndex] = useState(0); 
    const [currentDownloadIndex, setCurrentDownloadIndex] = useState(0); 


    // Fonction pour récupérer toutes les fiches
    const fetchFiches = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error("Échec de la récupération des fiches.");
            }
            const data = await response.json();
            // Tri décroissant par date
            data.sort((a, b) => new Date(b.dateEnregistrement) - new Date(a.dateEnregistrement)); 
            setFiches(data);
        } catch (error) {
            console.error("Erreur lors du chargement des fiches:", error);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Fonction pour récupérer les détails d'une fiche
    const fetchFicheDetails = async (id) => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/${id}`);
            if (!response.ok) {
                throw new Error("Fiche non trouvée.");
            }
            const data = await response.json();
            setSelectedFiche(data);
        } catch (error) {
            console.error(`Erreur chargement fiche ${id}:`, error);
            navigate('/liste_cambiste'); 
        } finally {
            setIsLoading(false);
        }
    };


    useEffect(() => {
        if (view === "list") {
            fetchFiches();
        } else if (view === "detail" && ficheId) {
            fetchFicheDetails(ficheId);
        }
    }, [view, ficheId]); 


    // --- LOGIQUE DE FILTRAGE COMBINÉE ---
    const fichesAffiches = fiches.filter(fiche => {
        // 1. Filtre par Date
        const ficheDate = fiche.dateEnregistrement ? String(fiche.dateEnregistrement).split('T')[0] : '';
        const matchDate = !downloadDate || ficheDate === downloadDate;

        // 2. Recherche par Nom
        const matchSearch = !searchTerm || 
            fiche.nomPrenom?.toLowerCase().includes(searchTerm.toLowerCase());

        // 3. Filtre par Association
        const matchAssociation = !filterAssociation || 
            fiche.associationNom?.toLowerCase().includes(filterAssociation.toLowerCase());

        // 4. Filtre par Activité
        let matchActivity = true;
        if (filterActivity !== 'all') {
            matchActivity = fiche[filterActivity] === true || fiche[filterActivity] === 'on';
        }

        return matchDate && matchSearch && matchAssociation && matchActivity;
    });

    // Mise à jour des lots pour le ZIP quand les filtres changent
    useEffect(() => {
        const total = fichesAffiches.length;
        const batches = Math.ceil(total / DOWNLOAD_BATCH_SIZE);
        setFichesToDownloadFullList(fichesAffiches);
        setTotalBatches(batches);
        setSelectedBatchIndex(0);
        setCurrentDownloadIndex(0);
    }, [downloadDate, searchTerm, filterAssociation, filterActivity, fiches]);


    const handleDownloadSelectedBatch = () => {
        if (fichesToDownloadFullList.length === 0) {
            alert("Aucune fiche ne correspond aux critères.");
            return;
        }
        
        const startIndex = selectedBatchIndex * DOWNLOAD_BATCH_SIZE;
        const batchNumber = selectedBatchIndex + 1;
        const endIndex = Math.min(startIndex + DOWNLOAD_BATCH_SIZE, fichesToDownloadFullList.length);
        
        if (window.confirm(`Télécharger le Lot ${batchNumber} (${startIndex + 1} à ${endIndex}) ?`)) {
            processBatchDownload(fichesToDownloadFullList, startIndex, batchNumber);
        }
    }
    
    const processBatchDownload = async (fullList, startIndex, batchNumber) => {
        setIsBatchDownloading(true);
        setCurrentDownloadIndex(0); 
        const endIndex = Math.min(startIndex + DOWNLOAD_BATCH_SIZE, fullList.length);
        const currentBatch = fullList.slice(startIndex, endIndex);
        
        try {
            const zip = new JSZip(); 
            const zipFolderName = `Fiches_AREFA_Lot_${batchNumber}`;
            let successCount = 0;

            for (const [index, fiche] of currentBatch.entries()) {
                setCurrentDownloadIndex(index + 1);
                try {
                    const pdfArrayBuffer = await generatePDFForFiche(fiche, false); 
                    if (pdfArrayBuffer) {
                        const cambisteId = String(fiche._id || fiche.id).slice(-4); 
                        const safeName = fiche.nomPrenom ? fiche.nomPrenom.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_') : 'Inconnu';
                        zip.file(`${zipFolderName}/Fiche-${cambisteId}-${safeName}.pdf`, pdfArrayBuffer, { binary: true });
                        successCount++;
                    }
                } catch (err) { console.error(err); }
            }
            
            if (successCount > 0) {
                const content = await zip.generateAsync({ type: "blob" });
                saveAs(content, `${zipFolderName}.zip`); 
            }
        } catch (error) {
            alert(`Erreur ZIP: ${error.message}`);
        } finally {
            setIsBatchDownloading(false);
        }
    };

    const onSubmit = async (data) => {
        const formData = new FormData();
        Object.keys(data).forEach(key => {
            const value = data[key];
            if (key === 'photoID' && value instanceof FileList && value.length > 0) {
                formData.append(key, value[0]); 
            } else if (value !== undefined && value !== null && value !== false && value !== '') {
                formData.append(key, value === true ? 'on' : value);
            }
        });

        try {
            const response = await fetch(API_URL, { method: 'POST', body: formData });
            if (!response.ok) throw new Error("Échec de l'enregistrement.");
            navigate('/liste_cambiste'); 
            reset(); 
            setPhotoIDURL(null); 
        } catch (error) {
            alert(`Erreur: ${error.message}`);
        }
    };
    
    const handleImageUpload = (event) => {
        const file = event.target.files[0];
        if (file) setPhotoIDURL(URL.createObjectURL(file));
        else setPhotoIDURL(null);
    };

    // CORRECTION ICI : Extraction propre de l'ID pour la navigation
    const viewDetails = (fiche) => {
        const id = fiche._id || fiche.id;
        if (id) {
            navigate(`/fiche/${id}`);
        } else {
            alert("Erreur: ID de fiche introuvable.");
        }
    };

    const closeDetails = () => navigate('/liste_cambiste');
    const handleFicheDeleted = (deletedId) => setFiches(fiches.filter(f => (f._id || f.id) !== deletedId));


    if (view === "detail") {
        if (isLoading) return <div className="text-center p-5">Chargement...</div>;
        return (
            <div className="d-flex justify-content-center align-items-center min-vh-100 bg-light p-3">
                <FicheDetail fiche={selectedFiche} onClose={closeDetails} onFicheDeleted={handleFicheDeleted} />
            </div>
        );
    }

    if (view === "list") {
        const totalFiltered = fichesAffiches.length;
        const startIndex = selectedBatchIndex * DOWNLOAD_BATCH_SIZE;
        const currentBatchSize = Math.min(DOWNLOAD_BATCH_SIZE, totalFiltered - startIndex);

        return (
            <div className="d-flex justify-content-center align-items-center min-vh-100 bg-light p-3">
                <div className="card shadow-lg w-100" style={{ maxWidth: '1000px', borderRadius: '1.5rem' }}>
                    
                    <div className="modal-header bg-white" style={{ borderTopLeftRadius: '1.5rem', borderTopRightRadius: '1.5rem', display: 'block', padding: '1.5rem' }}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h5 className="modal-title fw-bold" style={{ color: primaryColor }}>
                                Base de Données Cambistes ({fiches.length})
                            </h5>
                            <button className="btn btn-sm text-white rounded-pill" style={{ backgroundColor: primaryColor }} onClick={() => navigate('/')}>
                                + Nouvelle Fiche
                            </button>
                        </div>

                        {/* BARRE DE FILTRES CORRIGÉE */}
                        <div className="row g-2 mb-3 p-3 bg-light rounded-3 border">
                            <div className="col-md-4">
                                <label className="form-label small fw-bold">Nom</label>
                                <input type="text" className="form-control form-control-sm rounded-pill" placeholder="Nom..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label small fw-bold">Association</label>
                                <input type="text" className="form-control form-control-sm rounded-pill" placeholder="Association..." value={filterAssociation} onChange={(e) => setFilterAssociation(e.target.value)} />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label small fw-bold">Activité</label>
                                <select className="form-select form-select-sm rounded-pill" value={filterActivity} onChange={(e) => setFilterActivity(e.target.value)}>
                                    <option value="all">Toutes</option>
                                    <option value="airtelMoney">Airtel Money</option>
                                    <option value="mPesa">M-Pesa</option>
                                    <option value="orangeMoney">Orange Money</option>
                                    <option value="afrimoney">Afrimoney</option>
                                    <option value="changeManuel">Change Manuel</option>
                                </select>
                            </div>
                        </div>

                        <div className="p-3 border rounded-3 d-flex flex-wrap align-items-center bg-white">
                            <label className="fw-semibold me-2 small">Date :</label>
                            <input type="date" className="form-control form-control-sm rounded-pill me-3" style={{ maxWidth: '140px' }} value={downloadDate} onChange={(e) => setDownloadDate(e.target.value)} />
                            
                            {totalBatches > 0 && (
                                <>
                                    <label className="fw-semibold me-2 small">Lot :</label>
                                    <select className="form-select form-select-sm rounded-pill me-3" style={{ maxWidth: '140px' }} value={selectedBatchIndex} onChange={(e) => setSelectedBatchIndex(parseInt(e.target.value))}>
                                        {Array.from({ length: totalBatches }, (_, i) => (
                                            <option key={i} value={i}>Lot {i + 1} ({i * DOWNLOAD_BATCH_SIZE + 1} - {Math.min((i + 1) * DOWNLOAD_BATCH_SIZE, totalFiltered)})</option>
                                        ))}
                                    </select>
                                </>
                            )}
                            
                            <button onClick={handleDownloadSelectedBatch} className="btn btn-sm btn-success rounded-pill" disabled={isBatchDownloading || totalFiltered === 0}>
                                {isBatchDownloading ? `Lot ${selectedBatchIndex+1}: ${currentDownloadIndex}/${currentBatchSize}` : `Télécharger ZIP (${totalFiltered})`}
                            </button>
                        </div>
                    </div>
                    
                    <div className="card-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                        {fichesAffiches.length > 0 ? fichesAffiches.map((fiche, index) => (
                            <div key={fiche._id || fiche.id} className="card mb-2 shadow-sm border-0" style={{ backgroundColor: index % 2 === 0 ? lightOrange : '#fff' }}>
                                <div className="card-body p-2 row align-items-center">
                                    <div className="col-auto">
                                        <img src={fiche.photoIDPath ? `${UPLOADS_BASE_URL}${fiche.photoIDPath}` : ''} alt="" style={{ width: '40px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />
                                    </div>
                                    <div className="col">
                                        <h6 className="mb-0 fw-bold">{fiche.nomPrenom}</h6>
                                        <small className="text-muted">{fiche.associationNom || 'Indépendant'} | {fiche.telephone}</small>
                                    </div>
                                    <div className="col-auto">
                                        <button onClick={() => viewDetails(fiche)} className="btn btn-sm text-white rounded-pill" style={{ backgroundColor: primaryColor }}>Détails</button>
                                    </div>
                                </div>
                            </div>
                        )) : <div className="text-center p-5 text-muted">Aucun résultat.</div>}
                    </div>
                </div>
            </div>
        );
    }

    // FORMULAIRE (Section III, IV, V, VI intégrées)
    return (
        <div className="d-flex justify-content-center align-items-center min-vh-100 bg-light p-3">
            <div className="card shadow-lg w-100" style={{ maxWidth: '900px', borderRadius: '1.5rem' }}>
                <div className="position-relative text-white text-center p-4" style={{ backgroundColor: primaryColor, borderTopLeftRadius: '1.5rem', borderTopRightRadius: '1.5rem' }}>
                    <img src={Image} alt="Logo" className="position-absolute top-50 start-0 translate-middle-y m-3" style={{ height: '70px', width: '70px', objectFit: 'contain' }} />
                    <h1 className="fs-4 fw-bold mb-1">FICHE D’ENREGISTREMENT CAMBISTE</h1>
                    <p className="fs-6 fw-light fst-italic"> Zone libérée AFC/M23</p>
                    <button onClick={() => navigate('/liste_cambiste')} className="btn btn-sm btn-light position-absolute top-0 end-0 m-3 rounded-pill shadow-sm">Voir la Liste</button>
                </div>

                <div className="card-body p-4 p-md-5">
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <h2 className="fs-4 fw-bold pb-2 mb-4" style={{ color: primaryColor, borderBottom: `2px solid ${lightOrange}` }}>I. Identité</h2>
                        <div className="row g-3">
                            <div className="col-12 d-flex flex-column align-items-center mb-3">
                                <div style={{ width: '150px', height: '180px', border: `2px dashed ${primaryColor}`, borderRadius: '0.5rem', overflow: 'hidden', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
                                    {photoIDURL ? <img src={photoIDURL} alt="Aperçu" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span className="text-muted small">Photo</span>}
                                    <input type="file" {...register("photoID", { onChange: handleImageUpload })} accept="image/*" className="form-control position-absolute opacity-0 w-100 h-100 top-0 start-0" style={{ cursor: 'pointer' }} />
                                </div>
                            </div>
                            <div className="col-12">
                                <label className="form-label fw-semibold">Nom et Prénom</label>
                                <input type="text" {...register("nomPrenom", { required: true })} className={`form-control rounded-pill ${errors.nomPrenom ? 'is-invalid' : ''}`} />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label fw-semibold">Sexe</label>
                                <div className="d-flex gap-3"><input type="radio" value="M" {...register("sexe")} /> M <input type="radio" value="F" {...register("sexe")} /> F</div>
                            </div>
                            <div className="col-md-4"><label className="form-label fw-semibold">Lieu de naissance</label><input type="text" {...register("lieuNaissance")} className="form-control rounded-pill" /></div>
                            <div className="col-md-4"><label className="form-label fw-semibold">Date de naissance</label><input type="date" {...register("dateNaissance")} className="form-control rounded-pill" /></div>
                            <div className="col-md-6"><label className="form-label fw-semibold">Nationalité</label><input type="text" {...register("nationalite")} className="form-control rounded-pill" /></div>
                            <div className="col-md-6"><label className="form-label fw-semibold">Document d’identité</label><input type="text" {...register("documentIdentite")} className="form-control rounded-pill" /></div>
                            <div className="col-12"><label className="form-label fw-semibold">Adresse</label><input type="text" {...register("adresse")} className="form-control rounded-pill" /></div>
                            <div className="col-md-6"><label className="form-label fw-semibold">Téléphone</label><input type="tel" {...register("telephone", { required: true })} className="form-control rounded-pill" /></div>
                            <div className="col-md-6"><label className="form-label fw-semibold">E-mail</label><input type="email" {...register("email")} className="form-control rounded-pill" /></div>
                        </div>

                        <h2 className="fs-4 fw-bold pt-4 pb-2 mb-4 mt-5" style={{ color: primaryColor, borderBottom: `2px solid ${lightOrange}` }}>II. Association</h2>
                        <div className="row g-3">
                            <div className="col-12"><label className="form-label fw-semibold">Nom de l’Association</label><input type="text" {...register("associationNom")} className="form-control rounded-pill" /></div>
                            <div className="col-md-6"><label className="form-label fw-semibold">N° d’enregistrement</label><input type="text" {...register("associationNumero")} className="form-control rounded-pill" /></div>
                            <div className="col-md-6"><label className="form-label fw-semibold">Nom du Responsable</label><input type="text" {...register("associationResponsable")} className="form-control rounded-pill" /></div>
                            <div className="col-md-6"><label className="form-label fw-semibold">Contact Association</label><input type="text" {...register("associationContact")} className="form-control rounded-pill" /></div>
                            <div className="col-md-6"><label className="form-label fw-semibold">Nature Garantie</label><input type="text" {...register("garantieNature")} className="form-control rounded-pill" /></div>
                        </div>

                        <h2 className="fs-4 fw-bold pt-4 pb-2 mb-4 mt-5" style={{ color: primaryColor, borderBottom: `2px solid ${lightOrange}` }}>III. Activités</h2>
                        <div className="d-flex flex-column gap-3">
                            <div className="form-check"><input type="checkbox" {...register("changeManuel")} className="form-check-input" /> <label className="form-check-label fw-semibold">Change manuel</label></div>
                            <div className="card p-3 border-light shadow-sm bg-white">
                                <p className="fw-semibold mb-2">Monnaie électronique :</p>
                                <div className="row g-2">
                                    <div className="col-md-3"><input type="checkbox" {...register("airtelMoney")} /> Airtel Money</div>
                                    <div className="col-md-3"><input type="checkbox" {...register("mPesa")} /> M-Pesa</div>
                                    <div className="col-md-3"><input type="checkbox" {...register("orangeMoney")} /> Orange Money</div>
                                    <div className="col-md-3"><input type="checkbox" {...register("afrimoney")} /> Afrimoney</div>
                                </div>
                            </div>
                            <div className="form-check"><input type="checkbox" {...register("venteTelecom")} className="form-check-input" /> <label className="form-check-label fw-semibold">Vente Telecom</label></div>
                            <input type="text" placeholder="Autres activités" {...register("autresActivites")} className="form-control rounded-pill" />
                        </div>

                        <h2 className="fs-4 fw-bold pt-4 pb-2 mb-4 mt-5" style={{ color: primaryColor, borderBottom: `2px solid ${lightOrange}` }}>IV. Détails Activité</h2>
                        <div className="row g-3">
                            <div className="col-12"><label className="form-label fw-semibold">Lieu habituel</label><input type="text" {...register("lieuActivite")} className="form-control rounded-pill" /></div>
                            <div className="col-12"><label className="form-label fw-semibold">Ancienneté</label><input type="text" {...register("anciennete")} className="form-control rounded-pill" /></div>
                            <div className="col-12"><label className="form-label fw-semibold">Volume estimé</label><input type="text" {...register("volume")} className="form-control rounded-pill" /></div>
                            <div className="col-12"><label className="form-label fw-semibold">Sources</label><textarea {...register("sources")} className="form-control rounded-3" rows="3"></textarea></div>
                        </div>

                        <h2 className="fs-4 fw-bold pt-4 pb-2 mb-4 mt-5" style={{ color: primaryColor, borderBottom: `2px solid ${lightOrange}` }}>V. Engagements</h2>
                        <div className="mb-4 bg-light p-3 rounded-3 border">
                            <p>Je soussigné(e) : <input type="text" {...register("soussigne")} className="form-control d-inline w-auto border-0 border-bottom px-2" style={{ backgroundColor: 'transparent' }} /> certifie l'exactitude des informations.</p>
                            <div className="row g-3">
                                <div className="col-md-6"><label className="small fw-bold">Association (Garant)</label><input type="text" {...register("nomAssociationAtteste")} className="form-control rounded-pill" /></div>
                                <div className="col-md-6"><label className="small fw-bold">Responsable Association</label><input type="text" {...register("nomResponsableAssociation")} className="form-control rounded-pill" /></div>
                                <div className="col-md-6"><label className="small fw-bold">Fait à</label><input type="text" {...register("lieuFait")} className="form-control rounded-pill" /></div>
                                <div className="col-md-6"><label className="small fw-bold">Le (Date)</label><input type="date" {...register("dateEngagement")} className="form-control rounded-pill" /></div>
                            </div>
                        </div>

                        <h2 className="fs-4 fw-bold pt-4 pb-2 mb-4 mt-5" style={{ color: primaryColor, borderBottom: `2px solid ${lightOrange}` }}>VI. Autorité</h2>
                        <div className="row g-3">
                            <div className="col-12"><label className="form-label fw-semibold">N° d’enregistrement AREFA</label><input type="text" {...register("numEnregistrement")} className="form-control rounded-pill" /></div>
                            <div className="col-md-6"><label className="form-label fw-semibold">Nom agent</label><input type="text" {...register("agentNom")} className="form-control rounded-pill" /></div>
                            <div className="col-md-6"><label className="form-label fw-semibold">Date</label><input type="date" {...register("dateAutorite")} className="form-control rounded-pill" /></div>
                        </div>
                        
                        <div className="text-center mt-5">
                            <button type="submit" className="btn btn-primary btn-lg rounded-pill shadow-sm" style={{ backgroundColor: primaryColor, borderColor: primaryColor }}>Soumettre la Fiche</button>
                        </div>
                    </form>
                </div>
                <div className="card-footer text-center text-muted small border-top bg-light p-4">
                    <p className="mb-1">AREFA - Direction Générale</p>
                    <p className="mb-0">+243 995 568 661</p>
                </div>
            </div>
        </div>
    );
}