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
    LayoutDashboard,
    Eye
} from 'lucide-react';

// URL de base pour servir les images et l'API
const UPLOADS_BASE_URL = 'http://127.0.0.1:5000/';
const API_URL = 'http://127.0.0.1:5000/api/fiches';

const primaryColor = '#ea580c';
const lightOrange = '#fed7aa';

// --- Fonctions Utilitaires ---

const formatKey = (key) => key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();

const formatCambisteId = (id) => {
    if (!id) return '00/AREFA';
    // Utiliser les 4 derniers caractères de l'ID pour la démo si c'est un ID long
    const baseId = String(id).slice(-4);
    return `${baseId}/AREFA`;
};

const formatValue = (key, value) => {
    if (value === true || value === 'on') return 'Oui';
    if (value === false || value === 'off') return 'Non';
    if (value === null || value === undefined || value === "") return 'N/A';
    if (key.startsWith('date') && value) {
        try {
            const dateOnly = String(value).split('T')[0];
            return new Date(dateOnly).toLocaleDateString('fr-FR');
        } catch {
            return value;
        }
    }
    return value;
};

// Définition de la structure des sections (utilisée pour l'affichage et le PDF)
const SECTIONS = {
    'I. Identité du Cambiste': ['nomPrenom', 'sexe', 'lieuNaissance', 'dateNaissance', 'nationalite', 'documentIdentite', 'adresse', 'telephone', 'email'],
    'II. Association de rattachement': ['associationNom', 'associationNumero', 'associationResponsable', 'associationContact', 'garantieNature'],
    'III. Activités exercées': ['changeManuel', 'airtelMoney', 'mPesa', 'orangeMoney', 'afrimoney', 'venteTelecom', 'autresActivites'],
    'IV. Détails sur l’activité': ['lieuActivite', 'anciennete', 'volume', 'sources'],
    'V. Engagements': ['soussigne', 'nomAssociationAtteste', 'nomResponsableAssociation', 'lieuFait', 'dateEngagement'],
    'VI. Réservé à l’Autorité': ['numEnregistrement', 'agentNom', 'dateAutorite'],
};


// ------------------------------------------------------------------------------------
// Fonction de Génération PDF MODIFIÉE pour retourner ArrayBuffer (pour le ZIP)
// ------------------------------------------------------------------------------------

/**
 * Génère un PDF pour une fiche donnée.
 * @param {object} fiche - Les données de la fiche à imprimer.
 * @param {boolean} [shouldSave=true] - Si true, télécharge directement; sinon, retourne l'ArrayBuffer.
 * @returns {Promise<ArrayBuffer | void>} L'ArrayBuffer du PDF si shouldSave est false.
 */
