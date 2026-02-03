import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Download,
    Trash2,
    User,
    Shield,
    Smartphone,
    Calendar,
    MapPin,
    Mail,
    Phone,
    FileText,
    TrendingUp,
    CheckCircle,
    Eye
} from 'lucide-react';
import { generatePDFForOperateur } from './OperateurList';

const API_BASE_URL = 'http://127.0.0.1:5000/api';
const UPLOADS_BASE_URL = 'http://127.0.0.1:5000/';

export default function OperateurDetail() {
    const { operateurId } = useParams();
    const navigate = useNavigate();
    const [op, setOp] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isPreviewing, setIsPreviewing] = useState(false);

    useEffect(() => {
        fetchOperateur();
    }, [operateurId]);

    const fetchOperateur = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/operateurs/${operateurId}`);
            if (!response.ok) throw new Error("Non trouvé");
            const data = await response.json();
            setOp(data);
            setLoading(false);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Supprimer définitivement cet opérateur ?")) return;
        setIsDeleting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/operateurs/${operateurId}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                navigate('/liste_operateur');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDownloadPDF = async () => {
        setIsDownloading(true);
        try {
            await generatePDFForOperateur(op, true);
        } catch (error) {
            console.error(error);
        } finally {
            setIsDownloading(false);
        }
    };

    const handlePreviewPDF = async () => {
        setIsPreviewing(true);
        try {
            // Pour l'aperçu, on utilise shouldSave = false pour obtenir l'ArrayBuffer
            const buffer = await generatePDFForOperateur(op, false);
            const blob = new Blob([buffer], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (error) {
            console.error(error);
        } finally {
            setIsPreviewing(false);
        }
    };

    if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></div>;
    if (!op) return <div className="text-center py-5">Opérateur non trouvé.</div>;

    return (
        <div className="container py-5 animate-fade-in">
            <div className="d-flex justify-content-between align-items-center mb-5 no-print">
                <button
                    onClick={() => navigate('/liste_operateur')}
                    className="btn btn-outline-dark rounded-pill d-flex align-items-center gap-2 px-4 shadow-sm hover-lift"
                >
                    <ArrowLeft size={18} />
                    Retour à la liste
                </button>
                <div className="d-flex gap-2">
                    <button
                        onClick={handleDelete}
                        className="btn btn-outline-danger rounded-pill d-flex align-items-center gap-2 px-4 shadow-sm hover-lift"
                        disabled={isDeleting}
                    >
                        {isDeleting ? <span className="spinner-border spinner-border-sm"></span> : <Trash2 size={18} />}
                        Supprimer
                    </button>
                    <button
                        onClick={handlePreviewPDF}
                        className="btn btn-outline-primary rounded-pill d-flex align-items-center gap-2 px-4 shadow-sm hover-lift"
                        disabled={isPreviewing}
                    >
                        {isPreviewing ? <span className="spinner-border spinner-border-sm"></span> : <Eye size={18} />}
                        Aperçu PDF
                    </button>
                    <button
                        onClick={handleDownloadPDF}
                        className="btn btn-primary rounded-pill d-flex align-items-center gap-2 px-4 shadow-lg hover-lift border-0"
                        style={{ background: 'linear-gradient(90deg, var(--primary) 0%, #dc2626 100%)' }}
                        disabled={isDownloading}
                    >
                        {isDownloading ? <span className="spinner-border spinner-border-sm"></span> : <Download size={18} />}
                        Télécharger
                    </button>
                </div>
            </div>

            <div className="card border-0 shadow-lg overflow-hidden" style={{ borderRadius: '30px' }}>
                <div style={{
                    background: `linear-gradient(135deg, var(--primary) 0%, #dc2626 100%)`,
                    padding: '3rem 2rem',
                    color: 'white'
                }}>
                    <div className="row align-items-center">
                        <div className="col-md-auto text-center text-md-start mb-4 mb-md-0">
                            <div className="bg-white p-1 rounded-4 shadow-lg d-inline-block overflow-hidden" style={{ width: '160px', height: '190px' }}>
                                {op.photoPath ? (
                                    <img
                                        src={`${UPLOADS_BASE_URL}${op.photoPath.startsWith('uploads/') ? op.photoPath : 'uploads/' + op.photoPath}`}
                                        alt="Photo"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }}
                                    />
                                ) : (
                                    <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted bg-light" style={{ borderRadius: '12px' }}>
                                        <User size={40} className="opacity-20" />
                                        <span className="small mt-2 fw-bold opacity-30">PHOTO N/A</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="col-md text-center text-md-start ps-md-4">
                            <span className="badge rounded-pill bg-white bg-opacity-20 px-3 py-2 mb-3 border border-white border-opacity-25" style={{ backdropFilter: 'blur(10px)' }}>
                                <Shield size={14} className="me-2" />
                                FICHE OPÉRATEUR AREFA
                            </span>
                            <h1 className="display-6 fw-bold mb-2">{op.nomPrenom}</h1>
                            <div className="d-flex flex-wrap justify-content-center justify-content-md-start gap-3 opacity-90">
                                <span className="d-flex align-items-center gap-2 small">
                                    <FileText size={16} />
                                    Statut: {op.statut}
                                </span>
                                <span className="d-flex align-items-center gap-2 small">
                                    <Calendar size={16} />
                                    Enregistré le {new Date(op.dateEnregistrement).toLocaleDateString('fr-FR')}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card-body p-4 p-md-5 bg-white">
                    <div className="row g-5">
                        <div className="col-lg-6">
                            <div className="mb-5">
                                <h5 className="fw-bold mb-4 d-flex align-items-center">
                                    <div className="bg-primary rounded-3 me-3 p-2 text-white" style={{ background: 'var(--primary)' }}>
                                        <User size={18} />
                                    </div>
                                    INFORMATIONS PERSONNELLES
                                </h5>
                                <div className="space-y-4">
                                    {[
                                        { label: 'Sexe', value: op.sexe, icon: <User size={14} /> },
                                        { label: 'Nationalité', value: op.nationalite, icon: <Shield size={14} /> },
                                        { label: 'Né le', value: op.dateNaissance ? new Date(op.dateNaissance).toLocaleDateString('fr-FR') : 'N/A', icon: <Calendar size={14} /> },
                                        { label: 'À', value: op.lieuNaissance, icon: <MapPin size={14} /> },
                                        { label: 'Document', value: op.documentIdentite, icon: <FileText size={14} /> },
                                        { label: 'Adresse', value: op.adresse, icon: <MapPin size={14} /> },
                                    ].map((item, idx) => (
                                        <div key={idx} className="d-flex align-items-center py-2 border-bottom-dashed">
                                            <span className="text-muted small fw-bold text-uppercase w-40">{item.label}</span>
                                            <span className="fw-semibold text-dark">{item.value || 'Non renseigné'}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mb-5">
                                <h5 className="fw-bold mb-4 d-flex align-items-center">
                                    <div className="bg-success rounded-3 me-3 p-2 text-white" style={{ background: '#10b981' }}>
                                        <Smartphone size={18} />
                                    </div>
                                    CONTACT & SERVICES
                                </h5>
                                <div className="p-4 bg-light rounded-4 mb-4">
                                    <div className="d-flex align-items-center mb-3">
                                        <Phone size={16} className="text-primary me-3" />
                                        <span className="fw-bold fs-5">{op.telephone}</span>
                                    </div>
                                    {op.email && (
                                        <div className="d-flex align-items-center mb-0">
                                            <Mail size={16} className="text-primary me-3" />
                                            <span>{op.email}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="d-flex flex-wrap gap-2">
                                    {["airtelMoney", "mPesa", "orangeMoney", "afrimoney", "venteTelecom", "monnaieInternationale"].map(act => (
                                        op[act] && (
                                            <span key={act} className="badge rounded-pill bg-white border px-3 py-2 text-dark shadow-sm d-flex align-items-center gap-2">
                                                <CheckCircle size={14} className="text-success" />
                                                {act.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).replace('internationale', 'étrangère')}
                                            </span>
                                        )
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="col-lg-6">
                            <div className="mb-5 p-4 rounded-4 border border-2 border-dashed border-light h-100">
                                <h5 className="fw-bold mb-4 d-flex align-items-center">
                                    <div className="bg-dark rounded-3 me-3 p-2 text-white">
                                        <Shield size={18} />
                                    </div>
                                    ÉTABLISSEMENT & AUTORITÉ
                                </h5>
                                <div className="space-y-4">
                                    <div className="mb-4">
                                        <p className="text-muted small fw-bold text-uppercase mb-1">Nom Commercial</p>
                                        <p className="fw-bold fs-5 text-primary mb-0">{op.nomEtablissement || 'NON DÉFINI'}</p>
                                    </div>
                                    <div className="mb-4">
                                        <p className="text-muted small fw-bold text-uppercase mb-1">N° Agent / Master</p>
                                        <p className="fw-semibold fs-5 mb-0">{op.numAgent || 'N/A'}</p>
                                    </div>

                                    <div className="mt-5 pt-4 border-top">
                                        <h5 className="fw-bold mb-4 d-flex align-items-center text-secondary">
                                            <div className="bg-secondary rounded-3 me-3 p-2 text-white opacity-50">
                                                <CheckCircle size={18} />
                                            </div>
                                            VALIDATION AREFA
                                        </h5>
                                        <div className="space-y-3">
                                            <div className="d-flex justify-content-between align-items-center">
                                                <span className="text-muted small fw-bold text-uppercase">N° AREFA</span>
                                                <span className="badge bg-dark rounded-pill px-3">{op.numEnregistrement || 'EN ATTENTE'}</span>
                                            </div>
                                            <div className="d-flex justify-content-between align-items-center">
                                                <span className="text-muted small fw-bold text-uppercase">Validateur</span>
                                                <span className="fw-medium text-dark">{op.agentNom || 'Système'}</span>
                                            </div>
                                            <div className="d-flex justify-content-between align-items-center">
                                                <span className="text-muted small fw-bold text-uppercase">Date</span>
                                                <span className="fw-medium text-dark">{op.dateAutorite ? new Date(op.dateAutorite).toLocaleDateString('fr-FR') : '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card-footer bg-light border-0 p-4 text-center">
                    <p className="mb-0 text-muted small">
                        Fiche d'identification opérateur certifiée par l'Autorité AREFA.
                    </p>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .space-y-4 > * + * { margin-top: 1rem; }
                .space-y-3 > * + * { margin-top: 0.75rem; }
                .border-bottom-dashed { border-bottom: 1px dashed #e2e8f0; }
                .w-40 { width: 40%; }
                .hover-lift:hover { transform: translateY(-3px); transition: all 0.3s ease; }
            `}} />
        </div>
    );
}
