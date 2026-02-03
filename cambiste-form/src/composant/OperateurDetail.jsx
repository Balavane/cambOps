import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
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
    Eye,
    Edit2,
    Save,
    X
} from 'lucide-react';
import { showAlert, showToast, askConfirmation } from '../utils/ui';
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
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const { register, handleSubmit, reset } = useForm();

    useEffect(() => {
        fetchOperateur();
    }, [operateurId]);

    const fetchOperateur = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/operateurs/${operateurId}`);
            if (!response.ok) throw new Error("Non trouvé");
            const data = await response.json();
            setOp(data);
            reset(data); // Populate form with data
            setLoading(false);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    const handleSave = async (data) => {
        setIsSaving(true);
        try {
            const response = await fetch(`${API_BASE_URL}/operateurs/${operateurId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!response.ok) throw new Error("Erreur lors de la mise à jour");

            const updatedOp = await response.json();
            setOp(updatedOp);
            setIsEditing(false);
            showToast('success', "Mise à jour de l'opérateur réussie !");
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            console.error(error);
            showAlert('error', 'Erreur Mise à jour', error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        const confirmed = await askConfirmation(
            "Supprimer cet opérateur ?",
            "Cette action est irréversible."
        );
        if (!confirmed) return;
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
        <form onSubmit={handleSubmit(handleSave)} className="container py-5 animate-fade-in">
            <div className="d-flex justify-content-between align-items-center mb-5 no-print">
                <button
                    type="button"
                    onClick={() => navigate('/liste_operateur')}
                    className="btn btn-outline-dark rounded-pill d-flex align-items-center gap-2 px-4 shadow-sm hover-lift"
                >
                    <ArrowLeft size={18} />
                    Retour à la liste
                </button>
                <div className="d-flex gap-2">
                    {isEditing ? (
                        <React.Fragment key="editing-buttons">
                            <button
                                type="button"
                                onClick={() => { setIsEditing(false); reset(); }}
                                className="btn btn-outline-dark rounded-pill d-flex align-items-center gap-2 px-4 shadow-sm hover-lift"
                                disabled={isSaving}
                            >
                                <X size={18} />
                                Annuler
                            </button>
                            <button
                                type="submit"
                                className="btn btn-success rounded-pill d-flex align-items-center gap-2 px-4 shadow-sm hover-lift border-0"
                                style={{ background: '#059669' }}
                                disabled={isSaving}
                            >
                                {isSaving ? <span className="spinner-border spinner-border-sm"></span> : <Save size={18} />}
                                Enregistrer
                            </button>
                        </React.Fragment>
                    ) : (
                        <React.Fragment key="view-buttons">
                            <button
                                type="button"
                                onClick={() => setIsEditing(true)}
                                className="btn btn-outline-warning rounded-pill d-flex align-items-center gap-2 px-4 shadow-sm hover-lift"
                            >
                                <Edit2 size={18} />
                                Modifier
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="btn btn-outline-danger rounded-pill d-flex align-items-center gap-2 px-4 shadow-sm hover-lift"
                                disabled={isDeleting}
                            >
                                {isDeleting ? <span className="spinner-border spinner-border-sm"></span> : <Trash2 size={18} />}
                                Supprimer
                            </button>
                            <button
                                type="button"
                                onClick={handlePreviewPDF}
                                className="btn btn-outline-primary rounded-pill d-flex align-items-center gap-2 px-4 shadow-sm hover-lift"
                                disabled={isPreviewing}
                            >
                                {isPreviewing ? <span className="spinner-border spinner-border-sm"></span> : <Eye size={18} />}
                                Aperçu PDF
                            </button>
                            <button
                                type="button"
                                onClick={handleDownloadPDF}
                                className="btn btn-primary rounded-pill d-flex align-items-center gap-2 px-4 shadow-lg hover-lift border-0"
                                style={{ background: 'linear-gradient(90deg, var(--primary) 0%, #dc2626 100%)' }}
                                disabled={isDownloading}
                            >
                                {isDownloading ? <span className="spinner-border spinner-border-sm"></span> : <Download size={18} />}
                                Télécharger
                            </button>
                        </React.Fragment>
                    )}
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
                            {isEditing ? (
                                <input
                                    {...register("nomPrenom")}
                                    className="form-control form-control-lg bg-white bg-opacity-10 text-white border-white border-opacity-25 mb-2 fw-bold text-center text-md-start"
                                    style={{ fontSize: '2.5rem' }}
                                />
                            ) : (
                                <h1 className="display-6 fw-bold mb-2">{op.nomPrenom}</h1>
                            )}
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
                                    <span className="bg-primary rounded-3 me-3 p-2 text-white d-flex align-items-center justify-content-center" style={{ background: 'var(--primary)' }}>
                                        <User size={18} />
                                    </span>
                                    INFORMATIONS PERSONNELLES
                                </h5>
                                <div className="space-y-4">
                                    {[
                                        { label: 'Sexe', key: 'sexe', type: 'select', options: ['Masculin', 'Féminin'] },
                                        { label: 'Nationalité', key: 'nationalite' },
                                        { label: 'Né le', key: 'dateNaissance', type: 'date' },
                                        { label: 'À', key: 'lieuNaissance' },
                                        { label: 'Document', key: 'documentIdentite' },
                                        { label: 'Adresse', key: 'adresse' },
                                    ].map((item, idx) => (
                                        <div key={idx} className="d-flex align-items-center py-2 border-bottom-dashed">
                                            <span className="text-muted small fw-bold text-uppercase w-40">{item.label}</span>
                                            {isEditing ? (
                                                item.type === 'select' ? (
                                                    <select {...register(item.key)} className="form-select form-select-sm border-0 bg-light rounded-pill">
                                                        {item.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                    </select>
                                                ) : (
                                                    <input type={item.type || 'text'} {...register(item.key)} className="form-control form-control-sm border-0 bg-light rounded-pill" />
                                                )
                                            ) : (
                                                <span className="fw-semibold text-dark">
                                                    {item.key === 'dateNaissance' ? (op[item.key] ? new Date(op[item.key]).toLocaleDateString('fr-FR') : 'N/A') : (op[item.key] || 'Non renseigné')}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mb-5">
                                <h5 className="fw-bold mb-4 d-flex align-items-center">
                                    <span className="bg-success rounded-3 me-3 p-2 text-white d-flex align-items-center justify-content-center" style={{ background: '#10b981' }}>
                                        <Smartphone size={18} />
                                    </span>
                                    CONTACT & SERVICES
                                </h5>
                                <div className="p-4 bg-light rounded-4 mb-4">
                                    <div className="d-flex align-items-center mb-3">
                                        <Phone size={16} className="text-primary me-3" />
                                        {isEditing ? (
                                            <input {...register("telephone")} className="form-control form-control-sm border-0 bg-white rounded-pill" />
                                        ) : (
                                            <span className="fw-bold fs-5">{op.telephone}</span>
                                        )}
                                    </div>
                                    <div className="d-flex align-items-center mb-0">
                                        <Mail size={16} className="text-primary me-3" />
                                        {isEditing ? (
                                            <input {...register("email")} className="form-control form-control-sm border-0 bg-white rounded-pill" placeholder="Email (optionnel)" />
                                        ) : (
                                            <span>{op.email || 'N/A'}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="d-flex flex-wrap gap-2">
                                    {["airtelMoney", "mPesa", "orangeMoney", "afrimoney", "venteTelecom", "monnaieInternationale"].map(act => (
                                        isEditing ? (
                                            <div key={act} className="form-check form-check-inline bg-light rounded-pill px-3 py-1 m-0 border border-secondary border-opacity-10">
                                                <input type="checkbox" {...register(act)} className="form-check-input" id={`edit-op-${act}`} />
                                                <label className="form-check-label small" htmlFor={`edit-op-${act}`}>{act.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</label>
                                            </div>
                                        ) : (
                                            op[act] && (
                                                <span key={act} className="badge rounded-pill bg-white border px-3 py-2 text-dark shadow-sm d-flex align-items-center gap-2">
                                                    <CheckCircle size={14} className="text-success" />
                                                    {act.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).replace('internationale', 'étrangère')}
                                                </span>
                                            )
                                        )
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="col-lg-6">
                            <div className="mb-5 p-4 rounded-4 border border-2 border-dashed border-light h-100">
                                <h5 className="fw-bold mb-4 d-flex align-items-center">
                                    <span className="bg-dark rounded-3 me-3 p-2 text-white d-flex align-items-center justify-content-center">
                                        <Shield size={18} />
                                    </span>
                                    ÉTABLISSEMENT & AUTORITÉ
                                </h5>
                                <div className="space-y-4">
                                    <div className="mb-4">
                                        <p className="text-muted small fw-bold text-uppercase mb-1">Nom Commercial</p>
                                        {isEditing ? (
                                            <input {...register("nomEtablissement")} className="form-control border-0 bg-light rounded-pill" placeholder="Nom commercial..." />
                                        ) : (
                                            <p className="fw-bold fs-5 text-primary mb-0">{op.nomEtablissement || 'NON DÉFINI'}</p>
                                        )}
                                    </div>
                                    <div className="mb-4">
                                        <p className="text-muted small fw-bold text-uppercase mb-1">N° Agent / Master</p>
                                        {isEditing ? (
                                            <input {...register("numAgent")} className="form-control form-control-sm border-0 bg-light rounded-pill" />
                                        ) : (
                                            <p className="fw-semibold fs-5 mb-0">{op.numAgent || 'N/A'}</p>
                                        )}
                                    </div>

                                    <div className="mt-5 pt-4 border-top">
                                        <h5 className="fw-bold mb-4 d-flex align-items-center text-secondary">
                                            <span className="bg-secondary rounded-3 me-3 p-2 text-white opacity-50 d-flex align-items-center justify-content-center">
                                                <CheckCircle size={18} />
                                            </span>
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
        </form>
    );
}
