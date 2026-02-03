// App.jsx

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from 'react-router-dom';
import Image from "./assets/image.jpg";

// Importez le composant par défaut et la nouvelle fonction exportée pour le téléchargement
import FicheDetail, { generatePDFForFiche } from "./composant/cambiste";

import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
    Home,
    List,
    UserPlus,
    Search,
    Filter,
    Download,
    LayoutDashboard,
    User,
    Shield,
    Smartphone,
    TrendingUp,
    FileText,
    ArrowLeft
} from 'lucide-react';


// URL de base de votre API
const API_URL = 'http://127.0.0.1:5000/api/fiches';
const UPLOADS_BASE_URL = 'http://127.0.0.1:5000/';

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

                        // Ajout du PDF dans le ZIP
                        zip.file(`${zipFolderName}/Fiche-${cambisteId}-${safeName}.pdf`, pdfArrayBuffer, { binary: true });

                        // Ajout de la photo séparée dans le même ZIP (si disponible)
                        if (fiche.photoIDPath) {
                            try {
                                const photoSrc = fiche.photoIDPath && fiche.photoIDPath.startsWith('uploads/') ? fiche.photoIDPath : 'uploads/' + fiche.photoIDPath;
                                const photoUrl = `${UPLOADS_BASE_URL}${photoSrc}`;
                                const response = await fetch(photoUrl);
                                if (response.ok) {
                                    const blob = await response.blob();
                                    const buffer = await blob.arrayBuffer();
                                    const ext = fiche.photoIDPath.lastIndexOf('.') !== -1
                                        ? fiche.photoIDPath.substring(fiche.photoIDPath.lastIndexOf('.'))
                                        : '.jpg';
                                    zip.file(
                                        `${zipFolderName}/Photo-${cambisteId}-${safeName}${ext}`,
                                        buffer,
                                        { binary: true }
                                    );
                                }
                            } catch (err) {
                                console.error('Erreur photo ZIP:', err);
                            }
                        }
                        successCount++;
                    }
                } catch (err) {
                    console.error("Erreur fiche ZIP:", err);
                }
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
            <div className="d-flex justify-content-center align-items-center min-vh-100 bg-light p-3 animate-fade-in">
                <FicheDetail fiche={selectedFiche} onClose={closeDetails} onFicheDeleted={handleFicheDeleted} />
            </div>
        );
    }

    if (view === "list") {
        const totalFiltered = fichesAffiches.length;
        const startIndex = selectedBatchIndex * DOWNLOAD_BATCH_SIZE;
        const currentBatchSize = Math.min(DOWNLOAD_BATCH_SIZE, totalFiltered - startIndex);

        return (
            <div className="d-flex justify-content-center align-items-start min-vh-100 bg-light p-3 animate-fade-in">
                <div className="card shadow-md w-100 border-0" style={{ maxWidth: '1100px', borderRadius: '24px' }}>

                    <div className="card-header bg-white p-4" style={{ borderRadius: '24px 24px 0 0', borderBottom: '1px solid #f1f5f9' }}>
                        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                            <div>
                                <h5 className="fw-bold mb-1" style={{ color: 'var(--text-main)', fontSize: '1.25rem' }}>
                                    Base de Données Cambistes
                                </h5>
                                <p className="text-muted small mb-0">{fiches.length} enregistrements au total</p>
                            </div>
                            <div className="d-flex gap-2">
                                <button className="btn btn-light rounded-pill d-flex align-items-center" onClick={() => navigate('/')}>
                                    🏠 Dashboard
                                </button>
                                <button className="btn btn-primary rounded-pill d-flex align-items-center" onClick={() => navigate('/nouveau_cambiste')}>
                                    + Nouvelle Fiche
                                </button>
                            </div>
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
                                {isBatchDownloading ? `Lot ${selectedBatchIndex + 1}: ${currentDownloadIndex}/${currentBatchSize}` : `Télécharger ZIP (${totalFiltered})`}
                            </button>
                        </div>
                    </div>

                    <div className="card-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                        {fichesAffiches.length > 0 ? fichesAffiches.map((fiche, index) => (
                            <div key={fiche._id || fiche.id} className="card mb-2 shadow-sm border-0" style={{ backgroundColor: index % 2 === 0 ? lightOrange : '#fff' }}>
                                <div className="card-body p-2 row align-items-center">
                                    <div className="col-auto">
                                        <div className="bg-light rounded d-flex align-items-center justify-content-center" style={{ width: '40px', height: '50px', overflow: 'hidden' }}>
                                            {fiche.photoIDPath ? (
                                                <img
                                                    src={`${UPLOADS_BASE_URL}${fiche.photoIDPath.startsWith('uploads/') ? fiche.photoIDPath : 'uploads/' + fiche.photoIDPath}`}
                                                    alt=""
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <span className="text-muted" style={{ fontSize: '10px' }}>N/A</span>
                                            )}
                                        </div>
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

    // --- RENDER LIST ---
    if (view === "list") {
        return (
            <div className="min-vh-100 bg-light animate-fade-in pb-5">
                {/* Header Page */}
                <div style={{
                    background: `linear-gradient(135deg, var(--primary) 0%, #dc2626 100%)`,
                    padding: '3rem 0',
                    marginBottom: '3rem',
                    borderBottomLeftRadius: '30px',
                    borderBottomRightRadius: '30px',
                    boxShadow: 'var(--shadow-lg)'
                }}>
                    <div className="container">
                        <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center">
                                <button className="btn btn-outline-light rounded-circle me-3 p-0 d-flex align-items-center justify-content-center" onClick={() => navigate('/')} style={{ width: '45px', height: '45px' }}>
                                    <Home size={24} />
                                </button>
                                <div>
                                    <h1 className="text-white fw-bold mb-1 h3">Base de Données Cambistes</h1>
                                    <p className="text-white-50 mb-0 small">Gérez et exportez les fiches d'identification</p>
                                </div>
                            </div>
                            <button className="btn btn-light rounded-pill shadow-sm d-flex align-items-center gap-2" onClick={() => navigate('/nouveau_cambiste')}>
                                <UserPlus size={18} />
                                Nouveau Cambiste
                            </button>
                        </div>
                    </div>
                </div>

                <div className="container px-3">
                    <div className="card border-0 shadow-lg overflow-hidden" style={{ borderRadius: '24px' }}>
                        {/* Barre d'outils List */}
                        <div className="card-header bg-white border-0 p-4">
                            <div className="row g-3 align-items-center">
                                <div className="col-md-4">
                                    <div className="input-group bg-light rounded-pill px-3 py-1">
                                        <span className="input-group-text bg-transparent border-0 text-muted"><Search size={18} /></span>
                                        <input type="text" className="form-control bg-transparent border-0 shadow-none ps-0" placeholder="Rechercher par nom..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="input-group bg-light rounded-pill px-3 py-1">
                                        <span className="input-group-text bg-transparent border-0 text-muted"><Shield size={18} /></span>
                                        <input type="text" className="form-control bg-transparent border-0 shadow-none ps-0" placeholder="Association..." value={filterAssociation} onChange={(e) => setFilterAssociation(e.target.value)} />
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="input-group bg-light rounded-pill px-3 py-1">
                                        <span className="input-group-text bg-transparent border-0 text-muted"><Filter size={18} /></span>
                                        <select className="form-select bg-transparent border-0 shadow-none ps-0" value={filterActivity} onChange={(e) => setFilterActivity(e.target.value)}>
                                            <option value="all">Toutes les activités</option>
                                            {["airtelMoney", "mPesa", "orangeMoney", "afrimoney", "changeManuel"].map(act => (
                                                <option key={act} value={act}>{act}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="col-md-2">
                                    <button onClick={handleDownloadSelectedBatch} className="btn btn-primary rounded-pill w-100 py-2 shadow-sm d-flex align-items-center justify-content-center gap-2" disabled={isBatchDownloading || totalFiltered === 0} style={{ background: 'var(--primary)', border: 'none' }}>
                                        {isBatchDownloading ? (
                                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                        ) : (
                                            <Download size={18} />
                                        )}
                                        {isBatchDownloading ? 'ZIP...' : 'Exporter ZIP'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Liste */}
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="ps-4 py-3 text-muted small fw-bold text-uppercase border-0">Cambiste</th>
                                        <th className="py-3 text-muted small fw-bold text-uppercase border-0">Association</th>
                                        <th className="py-3 text-muted small fw-bold text-uppercase border-0">Contact</th>
                                        <th className="py-3 text-muted small fw-bold text-uppercase border-0 text-center">Statut</th>
                                        <th className="pe-4 py-3 text-muted small fw-bold text-uppercase border-0 text-end">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {fichesAffiches.length > 0 ? fichesAffiches.map((fiche) => (
                                        <tr key={fiche._id || fiche.id} className="border-bottom-light">
                                            <td className="ps-4 py-3">
                                                <div className="d-flex align-items-center">
                                                    <div className="rounded-circle me-3 overflow-hidden shadow-sm border border-2 border-white" style={{ width: '45px', height: '45px', backgroundColor: '#f1f5f9' }}>
                                                        {fiche.photoIDPath ? (
                                                            <img
                                                                src={`${UPLOADS_BASE_URL}${fiche.photoIDPath.startsWith('uploads/') ? fiche.photoIDPath : 'uploads/' + fiche.photoIDPath}`}
                                                                alt=""
                                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                            />
                                                        ) : (
                                                            <div className="h-100 d-flex align-items-center justify-content-center text-muted"><User size={20} /></div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h6 className="mb-0 fw-bold text-dark">{fiche.nomPrenom}</h6>
                                                        <small className="text-muted">ID: {formatCambisteId(fiche._id || fiche.id)}</small>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                <div className="d-flex align-items-center">
                                                    <Shield size={14} className="me-2 text-primary opacity-75" />
                                                    <span className="fw-medium">{fiche.associationNom || 'Indépendant'}</span>
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                <div className="d-flex flex-column">
                                                    <span className="small text-dark fw-medium">{fiche.telephone}</span>
                                                    <span className="small text-muted" style={{ fontSize: '11px' }}>{fiche.email || 'Pas d\'email'}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 text-center">
                                                <span className="badge rounded-pill bg-success bg-opacity-10 text-success px-3 py-2 border border-success border-opacity-25" style={{ fontSize: '11px' }}>Identifié</span>
                                            </td>
                                            <td className="pe-4 py-3 text-end">
                                                <button onClick={() => viewDetails(fiche)} className="btn btn-outline-primary btn-sm rounded-pill px-4 hover-lift">
                                                    Consulter
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="5" className="text-center py-5">
                                                <div className="py-4">
                                                    <List size={40} className="text-muted opacity-25 mb-3" />
                                                    <p className="text-muted mb-0">Aucun cambiste trouvé pour ces critères.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- RENDER FORM ---
    return (
        <div className="min-vh-100 bg-light animate-fade-in pb-5">
            {/* Header Formulaire */}
            <div style={{
                background: `linear-gradient(135deg, var(--primary) 0%, #dc2626 100%)`,
                padding: '3rem 0',
                marginBottom: '3rem',
                borderBottomLeftRadius: '30px',
                borderBottomRightRadius: '30px',
                boxShadow: 'var(--shadow-lg)'
            }}>
                <div className="container">
                    <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center">
                            <button className="btn btn-outline-light rounded-circle me-3 p-0 d-flex align-items-center justify-content-center" onClick={() => navigate('/')} style={{ width: '45px', height: '45px' }}>
                                <ArrowLeft size={24} />
                            </button>
                            <div>
                                <h1 className="text-white fw-bold mb-1 h3">Nouvelle Fiche Cambiste</h1>
                                <p className="text-white-50 mb-0 small">Remplissez les informations d'identification</p>
                            </div>
                        </div>
                        <div className="d-flex gap-2">
                            <button className="btn btn-white-glass rounded-pill show-sm d-flex align-items-center gap-2" onClick={() => navigate('/liste_cambiste')} style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(10px)' }}>
                                <List size={18} />
                                Voir la Liste
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container px-3">
                <form onSubmit={handleSubmit(onSubmit)} style={{ maxWidth: '900px', margin: '0 auto' }}>

                    {/* SECTION 1: PHOTO & IDENTITÉ */}
                    <div className="card border-0 shadow-md mb-4" style={{ borderRadius: '24px' }}>
                        <div className="card-body p-4 p-md-5">
                            <h5 className="fw-bold mb-4 d-flex align-items-center">
                                <div className="bg-primary rounded-3 me-3 p-2" style={{ backgroundColor: 'rgba(234, 88, 12, 0.1)' }}>
                                    <User size={20} className="text-primary" />
                                </div>
                                I. IDENTITÉ DU CAMBISTE
                            </h5>

                            <div className="row g-4 align-items-center mb-5">
                                <div className="col-md-4 text-center">
                                    <div className="mx-auto mb-3 shadow-sm position-relative" style={{
                                        width: '150px',
                                        height: '180px',
                                        borderRadius: '16px',
                                        overflow: 'hidden',
                                        backgroundColor: '#f8fafc',
                                        border: '2px dashed #cbd5e1'
                                    }}>
                                        {photoIDURL ? (
                                            <img src={photoIDURL} alt="Aperçu" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted">
                                                <User size={32} className="mb-2 opacity-50" />
                                                <span style={{ fontSize: '10px', fontWeight: 'bold' }}>PHOTO D'IDENTITÉ</span>
                                            </div>
                                        )}
                                        <input type="file" {...register("photoID", { onChange: handleImageUpload })} accept="image/*" className="position-absolute w-100 h-100 top-0 start-0 opacity-0 cursor-pointer" style={{ cursor: 'pointer' }} />
                                    </div>
                                    <button type="button" className="btn btn-outline-primary btn-sm rounded-pill w-100 shadow-none">Choisir une image</button>
                                </div>
                                <div className="col-md-8">
                                    <div className="mb-4">
                                        <label className="form-label small fw-bold text-muted text-uppercase mb-2">Nom et Prénom complet</label>
                                        <input type="text" {...register("nomPrenom", { required: true })} className={`form-control border-0 bg-light rounded-pill px-4 py-3 ${errors.nomPrenom ? 'is-invalid border-danger' : ''}`} placeholder="Ex: Joseph KABILA" />
                                    </div>
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="form-label small fw-bold text-muted text-uppercase mb-2">Sexe</label>
                                            <div className="d-flex gap-4 p-2 bg-light rounded-pill px-4">
                                                <div className="form-check mb-0">
                                                    <input className="form-check-input" type="radio" value="M" {...register("sexe")} id="sexe-m" defaultChecked />
                                                    <label className="form-check-label fw-medium" htmlFor="sexe-m">Masculin</label>
                                                </div>
                                                <div className="form-check mb-0">
                                                    <input className="form-check-input" type="radio" value="F" {...register("sexe")} id="sexe-f" />
                                                    <label className="form-check-label fw-medium" htmlFor="sexe-f">Féminin</label>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label small fw-bold text-muted text-uppercase mb-2">Date de naissance</label>
                                            <input type="date" {...register("dateNaissance")} className="form-control border-0 bg-light rounded-pill px-4 py-3" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="row g-4">
                                <div className="col-md-6">
                                    <label className="form-label small fw-bold text-muted text-uppercase mb-2">Lieu de naissance</label>
                                    <input type="text" {...register("lieuNaissance")} className="form-control border-0 bg-light rounded-pill px-4 py-3" placeholder="Ville de naissance" />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label small fw-bold text-muted text-uppercase mb-2">Nationalité</label>
                                    <input type="text" {...register("nationalite")} className="form-control border-0 bg-light rounded-pill px-4 py-3" placeholder="Nationalité" />
                                </div>
                                <div className="col-12">
                                    <label className="form-label small fw-bold text-muted text-uppercase mb-2">Adresse de résidence actuelle</label>
                                    <input type="text" {...register("adresse")} className="form-control border-0 bg-light rounded-pill px-4 py-3" placeholder="Numéro, Avenue, Quartier, Commune..." />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label small fw-bold text-muted text-uppercase mb-2">Document d'identité (Type & N°)</label>
                                    <input type="text" {...register("documentIdentite")} className="form-control border-0 bg-light rounded-pill px-4 py-3" placeholder="Ex: Carte d'électeur N°..." />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label small fw-bold text-muted text-uppercase mb-2">Téléphone principal</label>
                                    <input type="tel" {...register("telephone", { required: true })} className="form-control border-0 bg-light rounded-pill px-4 py-3 font-monospace" placeholder="+243..." />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: ASSOCIATION */}
                    <div className="card border-0 shadow-md mb-4" style={{ borderRadius: '24px' }}>
                        <div className="card-body p-4 p-md-5">
                            <h5 className="fw-bold mb-4 d-flex align-items-center">
                                <div className="bg-primary rounded-3 me-3 p-2" style={{ backgroundColor: 'rgba(234, 88, 12, 0.1)' }}>
                                    <Shield size={20} className="text-primary" />
                                </div>
                                II. RATTACHEMENT PROFESSIONNEL
                            </h5>
                            <div className="row g-4">
                                <div className="col-12">
                                    <label className="form-label small fw-bold text-muted text-uppercase mb-2">Nom de l’Association (Garante)</label>
                                    <input type="text" {...register("associationNom")} className="form-control border-0 bg-light rounded-pill px-4 py-3" placeholder="Ex: ACOB / INDÉPENDANT" />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label small fw-bold text-muted text-uppercase mb-2">N° d’enregistrement Association</label>
                                    <input type="text" {...register("associationNumero")} className="form-control border-0 bg-light rounded-pill px-4 py-3" />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label small fw-bold text-muted text-uppercase mb-2">Responsable Association</label>
                                    <input type="text" {...register("associationResponsable")} className="form-control border-0 bg-light rounded-pill px-4 py-3" />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label small fw-bold text-muted text-uppercase mb-2">Contact Association</label>
                                    <input type="tel" {...register("associationContact")} className="form-control border-0 bg-light rounded-pill px-4 py-3" placeholder="+243..." />
                                </div>
                                <div className="col-md-12">
                                    <label className="form-label small fw-bold text-muted text-uppercase mb-2">Nature de la Garantie versée</label>
                                    <input type="text" {...register("garantieNature")} className="form-control border-0 bg-light rounded-pill px-4 py-3" placeholder="Caution solidaire, immobilière..." />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: ACTIVITÉS */}
                    <div className="card border-0 shadow-md mb-4" style={{ borderRadius: '24px' }}>
                        <div className="card-body p-4 p-md-5">
                            <h5 className="fw-bold mb-4 d-flex align-items-center text-success">
                                <div className="bg-success rounded-3 me-3 p-2" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                                    <TrendingUp size={20} className="text-success" />
                                </div>
                                III. ACTIVITÉS & SERVICES EXERCÉS
                            </h5>

                            <div className="mb-4 p-4 bg-light rounded-4">
                                <p className="fw-bold small text-muted text-uppercase mb-3">Plateformes de monnaie électronique :</p>
                                <div className="d-flex flex-wrap gap-2">
                                    {["airtelMoney", "mPesa", "orangeMoney", "afrimoney"].map(service => (
                                        <div key={service} className="form-check custom-checkbox-card">
                                            <input className="form-check-input d-none" type="checkbox" {...register(service)} id={service} />
                                            <label className="form-check-label px-3 py-2 border rounded-pill fw-semibold bg-white cursor-pointer" htmlFor={service} style={{ cursor: 'pointer' }}>
                                                {service.replace('M', ' M')}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="row g-4 mb-4">
                                <div className="col-md-6">
                                    <div className="p-3 border rounded-4 bg-white shadow-sm d-flex align-items-center">
                                        <div className="form-check form-switch mb-0">
                                            <input className="form-check-input" type="checkbox" {...register("changeManuel")} id="change-manual" />
                                            <label className="form-check-label fw-bold" htmlFor="change-manual" style={{ cursor: 'pointer' }}>Change Manuel Automatisé</label>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="p-3 border rounded-4 bg-white shadow-sm d-flex align-items-center">
                                        <div className="form-check form-switch mb-0">
                                            <input className="form-check-input" type="checkbox" {...register("venteTelecom")} id="vente-sim" />
                                            <label className="form-check-label fw-bold" htmlFor="vente-sim" style={{ cursor: 'pointer' }}>Vente Produits Télécom</label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="row g-4">
                                <div className="col-12">
                                    <label className="form-label small fw-bold text-muted text-uppercase mb-2">Lieu habituel d'exploitation</label>
                                    <input type="text" {...register("lieuActivite")} className="form-control border-0 bg-light rounded-pill px-4 py-3" placeholder="Avenue, Entrée Shop, Stand..." />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label small fw-bold text-muted text-uppercase mb-2">Volume mensuel estimé ($)</label>
                                    <input type="text" {...register("volume")} className="form-control border-0 bg-light rounded-pill px-4 py-3" placeholder="0.00" />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label small fw-bold text-muted text-uppercase mb-2">Ancienneté (Années/Mois)</label>
                                    <input type="text" {...register("anciennete")} className="form-control border-0 bg-light rounded-pill px-4 py-3" />
                                </div>
                                <div className="col-12">
                                    <label className="form-label small fw-bold text-muted text-uppercase mb-2">Autres activités (Précisez)</label>
                                    <input type="text" {...register("autresActivites")} className="form-control border-0 bg-light rounded-pill px-4 py-3" placeholder="Ex: Transfert d'argent local..." />
                                </div>
                                <div className="col-12">
                                    <label className="form-label small fw-bold text-muted text-uppercase mb-2">Précisions supplémentaires / Sources de provenance des fonds</label>
                                    <textarea {...register("sources")} className="form-control border-0 bg-light rounded-4 px-4 py-3 shadow-none" rows="3" placeholder="Notes additionnelles..."></textarea>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 4: ENGAGEMENT */}
                    <div className="card border-0 shadow-md mb-4 bg-primary bg-opacity-10" style={{ borderRadius: '24px', border: '1px solid rgba(234, 88, 12, 0.1)' }}>
                        <div className="card-body p-4 p-md-5">
                            <h5 className="fw-bold mb-4 d-flex align-items-center">
                                <div className="bg-primary rounded-3 me-3 p-2">
                                    <FileText size={20} className="text-white" />
                                </div>
                                IV. CERTIFICATION & ENGAGEMENT
                            </h5>
                            <div className="mb-4 line-height-lg p-3 bg-white rounded-4 border">
                                <p className="mb-3">
                                    Je soussigné(e) <input type="text" {...register("soussigne")} className="form-control d-inline border-0 border-bottom border-primary rounded-0 px-2 font-monospace fw-bold" style={{ width: '250px', backgroundColor: 'transparent' }} placeholder="Nom Complet" />, certifie sur l'honneur l'exactitude des informations fournies ci-dessus et m'engage à respecter les régulations d'AREFA.
                                </p>
                                <hr className="my-4 opacity-10" />
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label small fw-bold text-muted">Nom de l'Association qui atteste</label>
                                        <input type="text" {...register("nomAssociationAtteste")} className="form-control border-0 bg-light rounded-pill px-3 py-2 small" placeholder="Nom de l'entité" />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label small fw-bold text-muted">Nom du Responsable qui atteste</label>
                                        <input type="text" {...register("nomResponsableAssociation")} className="form-control border-0 bg-light rounded-pill px-3 py-2 small" placeholder="Signature autorisée" />
                                    </div>
                                </div>
                            </div>
                            <div className="row g-4">
                                <div className="col-md-6">
                                    <label className="form-label small fw-bold text-muted text-uppercase mb-2">Fait à</label>
                                    <input type="text" {...register("lieuFait")} className="form-control border-0 bg-white rounded-pill px-4 py-3 shadow-sm" defaultValue="Goma" />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label small fw-bold text-muted text-uppercase mb-2">Date du jour</label>
                                    <input type="date" {...register("dateEngagement")} className="form-control border-0 bg-white rounded-pill px-4 py-3 shadow-sm" defaultValue={new Date().toISOString().split('T')[0]} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 5: RÉSERVÉ */}
                    <div className="card border-0 shadow-lg mb-5 bg-dark" style={{ borderRadius: '24px' }}>
                        <div className="card-body p-4 p-md-5">
                            <h5 className="fw-bold mb-4 d-flex align-items-center text-warning">
                                <div className="bg-warning rounded-3 me-3 p-2 text-dark">
                                    <Shield size={20} />
                                </div>
                                RÉSERVÉ À L’AUTORITÉ AREFA
                            </h5>
                            <div className="row g-4">
                                <div className="col-md-4">
                                    <label className="form-label small text-white-50 text-uppercase">N° d'enregistrement AREFA</label>
                                    <input type="text" {...register("numEnregistrement")} className="form-control bg-transparent border-secondary text-white rounded-pill px-4 py-2" />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label small text-white-50 text-uppercase">Agent de Recensement</label>
                                    <input type="text" {...register("agentNom")} className="form-control bg-transparent border-secondary text-white rounded-pill px-4 py-2" />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label small text-white-50 text-uppercase">Date de Validation</label>
                                    <input type="date" {...register("dateAutorite")} className="form-control bg-transparent border-secondary text-white rounded-pill px-4 py-2" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action */}
                    <div className="text-center pb-5">
                        <button type="submit" className="btn btn-primary btn-lg rounded-pill px-5 py-3 shadow-lg d-inline-flex align-items-center gap-3 border-0" style={{ background: 'linear-gradient(90deg, var(--primary) 0%, #dc2626 100%)' }}>
                            <LayoutDashboard size={20} />
                            Enregistrer la Fiche Cambiste
                        </button>
                    </div>

                </form>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-checkbox-card input:checked + label {
                    background-color: var(--primary) !important;
                    color: white !important;
                    border-color: var(--primary) !important;
                    box-shadow: var(--shadow-sm);
                }
                .cursor-pointer { cursor: pointer; }
                .line-height-lg { line-height: 2; }
                .hover-lift:hover { transform: translateY(-2px); transition: all 0.2s; }
            `}} />
        </div>
    );
}

function formatCambisteId(id) {
    if (!id) return 'N/A';
    const str = String(id);
    return str.slice(-4).toUpperCase();
}