import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

const primaryColor = '#ea580c';

export const showAlert = (type, title, text) => {
    return MySwal.fire({
        icon: type,
        title: title,
        text: text,
        confirmButtonColor: primaryColor,
        buttonsStyling: true,
        customClass: {
            confirmButton: 'btn btn-primary rounded-pill px-4',
            popup: 'rounded-4 shadow-lg border-0'
        }
    });
};

export const showToast = (type, title) => {
    const Toast = MySwal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', MySwal.stopTimer);
            toast.addEventListener('mouseleave', MySwal.resumeTimer);
        },
        customClass: {
            popup: 'rounded-4 shadow-lg border-0'
        }
    });

    return Toast.fire({
        icon: type,
        title: title
    });
};

export const askConfirmation = async (title, text, confirmButtonText = 'Oui, continuer') => {
    const result = await MySwal.fire({
        title: title,
        text: text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626', // Rouge pour les actions dangereuses par défaut
        cancelButtonColor: '#6c757d',
        confirmButtonText: confirmButtonText,
        cancelButtonText: 'Annuler',
        customClass: {
            confirmButton: 'btn btn-danger rounded-pill px-4 me-2',
            cancelButton: 'btn btn-secondary rounded-pill px-4',
            popup: 'rounded-4 shadow-lg border-0'
        },
        buttonsStyling: false // Important pour que bootstrap classes fonctionnent
    });
    return result.isConfirmed;
};