export const generatePDFForFiche = async (fiche, shouldSave = true) => {
    const id = fiche._id || fiche.id;
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = '210mm';
    document.body.appendChild(tempContainer);

    const contentHtml = `
        <div id="fiche-imprimable-temp" style="width: 210mm; padding: 10mm; background-color: white;">
            <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid ${lightOrange}; padding-bottom: 10px;">
                <h1 style="font-size: 24px; font-weight: bold; color: ${primaryColor};">FICHE D'ENREGISTREMENT CAMBISTE</h1>
                <p style="font-size: 12px; color: #6c757d;"> Num. Enregistrement : ${formatCambisteId(id)} - Date d'enregistrement : ${formatValue('date', fiche.dateEnregistrement)}</p>
            </div>
            
            <div style="text-align: center; margin-bottom: 20px;">
                <h5 style="font-weight: bold; color: ${primaryColor};">Photo d'identité</h5>
                ${fiche.photoIDPath ?
            `<img src="${UPLOADS_BASE_URL}${fiche.photoIDPath.startsWith('uploads/') ? fiche.photoIDPath : 'uploads/' + fiche.photoIDPath}" alt="Photo d'identité" crossOrigin="anonymous" style="width: 150px; height: 180px; object-fit: cover; border: 1px solid #ccc;"/>`
            : `<div style="width: 150px; height: 180px; margin: 0 auto; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; color: #6c757d;">Photo N/A</div>`}
            </div>
            
            ${Object.entries(SECTIONS).map(([sectionTitle, keys]) => `
                <div style="margin-bottom: 20px;">
                    <h2 style="font-size: 18px; font-weight: bold; padding-bottom: 5px; margin-top: 15px; color: ${primaryColor}; border-bottom: 2px solid ${lightOrange};">${sectionTitle}</h2>
                    <div style="display: flex; flex-wrap: wrap;">
                        ${keys.map(key => {
                const value = fiche[key];
                return `
                                <div style="width: 50%; padding-right: 10px; box-sizing: border-box; font-size: 11px; margin-top: 5px;">
                                    <strong style="color: #6c757d;">${formatKey(key)} :</strong> <span style="color: #212529;">${formatValue(key, value)}</span>
                                </div>
                            `;
            }).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    tempContainer.innerHTML = contentHtml;
    const input = tempContainer.querySelector('#fiche-imprimable-temp');

    // Attendre que les images soient chargées
    const images = tempContainer.querySelectorAll('img');
    const imagePromises = Array.from(images).map(img => {
        return new Promise(resolve => {
            if (img.complete && img.naturalHeight !== 0) {
                resolve();
            } else {
                img.onload = () => resolve();
                img.onerror = () => {
                    console.error("Erreur chargement image Cambiste PDF:", img.src);
                    resolve();
                };
            }
        });
    });
    await Promise.all(imagePromises);
    await new Promise(resolve => setTimeout(resolve, 500)); // Sécurité

    try {
        const canvas = await html2canvas(input, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const imgWidth = pdfWidth - 20;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let position = 10;
        let heightLeft = imgHeight;

        pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft >= 0) {
            position = heightLeft - pdfHeight + 10;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;
        }

        const filename = `Fiche-Cambiste-${formatCambisteId(id).replace('/', '-')}.pdf`;

        if (shouldSave) {
            pdf.save(filename);

            // TÉLÉCHARGEMENT AUTOMATIQUE DE LA PHOTO SÉPARÉE
            if (fiche.photoIDPath) {
                const photoSrc = fiche.photoIDPath.startsWith('uploads/') ? fiche.photoIDPath : 'uploads/' + fiche.photoIDPath;
                const photoUrl = `${UPLOADS_BASE_URL}${photoSrc}`;
                const safeName = fiche.nomPrenom ? fiche.nomPrenom.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_') : 'Cambiste';

                const link = document.createElement('a');
                link.href = photoUrl;
                link.download = `Photo-${safeName}${fiche.photoIDPath.lastIndexOf('.') !== -1
                    ? fiche.photoIDPath.substring(fiche.photoIDPath.lastIndexOf('.'))
                    : '.jpg'}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } else {
            return pdf.output('arraybuffer');
        }

    } catch (error) {
        console.error("Erreur durant la génération PDF:", error);
        throw new Error(`Échec de la conversion de la fiche ${id} en PDF.`);
    } finally {
        document.body.removeChild(tempContainer);
    }
};


// ------------------------------------------------------------------------------------
// Composant FicheDetail (Mise à jour de l'appel à generatePDFForFiche)
// ------------------------------------------------------------------------------------
const FicheDetail = ({ fiche, onClose, onFicheDeleted }) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isPreviewing, setIsPreviewing] = useState(false);

    const { register } = useForm({
        defaultValues: fiche,
    });

    useEffect(() => {
    }, [fiche]);

    // --- Logique de Suppression de la Fiche (inchangée) ---
    const handleDelete = async () => {
        // ... (Code inchangé)
    };


    // --- Logique de Téléchargement direct en PDF (shouldSave: true) ---
    const handleDownloadPDF = async () => {
        setIsDownloading(true);
        try {
            await generatePDFForFiche(fiche, true);
        } catch (error) {
            console.error(error);
            alert(error.message);
        } finally {
            setIsDownloading(false);
        }
    };

    const handlePreviewPDF = async () => {
        setIsPreviewing(true);
        try {
            const buffer = await generatePDFForFiche(fiche, false);
            const blob = new Blob([buffer], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (error) {
            console.error(error);
            alert(error.message);
        } finally {
            setIsPreviewing(false);
        }
    };


    return (
        <div className="container py-5 animate-fade-in">
            {/* Header / Actions bar */}
            <div className="d-flex justify-content-between align-items-center mb-5 no-print">
                <button
                    onClick={onClose}
                    className="btn btn-outline-dark rounded-pill d-flex align-items-center gap-2 px-4 shadow-sm hover-lift"
                >
                    <ArrowLeft size={18} />
                    Retour à la liste
                </button>
                <div className="d-flex gap-2">
                    <button
                        onClick={handleDelete}
                        className="btn btn-outline-danger rounded-pill d-flex align-items-center gap-2 px-4 shadow-sm hover-lift"
                        disabled={!(fiche._id || fiche.id) || isDeleting}
                    >
                        {isDeleting ? (
                            <span className="spinner-border spinner-border-sm" role="status"></span>
                        ) : (
                            <Trash2 size={18} />
                        )}
                        Supprimer
                    </button>
                    <button
                        onClick={handlePreviewPDF}
                        className="btn btn-outline-primary rounded-pill d-flex align-items-center gap-2 px-4 shadow-sm hover-lift"
                        disabled={isPreviewing}
                    >
                        {isPreviewing ? <span className="spinner-border spinner-border-sm"></span> : <Eye size={18} />}
                        Voir PDF
                    </button>
                    <button
                        onClick={handleDownloadPDF}
                        className="btn btn-primary rounded-pill d-flex align-items-center gap-2 px-4 shadow-lg hover-lift border-0"
                        style={{ background: 'linear-gradient(90deg, var(--primary) 0%, #dc2626 100%)' }}
                        disabled={isDownloading}
                    >
                        {isDownloading ? (
                            <span className="spinner-border spinner-border-sm" role="status"></span>
                        ) : (
                            <Download size={18} />
                        )}
                        Télécharger le PDF
                    </button>
                </div>
            </div>

            {/* Fiche Card */}
            <div className="card border-0 shadow-lg overflow-hidden" style={{ borderRadius: '30px' }} id="fiche-imprimable-content-display">
                {/* Visual Header */}
                <div style={{
                    background: `linear-gradient(135deg, var(--primary) 0%, #dc2626 100%)`,
                    padding: '3rem 2rem',
                    color: 'white'
                }}>
                    <div className="row align-items-center">
                        <div className="col-md-auto text-center text-md-start mb-4 mb-md-0">
                            <div className="bg-white p-1 rounded-4 shadow-lg d-inline-block overflow-hidden" style={{ width: '160px', height: '190px' }}>
                                {fiche.photoIDPath ? (
                                    <img
                                        src={`${UPLOADS_BASE_URL}${fiche.photoIDPath.startsWith('uploads/') ? fiche.photoIDPath : 'uploads/' + fiche.photoIDPath}`}
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
                                FICHE D'IDENTIFICATION OFFICIELLE
                            </span>
                            <h1 className="display-6 fw-bold mb-2">{fiche.nomPrenom}</h1>
                            <div className="d-flex flex-wrap justify-content-center justify-content-md-start gap-3 opacity-90">
                                <span className="d-flex align-items-center gap-2 small">
                                    <FileText size={16} />
                                    ID: {formatCambisteId(fiche._id || fiche.id)}
                                </span>
                                <span className="d-flex align-items-center gap-2 small">
                                    <Calendar size={16} />
                                    Enregistré le {formatValue('date', fiche.dateEnregistrement)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="card-body p-4 p-md-5 bg-white">
                    <div className="row g-5">
                        {/* Identité Section */}
                        <div className="col-lg-6">
                            <div className="mb-5">
                                <h5 className="fw-bold mb-4 d-flex align-items-center">
                                    <div className="bg-primary rounded-3 me-3 p-2 text-white" style={{ background: 'var(--primary)' }}>
                                        <User size={18} />
                                    </div>
                                    DONNÉES INDIVIDUELLES
                                </h5>
                                <div className="space-y-4">
                                    {[
                                        { label: 'Sexe', value: formatValue('sexe', fiche.sexe), icon: <User size={14} /> },
                                        { label: 'Nationalité', value: fiche.nationalite, icon: <Shield size={14} /> },
                                        { label: 'Né le', value: formatValue('date', fiche.dateNaissance), icon: <Calendar size={14} /> },
                                        { label: 'À', value: fiche.lieuNaissance, icon: <MapPin size={14} /> },
                                        { label: 'Document', value: fiche.documentIdentite, icon: <FileText size={14} /> },
                                        { label: 'Adresse', value: fiche.adresse, icon: <MapPin size={14} /> },
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
                                    CONTACT & ACTIVITÉS
                                </h5>
                                <div className="p-4 bg-light rounded-4 mb-4">
                                    <div className="d-flex align-items-center mb-3">
                                        <Phone size={16} className="text-primary me-3" />
                                        <span className="fw-bold fs-5">{fiche.telephone}</span>
                                    </div>
                                    {fiche.email && (
                                        <div className="d-flex align-items-center mb-2">
                                            <Mail size={16} className="text-primary me-3" />
                                            <span>{fiche.email}</span>
                                        </div>
                                    )}
                                    {fiche.autresActivites && (
                                        <div className="d-flex align-items-center mt-3 pt-3 border-top border-secondary border-opacity-10">
                                            <TrendingUp size={16} className="text-primary me-3" />
                                            <span className="small"><strong>Autres :</strong> {fiche.autresActivites}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="d-flex flex-wrap gap-2">
                                    {["airtelMoney", "mPesa", "orangeMoney", "afrimoney", "changeManuel", "venteTelecom"].map(act => (
                                        fiche[act] && (
                                            <span key={act} className="badge rounded-pill bg-white border px-3 py-2 text-dark shadow-sm d-flex align-items-center gap-2">
                                                <CheckCircle size={14} className="text-success" />
                                                {act.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                            </span>
                                        )
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Association & Autorité Section */}
                        <div className="col-lg-6">
                            <div className="mb-5 p-4 rounded-4 border border-2 border-dashed border-light h-100">
                                <h5 className="fw-bold mb-4 d-flex align-items-center">
                                    <div className="bg-dark rounded-3 me-3 p-2 text-white">
                                        <Shield size={18} />
                                    </div>
                                    GARANTIE & ASSOCIATION
                                </h5>
                                <div className="space-y-4">
                                    <div className="mb-4">
                                        <p className="text-muted small fw-bold text-uppercase mb-1">Association</p>
                                        <p className="fw-bold fs-5 text-primary mb-0">{fiche.associationNom || 'INDÉPENDANT'}</p>
                                    </div>
                                    <div className="row g-3">
                                        <div className="col-4">
                                            <p className="text-muted small fw-bold text-uppercase mb-1">N° Enr.</p>
                                            <p className="fw-semibold mb-0">{fiche.associationNumero || '-'}</p>
                                        </div>
                                        <div className="col-4">
                                            <p className="text-muted small fw-bold text-uppercase mb-1">Responsable</p>
                                            <p className="fw-semibold mb-0 text-truncate" title={fiche.associationResponsable}>{fiche.associationResponsable || '-'}</p>
                                        </div>
                                        <div className="col-4">
                                            <p className="text-muted small fw-bold text-uppercase mb-1">Contact</p>
                                            <p className="fw-semibold mb-0">{fiche.associationContact || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 p-3 bg-primary bg-opacity-10 rounded-3 border border-primary border-opacity-10">
                                        <p className="text-primary small fw-bold text-uppercase mb-1">Nature de la Garantie</p>
                                        <p className="mb-0 fw-medium">{fiche.garantieNature || 'Aucune garantie renseignée'}</p>
                                    </div>
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
                                            <span className="badge bg-dark rounded-pill px-3">{fiche.numEnregistrement || 'EN ATTENTE'}</span>
                                        </div>
                                        <div className="d-flex justify-content-between align-items-center">
                                            <span className="text-muted small fw-bold text-uppercase">Agent</span>
                                            <span className="fw-medium text-dark">{fiche.agentNom || 'Système'}</span>
                                        </div>
                                    </div>

                                    {(fiche.nomAssociationAtteste || fiche.nomResponsableAssociation) && (
                                        <div className="mt-4 p-3 bg-light rounded-3 border-start border-4 border-primary">
                                            <p className="text-dark small fw-bold text-uppercase mb-1">Attestation Association</p>
                                            <p className="mb-0 small text-muted">A été attesté par <strong>{fiche.nomResponsableAssociation || 'N/A'}</strong> de l'association <strong>{fiche.nomAssociationAtteste || 'N/A'}</strong>.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="card-footer bg-light border-0 p-4 text-center">
                    <p className="mb-0 text-muted small px-5">
                        Cette fiche d'identification numérique est une propriété exclusive d'AREFA.
                        Toute falsification est passible de poursuites judiciaires.
                    </p>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .space-y-4 > * + * { margin-top: 1rem; }
                .space-y-3 > * + * { margin-top: 0.75rem; }
                .border-bottom-dashed { border-bottom: 1px dashed #e2e8f0; }
                .w-40 { width: 40%; }
                .hover-lift:hover { transform: translateY(-3px); transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
            `}} />
        </div>
    );
};

export default FicheDetail;
