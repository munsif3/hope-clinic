export const formatCurrency = (amount) => {
    const formattedNumber = new Intl.NumberFormat('en-LK', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
    return `Rs. ${formattedNumber}`;
};

export const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-LK', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

export const formatDateTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleString('en-LK', {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: 'numeric',
    });
};
