import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    UserCheck,
    TrendingUp,
    Building2,
    DollarSign,
    Smartphone,
    ArrowRight,
    Calendar,
    Activity
} from 'lucide-react';
import Image from '../assets/image.jpg';

const API_URL = 'http://127.0.0.1:5000/api';
const UPLOADS_BASE_URL = 'http://127.0.0.1:5000/';
const primaryColor = '#ea580c';
const lightOrange = '#fed7aa';

export default function Dashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/stats`);
            if (!response.ok) throw new Error('Erreur de chargement');
            const data = await response.json();
            setStats(data);
        } catch (error) {
            console.error('Erreur stats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-vh-100 d-flex justify-content-center align-items-center bg-light">
                <div className="text-center">
                    <div className="spinner-border" style={{ color: primaryColor }} role="status">
                        <span className="visually-hidden">Chargement...</span>
                    </div>
                    <p className="mt-3 text-muted">Chargement du tableau de bord...</p>
                </div>
            </div>
        );
    }

    const StatCard = ({ icon: Icon, title, value, color, gradient, onClick }) => (
        <div
            className="card border-0 shadow-sm h-100 stat-card"
            style={{
                background: gradient,
                cursor: onClick ? 'pointer' : 'default',
                transition: 'all 0.3s ease'
            }}
            onClick={onClick}
        >
            <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-start">
                    <div>
                        <p className="text-white-50 mb-2 small fw-semibold">{title}</p>
                        <h2 className="text-white fw-bold mb-0 display-5">{value}</h2>
                    </div>
                    <div className="stat-icon" style={{
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        borderRadius: '12px',
                        padding: '12px'
                    }}>
                        <Icon size={32} color="white" />
                    </div>
                </div>
            </div>
        </div>
    );

    const ActivityBar = ({ label, value, max, color }) => {
        const percentage = max > 0 ? (value / max) * 100 : 0;
        return (
            <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="small fw-semibold text-muted">{label}</span>
                    <span className="badge" style={{ backgroundColor: color }}>{value}</span>
                </div>
                <div className="progress" style={{ height: '8px', borderRadius: '10px' }}>
                    <div
                        className="progress-bar"
                        style={{
                            width: `${percentage}%`,
                            backgroundColor: color,
                            transition: 'width 0.6s ease'
                        }}
                    />
                </div>
            </div>
        );
    };

    const QuickActionButton = ({ icon: Icon, label, onClick, color }) => (
        <button
            className="btn btn-lg w-100 text-start d-flex align-items-center justify-content-between shadow-sm quick-action-btn"
            style={{
                backgroundColor: 'white',
                border: `2px solid ${lightOrange}`,
                borderRadius: '12px',
                transition: 'all 0.3s ease'
            }}
            onClick={onClick}
        >
            <div className="d-flex align-items-center">
                <div style={{
                    backgroundColor: color,
                    borderRadius: '10px',
                    padding: '10px',
                    marginRight: '12px'
                }}>
                    <Icon size={24} color="white" />
                </div>
                <span className="fw-semibold">{label}</span>
            </div>
            <ArrowRight size={20} color={primaryColor} />
        </button>
    );

    const maxActivity = stats?.activityStats ? Math.max(...Object.values(stats.activityStats)) : 1;

    return (
        <div className="min-vh-100 bg-light animate-fade-in">
            {/* Header Modernisé */}
            <div className="dashboard-header" style={{
                background: `linear-gradient(135deg, var(--primary) 0%, #dc2626 100%)`,
                padding: '3rem 0',
                marginBottom: '2.5rem',
                borderBottomLeftRadius: '30px',
                borderBottomRightRadius: '30px',
                boxShadow: 'var(--shadow-lg)'
            }}>
                <div className="container">
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-4">
                        <div className="d-flex align-items-center">
                            <div className="bg-white p-2 rounded-4 shadow-sm me-4">
                                <img
                                    src={Image}
                                    alt="Logo AREFA"
                                    style={{
                                        height: '60px',
                                        width: '60px',
                                        objectFit: 'contain'
                                    }}
                                />
                            </div>
                            <div>
                                <h1 className="text-white fw-bold mb-1 h2">Tableau de Bord AREFA</h1>
                                <p className="text-white-50 mb-0 d-flex align-items-center">
                                    <Activity size={16} className="me-2" />
                                    Gestion Professionnelle des Flux Monétaires
                                </p>
                            </div>
                        </div>
                        <div className="d-flex gap-3">
                            <button
                                className="btn btn-light rounded-pill shadow-sm d-flex align-items-center"
                                onClick={() => fetchStats()}
                            >
                                <Activity size={18} className="me-2 text-primary" />
                                Actualiser
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container pb-5">
                {/* Statistics Cards */}
                <div className="row g-4 mb-5">
                    <div className="col-md-6 col-lg-3">
                        <StatCard
                            icon={Users}
                            title="Total Cambistes"
                            value={stats?.totalCambistes || 0}
                            gradient={`linear-gradient(135deg, var(--primary) 0%, #f97316 100%)`}
                            onClick={() => navigate('/liste_cambiste')}
                        />
                    </div>
                    <div className="col-md-6 col-lg-3">
                        <StatCard
                            icon={UserCheck}
                            title="Total Opérateurs"
                            value={stats?.totalOperateurs || 0}
                            gradient="linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
                            onClick={() => navigate('/liste_operateur')}
                        />
                    </div>
                    <div className="col-md-6 col-lg-3">
                        <StatCard
                            icon={Calendar}
                            title="Enregistrements / Jour"
                            value={stats?.todayTotal || 0}
                            gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
                        />
                    </div>
                    <div className="col-md-6 col-lg-3">
                        <StatCard
                            icon={Building2}
                            title="Associations Actives"
                            value={stats?.activeAssociations || 0}
                            gradient="linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)"
                        />
                    </div>
                </div>

                <div className="row g-4">
                    {/* Association Stats Section */}
                    <div className="col-lg-8">
                        <div className="card border-0 shadow-sm h-100 glass-card">
                            <div className="card-body p-4">
                                <div className="d-flex justify-content-between align-items-center mb-4">
                                    <h5 className="fw-bold mb-0" style={{ color: 'var(--text-main)' }}>
                                        <Building2 size={24} className="me-3 text-primary" />
                                        Répartition par Association
                                    </h5>
                                    <span className="badge bg-light text-muted p-2 rounded-pill">Membres AREFA</span>
                                </div>
                                {stats?.associationStats && stats.associationStats.length > 0 ? (
                                    <div className="row g-4">
                                        {stats.associationStats.slice(0, 6).map((assoc, idx) => (
                                            <div key={idx} className="col-md-6">
                                                <ActivityBar
                                                    label={assoc.name}
                                                    value={assoc.count}
                                                    max={Math.max(...stats.associationStats.map(a => a.count))}
                                                    color={idx % 2 === 0 ? 'var(--primary)' : '#3b82f6'}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-5">
                                        <p className="text-muted">Aucune donnée d'association disponible</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Recent Activities Section */}
                    <div className="col-lg-4">
                        <div className="card border-0 shadow-sm h-100">
                            <div className="card-body p-4">
                                <h5 className="fw-bold mb-4" style={{ color: 'var(--text-main)' }}>
                                    <Activity size={24} className="me-3 text-primary" />
                                    Activités Récentes
                                </h5>
                                {stats?.recentActivities && stats.recentActivities.length > 0 ? (
                                    <div className="d-flex flex-column gap-3">
                                        {stats.recentActivities.map((activity, index) => (
                                            <div
                                                key={index}
                                                className="d-flex align-items-center p-3 rounded-4 bg-light border-0 transition-all hover-translate-x cursor-pointer"
                                                style={{ transition: 'all 0.3s ease', cursor: 'pointer' }}
                                                onClick={() => {
                                                    if (activity.type === 'Cambiste') {
                                                        navigate(`/fiche/${activity._id || activity.id}`);
                                                    } else {
                                                        navigate(`/operateur/${activity._id || activity.id}`);
                                                    }
                                                }}
                                            >
                                                <div className="position-relative">
                                                    <img
                                                        src={activity.photoIDPath ? `${UPLOADS_BASE_URL}${activity.photoIDPath.startsWith('uploads/') ? activity.photoIDPath : 'uploads/' + activity.photoIDPath}` : Image}
                                                        alt=""
                                                        style={{
                                                            width: '48px',
                                                            height: '48px',
                                                            borderRadius: '12px',
                                                            objectFit: 'cover'
                                                        }}
                                                    />
                                                    <span className={`position-absolute bottom-0 end-0 p-1 rounded-circle border border-2 border-white ${activity.type === 'Cambiste' ? 'bg-primary' : 'bg-info'}`} style={{ width: '12px', height: '12px' }}></span>
                                                </div>
                                                <div className="ms-3 flex-grow-1">
                                                    <p className="mb-0 fw-bold small">{activity.nomPrenom}</p>
                                                    <div className="d-flex align-items-center text-muted" style={{ fontSize: '0.75rem' }}>
                                                        <span className="badge bg-white text-dark border-0 shadow-sm me-2">{activity.type}</span>
                                                        <span>{new Date(activity.dateEnregistrement).toLocaleDateString('fr-FR')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-5">
                                        <Activity size={48} className="text-light mb-3" />
                                        <p className="text-muted">Aucune activité récente</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions Modernisées */}
                <div className="mt-5 pt-4">
                    <div className="d-flex align-items-center mb-4">
                        <div className="bg-primary p-2 rounded-3 me-3">
                            <ArrowRight size={20} color="white" />
                        </div>
                        <h4 className="fw-bold mb-0">Raccourcis de Gestion</h4>
                    </div>
                    <div className="row g-4">
                        <div className="col-md-6 col-lg-3">
                            <QuickActionButton
                                icon={Users}
                                label="Nouveau Cambiste"
                                onClick={() => navigate('/nouveau_cambiste')}
                                color="var(--primary)"
                            />
                        </div>
                        <div className="col-md-6 col-lg-3">
                            <QuickActionButton
                                icon={UserCheck}
                                label="Nouvel Opérateur"
                                onClick={() => navigate('/enregistrement_operateur')}
                                color="#3b82f6"
                            />
                        </div>
                        <div className="col-md-6 col-lg-3">
                            <QuickActionButton
                                icon={DollarSign}
                                label="Fiches Cambistes"
                                onClick={() => navigate('/liste_cambiste')}
                                color="#10b981"
                            />
                        </div>
                        <div className="col-md-6 col-lg-3">
                            <QuickActionButton
                                icon={Smartphone}
                                label="Fiches Opérateurs"
                                onClick={() => navigate('/liste_operateur')}
                                color="#8b5cf6"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .hover-translate-x:hover {
                    transform: translateX(5px);
                    background-color: white !important;
                    box-shadow: var(--shadow-md);
                }
                .quick-action-btn:hover {
                    border-color: var(--primary) !important;
                    transform: translateY(-3px);
                    box-shadow: var(--shadow-lg) !important;
                }
                .stat-card:hover {
                    transform: translateY(-8px);
                }
            `}} />
        </div>
    );
}
