import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from 'react-router-dom';
import {
    ArrowRight,
    Smartphone,
    Users,
    TrendingUp,
    Building2,
    DollarSign
} from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:5000/api';

export default function OperateurForm() {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const navigate = useNavigate();

    // État pour la prévisualisation de l'image
    const [photoPreview, setPhotoPreview] = useState(null);

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const onFormSubmit = async (data) => {
        const formData = new FormData();

        // On ajoute chaque champ à FormData
        Object.keys(data).forEach(key => {
            if (key === 'photoOperateur' && data[key] instanceof FileList && data[key].length > 0) {
                formData.append('photoOperateur', data[key][0]);
            } else if (key !== 'photoOperateur') {
                formData.append(key, data[key]);
            }
        });

        try {
            console.log("Envoi du formulaire vers:", `${API_BASE_URL}/operateurs`);
            const response = await fetch(`${API_BASE_URL}/operateurs`, {
                method: 'POST',
                body: formData
            });

            console.log("Réponse reçue:", response.status, response.statusText);

            if (response.ok) {
                alert("Opérateur enregistré avec succès !");
                navigate('/liste_operateur');
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error("Erreur serveur détaillée:", errorData);
                alert(`Erreur serveur: ${errorData.message || response.statusText}`);
            }
        } catch (error) {
            console.error("Erreur d'envoi:", error);
            alert("Erreur de connexion au serveur.");
        }
    };

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
                            <button className="btn btn-outline-light rounded-circle me-3 p-0 d-flex align-items-center justify-content-center" onClick={() => navigate(-1)} style={{ width: '45px', height: '45px' }}>
                                <ArrowRight size={24} style={{ transform: 'rotate(180deg)' }} />
                            </button>
                            <div>
                                <h1 className="text-white fw-bold mb-1 h3">Enregistrement Opérateur</h1>
                                <p className="text-white-50 mb-0 small">Veuillez remplir toutes les sections avec précision</p>
                            </div>
                        </div>
                        <button className="btn btn-light rounded-pill shadow-sm" onClick={() => navigate('/')}>
                            🏠 Retour Accueil
                        </button>
                    </div>
                </div>
            </div>

            <div className="container px-3">
                <form onSubmit={handleSubmit(onFormSubmit)} style={{ maxWidth: '900px', margin: '0 auto' }}>

                    {/* SECTION 1: PHOTO & STATUT */}
                    <div className="card border-0 shadow-md mb-4" style={{ borderRadius: '20px' }}>
                        <div className="card-body p-4 p-md-5">
                            <h5 className="fw-bold mb-4 d-flex align-items-center">
                                <div className="bg-primary rounded-3 me-3 p-2" style={{ backgroundColor: 'rgba(234, 88, 12, 0.1)' }}>
                                    <Smartphone size={20} className="text-primary" />
                                </div>
                                1. STATUT & PHOTO
                            </h5>
                            <div className="row g-4 align-items-center">
                                <div className="col-md-4 text-center">
                                    <div className="mx-auto mb-3 shadow-sm position-relative" style={{
                                        width: '150px',
                                        height: '180px',
                                        borderRadius: '16px',
                                        overflow: 'hidden',
                                        backgroundColor: '#f8fafc',
                                        border: '2px dashed #cbd5e1'
                                    }}>
                                        {photoPreview ? (
                                            <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted">
                                                <Users size={32} className="mb-2 opacity-50" />
                                                <span style={{ fontSize: '10px', fontWeight: 'bold' }}>Photo d'identité</span>
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        id="photoInput"
                                        className="d-none"
                                        accept="image/*"
                                        {...register("photoOperateur")}
                                        onChange={(e) => {
                                            handlePhotoChange(e);
                                            const { onChange } = register("photoOperateur");
                                            onChange(e);
                                        }}
                                    />
                                    <label htmlFor="photoInput" className="btn btn-outline-primary btn-sm rounded-pill w-100" style={{ cursor: 'pointer' }}>
                                        Choisir une photo
                                    </label>
                                </div>
                                <div className="col-md-8">
                                    <div className="mb-4 p-4 bg-light rounded-4">
                                        <label className="form-label fw-bold small text-muted text-uppercase mb-3 d-block">Type d'Établissement</label>
                                        <div className="d-flex flex-wrap gap-3">
                                            {["Shop", "Grande cabine", "Petite cabine"].map(item => (
                                                <div key={item} className="form-check custom-radio-card">
                                                    <input className="form-check-input d-none" type="radio" value={item} {...register("statut")} id={item} defaultChecked={item === "Shop"} />
                                                    <label className="form-check-label px-3 py-2 border rounded-pill fw-semibold" htmlFor={item} style={{ cursor: 'pointer' }}>
                                                        {item}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="p-4 border rounded-4 bg-white shadow-sm">
                                        <div className="form-check form-switch mb-1">
                                            <input className="form-check-input" type="checkbox" {...register("monnaieInternationale")} id="intl" />
                                            <label className="form-check-label fw-bold text-primary" htmlFor="intl" style={{ cursor: 'pointer' }}>Activités de transfert d'argent à l'etrange</label>
                                        </div>
                                        <p className="text-muted small mb-0">Cochez si l'opérateur effectue des opérations de monnaies étrangères.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: IDENTITÉ */}
                    <div className="card border-0 shadow-md mb-4" style={{ borderRadius: '20px' }}>
                        <div className="card-body p-4 p-md-5">
                            <h5 className="fw-bold mb-4 d-flex align-items-center">
                                <div className="bg-primary rounded-3 me-3 p-2" style={{ backgroundColor: 'rgba(234, 88, 12, 0.1)' }}>
                                    <Users size={20} className="text-primary" />
                                </div>
                                2. IDENTITÉ DE L’OPÉRATEUR
                            </h5>
                            <div className="row g-4">
                                <div className="col-md-8">
                                    <label className="form-label small fw-bold text-muted text-uppercase">Nom et Prénom</label>
                                    <input type="text" className="form-control rounded-pill border-0 bg-light px-4 py-3 shadow-none" {...register("nomPrenom", { required: true })} placeholder="Ex: Jean-Luc KABILA" />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label small fw-bold text-muted text-uppercase">Sexe</label>
                                    <select className="form-select rounded-pill border-0 bg-light px-4 py-3 shadow-none" {...register("sexe")}>
                                        <option value="M">Masculin (M)</option>
                                        <option value="F">Féminin (F)</option>
                                    </select>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label small fw-bold text-muted text-uppercase">Date de naissance</label>
                                    <input type="date" className="form-control rounded-pill border-0 bg-light px-4 py-3 shadow-none" {...register("dateNaissance")} />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label small fw-bold text-muted text-uppercase">Lieu de naissance</label>
                                    <input type="text" className="form-control rounded-pill border-0 bg-light px-4 py-3 shadow-none" {...register("lieuNaissance")} placeholder="Ville de naissance" />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label small fw-bold text-muted text-uppercase">Nationalité</label>
                                    <input type="text" className="form-control rounded-pill border-0 bg-light px-4 py-3 shadow-none" {...register("nationalite")} placeholder="Ex: Congolaise" />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label small fw-bold text-muted text-uppercase">Document d'identité (Type & N°)</label>
                                    <input type="text" className="form-control rounded-pill border-0 bg-light px-4 py-3 shadow-none" {...register("documentIdentite")} placeholder="Ex: Passeport N°1234567" />
                                </div>
                                <div className="col-md-12">
                                    <label className="form-label small fw-bold text-muted text-uppercase">Adresse Complète</label>
                                    <input type="text" className="form-control rounded-pill border-0 bg-light px-4 py-3 shadow-none" {...register("adresse")} placeholder="N°, Avenue, Quartier, Commune..." />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label small fw-bold text-muted text-uppercase">Téléphone</label>
                                    <input type="tel" className="form-control rounded-pill border-0 bg-light px-4 py-3 shadow-none" {...register("telephone", { required: true })} placeholder="+243..." />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label small fw-bold text-muted text-uppercase">Email (facultatif)</label>
                                    <input type="email" className="form-control rounded-pill border-0 bg-light px-4 py-3 shadow-none" {...register("email")} placeholder="contact@exemple.cd" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: SERVICES */}
                    <div className="card border-0 shadow-md mb-4" style={{ borderRadius: '20px' }}>
                        <div className="card-body p-4 p-md-5">
                            <h5 className="fw-bold mb-4 d-flex align-items-center text-success">
                                <div className="bg-success rounded-3 me-3 p-2" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                                    <TrendingUp size={20} className="text-success" />
                                </div>
                                3. ACTIVITÉS & SERVICES
                            </h5>
                            <div className="mb-4">
                                <label className="form-label small fw-bold text-muted text-uppercase">Nom de l'Établissement (Shop / Cabinet)</label>
                                <input type="text" className="form-control rounded-pill border-1 border-primary border-opacity-10 px-4 py-3" {...register("nomEtablissement")} placeholder="Nom commercial" />
                            </div>
                            <p className="fw-bold small text-muted text-uppercase mb-3">Plateformes de Paiement :</p>
                            <div className="d-flex flex-wrap gap-2 p-3 bg-light rounded-4 mb-4">
                                {["airtelMoney", "mPesa", "orangeMoney", "afrimoney"].map(service => (
                                    <div key={service} className="form-check custom-checkbox-card">
                                        <input className="form-check-input d-none" type="checkbox" {...register(service)} id={service} />
                                        <label className="form-check-label px-3 py-2 border rounded-pill fw-semibold" htmlFor={service} style={{ cursor: 'pointer' }}>
                                            {service.replace('M', ' M')}
                                        </label>
                                    </div>
                                ))}
                            </div>
                            <div className="row g-4 align-items-center">
                                <div className="col-md-6">
                                    <div className="form-check form-switch pt-2">
                                        <input className="form-check-input" type="checkbox" {...register("venteTelecom")} id="telecom" />
                                        <label className="form-check-label fw-bold" htmlFor="telecom" style={{ cursor: 'pointer' }}>Vente de Produits Télécom</label>
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label small fw-bold text-muted text-uppercase">ID Agent / N° Master</label>
                                    <input type="text" className="form-control rounded-pill border-0 bg-light px-4 py-3" {...register("numAgent")} placeholder="ID Unique de l'agent" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 4: RÉSERVÉ */}
                    <div className="card border-0 shadow-lg mb-5 bg-dark" style={{ borderRadius: '20px' }}>
                        <div className="card-body p-4 p-md-5">
                            <h5 className="fw-bold mb-4 d-flex align-items-center text-warning">
                                <div className="bg-warning rounded-3 me-3 p-2 text-dark">
                                    <Building2 size={20} />
                                </div>
                                RÉSERVÉ À L’AUTORITÉ AREFA
                            </h5>
                            <div className="row g-4">
                                <div className="col-md-4">
                                    <label className="form-label small text-white-50 text-uppercase">N° d'enregistrement</label>
                                    <input type="text" className="form-control bg-transparent border-secondary text-white rounded-pill px-4 py-2" {...register("numEnregistrement")} />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label small text-white-50 text-uppercase">Agent Validateur</label>
                                    <input type="text" className="form-control bg-transparent border-secondary text-white rounded-pill px-4 py-2" {...register("agentNom")} />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label small text-white-50 text-uppercase">Date de Validation</label>
                                    <input type="date" className="form-control bg-transparent border-secondary text-white rounded-pill px-4 py-2" {...register("dateAutorite")} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="text-center pb-5">
                        <button type="submit" className="btn btn-primary btn-lg rounded-pill px-5 py-3 shadow-lg d-inline-flex align-items-center gap-2 border-0" style={{ background: 'linear-gradient(90deg, var(--primary) 0%, #dc2626 100%)' }}>
                            <DollarSign size={20} />
                            Finaliser l'Enregistrement
                        </button>
                    </div>

                </form>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-radio-card input:checked + label {
                    background-color: var(--primary) !important;
                    color: white !important;
                    border-color: var(--primary) !important;
                    box-shadow: 0 4px 6px -1px rgba(234, 88, 12, 0.4);
                }
                .custom-checkbox-card input:checked + label {
                    background-color: var(--primary) !important;
                    color: white !important;
                    border-color: var(--primary) !important;
                    box-shadow: 0 4px 6px -1px rgba(234, 88, 12, 0.4);
                }
                .cursor-pointer { cursor: pointer; }
                .text-uppercase { text-transform: uppercase; letter-spacing: 0.5px; }
            `}} />
        </div>
    );
}