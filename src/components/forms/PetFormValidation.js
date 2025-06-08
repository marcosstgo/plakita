// Validaciones para formularios de mascotas
export const validatePetForm = (formData) => {
  const errors = {};

  // Validar nombre
  if (!formData.name || formData.name.trim().length < 2) {
    errors.name = 'El nombre debe tener al menos 2 caracteres';
  }

  // Validar tipo
  if (!formData.type) {
    errors.type = 'Debes seleccionar un tipo de mascota';
  }

  // Validar nombre del dueño
  if (!formData.ownerName || formData.ownerName.trim().length < 2) {
    errors.ownerName = 'El nombre del dueño debe tener al menos 2 caracteres';
  }

  // Validar información de contacto
  if (!formData.contactInfo || formData.contactInfo.trim().length < 5) {
    errors.contactInfo = 'La información de contacto debe tener al menos 5 caracteres';
  }

  // Validar email si parece ser un email
  if (formData.contactInfo && formData.contactInfo.includes('@')) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.contactInfo)) {
      errors.contactInfo = 'El formato del email no es válido';
    }
  }

  // Validar teléfono si parece ser un teléfono
  if (formData.contactInfo && /^\+?[\d\s\-\(\)]+$/.test(formData.contactInfo)) {
    const phoneDigits = formData.contactInfo.replace(/\D/g, '');
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      errors.contactInfo = 'El número de teléfono debe tener entre 7 y 15 dígitos';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Limpiar y formatear datos del formulario
export const sanitizePetFormData = (formData) => {
  return {
    name: formData.name?.trim() || '',
    type: formData.type?.trim() || '',
    breed: formData.breed?.trim() || '',
    ownerName: formData.ownerName?.trim() || '',
    contactInfo: formData.contactInfo?.trim() || '',
    notes: formData.notes?.trim() || ''
  };
};

// Validaciones para códigos de tags
export const validateTagCode = (code) => {
  const errors = {};

  if (!code || code.trim().length < 3) {
    errors.code = 'El código debe tener al menos 3 caracteres';
  }

  if (code && !/^[A-Z0-9\-]+$/.test(code.toUpperCase())) {
    errors.code = 'El código solo puede contener letras, números y guiones';
  }

  if (code && code.length > 20) {
    errors.code = 'El código no puede tener más de 20 caracteres';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Generar código de tag aleatorio
export const generateTagCode = () => {
  const prefix = 'PLK-';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = prefix;
  
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
};